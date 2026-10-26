import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.TABLE_QR_SECRET = 'b'.repeat(32);
process.env.TENANT_CREDENTIALS_ENCRYPTION_KEY = 'c'.repeat(32);
process.env.SUPER_ADMIN_EMAIL = 'admin@infinigrowsoftech.com';
process.env.SUPER_ADMIN_PASSWORD = 'ProductionSecurePassword123!';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/cafe_prod_test';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.CLIENT_URL = 'https://cafe.infinigrowsoftech.com';
process.env.RAZORPAY_KEY_ID = 'rzp_live_testvalidkey123';
process.env.RAZORPAY_KEY_SECRET = 'live_testvalidsecret12345';
process.env.DISABLE_REDIS_PUBSUB = 'true';

import RedisMock from 'ioredis-mock';
import { setRedisClient } from '../config/redis.js';

setRedisClient(new RedisMock());

const { createApp } = await import('../index.js');

test('production API requires HTTPS and rejects origins outside the two-site allowlist', async (t) => {
  const server = createApp().listen(0);
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    const { closeRedis } = await import('../config/redis.js');
    await closeRedis();
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const plainHttp = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://cafe.infinigrowsoftech.com' },
  });
  assert.equal(plainHttp.status, 426);
  assert.equal((await plainHttp.json()).code, 'HTTPS_REQUIRED');

  const subdomainBypass = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://attacker.infinigrowsoftech.com', 'X-Forwarded-Proto': 'https' },
  });
  assert.equal(subdomainBypass.status, 403);

  const evilVercel = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://evil.vercel.app', 'X-Forwarded-Proto': 'https' },
  });
  assert.equal(evilVercel.status, 403);

  const superAdminOrigin = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://cafestore-superadmin.vercel.app', 'X-Forwarded-Proto': 'https' },
  });
  assert.equal(superAdminOrigin.status, 200);
  assert.equal(superAdminOrigin.headers.get('access-control-allow-origin'), 'https://cafestore-superadmin.vercel.app');

  const forwardedHttps = await fetch(`${baseUrl}/api/readyz`, {
    headers: { Origin: 'https://cafe.infinigrowsoftech.com', 'X-Forwarded-Proto': 'https' },
  });
  assert.equal(forwardedHttps.status, 503); // HTTPS passed; DB readiness is correctly unavailable in this isolated test.
  assert.ok(forwardedHttps.headers.get('strict-transport-security'));
});

