import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Table from '../models/Table.js';
import Counter from '../models/Counter.js';
import Branch from '../models/Branch.js';
import Payment from '../models/Payment.js';
import PaymentLedger from '../models/PaymentLedger.js';
import { protect, cashiers, ownerOrManager } from '../middleware/auth.js';
import { generateOrderAccessToken, hashAccessToken } from '../utils/orderSecurity.js';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';
import { validateInventoryForOrder, confirmOrderAndDeduct } from '../services/inventoryService.js';
import { formatGstInvoiceNumber } from '../services/gstService.js';
import { calculateOrderPricing } from '../services/pricingService.js';
import { claimCoupon } from '../services/couponService.js';
import { createReceiptData } from '../services/receipt.js';
import { publishNewOrder, publishOrderUpdate } from '../services/liveUpdates.js';
import { awardLoyaltyPoints } from '../services/loyaltyService.js';
import { ensureMainBranch } from './branches.js';
import { withMongoTransaction } from '../utils/mongoTransaction.js';
import { parsePagination, formatPagination } from '../utils/pagination.js';
import { syncTableStatusForOrder } from '../services/tableLifecycle.js';
import { writeAuditLog } from '../services/auditLog.js';

const router = express.Router();

// Helper to generate next GST invoice number for tenant
const getNextInvoiceNumber = async (tenantId, prefix = 'INV') => {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'gstInvoiceNumber' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return formatGstInvoiceNumber({
    prefix,
    sequenceNumber: counter.seq,
    date: new Date(),
  });
};

