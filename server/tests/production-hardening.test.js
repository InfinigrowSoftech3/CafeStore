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

  const forwardedHttps = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://cafe.infinigrowsoftech.com', 'X-Forwarded-Proto': 'https' },
  });
  assert.equal(forwardedHttps.status, 503); // HTTPS passed; DB readiness is correctly unavailable in this isolated test.
  assert.ok(forwardedHttps.headers.get('strict-transport-security'));
});
