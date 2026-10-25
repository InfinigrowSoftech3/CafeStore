import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import RedisMock from 'ioredis-mock';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || `mongodb://127.0.0.1:27017/cafe_phase3_qr_webhook_${process.pid}`;
process.env.JWT_SECRET ||= 'phase3-qr-webhook-test-jwt-secret-min32chars';
process.env.TABLE_QR_SECRET ||= 'phase3-qr-webhook-table-qr-signing-secret-32';
process.env.RAZORPAY_WEBHOOK_SECRET ||= 'test-platform-webhook-secret-min32chars';
process.env.CLIENT_URL ||= 'https://client-seven-sigma-26.vercel.app';
process.env.CUSTOMER_APP_URL ||= 'https://client-seven-sigma-26.vercel.app';

const { createApp } = await import('../index.js');
const { setRedisClient, closeRedis } = await import('../config/redis.js');
import Tenant from '../models/Tenant.js';
import Table from '../models/Table.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import BillingWebhookEvent from '../models/BillingWebhookEvent.js';
import { createTableQrToken } from '../utils/tableQr.js';
import { runWithTenant, runWithSystemTenantAccess } from '../utils/tenantContext.js';

test('PHASE 3 & 4: QR Table Resolution & Webhook Signature Hardening', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  setRedisClient(new RedisMock());

  const app = createApp();
  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeRedis();
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
      } catch { /* ignore */ }
    }
  });

  // Setup Seed Data: Two independent cafés (Cafe Alpha & Cafe Beta)
  let cafeAlpha;
  let cafeBeta;
  let inactiveCafe;
  let tableAlpha1;
  let tableAlphaInactive;
  let tableBeta1;
  let productAlpha;

  await runWithSystemTenantAccess(async () => {
    await Tenant.deleteMany({ slug: { $in: ['alpha-cafe', 'beta-cafe', 'inactive-cafe'] } });
    await BillingWebhookEvent.deleteMany({});

    cafeAlpha = await Tenant.create({
      name: 'Cafe Alpha',
      slug: 'alpha-cafe',
      status: 'active',
      razorpayWebhookSecret: 'tenant-alpha-custom-webhook-secret',
    });

    cafeBeta = await Tenant.create({
      name: 'Cafe Beta',
      slug: 'beta-cafe',
      status: 'active',
    });

    inactiveCafe = await Tenant.create({
      name: 'Inactive Cafe',
      slug: 'inactive-cafe',
      status: 'suspended',
    });
  });

  await runWithTenant(cafeAlpha._id, async () => {
    await Table.deleteMany({ tenantId: cafeAlpha._id });
    await Category.deleteMany({ tenantId: cafeAlpha._id });
    await Product.deleteMany({ tenantId: cafeAlpha._id });
    await Order.deleteMany({ tenantId: cafeAlpha._id });

    tableAlpha1 = await Table.create({
      tenantId: cafeAlpha._id,
      tableNumber: 1,
      label: 'Window Table 1',
      active: true,
    });

    tableAlphaInactive = await Table.create({
      tenantId: cafeAlpha._id,
      tableNumber: 2,
      label: 'Inactive Table 2',
      active: false,
    });

    const category = await Category.create({
      tenantId: cafeAlpha._id,
      name: 'Coffee',
    });

    productAlpha = await Product.create({
      tenantId: cafeAlpha._id,
      name: 'Alpha Espresso',
      price: 120,
      category: category._id,
      available: true,
    });
  });

  await runWithTenant(cafeBeta._id, async () => {
    await Table.deleteMany({ tenantId: cafeBeta._id });
    tableBeta1 = await Table.create({
      tenantId: cafeBeta._id,
      tableNumber: 1,
      label: 'Beta Table 1',
      active: true,
    });
  });

  const request = async (path, options = {}) => {
    const headers = {
      ...(options.headers || {}),
    };
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body,
    });
    let data = null;
    try {
      data = await res.json();
    } catch { /* non-json */ }
    return { status: res.status, data };
  };

  // ── TEST 1: Valid Signed QR Token Resolves Successfully ────────────────────
  await t.test('1. Valid signed QR token resolves strictly to intended cafe and table', async () => {
    const validToken = createTableQrToken(tableAlpha1._id, cafeAlpha._id);
    const res = await request(`/api/public/cafes/resolve?token=${encodeURIComponent(validToken)}`);

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.cafe.id, String(cafeAlpha._id));
    assert.equal(res.data.data.cafe.slug, 'alpha-cafe');
    assert.equal(res.data.data.table.id, String(tableAlpha1._id));
    assert.equal(res.data.data.table.number, 1);
    assert.equal(res.data.data.qr.token, validToken);
  });

  // ── TEST 2: Expired QR Token Returns 410 QR_EXPIRED ────────────────────────
  await t.test('2. Expired QR token returns 410 QR_EXPIRED', async () => {
    const expiredTimestamp = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago
    const expiredToken = createTableQrToken(tableAlpha1._id, cafeAlpha._id, expiredTimestamp);
    const res = await request(`/api/public/cafes/resolve?token=${encodeURIComponent(expiredToken)}`);

    assert.equal(res.status, 410);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'QR_EXPIRED');
  });

  // ── TEST 3: Tampered QR Token Returns 404 QR_NOT_FOUND ─────────────────────
  await t.test('3. Tampered or malformed QR token returns 404 QR_NOT_FOUND', async () => {
    const validToken = createTableQrToken(tableAlpha1._id, cafeAlpha._id);
    const tamperedToken = `${validToken.slice(0, -2)}xx`;
    const res = await request(`/api/public/cafes/resolve?token=${encodeURIComponent(tamperedToken)}`);

    assert.equal(res.status, 404);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'QR_NOT_FOUND');
  });

  // ── TEST 4: Invalid Token with Fallback Params NEVER Falls Through ─────────
  await t.test('4. Invalid QR token with fallback query params must NEVER fall through to slug resolution', async () => {
    const res = await request(`/api/public/cafes/resolve?token=invalid_tampered_token&cafeSlug=alpha-cafe&tableSlug=1`);

    assert.equal(res.status, 404);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'QR_NOT_FOUND');
    // Ensure it did not fall through and return 200 with alpha-cafe
    assert.equal(res.data.data, undefined);
  });

  // ── TEST 5: Missing Token and Missing Table Returns 404 TABLE_NOT_FOUND ────
  await t.test('5. Missing table identifier must NEVER select first active table as fallback', async () => {
    const res = await request(`/api/public/cafes/resolve?cafeSlug=alpha-cafe`);

    assert.equal(res.status, 404);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'TABLE_NOT_FOUND');
    assert.equal(res.data.data, undefined);
  });

  // ── TEST 6: Invalid Cafe Slug Returns 404 CAFE_NOT_FOUND ───────────────────
  await t.test('6. Invalid cafe slug returns 404 CAFE_NOT_FOUND without default cafe fallback', async () => {
    const res = await request(`/api/public/cafes/resolve?cafeSlug=non-existent-cafe-slug&tableSlug=1`);

    assert.equal(res.status, 404);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'CAFE_NOT_FOUND');
  });

  // ── TEST 7: Cross-Tenant Table Returns 409 TABLE_CAFE_MISMATCH ─────────────
  await t.test('7. Table from another cafe returns 409 TABLE_CAFE_MISMATCH', async () => {
    const res = await request(`/api/public/cafes/resolve?cafeSlug=alpha-cafe&tableSlug=${tableBeta1._id}`);

    assert.equal(res.status, 409);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'TABLE_CAFE_MISMATCH');
  });

  // ── TEST 8: Inactive Table Returns 410 QR_EXPIRED ──────────────────────────
  await t.test('8. Inactive table returns 410 QR_EXPIRED', async () => {
    const inactiveTableToken = createTableQrToken(tableAlphaInactive._id, cafeAlpha._id);
    const res = await request(`/api/public/cafes/resolve?token=${encodeURIComponent(inactiveTableToken)}`);

    assert.equal(res.status, 410);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'QR_EXPIRED');
  });

  // ── TEST 9: Inactive Cafe Returns 410 QR_EXPIRED ───────────────────────────
  await t.test('9. Inactive or suspended cafe returns 410 QR_EXPIRED', async () => {
    let inactiveTable;
    await runWithTenant(inactiveCafe._id, async () => {
      inactiveTable = await Table.create({
        tenantId: inactiveCafe._id,
        tableNumber: 1,
        active: true,
      });
    });

    const inactiveCafeToken = createTableQrToken(inactiveTable._id, inactiveCafe._id);
    const res = await request(`/api/public/cafes/resolve?token=${encodeURIComponent(inactiveCafeToken)}`);

    assert.equal(res.status, 410);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'QR_EXPIRED');
  });

  // ── TEST 10: Public Order Creation after Valid QR Resolution ───────────────
  await t.test('10. Public order creation succeeds with verified QR context and valid items', async () => {
    const validToken = createTableQrToken(tableAlpha1._id, cafeAlpha._id);
    const orderRes = await request('/api/public/orders', {
      method: 'POST',
      headers: {
        'X-Cafe-ID': String(cafeAlpha._id),
        'X-QR-TOKEN': validToken,
      },
      body: {
        tableId: String(tableAlpha1._id),
        items: [{ productId: String(productAlpha._id), quantity: 2 }],
        customer: { name: 'Alice', phone: '9876543210' },
        paymentMethod: 'cash',
      },
    });

    assert.equal(orderRes.status, 201);
    assert.equal(orderRes.data.success, true);
    assert.equal(orderRes.data.data.order.cafeId, String(cafeAlpha._id));
    assert.equal(orderRes.data.data.order.status, 'PENDING');
    assert.equal(orderRes.data.data.order.total, 252); // 2 * 120 = 240 + 5% tax = 252
  });

  // ── TEST 11: Webhook Signature Verification with Valid Signature ───────────
  await t.test('11. Billing webhook with valid signature processes idempotently', async () => {
    const eventPayload = {
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: 'sub_test_alpha_123',
            notes: { tenantId: String(cafeAlpha._id) },
            current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          },
        },
      },
      created_at: 1729000000,
    };

    const rawBodyBuffer = Buffer.from(JSON.stringify(eventPayload), 'utf8');
    const secret = cafeAlpha.razorpayWebhookSecret;
    const signature = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('hex');

    const res = await request('/api/billing/webhook', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': 'evt_sub_test_1',
        'Content-Type': 'application/json',
      },
      body: rawBodyBuffer,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'processed');

    // Duplicate webhook delivery with same event ID must be safely ignored
    const duplicateRes = await request('/api/billing/webhook', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': 'evt_sub_test_1',
        'Content-Type': 'application/json',
      },
      body: rawBodyBuffer,
    });

    assert.equal(duplicateRes.status, 200);
    assert.equal(duplicateRes.data.status, 'ignored');
    assert.equal(duplicateRes.data.reason, 'duplicate_event');
  });

  // ── TEST 12: Webhook with Missing or Invalid Signature is Rejected ─────────
  await t.test('12. Billing webhook rejects missing, invalid, or altered payloads with 400', async () => {
    const eventPayload = {
      event: 'subscription.charged',
      payload: { subscription: { entity: { id: 'sub_test_alpha_123', notes: { tenantId: String(cafeAlpha._id) } } } },
    };
    const rawBodyBuffer = Buffer.from(JSON.stringify(eventPayload), 'utf8');

    // 1. Missing signature
    const missingSigRes = await request('/api/billing/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBodyBuffer,
    });
    assert.equal(missingSigRes.status, 400);

    // 2. Invalid signature
    const invalidSigRes = await request('/api/billing/webhook', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'invalid_signature_hex_value_here',
        'Content-Type': 'application/json',
      },
      body: rawBodyBuffer,
    });
    assert.equal(invalidSigRes.status, 400);

    // 3. Altered payload with signature generated for original
    const validSignature = crypto.createHmac('sha256', cafeAlpha.razorpayWebhookSecret).update(rawBodyBuffer).digest('hex');
    const alteredPayload = { ...eventPayload, tampered: true };
    const alteredBuffer = Buffer.from(JSON.stringify(alteredPayload), 'utf8');

    const alteredRes = await request('/api/billing/webhook', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': validSignature,
        'Content-Type': 'application/json',
      },
      body: alteredBuffer,
    });
    assert.equal(alteredRes.status, 400);
  });

  await t.test('13. Order creation rejects online payment method when online payments are disabled, but accepts cash', async () => {
    const origMode = process.env.PAYMENT_MODE;
    const origEnabled = process.env.PAYMENTS_ENABLED;
    process.env.PAYMENTS_ENABLED = 'false';
    process.env.PAYMENT_MODE = 'disabled';

    try {
      const validToken = createTableQrToken(tableAlpha1._id, cafeAlpha._id);
      // Online payment request must be rejected with 400 PAYMENTS_DISABLED
      const onlineRes = await request('/api/public/orders', {
        method: 'POST',
        headers: {
          'X-Cafe-ID': String(cafeAlpha._id),
          'X-QR-TOKEN': validToken,
        },
        body: {
          tableId: String(tableAlpha1._id),
          items: [{ productId: String(productAlpha._id), quantity: 1 }],
          customer: { name: 'Online Customer', phone: '9876543210' },
          paymentMethod: 'ONLINE',
        },
      });
      assert.equal(onlineRes.status, 400);
      assert.equal(onlineRes.data.error.code, 'PAYMENTS_DISABLED');

      // Cash payment request must succeed cleanly
      const cashRes = await request('/api/public/orders', {
        method: 'POST',
        headers: {
          'X-Cafe-ID': String(cafeAlpha._id),
          'X-QR-TOKEN': validToken,
        },
        body: {
          tableId: String(tableAlpha1._id),
          items: [{ productId: String(productAlpha._id), quantity: 1 }],
          customer: { name: 'Cash Customer', phone: '9876543210' },
          paymentMethod: 'cash',
        },
      });
      assert.equal(cashRes.status, 201);
      assert.equal(cashRes.data.success, true);
      assert.equal(cashRes.data.data.order.status, 'PENDING');
      assert.equal(cashRes.data.data.order.paymentStatus, 'PENDING');
    } finally {
      if (origMode !== undefined) process.env.PAYMENT_MODE = origMode;
      else delete process.env.PAYMENT_MODE;
      if (origEnabled !== undefined) process.env.PAYMENTS_ENABLED = origEnabled;
      else delete process.env.PAYMENTS_ENABLED;
    }
  });
});