test('validateEnv enforces payment mode policy and rejects test keys in production even on Render', async () => {
  const { validateEnv } = await import('../config/env.js');

  const baseConfig = {
    NODE_ENV: 'production',
    JWT_SECRET: 'd'.repeat(32),
    MONGO_URI: 'mongodb://127.0.0.1:27017/prod',
    CLIENT_URL: 'https://cafe.infinigrowsoftech.com',
  };

  // 1. Valid live credentials in production must pass
  const liveRes = validateEnv({
    ...baseConfig,
    RAZORPAY_KEY_ID: 'rzp_live_samplekey123',
    RAZORPAY_KEY_SECRET: 'live_sample_secret_123',
  });
  assert.equal(liveRes.valid, true);

  // 2. Hosting provider detection (RENDER=true) must NOT automatically authorize test payments
  assert.throws(
    () => {
      validateEnv({
        ...baseConfig,
        RAZORPAY_KEY_ID: 'rzp_test_samplekey123',
        RAZORPAY_KEY_SECRET: 'test_sample_secret_123',
        RENDER: 'true',
      });
    },
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );

  // 3. Reject missing credentials in live production
  assert.throws(
    () => {
      validateEnv({
        ...baseConfig,
        RAZORPAY_KEY_ID: '',
        RAZORPAY_KEY_SECRET: '',
      });
    },
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );

  // 4. Reject placeholder credentials in live production
  assert.throws(
    () => {
      validateEnv({
        ...baseConfig,
        RAZORPAY_KEY_ID: 'rzp_live_xxxx',
        RAZORPAY_KEY_SECRET: 'placeholder_secret',
      });
    },
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );

  // 5. Test credentials must only be permitted when explicitly configured via ALLOW_TEST_PAYMENTS=true or PAYMENT_MODE=test
  const testRes1 = validateEnv({
    ...baseConfig,
    RAZORPAY_KEY_ID: 'rzp_test_samplekey123',
    RAZORPAY_KEY_SECRET: 'test_sample_secret_123',
    ALLOW_TEST_PAYMENTS: 'true',
  });
  assert.equal(testRes1.valid, true);

  const testRes2 = validateEnv({
    ...baseConfig,
    RAZORPAY_KEY_ID: 'rzp_test_samplekey123',
    RAZORPAY_KEY_SECRET: 'test_sample_secret_123',
    PAYMENT_MODE: 'test',
  });
  assert.equal(testRes2.valid, true);

  // 6. Conflicting configuration: PAYMENT_MODE=live but ALLOW_TEST_PAYMENTS=true must throw
  assert.throws(
    () => {
      validateEnv({
        ...baseConfig,
        RAZORPAY_KEY_ID: 'rzp_live_samplekey123',
        RAZORPAY_KEY_SECRET: 'live_sample_secret_123',
        PAYMENT_MODE: 'live',
        ALLOW_TEST_PAYMENTS: 'true',
      });
    },
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );

  // 7. Invalid PAYMENT_MODE string must throw
  assert.throws(
    () => {
      validateEnv({
        ...baseConfig,
        RAZORPAY_KEY_ID: 'rzp_live_samplekey123',
        RAZORPAY_KEY_SECRET: 'live_sample_secret_123',
        PAYMENT_MODE: 'invalid_mode',
      });
    },
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );

  // 8. Intentionally disabled payments via PAYMENT_MODE=disabled must succeed without credentials
  const disabledRes1 = validateEnv({
    ...baseConfig,
    PAYMENT_MODE: 'disabled',
  });
  assert.equal(disabledRes1.valid, true);

  // 9. Intentionally disabled payments via PAYMENTS_ENABLED=false must succeed without credentials
  const disabledRes2 = validateEnv({
    ...baseConfig,
    PAYMENTS_ENABLED: 'false',
  });
  assert.equal(disabledRes2.valid, true);

  // 10. Conflicting configuration: PAYMENT_MODE=live and PAYMENTS_ENABLED=false must throw
  assert.throws(
    () => {
      validateEnv({
        ...baseConfig,
        PAYMENT_MODE: 'live',
        PAYMENTS_ENABLED: 'false',
        RAZORPAY_KEY_ID: 'rzp_live_samplekey123',
        RAZORPAY_KEY_SECRET: 'live_sample_secret_123',
      });
    },
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );
});

