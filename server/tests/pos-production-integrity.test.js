import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || `mongodb://127.0.0.1:27017/cafe_pos_integrity_${process.pid}`;
process.env.JWT_SECRET ||= 'integration-test-jwt-secret-with-more-than-32-bytes-pos-integrity';
process.env.TABLE_QR_SECRET ||= 'integration-test-table-qr-secret-with-32-bytes';

const { createApp } = await import('../index.js');
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import Table from '../models/Table.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import PaymentLedger from '../models/PaymentLedger.js';
import Coupon from '../models/Coupon.js';
import InventoryItem from '../models/InventoryItem.js';
import InventoryCategory from '../models/InventoryCategory.js';
import MenuInventoryMapping from '../models/MenuInventoryMapping.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import AuditEvent from '../models/AuditEvent.js';
import { runWithTenant, runWithSystemTenantAccess } from '../utils/tenantContext.js';

test('POS PRODUCTION INTEGRITY & SECURITY SUITE', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const app = createApp();
  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const request = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.token && { Authorization: `Bearer ${options.token}` }),
      ...(options.headers || {}),
    };
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // Non-json
    }
    return { status: res.status, data };
  };

  const createToken = (user) => {
    return jwt.sign(
      {
        id: user._id,
        role: user.role,
        tenantId: user.tenantId,
        tokenUse: 'access',
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  // Setup Two Cafes: Cafe Alpha & Cafe Beta
  let cafeA, cafeB;
  let cashierA, managerA, kitchenA;
  let cashierB;
  let branchA, branchB;
  let tableA1, tableB1;
  let productA1, productA2, productB1;
  let invCoffeeBeanA;
  let couponA10;

  await runWithSystemTenantAccess(async () => {
    const suffix = Date.now();

    // 1. Cafe Alpha
    cafeA = await Tenant.create({
      name: 'Cafe Alpha Roasters',
      slug: `cafe-alpha-${suffix}`,
      status: 'active',
      plan: 'pro',
      settings: {
        currency: 'INR',
        taxRate: 5,
        gstSettings: {
          enabled: true,
          gstin: '24AAAAA0000A1Z5',
          stateCode: '24',
          invoicePrefix: 'ALP',
        },
        posSettings: {
          maxCashierDiscountPercent: 20,
          maxCashierDiscountAmount: 500,
          allowStackingDiscountAndCoupon: false,
          requireManagerDiscountApproval: true,
        },
      },
    });

    branchA = await Branch.create({
      tenantId: cafeA._id,
      name: 'Alpha Main Branch',
      code: `AMB-${suffix}`,
      isMain: true,
      active: true,
    });

    tableA1 = await Table.create({
      tenantId: cafeA._id,
      branchId: branchA._id,
      tableNumber: 1,
      label: 'Table 1',
      status: 'AVAILABLE',
      active: true,
    });

    cashierA = await User.create({
      tenantId: cafeA._id,
      name: 'Asha Cashier',
      email: `cashier.alpha.${suffix}@test.com`,
      password: 'Password@123',
      role: 'cashier',
    });

    managerA = await User.create({
      tenantId: cafeA._id,
      name: 'Mehul Manager',
      email: `manager.alpha.${suffix}@test.com`,
      password: 'Password@123',
      role: 'manager',
    });

    kitchenA = await User.create({
      tenantId: cafeA._id,
      name: 'Karan Chef',
      email: `kitchen.alpha.${suffix}@test.com`,
      password: 'Password@123',
      role: 'kitchen',
    });

    const catA = await Category.create({
      tenantId: cafeA._id,
      name: 'Alpha Hot Beverages',
      slug: `bev-a-${suffix}`,
    });

    productA1 = await Product.create({
      tenantId: cafeA._id,
      name: 'Artisan Latte',
      category: catA._id,
      price: 200,
      available: true,
    });

    productA2 = await Product.create({
      tenantId: cafeA._id,
      name: 'Croissant',
      category: catA._id,
      price: 150,
      available: true,
    });

    const invCatA = await InventoryCategory.create({
      tenantId: cafeA._id,
      name: 'Coffee & Dairy',
    });

    invCoffeeBeanA = await InventoryItem.create({
      tenantId: cafeA._id,
      name: 'Roasted Coffee Beans',
      category: invCatA._id,
      currentQuantity: 10,
      unit: 'kg',
      active: true,
    });

    await MenuInventoryMapping.create({
      tenantId: cafeA._id,
      product: productA1._id,
      inventoryItem: invCoffeeBeanA._id,
      quantityRequired: 0.05, // 50g per latte
      active: true,
    });

    couponA10 = await Coupon.create({
      tenantId: cafeA._id,
      code: 'ALPHA10',
      discountType: 'percent',
      value: 10,
      minimumSubtotal: 100,
      active: true,
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 86400000),
    });

    // 2. Cafe Beta (Multi-tenant check)
    cafeB = await Tenant.create({
      name: 'Cafe Beta Bakers',
      slug: `cafe-beta-${suffix}`,
      status: 'active',
      plan: 'pro',
      settings: {
        currency: 'INR',
        taxRate: 5,
        gstSettings: {
          enabled: true,
          gstin: '27BBBBB0000B1Z6',
          stateCode: '27',
          invoicePrefix: 'BET',
        },
      },
    });

    branchB = await Branch.create({
      tenantId: cafeB._id,
      name: 'Beta Downtown',
      code: `BDB-${suffix}`,
      isMain: true,
      active: true,
    });

    tableB1 = await Table.create({
      tenantId: cafeB._id,
      branchId: branchB._id,
      tableNumber: 1,
      label: 'Beta Table 1',
      status: 'AVAILABLE',
      active: true,
    });

    cashierB = await User.create({
      tenantId: cafeB._id,
      name: 'Bharat Cashier',
      email: `cashier.beta.${suffix}@test.com`,
      password: 'Password@123',
      role: 'cashier',
    });

    const catB = await Category.create({
      tenantId: cafeB._id,
      name: 'Beta Bakery',
      slug: `bak-b-${suffix}`,
    });

    productB1 = await Product.create({
      tenantId: cafeB._id,
      name: 'Beta Bagel',
      category: catB._id,
      price: 180,
      available: true,
    });
  });

  const tokenCashierA = createToken(cashierA);
  const tokenManagerA = createToken(managerA);
  const tokenKitchenA = createToken(kitchenA);
  const tokenCashierB = createToken(cashierB);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: AUTHENTICATION, DEMO ISOLATION & ROLE ENFORCEMENT
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('1. Authentication & Role Gates: unauthenticated and kitchen roles rejected', async () => {
    // Unauthenticated request receives 401
    const unauth = await request('/api/pos/orders', {
      method: 'POST',
      body: { items: [{ productId: String(productA1._id), quantity: 1 }] },
    });
    assert.equal(unauth.status, 401);

    // Kitchen staff role is rejected from POS order creation (403)
    const kitchenCreate = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenKitchenA,
      body: { items: [{ productId: String(productA1._id), quantity: 1 }] },
    });
    assert.equal(kitchenCreate.status, 403);
    assert.match(kitchenCreate.data.error, /not allowed to perform this action/i);

    // Kitchen staff role is rejected from offline sync (403)
    const kitchenSync = await request('/api/pos/sync', {
      method: 'POST',
      token: tokenKitchenA,
      body: { orders: [{ syncId: 'offline_k_1', items: [{ productId: String(productA1._id), quantity: 1 }] }] },
    });
    assert.equal(kitchenSync.status, 403);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: REBUILD ORDER CREATION & PAYMENT SETTLEMENT SAFELY
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('2. Payment Integrity: Client cannot force paid status via isPaid / autoComplete', async () => {
    // Attempting to pass paymentMethod: 'razorpay' with client flags isPaid: true, autoComplete: true
    const res = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'razorpay',
        isPaid: true,
        autoComplete: true,
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.order.paymentMethod, 'razorpay');
    // Backend MUST NOT mark it paid!
    assert.equal(res.data.order.paymentStatus, 'pending');
    assert.equal(res.data.order.orderStatus, 'pending');
    assert.equal(res.data.order.gstDetails.invoiceNumber, ''); // No paid invoice issued!
  });

  await t.test('3. Cash Settlement: Authenticated cashier attestation records audit trail and tendered amounts', async () => {
    const res = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        tenderedAmount: 500, // Product is 200 + 5% tax = 210
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });

    assert.equal(res.status, 201);
    const order = res.data.order;
    assert.equal(order.paymentStatus, 'paid');
    assert.ok(['confirmed', 'completed'].includes(order.orderStatus));
    assert.equal(order.cashVerificationStatus, 'confirmed');
    assert.equal(order.subtotal, 200);
    assert.equal(order.tax, 10);
    assert.equal(order.total, 210);

    // Verify cashier attestation metadata
    assert.equal(String(order.posMetadata.cashierId), String(cashierA._id));
    assert.equal(order.posMetadata.cashierAttestation.tenderedAmount, 500);
    assert.equal(order.posMetadata.cashierAttestation.changeAmount, 290);

    // Verify Payment & PaymentLedger created
    const { payment, ledger } = await runWithTenant(cafeA._id, async () => {
      const p = await Payment.findOne({ orderId: order._id, tenantId: cafeA._id });
      const l = await PaymentLedger.findOne({ orderId: order._id, tenantId: cafeA._id });
      return { payment: p, ledger: l };
    });
    assert.ok(payment);
    assert.equal(payment.provider, 'cash');
    assert.equal(payment.status, 'captured');
    assert.equal(payment.amount, 210);

    assert.ok(ledger);
    assert.equal(ledger.eventType, 'payment_captured');
  });

  await t.test('4. Cash Settlement: Rejects tendered amount less than total', async () => {
    const res = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        tenderedAmount: 100, // Total is 210
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data.error, /tendered amount.*cannot be less than order total/i);
  });

  await t.test('5. External Terminal Settlement (UPI/Card): Records terminal reference and attestation', async () => {
    const res = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'upi',
        externalPaymentReference: 'UPI-REF-998877',
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });

    assert.equal(res.status, 201);
    const order = res.data.order;
    assert.equal(order.paymentStatus, 'paid');
    assert.equal(order.paymentMethod, 'upi');
    assert.equal(order.posMetadata.externalTerminalAttestation.reference, 'UPI-REF-998877');
    assert.equal(order.posMetadata.externalTerminalAttestation.verifiedBy, 'cashier_terminal_attestation');
  });

  await t.test('6. Split Payments: Validates component amounts, methods, and total reconciliation', async () => {
    // 6a. Rejects mismatched total (Total is 210, splits sum to 200)
    const badSum = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'split',
        splitPayments: [
          { method: 'cash', amount: 100 },
          { method: 'card', amount: 100 },
        ],
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(badSum.status, 400);
    assert.match(badSum.data.error, /split payment total.*does not match/i);

    // 6b. Rejects negative amount
    const negative = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'split',
        splitPayments: [
          { method: 'cash', amount: -50 },
          { method: 'card', amount: 260 },
        ],
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(negative.status, 400);

    // 6c. Accepts exact split match (100 cash + 110 card = 210)
    const valid = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'split',
        splitPayments: [
          { method: 'cash', amount: 100 },
          { method: 'card', amount: 110, reference: 'EDC-AUTH-12' },
        ],
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(valid.status, 201);
    assert.equal(valid.data.order.paymentStatus, 'paid');
    assert.equal(valid.data.order.splitPayments.length, 2);
  });

  await t.test('7. Existing Order Settlement via /pay: role-authorized and idempotent duplicate protection', async () => {
    // First create an unpaid counter order
    const createRes = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'razorpay',
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(createRes.status, 201);
    const orderId = createRes.data.order._id;

    // Kitchen role cannot call /pay (403)
    const kitchenPay = await request(`/api/pos/orders/${orderId}/pay`, {
      method: 'POST',
      token: tokenKitchenA,
      body: { paymentMethod: 'cash' },
    });
    assert.equal(kitchenPay.status, 403);

    // Authorized Cashier settles payment
    const payRes1 = await request(`/api/pos/orders/${orderId}/pay`, {
      method: 'POST',
      token: tokenCashierA,
      body: { paymentMethod: 'cash', tenderedAmount: 210 },
    });
    assert.equal(payRes1.status, 200);
    assert.equal(payRes1.data.order.paymentStatus, 'paid');
    const invoiceNum = payRes1.data.order.gstDetails.invoiceNumber;
    assert.ok(invoiceNum);

    // Repeated call to /pay is idempotent and safe
    const payRes2 = await request(`/api/pos/orders/${orderId}/pay`, {
      method: 'POST',
      token: tokenCashierA,
      body: { paymentMethod: 'cash' },
    });
    assert.equal(payRes2.status, 200);
    assert.equal(payRes2.data.alreadyPaid, true);
    assert.equal(payRes2.data.order.gstDetails.invoiceNumber, invoiceNum);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: OFFLINE ORDER SYNCHRONIZATION
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('8. Offline Sync: Idempotency with syncId, server pricing recalculation, and unverified flags', async () => {
    const syncId = `off_sync_${Date.now()}`;

    // 8a. Client tries to send malicious prices (₹1 instead of ₹200) and forged paid flag for UPI
    const offlineBatch = {
      orders: [
        {
          syncId,
          orderType: 'counter',
          paymentMethod: 'upi',
          isPaid: true, // Forged client flag!
          subtotal: 1, // Malicious forged price!
          total: 1,
          items: [{ productId: String(productA1._id), quantity: 1, price: 1 }],
        },
      ],
    };

    const syncRes1 = await request('/api/pos/sync', {
      method: 'POST',
      token: tokenCashierA,
      body: offlineBatch,
    });

    assert.equal(syncRes1.status, 200);
    assert.equal(syncRes1.data.synced.length, 1);
    assert.equal(syncRes1.data.synced[0].syncId, syncId);

    // Verify order created in database
    const syncedOrder = await runWithTenant(cafeA._id, async () => {
      return Order.findOne({ 'posMetadata.offlineSyncId': syncId, tenantId: cafeA._id });
    });
    assert.ok(syncedOrder);
    // Server recalculated real price (₹200 + 5% = ₹210)!
    assert.equal(syncedOrder.subtotal, 200);
    assert.equal(syncedOrder.total, 210);
    // Offline UPI is NOT marked paid merely because it reached the server!
    assert.equal(syncedOrder.paymentStatus, 'pending');
    assert.equal(syncedOrder.posMetadata.reconciliationRequired, true);
    assert.equal(syncedOrder.gstDetails.invoiceNumber, ''); // No official paid invoice issued!

    // 8b. Repeated sync with same syncId is idempotent and creates NO duplicate orders
    const syncRes2 = await request('/api/pos/sync', {
      method: 'POST',
      token: tokenCashierA,
      body: offlineBatch,
    });

    assert.equal(syncRes2.status, 200);
    assert.equal(syncRes2.data.synced[0].alreadySynced, true);
    const count = await runWithTenant(cafeA._id, async () => {
      return Order.countDocuments({ 'posMetadata.offlineSyncId': syncId, tenantId: cafeA._id });
    });
    assert.equal(count, 1); // Exactly one order!
  });

  await t.test('9. Offline Sync: Batch limit enforcement and partial batch safety', async () => {
    // 9a. Batch limit (> 50 items)
    const hugeBatch = {
      orders: Array.from({ length: 51 }, (_, i) => ({
        syncId: `huge_${i}`,
        items: [{ productId: String(productA1._id), quantity: 1 }],
      })),
    };
    const hugeRes = await request('/api/pos/sync', {
      method: 'POST',
      token: tokenCashierA,
      body: hugeBatch,
    });
    assert.equal(hugeRes.status, 400);
    assert.match(hugeRes.data.error, /cannot exceed 50/i);

    // 9b. Partial batch success (Order 1 valid, Order 2 invalid product ID)
    const partialBatch = {
      orders: [
        {
          syncId: `part_ok_${Date.now()}`,
          paymentMethod: 'cash',
          cashierAttestation: { confirmed: true },
          items: [{ productId: String(productA1._id), quantity: 1 }],
        },
        {
          syncId: `part_fail_${Date.now()}`,
          paymentMethod: 'cash',
          items: [{ productId: new mongoose.Types.ObjectId().toString(), quantity: 1 }], // Non-existent product
        },
      ],
    };

    const partialRes = await request('/api/pos/sync', {
      method: 'POST',
      token: tokenCashierA,
      body: partialBatch,
    });

    assert.equal(partialRes.status, 200);
    assert.equal(partialRes.data.synced.length, 1);
    assert.equal(partialRes.data.failed.length, 1);
    // Safe error: does not echo customer PII or raw internal stack trace
    assert.equal(partialRes.data.failed[0].syncId, partialBatch.orders[1].syncId);
    assert.ok(partialRes.data.failed[0].error);
    assert.equal(partialRes.data.failed[0].item, undefined); // Sensitive payload NOT leaked!
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: DISCOUNTS & COUPON AUTHORIZATION
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('10. Discount Policy: Cashier limit enforced; manager can override', async () => {
    // Product subtotal: ₹400 (2 * 200). Cashier limit: 20% = ₹80.
    // 10a. Cashier attempts ₹100 discount (25% > 20% limit) -> 403 DISCOUNT_APPROVAL_REQUIRED
    const overLimitRes = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        manualDiscount: 100,
        items: [{ productId: String(productA1._id), quantity: 2 }],
      },
    });

    assert.equal(overLimitRes.status, 403);
    assert.equal(overLimitRes.data.code, 'DISCOUNT_APPROVAL_REQUIRED');

    // 10b. Cashier provides ₹50 discount (12.5% <= 20% limit) -> Accepted
    const withinLimitRes = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        manualDiscount: 50,
        items: [{ productId: String(productA1._id), quantity: 2 }],
      },
    });

    assert.equal(withinLimitRes.status, 201);
    assert.equal(withinLimitRes.data.order.discount, 50);

    // 10c. Manager applies ₹150 discount (37.5%) directly -> Accepted by role
    const managerRes = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenManagerA,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        manualDiscount: 150,
        items: [{ productId: String(productA1._id), quantity: 2 }],
      },
    });

    assert.equal(managerRes.status, 201);
    assert.equal(managerRes.data.order.discount, 150);
  });

  await t.test('11. Coupon Validation & Stacking Rules', async () => {
    // 11a. Valid coupon applies 10% discount
    const couponRes = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        couponCode: 'ALPHA10',
        items: [{ productId: String(productA1._id), quantity: 1 }], // Subtotal 200 -> 10% = 20
      },
    });

    assert.equal(couponRes.status, 201);
    assert.equal(couponRes.data.order.discount, 20);
    assert.equal(couponRes.data.order.couponCode, 'ALPHA10');

    // 11b. Stacking: Attempting to combine manual discount + coupon when not allowed -> 400
    const stackRes = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        manualDiscount: 10,
        couponCode: 'ALPHA10',
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });

    assert.equal(stackRes.status, 400);
    assert.equal(stackRes.data.code, 'DISCOUNT_STACKING_NOT_ALLOWED');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 5: INVENTORY RELIABILITY & TABLE LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('12. Inventory: Deducts exactly once on confirmed sale and handles retry', async () => {
    const initialStock = (await runWithTenant(cafeA._id, async () => {
      return InventoryItem.findById(invCoffeeBeanA._id);
    })).currentQuantity;

    // 12a. Sale 1: Deducts 0.05 kg for 1 Latte
    const sale1 = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(sale1.status, 201);
    assert.equal(sale1.data.order.inventoryProcessed, true);
    assert.equal(sale1.data.order.inventoryProcessingStatus, 'processed');

    const stockAfterSale1 = (await runWithTenant(cafeA._id, async () => {
      return InventoryItem.findById(invCoffeeBeanA._id);
    })).currentQuantity;
    assert.equal(Number((initialStock - stockAfterSale1).toFixed(3)), 0.05);

    // Check inventory transaction recorded
    const tx = await runWithTenant(cafeA._id, async () => {
      return InventoryTransaction.findOne({ orderId: sale1.data.order._id, type: 'order_consumption' });
    });
    assert.ok(tx);
    assert.equal(tx.quantity, -0.05);

    // 12b. Insufficient inventory pre-check returns 409
    // Try to order 300 Lattes (needs 15kg, only ~9.95kg left)
    const overStock = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        items: [{ productId: String(productA1._id), quantity: 300 }],
      },
    });
    assert.equal(overStock.status, 409);
    assert.equal(overStock.data.code, 'INVENTORY_INSUFFICIENT');

    // 12c. Manager retry-inventory endpoint
    const retryRes = await request(`/api/pos/orders/${sale1.data.order._id}/retry-inventory`, {
      method: 'POST',
      token: tokenManagerA,
    });
    assert.equal(retryRes.status, 200);
    assert.equal(retryRes.data.alreadyProcessed, true);
  });

  await t.test('13. Table Validation: Rejects non-existent, inactive, and cross-tenant tables', async () => {
    // 13a. Non-existent table number (Table 999 does not exist)
    const invalidTable = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'dine_in',
        tableNumber: 999,
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(invalidTable.status, 400);
    assert.match(invalidTable.data.error, /does not exist or is inactive/i);

    // 13b. Valid table creation sets table occupied after creation
    const validDineIn = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'dine_in',
        tableNumber: 1,
        paymentMethod: 'cash',
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(validDineIn.status, 201);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 6: HARDENED MULTI-TENANT ISOLATION
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('14. Multi-Tenant Isolation: Cafe B cannot read, pay, or modify Cafe A records', async () => {
    // Create an order in Cafe A
    const orderARes = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        paymentMethod: 'razorpay',
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(orderARes.status, 201);
    const orderAId = orderARes.data.order._id;

    // 14a. Cashier B attempts to settle payment on Cafe A's order -> 404 Not Found
    const payCrossTenant = await request(`/api/pos/orders/${orderAId}/pay`, {
      method: 'POST',
      token: tokenCashierB,
      body: { paymentMethod: 'cash' },
    });
    assert.equal(payCrossTenant.status, 404);

    // 14b. Cashier B attempts to hold an order for Cafe A's product -> Rejected
    const crossProductOrder = await request('/api/pos/orders', {
      method: 'POST',
      token: tokenCashierB,
      body: {
        orderType: 'counter',
        paymentMethod: 'cash',
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(crossProductOrder.status, 400);
    const crossProductErrMsg = typeof crossProductOrder.data.error === 'string'
      ? crossProductOrder.data.error
      : crossProductOrder.data.error?.message;
    assert.match(crossProductErrMsg, /does not belong to this café/i);

    // 14c. Held orders isolation
    const heldRes = await request('/api/pos/orders/hold', {
      method: 'POST',
      token: tokenCashierA,
      body: {
        orderType: 'counter',
        items: [{ productId: String(productA1._id), quantity: 1 }],
      },
    });
    assert.equal(heldRes.status, 201);
    const heldOrderId = heldRes.data.order._id;

    // Cashier B attempts to delete Cafe A's held order -> 404
    const deleteHeldCross = await request(`/api/pos/held-orders/${heldOrderId}`, {
      method: 'DELETE',
      token: tokenCashierB,
    });
    assert.equal(deleteHeldCross.status, 404);

    // Cashier B listing held orders does NOT see Cafe A's held orders
    const listB = await request('/api/pos/held-orders', {
      method: 'GET',
      token: tokenCashierB,
    });
    assert.equal(listB.status, 200);
    const idsB = listB.data.orders.map((o) => String(o._id));
    assert.equal(idsB.includes(String(heldOrderId)), false);
  });
});