// POST /api/pos/orders — Fast POS Order Creation (Role: Cashier, Manager, Owner)
router.post('/orders', protect, cashiers, async (req, res, next) => {
  try {
    const {
      tableNumber,
      orderType = 'counter',
      branchId,
      customer: rawCustomer = {},
      items: rawItems,
      paymentMethod = 'cash',
      splitPayments = [],
      couponCode: rawCoupon,
      manualDiscount = 0,
      discountReason = '',
      managerApproval = null,
      customerGstin = '',
      notes = '',
      tenderedAmount = null,
      externalPaymentReference = '',
      station = 'POS-01',
      syncId,
    } = req.body || {};

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'At least one item is required.' });
    }

    if (rawItems.length > 100) {
      return res.status(400).json({ error: 'Order cannot contain more than 100 items.' });
    }

    // 1. Idempotency check scoped to authenticated tenant
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || syncId;
    if (idempotencyKey) {
      const existing = await Order.findOne({
        tenantId: req.tenantId,
        $or: [
          { 'posMetadata.offlineSyncId': idempotencyKey },
          { 'posMetadata.idempotencyKey': idempotencyKey },
          { idempotencyKey },
        ],
      });
      if (existing) {
        const receipt = await createReceiptData({
          orders: [existing],
          tableNumber: existing.tableNumber,
          tenantSettings: req.tenant?.settings,
        });
        return res.status(200).json({ success: true, order: existing, receipt, duplicate: true });
      }
    }

    // 2. Branch resolution and validation
    let effectiveBranchId = branchId;
    if (effectiveBranchId) {
      if (!mongoose.isValidObjectId(effectiveBranchId)) {
        return res.status(400).json({ error: 'Invalid branch ID format.' });
      }
      const branchDoc = await Branch.findOne({ _id: effectiveBranchId, tenantId: req.tenantId, active: true });
      if (!branchDoc) {
        return res.status(400).json({ error: 'Branch does not exist or is inactive for this café.' });
      }
    } else {
      const mainBranch = await ensureMainBranch(req.tenantId, req.tenant?.name);
      effectiveBranchId = mainBranch?._id;
    }

    // 3. Table validation for Dine-in
    let resolvedTableNumber = 0;
    if (orderType === 'dine_in') {
      if (tableNumber === undefined || tableNumber === null || tableNumber === '') {
        return res.status(400).json({ error: 'Table number is required for Dine-in orders.' });
      }
      const num = Number(tableNumber);
      if (!Number.isInteger(num) || num <= 0) {
        return res.status(400).json({ error: 'Table number must be a positive integer.' });
      }
      const tableDoc = await Table.findOne({ tableNumber: num, tenantId: req.tenantId, active: true });
      if (!tableDoc) {
        return res.status(400).json({ error: `Table ${num} does not exist or is inactive for this café.` });
      }
      if (tableDoc.status === 'DISABLED') {
        return res.status(400).json({ error: `Table ${num} is currently disabled.` });
      }
      if (effectiveBranchId && tableDoc.branchId && String(tableDoc.branchId) !== String(effectiveBranchId)) {
        return res.status(400).json({ error: `Table ${num} belongs to a different branch.` });
      }
      resolvedTableNumber = num;
      // Do NOT mark table occupied before order is created!
    }

    // 4. Customer details normalization
    const customerPhone = normalizePhoneNumber(rawCustomer.phone || '9999999999') || '9999999999';
    const customerName = String(rawCustomer.name || 'Walk-in Customer').trim().slice(0, 100);
    const customerEmail = String(rawCustomer.email || '').trim().toLowerCase().slice(0, 150);

    // 5. Pricing, discount, coupon, and GST calculation via shared pricing engine
    const pricing = await calculateOrderPricing({
      items: rawItems,
      tenant: req.tenant,
      tenantId: req.tenantId,
      customerGstin,
      manualDiscount,
      discountReason,
      couponCode: rawCoupon,
      actor: req.user,
      managerApproval,
    });

    const {
      validatedItems,
      subtotal,
      discount,
      discountDetails,
      coupon,
      cleanCoupon,
      taxableAmount,
      taxRate,
      tax,
      total,
      gstBreakdown,
      currency,
    } = pricing;

    // 6. Pre-check inventory
    const inventoryErrors = await validateInventoryForOrder(validatedItems);
    if (inventoryErrors.length > 0) {
      return res.status(409).json({
        error: 'Insufficient inventory for some items.',
        code: 'INVENTORY_INSUFFICIENT',
        details: inventoryErrors,
      });
    }

    // 7. Payment validation & cashier attestation
    const validPaymentMethods = ['cash', 'upi', 'card', 'split', 'razorpay'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `Invalid payment method: ${paymentMethod}` });
    }

    let isPaid = false;
    let paymentStatus = 'pending';
    let orderStatus = 'pending';
    let cashVerificationStatus = 'not_required';
    let cashierAttestation = null;
    let externalTerminalAttestation = null;
    let splitSettlement = null;

    if (paymentMethod === 'cash') {
      // Authenticated cashier confirms cash received
      isPaid = true;
      paymentStatus = 'paid';
      cashVerificationStatus = 'confirmed';
      orderStatus = 'completed';

      const numTendered = (tenderedAmount !== null && tenderedAmount !== undefined)
        ? Number(tenderedAmount)
        : total;
      if (Number.isFinite(numTendered) && numTendered < total) {
        return res.status(400).json({
          error: `Tendered amount (₹${numTendered}) cannot be less than order total (₹${total}).`,
        });
      }
      const changeAmount = Number.isFinite(numTendered)
        ? Number(Math.max(0, numTendered - total).toFixed(2))
        : 0;

      cashierAttestation = {
        attestedBy: req.user._id,
        attestedByName: req.user.name,
        attestedAt: new Date(),
        tenderedAmount: Number.isFinite(numTendered) ? numTendered : total,
        changeAmount,
      };
    } else if (paymentMethod === 'upi' || paymentMethod === 'card') {
      // External POS terminal settlement
      isPaid = true;
      paymentStatus = 'paid';
      cashVerificationStatus = 'not_required';
      orderStatus = 'completed';
      const reference = String(
        externalPaymentReference || req.body?.reference || `POS-${paymentMethod.toUpperCase()}-${Date.now()}`
      ).trim().slice(0, 100);

      externalTerminalAttestation = {
        attestedBy: req.user._id,
        attestedByName: req.user.name,
        attestedAt: new Date(),
        method: paymentMethod,
        reference,
        verifiedBy: 'cashier_terminal_attestation',
      };
    } else if (paymentMethod === 'split') {
      // Split payments validation
      if (!Array.isArray(splitPayments) || splitPayments.length < 2) {
        return res.status(400).json({ error: 'Split payments must include at least two payment components.' });
      }

      let splitSum = 0;
      for (const split of splitPayments) {
        if (!split || typeof split !== 'object') {
          return res.status(400).json({ error: 'Invalid split payment component.' });
        }
        if (!['cash', 'upi', 'card'].includes(split.method)) {
          return res.status(400).json({ error: `Unsupported split payment method: ${split.method}` });
        }
        const amt = Number(split.amount);
        if (!Number.isFinite(amt) || amt <= 0) {
          return res.status(400).json({ error: 'Each split payment amount must be greater than zero.' });
        }
        splitSum = Number((splitSum + amt).toFixed(2));
      }

      if (Math.abs(splitSum - total) > 0.05) {
        return res.status(400).json({
          error: `Split payment total (₹${splitSum}) does not match amount due (₹${total}).`,
          details: { splitSum, orderTotal: total },
        });
      }

      isPaid = true;
      paymentStatus = 'paid';
      cashVerificationStatus = splitPayments.some(s => s.method === 'cash') ? 'confirmed' : 'not_required';
      orderStatus = 'completed';
      splitSettlement = {
        settledBy: req.user._id,
        settledByName: req.user.name,
        settledAt: new Date(),
        splits: splitPayments,
      };
    } else if (paymentMethod === 'razorpay') {
      // Integrated gateway: cannot mark paid at POS creation; awaits webhook/verification
      isPaid = false;
      paymentStatus = 'pending';
      orderStatus = 'pending';
    }

    // 8. Generate GST invoice number if paid
    let invoiceNumber = '';
    let invoiceDate = null;
    if (isPaid) {
      const prefix = req.tenant?.settings?.gstSettings?.invoicePrefix || 'INV';
      invoiceNumber = await getNextInvoiceNumber(req.tenantId, prefix);
      invoiceDate = new Date();
    }

    // 9. Receipt access token
    const accessToken = generateOrderAccessToken();
    const accessTokenHash = hashAccessToken(accessToken);

    // 10. Create Order in MongoDB
    let order;
    const orderDocPayload = {
      tenantId: req.tenantId,
      branchId: effectiveBranchId,
      orderType,
      tableNumber: resolvedTableNumber,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        marketingConsent: Boolean(rawCustomer.marketingConsent),
      },
      items: validatedItems.map(item => ({
        product: item.product,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || '',
        addons: item.addons || [],
        variant: item.variant || null,
        specialInstructions: item.specialInstructions || '',
        itemTotal: item.itemTotal,
      })),
      subtotal,
      discount,
      discountDetails,
      couponCode: cleanCoupon || '',
      tax,
      total,
      taxRate,
      currency,
      gstDetails: {
        invoiceNumber,
        invoiceDate,
        customerGstin,
        cgst: gstBreakdown.cgst,
        sgst: gstBreakdown.sgst,
        igst: gstBreakdown.igst,
        taxableAmount,
      },
      paymentMethod,
      splitPayments: Array.isArray(splitPayments) ? splitPayments : [],
      paymentStatus,
      paymentVerifiedAt: isPaid ? new Date() : null,
      cashVerificationStatus,
      orderStatus,
      inventoryProcessed: false,
      inventoryProcessingStatus: 'pending',
      statusHistory: [{
        status: orderStatus,
        changedAt: new Date(),
        changedBy: req.user?._id,
        reason: isPaid ? `POS settlement via ${paymentMethod.toUpperCase()}` : 'POS order placed',
      }],
      notes: String(notes || '').trim().slice(0, 500),
      posMetadata: {
        cashierId: req.user?._id,
        cashierName: req.user?.name,
        station,
        offlineSynced: Boolean(syncId),
        offlineSyncId: syncId || '',
        idempotencyKey: idempotencyKey || '',
        isHeld: false,
        cashierAttestation,
        externalTerminalAttestation,
        splitSettlement,
      },
      accessTokenHash,
    };

    await withMongoTransaction(
      async (session) => {
        const created = await Order.create([orderDocPayload], { session });
        order = created[0];

        if (customerPhone && customerPhone !== '9999999999') {
          await Customer.findOneAndUpdate(
            { phone: customerPhone },
            {
              $setOnInsert: { firstOrderAt: new Date(), status: 'active' },
              $set: { name: customerName, email: customerEmail, lastOrderAt: new Date() },
              $inc: { totalOrders: 1, totalSpent: isPaid ? total : 0 },
            },
            { upsert: true, session }
          );
        }
      },
      async () => {
        order = await Order.create(orderDocPayload);
        if (customerPhone && customerPhone !== '9999999999') {
          await Customer.findOneAndUpdate(
            { phone: customerPhone },
            {
              $setOnInsert: { firstOrderAt: new Date(), status: 'active' },
              $set: { name: customerName, email: customerEmail, lastOrderAt: new Date() },
              $inc: { totalOrders: 1, totalSpent: isPaid ? total : 0 },
            },
            { upsert: true }
          );
        }
      }
    );

    // Atomically claim coupon if used
    if (coupon) {
      await claimCoupon(coupon).catch(() => {});
    }

    // 11. Deduct Inventory & Award Loyalty if order is paid
    if (isPaid) {
      try {
        await confirmOrderAndDeduct(order, { performedBy: req.user?._id });
        order.inventoryProcessed = true;
        order.inventoryProcessingStatus = 'processed';
        order.inventoryProcessedAt = new Date();
        await awardLoyaltyPoints(order._id);
      } catch (stockErr) {
        console.error('[POS] Stock deduction error for order:', order.orderNumber, stockErr.message);
        // Preserve order as confirmed sale, but mark inventory processing as failed
        await Order.updateOne(
          { _id: order._id, tenantId: req.tenantId },
          {
            $set: {
              inventoryProcessed: false,
              inventoryProcessingStatus: 'failed',
              inventoryError: {
                message: stockErr.message,
                code: stockErr.code || 'INSUFFICIENT_STOCK',
                failedAt: new Date(),
                details: stockErr.details || null,
              },
            },
          }
        );
        order.inventoryProcessed = false;
        order.inventoryProcessingStatus = 'failed';
        order.inventoryError = {
          message: stockErr.message,
          code: stockErr.code || 'INSUFFICIENT_STOCK',
          failedAt: new Date(),
        };

        await writeAuditLog({
          actor: req.user,
          action: 'inventory.deduction_failed',
          targetType: 'Order',
          targetId: order._id,
          details: { orderNumber: order.orderNumber, error: stockErr.message, code: stockErr.code },
          req,
        }).catch(() => {});
      }

      // Record Payment and PaymentLedger entries
      try {
        const paymentRecord = await Payment.create([{
          orderId: order._id,
          tenantId: req.tenantId,
          idempotencyKey: idempotencyKey || `pos_pay_${order._id}`,
          provider: paymentMethod,
          amount: total,
          currency,
          status: 'captured',
          capturedAt: new Date(),
          ledger: [{
            eventType: 'payment_captured',
            amount: total,
            currency,
            gatewayTransactionId: externalTerminalAttestation?.reference || '',
            metadata: {
              settledBy: req.user?._id,
              method: paymentMethod,
              splits: splitPayments,
            },
            timestamp: new Date(),
          }],
        }]);

        await PaymentLedger.create([{
          tenantId: req.tenantId,
          paymentId: paymentRecord[0]?._id,
          orderId: order._id,
          eventType: 'payment_captured',
          amount: total,
          currency,
          gatewayTransactionId: externalTerminalAttestation?.reference || '',
          reason: `POS ${paymentMethod.toUpperCase()} settlement`,
          metadata: { settledBy: req.user?._id },
          recordedAt: new Date(),
        }]);
      } catch (payErr) {
        console.warn('[POS] Payment record ledger warning:', payErr.message);
      }
    }

    // 12. Sync Table status AFTER successful order creation
    if (orderType === 'dine_in' && resolvedTableNumber) {
      await syncTableStatusForOrder(resolvedTableNumber, req.tenantId);
    }

    // 13. Audit Log
    await writeAuditLog({
      actor: req.user,
      action: isPaid ? 'pos.order_created_and_settled' : 'pos.order_created',
      targetType: 'Order',
      targetId: order._id,
      details: {
        orderNumber: order.orderNumber,
        total,
        paymentMethod,
        paymentStatus,
        discount,
        orderType,
      },
      req,
    }).catch(() => {});

    // 14. Live updates broadcast
    try {
      publishNewOrder(order);
    } catch (_err) {
      // Ignore broadcast errors
    }

    // 15. Prepare Receipt response
    const receipt = await createReceiptData({
      orders: [order],
      tableNumber: order.tableNumber,
      tenantSettings: req.tenant?.settings,
      receiptUrl: '',
    });

    return res.status(201).json({
      success: true,
      order,
      receipt,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/pos/orders/hold — Park / Hold an order (Role: Cashier, Manager, Owner)
router.post('/orders/hold', protect, cashiers, async (req, res, next) => {
  try {
    const {
      tableNumber = 0,
      orderType = 'counter',
      customer = {},
      items: rawItems,
      notes = '',
      manualDiscount = 0,
    } = req.body || {};

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Order must contain items to hold.' });
    }

    const pricing = await calculateOrderPricing({
      items: rawItems,
      tenant: req.tenant,
      tenantId: req.tenantId,
      manualDiscount,
      actor: req.user,
    });

    const accessToken = generateOrderAccessToken();
    const accessTokenHash = hashAccessToken(accessToken);

    const order = await Order.create({
      tenantId: req.tenantId,
      orderType,
      tableNumber: Number(tableNumber) || 0,
      customer: {
        name: customer.name || 'Walk-in Customer',
        phone: customer.phone || '',
      },
      items: pricing.validatedItems,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      tax: pricing.tax,
      total: pricing.total,
      taxRate: pricing.taxRate,
      currency: pricing.currency,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      orderStatus: 'held',
      inventoryProcessed: false,
      inventoryProcessingStatus: 'pending',
      notes: String(notes || '').trim().slice(0, 500),
      posMetadata: {
        cashierId: req.user?._id,
        isHeld: true,
        heldAt: new Date(),
      },
      accessTokenHash,
    });

    return res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

// GET /api/pos/held-orders — Retrieve all held orders scoped to tenant
router.get('/held-orders', protect, cashiers, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const filter = { orderStatus: 'held', tenantId: req.tenantId };
    const [heldOrders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      orders: heldOrders,
      pagination: formatPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/pos/held-orders/:id — Delete or dismiss a held order scoped to tenant
router.delete('/held-orders/:id', protect, cashiers, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId, orderStatus: 'held' });
    if (!order) {
      return res.status(404).json({ error: 'Held order not found.' });
    }
    await Order.deleteOne({ _id: order._id, tenantId: req.tenantId });
    return res.json({ success: true, message: 'Held order cleared.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/pos/orders/:id/pay — Pay & complete an existing order (Role: Cashier, Manager, Owner)
router.post('/orders/:id/pay', protect, cashiers, async (req, res, next) => {
  try {
    const {
      paymentMethod = 'cash',
      splitPayments = [],
      tenderedAmount = null,
      externalPaymentReference = '',
    } = req.body || {};

    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, order, alreadyPaid: true });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ error: 'Cannot settle a cancelled order.' });
    }

    const validPaymentMethods = ['cash', 'upi', 'card', 'split'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `Invalid payment method: ${paymentMethod}` });
    }

    let cashierAttestation = null;
    let externalTerminalAttestation = null;
    let splitSettlement = null;
    let cashVerificationStatus = 'not_required';

    if (paymentMethod === 'cash') {
      cashVerificationStatus = 'confirmed';
      const numTendered = (tenderedAmount !== null && tenderedAmount !== undefined)
        ? Number(tenderedAmount)
        : order.total;
      if (Number.isFinite(numTendered) && numTendered < order.total) {
        return res.status(400).json({
          error: `Tendered amount (₹${numTendered}) cannot be less than order total (₹${order.total}).`,
        });
      }
      const changeAmount = Number.isFinite(numTendered)
        ? Number(Math.max(0, numTendered - order.total).toFixed(2))
        : 0;

      cashierAttestation = {
        attestedBy: req.user._id,
        attestedByName: req.user.name,
        attestedAt: new Date(),
        tenderedAmount: Number.isFinite(numTendered) ? numTendered : order.total,
        changeAmount,
      };
    } else if (paymentMethod === 'upi' || paymentMethod === 'card') {
      const reference = String(
        externalPaymentReference || req.body?.reference || `POS-${paymentMethod.toUpperCase()}-${Date.now()}`
      ).trim().slice(0, 100);

      externalTerminalAttestation = {
        attestedBy: req.user._id,
        attestedByName: req.user.name,
        attestedAt: new Date(),
        method: paymentMethod,
        reference,
        verifiedBy: 'cashier_terminal_attestation',
      };
    } else if (paymentMethod === 'split') {
      if (!Array.isArray(splitPayments) || splitPayments.length < 2) {
        return res.status(400).json({ error: 'Split payments must include at least two payment components.' });
      }
      let splitSum = 0;
      for (const split of splitPayments) {
        if (!split || typeof split !== 'object') {
          return res.status(400).json({ error: 'Invalid split payment component.' });
        }
        if (!['cash', 'upi', 'card'].includes(split.method)) {
          return res.status(400).json({ error: `Unsupported split payment method: ${split.method}` });
        }
        const amt = Number(split.amount);
        if (!Number.isFinite(amt) || amt <= 0) {
          return res.status(400).json({ error: 'Each split payment amount must be greater than zero.' });
        }
        splitSum = Number((splitSum + amt).toFixed(2));
      }

      if (Math.abs(splitSum - order.total) > 0.05) {
        return res.status(400).json({
          error: `Split payment total (₹${splitSum}) does not match order total (₹${order.total}).`,
        });
      }
      cashVerificationStatus = splitPayments.some(s => s.method === 'cash') ? 'confirmed' : 'not_required';
      splitSettlement = {
        settledBy: req.user._id,
        settledByName: req.user.name,
        settledAt: new Date(),
        splits: splitPayments,
      };
    }

    let invoiceNumber = order.gstDetails?.invoiceNumber;
    let invoiceDate = order.gstDetails?.invoiceDate;
    if (!invoiceNumber) {
      const prefix = req.tenant?.settings?.gstSettings?.invoicePrefix || 'INV';
      invoiceNumber = await getNextInvoiceNumber(req.tenantId, prefix);
      invoiceDate = new Date();
    }

    await Order.updateOne(
      { _id: order._id, tenantId: req.tenantId, paymentStatus: { $ne: 'paid' } },
      {
        $set: {
          paymentMethod,
          splitPayments: Array.isArray(splitPayments) && splitPayments.length > 0 ? splitPayments : order.splitPayments,
          paymentStatus: 'paid',
          paymentVerifiedAt: new Date(),
          orderStatus: 'completed',
          cashVerificationStatus,
          'gstDetails.invoiceNumber': invoiceNumber,
          'gstDetails.invoiceDate': invoiceDate,
          'posMetadata.settledBy': req.user._id,
          'posMetadata.settledAt': new Date(),
          'posMetadata.cashierAttestation': cashierAttestation,
          'posMetadata.externalTerminalAttestation': externalTerminalAttestation,
          'posMetadata.splitSettlement': splitSettlement,
        },
        $push: {
          statusHistory: {
            status: 'completed',
            previousStatus: order.orderStatus,
            changedAt: new Date(),
            changedBy: req.user?._id,
            reason: `POS payment completed via ${paymentMethod.toUpperCase()}`,
          },
        },
      }
    );

    const updatedOrder = await Order.findOne({ _id: order._id, tenantId: req.tenantId });

    // Deduct inventory & award loyalty
    try {
      await confirmOrderAndDeduct(updatedOrder, { performedBy: req.user?._id });
      updatedOrder.inventoryProcessed = true;
      updatedOrder.inventoryProcessingStatus = 'processed';
      updatedOrder.inventoryProcessedAt = new Date();
      await awardLoyaltyPoints(updatedOrder._id);
    } catch (stockErr) {
      console.error('[POS] Stock deduction error on payment:', updatedOrder.orderNumber, stockErr.message);
      await Order.updateOne(
        { _id: updatedOrder._id, tenantId: req.tenantId },
        {
          $set: {
            inventoryProcessed: false,
            inventoryProcessingStatus: 'failed',
            inventoryError: {
              message: stockErr.message,
              code: stockErr.code || 'INSUFFICIENT_STOCK',
              failedAt: new Date(),
            },
          },
        }
      );
      updatedOrder.inventoryProcessingStatus = 'failed';
    }

    // Record Payment and PaymentLedger
    try {
      await Payment.create([{
        orderId: updatedOrder._id,
        tenantId: req.tenantId,
        idempotencyKey: `pos_settle_${updatedOrder._id}`,
        provider: paymentMethod,
        amount: updatedOrder.total,
        currency: updatedOrder.currency || 'INR',
        status: 'captured',
        capturedAt: new Date(),
        ledger: [{
          eventType: 'payment_captured',
          amount: updatedOrder.total,
          currency: updatedOrder.currency || 'INR',
          gatewayTransactionId: externalTerminalAttestation?.reference || '',
          metadata: { settledBy: req.user?._id, method: paymentMethod },
          timestamp: new Date(),
        }],
      }]);

      await PaymentLedger.create([{
        tenantId: req.tenantId,
        paymentId: new mongoose.Types.ObjectId(),
        orderId: updatedOrder._id,
        eventType: 'payment_captured',
        amount: updatedOrder.total,
        currency: updatedOrder.currency || 'INR',
        gatewayTransactionId: externalTerminalAttestation?.reference || '',
        reason: `POS ${paymentMethod.toUpperCase()} settlement`,
        metadata: { settledBy: req.user?._id },
        recordedAt: new Date(),
      }]);
    } catch (payErr) {
      console.warn('[POS] Payment record ledger warning on /pay:', payErr.message);
    }

    if (updatedOrder.tableNumber > 0) {
      await syncTableStatusForOrder(updatedOrder.tableNumber, req.tenantId);
    }

    await writeAuditLog({
      actor: req.user,
      action: 'pos.order_settled',
      targetType: 'Order',
      targetId: updatedOrder._id,
      details: {
        orderNumber: updatedOrder.orderNumber,
        total: updatedOrder.total,
        paymentMethod,
      },
      req,
    }).catch(() => {});

    try {
      publishOrderUpdate(updatedOrder);
    } catch (_err) {
      // SSE broadcast failure ignored
    }

    const receipt = await createReceiptData({
      orders: [updatedOrder],
      tableNumber: updatedOrder.tableNumber,
      tenantSettings: req.tenant?.settings,
    });

    return res.json({ success: true, order: updatedOrder, receipt });
  } catch (error) {
    next(error);
  }
});