test('payment endpoints are safely disabled when online payments are intentionally disabled', async (t) => {
  const origMode = process.env.PAYMENT_MODE;
  const origEnabled = process.env.PAYMENTS_ENABLED;
  process.env.PAYMENTS_ENABLED = 'false';
  process.env.PAYMENT_MODE = 'disabled';

  t.after(() => {
    if (origMode !== undefined) process.env.PAYMENT_MODE = origMode;
    else delete process.env.PAYMENT_MODE;
    if (origEnabled !== undefined) process.env.PAYMENTS_ENABLED = origEnabled;
    else delete process.env.PAYMENTS_ENABLED;
  });

  const server = createApp().listen(0);
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    const { closeRedis } = await import('../config/redis.js');
    await closeRedis();
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const headers = {
    Origin: 'https://cafe.infinigrowsoftech.com',
    'X-Forwarded-Proto': 'https',
    'Content-Type': 'application/json',
  };

  // 1. POST /api/payment/create-order returns 503 PAYMENTS_DISABLED
  const createRes = await fetch(`${baseUrl}/api/payment/create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ orderId: '507f1f77bcf86cd799439011', accessToken: 'dummy' }),
  });
  assert.equal(createRes.status, 503);
  const createJson = await createRes.json();
  assert.equal(createJson.code, 'PAYMENTS_DISABLED');

  // 2. POST /api/payment/verify returns 503 PAYMENTS_DISABLED
  const verifyRes = await fetch(`${baseUrl}/api/payment/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ orderId: '507f1f77bcf86cd799439011', accessToken: 'dummy' }),
  });
  assert.equal(verifyRes.status, 503);
  const verifyJson = await verifyRes.json();
  assert.equal(verifyJson.code, 'PAYMENTS_DISABLED');

  // 3. POST /api/payment/webhook returns 503 PAYMENTS_DISABLED
  const webhookRes = await fetch(`${baseUrl}/api/payment/webhook`, {
    method: 'POST',
    headers: { ...headers, 'x-razorpay-signature': 'dummy_sig' },
    body: JSON.stringify({ event: 'payment.captured' }),
  });
  assert.equal(webhookRes.status, 503);
  const webhookJson = await webhookRes.json();
  assert.equal(webhookJson.code, 'PAYMENTS_DISABLED');

  // 4. POST /api/payment/cancel returns 503 PAYMENTS_DISABLED
  const cancelRes = await fetch(`${baseUrl}/api/payment/cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ orderId: '507f1f77bcf86cd799439011', accessToken: 'dummy' }),
  });
  assert.equal(cancelRes.status, 503);
  const cancelJson = await cancelRes.json();
  assert.equal(cancelJson.code, 'PAYMENTS_DISABLED');

  // 5. POST /api/billing/webhook returns 503 PAYMENTS_DISABLED
  const billWebhookRes = await fetch(`${baseUrl}/api/billing/webhook`, {
    method: 'POST',
    headers: { ...headers, 'x-razorpay-signature': 'dummy_sig' },
    body: JSON.stringify({ event: 'subscription.charged' }),
  });
  assert.equal(billWebhookRes.status, 503);
  const billWebhookJson = await billWebhookRes.json();
  assert.equal(billWebhookJson.code, 'PAYMENTS_DISABLED');
});

test('validateEnv keeps super-admin bootstrap optional and validates configured pairs', async () => {
  const { validateEnv } = await import('../config/env.js');
  const base = {
    NODE_ENV: 'production',
    JWT_SECRET: 'd'.repeat(32),
    MONGO_URI: 'mongodb://127.0.0.1:27017/prod',
    CLIENT_URL: 'https://cafe.infinigrowsoftech.com',
    RAZORPAY_KEY_ID: 'rzp_live_testvalidkey123',
    RAZORPAY_KEY_SECRET: 'live_testvalidsecret12345',
  };

  // Booting must succeed without bootstrap credentials so existing platform admins can sign in.
  assert.doesNotThrow(() => validateEnv(base));

  // A partial pair is a misconfiguration.
  assert.throws(
    () => validateEnv({ ...base, SUPER_ADMIN_EMAIL: 'admin@example.com' }),
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );
  assert.throws(
    () => validateEnv({ ...base, SUPER_ADMIN_PASSWORD: 'ProductionSecurePassword123!' }),
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );

  // Once supplied, both values are validated.
  assert.throws(
    () => validateEnv({ ...base, SUPER_ADMIN_EMAIL: 'not-an-email', SUPER_ADMIN_PASSWORD: 'ProductionSecurePassword123!' }),
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );
  assert.throws(
    () => validateEnv({ ...base, SUPER_ADMIN_EMAIL: 'admin@example.com', SUPER_ADMIN_PASSWORD: 'SuperAdminTestPass123!' }),
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );
  assert.doesNotThrow(() =>
    validateEnv({ ...base, SUPER_ADMIN_EMAIL: 'admin@example.com', SUPER_ADMIN_PASSWORD: 'ProductionSecurePassword123!' })
  );
});

