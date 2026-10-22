import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.TABLE_QR_SECRET = 'b'.repeat(32);
process.env.TENANT_CREDENTIALS_ENCRYPTION_KEY = 'c'.repeat(32);
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

  const forwardedHttps = await fetch(`${baseUrl}/api/readyz`, {
    headers: { Origin: 'https://cafe.infinigrowsoftech.com', 'X-Forwarded-Proto': 'https' },
  });
  assert.equal(forwardedHttps.status, 503); // HTTPS passed; DB readiness is correctly unavailable in this isolated test.
  assert.ok(forwardedHttps.headers.get('strict-transport-security'));
});

test('validateEnv accepts fallback secrets and sandbox mode in staging/Render deployments', async () => {
  const { validateEnv } = await import('../config/env.js');

  // Should succeed with fallbacks to JWT_SECRET and no REDIS_URL when ALLOW_TEST_PAYMENTS is true
  const res1 = validateEnv({
    NODE_ENV: 'production',
    JWT_SECRET: 'd'.repeat(32),
    MONGO_URI: 'mongodb://127.0.0.1:27017/prod',
    CLIENT_URL: 'https://cafe.infinigrowsoftech.com',
    RAZORPAY_KEY_ID: 'rzp_test_samplekey123',
    RAZORPAY_KEY_SECRET: 'test_sample_secret_123',
    ALLOW_TEST_PAYMENTS: 'true',
  });
  assert.equal(res1.valid, true);

  // Should succeed when running on Render environment with rzp_test_ keys
  const res2 = validateEnv({
    NODE_ENV: 'production',
    JWT_SECRET: 'd'.repeat(32),
    MONGO_URI: 'mongodb://127.0.0.1:27017/prod',
    CLIENT_URL: 'https://cafe.infinigrowsoftech.com',
    RAZORPAY_KEY_ID: 'rzp_test_samplekey123',
    RAZORPAY_KEY_SECRET: 'test_sample_secret_123',
    RENDER: 'true',
  });
  assert.equal(res2.valid, true);

  // Should throw when live keys are enforced and test key is provided without bypass flag
  assert.throws(
    () => {
      validateEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'd'.repeat(32),
        MONGO_URI: 'mongodb://127.0.0.1:27017/prod',
        CLIENT_URL: 'https://cafe.infinigrowsoftech.com',
        RAZORPAY_KEY_ID: 'rzp_test_samplekey123',
        RAZORPAY_KEY_SECRET: 'test_sample_secret_123',
      });
    },
    (err) => err.code === 'UNSAFE_PRODUCTION_CONFIG'
  );
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