// POST /api/pos/orders/:id/retry-inventory — Reconcile & retry failed stock deduction (Role: Manager, Owner)
router.post('/orders/:id/retry-inventory', protect, ownerOrManager, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.inventoryProcessed && order.inventoryProcessingStatus === 'processed') {
      return res.json({ success: true, alreadyProcessed: true, message: 'Inventory was already processed for this order.', order });
    }

    try {
      await confirmOrderAndDeduct(order, { performedBy: req.user._id });
      await Order.updateOne(
        { _id: order._id, tenantId: req.tenantId },
        {
          $set: {
            inventoryProcessed: true,
            inventoryProcessingStatus: 'processed',
            inventoryProcessedAt: new Date(),
            inventoryError: null,
          },
        }
      );

      await writeAuditLog({
        actor: req.user,
        action: 'inventory.retry_succeeded',
        targetType: 'Order',
        targetId: order._id,
        details: { orderNumber: order.orderNumber },
        req,
      }).catch(() => {});

      const updated = await Order.findOne({ _id: order._id, tenantId: req.tenantId });
      return res.json({ success: true, message: 'Stock deduction successfully reconciled.', order: updated });
    } catch (stockErr) {
      await Order.updateOne(
        { _id: order._id, tenantId: req.tenantId },
        {
          $set: {
            inventoryProcessed: false,
            inventoryProcessingStatus: 'failed',
            inventoryError: {
              message: stockErr.message,
              code: stockErr.code || 'INSUFFICIENT_STOCK',
              failedAt: new Date(),
            },
          },
        }
      );
      return res.status(400).json({
        error: `Inventory deduction failed: ${stockErr.message}`,
        code: stockErr.code || 'INSUFFICIENT_STOCK',
        details: stockErr.details,
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/pos/sync — Bulk Sync for Offline Orders from IndexedDB (Role: Cashier, Manager, Owner)
router.post('/sync', protect, cashiers, async (req, res, next) => {
  try {
    const { orders = [] } = req.body || {};
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Orders payload must be an array.' });
    }

    if (orders.length > 50) {
      return res.status(400).json({ error: 'Sync batch size cannot exceed 50 orders per request.' });
    }

    if (orders.length === 0) {
      return res.json({ success: true, synced: [], failed: [] });
    }

    const synced = [];
    const failed = [];

    for (const item of orders) {
      const syncId = item.syncId || item.idempotencyKey;
      if (!syncId || typeof syncId !== 'string') {
        failed.push({
          syncId: 'unknown',
          code: 'MISSING_SYNC_ID',
          error: 'Missing or invalid syncId.',
        });
        continue;
      }

      try {
        // Scoped idempotency lookup by authenticated tenant
        const existing = await Order.findOne({
          tenantId: req.tenantId,
          $or: [
            { 'posMetadata.offlineSyncId': syncId },
            { idempotencyKey: syncId },
          ],
        });

        if (existing) {
          synced.push({
            syncId,
            orderId: existing._id,
            orderNumber: existing.orderNumber,
            alreadySynced: true,
            status: existing.orderStatus,
            paymentStatus: existing.paymentStatus,
          });
          continue;
        }

        // Validate items presence
        if (!Array.isArray(item.items) || item.items.length === 0) {
          failed.push({
            syncId,
            code: 'EMPTY_ITEMS',
            error: 'Order must contain at least one item.',
          });
          continue;
        }

        // Recalculate price, tax, discount, coupon using shared pricing engine
        const pricing = await calculateOrderPricing({
          items: item.items,
          tenant: req.tenant,
          tenantId: req.tenantId,
          customerGstin: item.customerGstin || '',
          manualDiscount: item.manualDiscount || item.discount || 0,
          discountReason: item.discountReason || 'Offline Order Discount',
          couponCode: item.couponCode || '',
          actor: req.user,
        });

        const {
          validatedItems,
          subtotal,
          discount,
          discountDetails,
          cleanCoupon,
          taxableAmount,
          taxRate,
          tax,
          total,
          gstBreakdown,
          currency,
        } = pricing;

        // Resolve table if dine_in
        let resolvedTableNumber = 0;
        if (item.orderType === 'dine_in') {
          const num = Number(item.tableNumber);
          if (Number.isInteger(num) && num > 0) {
            const tableDoc = await Table.findOne({ tableNumber: num, tenantId: req.tenantId, active: true });
            if (tableDoc && tableDoc.status !== 'DISABLED') {
              resolvedTableNumber = num;
            }
          }
        }

        // Offline payment handling:
        // Electronic payments (UPI, Card, Razorpay) offline are NOT independently verified;
        // they must require terminal reconciliation.
        // Cash payment requires cashier attestation or drawer reconciliation.
        let paymentStatus = 'pending';
        let cashVerificationStatus = 'not_required';
        let reconciliationRequired = false;
        let reconciliationReason = '';
        let invoiceNumber = '';
        let invoiceDate = null;

        const intendedMethod = ['cash', 'upi', 'card', 'split'].includes(item.paymentMethod)
          ? item.paymentMethod
          : 'cash';

        if (intendedMethod === 'cash') {
          // If cashier explicitly attested cash collection offline
          const isAttested = item.cashierAttestation?.confirmed || Boolean(item.cashierId) || Boolean(req.user?._id);
          if (isAttested) {
            paymentStatus = 'paid';
            cashVerificationStatus = 'confirmed';
            reconciliationRequired = false;
            const prefix = req.tenant?.settings?.gstSettings?.invoicePrefix || 'INV';
            invoiceNumber = await getNextInvoiceNumber(req.tenantId, prefix);
            invoiceDate = new Date();
          } else {
            paymentStatus = 'pending';
            cashVerificationStatus = 'pending';
            reconciliationRequired = true;
            reconciliationReason = 'Offline cash collection requires drawer reconciliation';
          }
        } else {
          // Electronic UPI / Card / Gateway offline
          paymentStatus = 'pending';
          reconciliationRequired = true;
          reconciliationReason = `Offline ${intendedMethod.toUpperCase()} requires terminal settlement confirmation`;
        }

        const accessToken = generateOrderAccessToken();
        const accessTokenHash = hashAccessToken(accessToken);

        const order = await Order.create({
          tenantId: req.tenantId,
          orderType: item.orderType || 'counter',
          tableNumber: resolvedTableNumber,
          customer: {
            name: String(item.customer?.name || 'Walk-in Customer').trim().slice(0, 100),
            phone: normalizePhoneNumber(item.customer?.phone || '9999999999') || '9999999999',
            email: String(item.customer?.email || '').trim().toLowerCase().slice(0, 150),
          },
          items: validatedItems,
          subtotal,
          discount,
          discountDetails,
          couponCode: cleanCoupon || '',
          tax,
          total,
          taxRate,
          currency,
          gstDetails: {
            invoiceNumber,
            invoiceDate,
            customerGstin: String(item.customerGstin || '').trim().toUpperCase(),
            cgst: gstBreakdown.cgst,
            sgst: gstBreakdown.sgst,
            igst: gstBreakdown.igst,
            taxableAmount,
          },
          paymentMethod: intendedMethod,
          paymentStatus,
          cashVerificationStatus,
          orderStatus: paymentStatus === 'paid' ? 'completed' : 'confirmed',
          inventoryProcessed: false,
          inventoryProcessingStatus: 'pending',
          paymentReconciliationStatus: reconciliationRequired ? 'reconciliation_required' : 'not_required',
          reconciliationNotes: reconciliationReason,
          posMetadata: {
            cashierId: req.user?._id,
            cashierName: req.user?.name,
            offlineSynced: true,
            offlineSyncId: syncId,
            reconciliationRequired,
            reconciliationReason,
          },
          accessTokenHash,
        });

        // Deduct inventory if marked paid
        if (paymentStatus === 'paid') {
          try {
            await confirmOrderAndDeduct(order, { performedBy: req.user?._id });
            order.inventoryProcessed = true;
            order.inventoryProcessingStatus = 'processed';
            order.inventoryProcessedAt = new Date();
          } catch (stockErr) {
            console.error('[POS Sync] Stock deduction error:', order.orderNumber, stockErr.message);
            await Order.updateOne(
              { _id: order._id, tenantId: req.tenantId },
              {
                $set: {
                  inventoryProcessed: false,
                  inventoryProcessingStatus: 'failed',
                  inventoryError: {
                    message: stockErr.message,
                    code: stockErr.code || 'INSUFFICIENT_STOCK',
                    failedAt: new Date(),
                  },
                },
              }
            );
          }
        }

        if (order.tableNumber > 0) {
          await syncTableStatusForOrder(order.tableNumber, req.tenantId).catch(() => {});
        }

        await writeAuditLog({
          actor: req.user,
          action: 'pos.offline_order_synced',
          targetType: 'Order',
          targetId: order._id,
          details: {
            syncId,
            orderNumber: order.orderNumber,
            total,
            paymentStatus,
            reconciliationRequired,
          },
          req,
        }).catch(() => {});

        synced.push({
          syncId,
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          reconciliationRequired,
        });
      } catch (err) {
        // Return safe error response without echoing sensitive customer or internal data
        failed.push({
          syncId,
          code: err.code || 'SYNC_ERROR',
          error: err.message || 'Failed to synchronize offline order.',
        });
      }
    }

    return res.json({ success: true, synced, failed });
  } catch (error) {
    next(error);
  }
});

// GET /api/pos/recent — Recent POS Orders scoped to tenant
router.get('/recent', protect, cashiers, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req, 20, 100);
    const filter = { tenantId: req.tenantId };
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      orders,
      pagination: formatPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
