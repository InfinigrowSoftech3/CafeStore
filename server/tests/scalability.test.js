import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import RedisMock from 'ioredis-mock';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || `mongodb://127.0.0.1:27017/cafe_scalability_${process.pid}`;
process.env.JWT_SECRET ||= 'scalability-test-jwt-secret-min-32-chars-long';
process.env.TABLE_QR_SECRET ||= 'scalability-test-table-qr-secret-32-bytes';
process.env.TENANT_CREDENTIALS_ENCRYPTION_KEY ||= 'GdilzkCnVqDoT84Z/2RCFOxLClu4FfSPZ6q2xLZAxzM=';
process.env.SUPER_ADMIN_PASSWORD ||= 'SuperAdminTestPass123!';
process.env.RUN_SCHEDULER = 'false'; // Keep scheduler paused so we control execution in tests

const { createApp } = await import('../index.js');
const { setRedisClient, closeRedis } = await import('../config/redis.js');
const { claimNextDueCampaign, executeCampaign } = await import('../services/campaignRunner.js');
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Campaign from '../models/Campaign.js';
import CampaignDelivery from '../models/CampaignDelivery.js';
import NotificationCampaign from '../models/NotificationCampaign.js';
import { runWithTenant, runWithSystemTenantAccess } from '../utils/tenantContext.js';

test('SCALABILITY & MULTI-INSTANCE VERIFICATION', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  // Set up shared Redis instance across both app servers
  const sharedRedis = new RedisMock();
  setRedisClient(sharedRedis);

  // Spin up App Instance 1
  const app1 = createApp();
  let server1;
  let url1;
  await new Promise((resolve) => {
    server1 = app1.listen(0, '127.0.0.1', () => {
      url1 = `http://127.0.0.1:${server1.address().port}`;
      resolve();
    });
  });

  // Spin up App Instance 2 (distinct port, sharing same Mongo + Redis)
  const app2 = createApp();
  let server2;
  let url2;
  await new Promise((resolve) => {
    server2 = app2.listen(0, '127.0.0.1', () => {
      url2 = `http://127.0.0.1:${server2.address().port}`;
      resolve();
    });
  });

  t.after(async () => {
    if (server1) await new Promise((resolve) => server1.close(resolve));
    if (server2) await new Promise((resolve) => server2.close(resolve));
    await closeRedis();
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
      } catch { /* ignore */ }
    }
  });

  // Setup seed tenant and owner user
  let tenant;
  let ownerUser;
  let category;
  let product;
  const ownerPassword = 'ValidPassword123!';

  await runWithSystemTenantAccess(async () => {
    await Tenant.deleteMany({ slug: 'scale-cafe' });
    tenant = await Tenant.create({
      name: 'Scalability Cafe',
      slug: 'scale-cafe',
      status: 'active',
    });

    await User.deleteMany({ email: 'owner@scalecafe.com' });
    ownerUser = await User.create({
      name: 'Cafe Owner',
      email: 'owner@scalecafe.com',
      password: ownerPassword,
      role: 'owner',
      tenantId: tenant._id,
    });
  });

  await runWithTenant(tenant._id, async () => {
    await Category.deleteMany({ tenantId: tenant._id });
    await Product.deleteMany({ tenantId: tenant._id });

    category = await Category.create({
      tenantId: tenant._id,
      name: 'Beverages',
    });

    product = await Product.create({
      tenantId: tenant._id,
      name: 'Original Coffee',
      price: 150,
      category: category._id,
      available: true,
    });
  });

  const request = async (baseUrl, path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': 'scale-cafe',
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
    } catch { /* non-json */ }
    return { status: res.status, data };
  };

  // ── TEST 1: Login Lockout is Shared Across Instances ───────────────────────
  await t.test('1. Login lockout is shared across instances via Redis', async () => {
    const targetEmail = 'attacker@scalecafe.com';

    // Send 10 consecutive failed attempts to Instance 1
    for (let i = 0; i < 10; i++) {
      const res = await request(url1, '/api/auth/login', {
        method: 'POST',
        body: { email: targetEmail, password: 'WrongPassword' },
      });
      assert.equal(res.status, 401, `Attempt ${i + 1} should fail with 401`);
    }

    // Attempt 11 on Instance 2 for the same account: MUST be locked out with 429
    const resOnInstance2 = await request(url2, '/api/auth/login', {
      method: 'POST',
      body: { email: targetEmail, password: 'WrongPassword' },
    });

    assert.equal(
      resOnInstance2.status,
      429,
      'Instance 2 should immediately enforce lockout triggered on Instance 1'
    );
    assert.equal(resOnInstance2.data.code, 'IP_LOCKED');

    // Clean up Redis lockout
    await sharedRedis.flushall();
  });

  // ── TEST 2: Menu Change is Visible Immediately Across Instances ────────────
  await t.test('2. Menu change is immediately visible across instances via Redis versioning', async () => {
    // Step A: Login on Instance 1 to obtain auth token
    const loginRes = await request(url1, '/api/auth/login', {
      method: 'POST',
      body: { email: 'owner@scalecafe.com', password: ownerPassword },
    });
    assert.equal(loginRes.status, 200);
    const token = loginRes.data.token;
    assert.ok(token);

    // Step B: Query menu from Instance 1 (populates Redis menu cache)
    const menu1 = await request(url1, '/api/menu');
    assert.equal(menu1.status, 200);
    const item1 = menu1.data.products.find((p) => p._id === String(product._id));
    assert.equal(item1.name, 'Original Coffee');

    // Step C: Query menu from Instance 2 (verifies cache hit)
    const menu2Cached = await request(url2, '/api/menu');
    assert.equal(menu2Cached.status, 200);
    const item2 = menu2Cached.data.products.find((p) => p._id === String(product._id));
    assert.equal(item2.name, 'Original Coffee');

    // Step D: Update menu item on Instance 2
    const updateRes = await request(url2, `/api/menu/${product._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { name: 'Royal Gold Brew', price: 250 },
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.product.name, 'Royal Gold Brew');

    // Step E: Query menu IMMEDIATELY from Instance 1
    // Version increment in Redis ensures Instance 1 skips stale cache and returns fresh data
    const menu1Fresh = await request(url1, '/api/menu');
    assert.equal(menu1Fresh.status, 200);
    const item1Fresh = menu1Fresh.data.products.find((p) => p._id === String(product._id));
    assert.equal(
      item1Fresh.name,
      'Royal Gold Brew',
      'Instance 1 should immediately reflect menu change performed on Instance 2'
    );
    assert.equal(item1Fresh.price, 250);
  });

  // ── TEST 3: Exactly-Once Campaign Claiming and Execution ───────────────────
  await t.test('3. Scheduled campaign is claimed atomically and executed exactly once', async () => {
    let customer;
    let campaign;

    await runWithTenant(tenant._id, async () => {
      customer = await Customer.create({
        tenantId: tenant._id,
        name: 'Scale Customer',
        phone: '9876543210',
        marketingConsent: true,
        status: 'active',
      });

      campaign = await Campaign.create({
        tenantId: tenant._id,
        name: 'Weekend Flash Sale',
        title: '50% Off Everything',
        message: 'Flash sale for this weekend only!',
        channel: 'sms',
        audienceType: 'all_opted_in',
        status: 'scheduled',
        scheduledAt: new Date(Date.now() - 5000), // Due in the past
      });
    });

    // Simulate two backend scheduler instances polling concurrently
    const [claimAttempt1, claimAttempt2] = await runWithTenant(tenant._id, async () => {
      return Promise.all([
        claimNextDueCampaign(Campaign, new Date()),
        claimNextDueCampaign(Campaign, new Date()),
      ]);
    });

    // Proves atomic claiming: Exactly one instance wins the claim
    const winners = [claimAttempt1, claimAttempt2].filter(Boolean);
    const losers = [claimAttempt1, claimAttempt2].filter((c) => c === null);

    assert.equal(winners.length, 1, 'Exactly one worker instance should successfully claim the campaign');
    assert.equal(losers.length, 1, 'The competing worker should receive null on atomic claim');
    assert.equal(String(winners[0]._id), String(campaign._id));
    assert.equal(winners[0].status, 'running');
    assert.ok(winners[0].leaseExpiresAt, 'Claimed campaign should have an active lease timeout');

    // Execute the claimed campaign
    await runWithTenant(tenant._id, async () => {
      await executeCampaign(winners[0]._id);
    });

    // Verify campaign completed with lease cleared
    await runWithTenant(tenant._id, async () => {
      const finishedCampaign = await Campaign.findById(campaign._id).lean();
      assert.equal(finishedCampaign.status, 'sent');
      assert.equal(finishedCampaign.leaseExpiresAt, null);
      assert.equal(finishedCampaign.totalSent, 1);

      // Verify delivery sending is idempotent per (campaign, recipient)
      const deliveries = await CampaignDelivery.find({ campaignId: campaign._id }).lean();
      assert.equal(deliveries.length, 1, 'Exactly one delivery record should exist');
      assert.equal(deliveries[0].status, 'delivered');
    });

    // Attempting a second execution of the same campaign must be a no-op (idempotent)
    await runWithTenant(tenant._id, async () => {
      await executeCampaign(campaign._id);
    });

    await runWithTenant(tenant._id, async () => {
      const deliveriesAfter = await CampaignDelivery.find({ campaignId: campaign._id }).lean();
      assert.equal(deliveriesAfter.length, 1, 'Delivery must not be duplicated on repeated execution');
    });
  });

  // ── TEST 4: Health Probes (/livez & /readyz) ────────────────────────────────
  await t.test('4. Health probes (/livez and /readyz) report correct status', async () => {
    // /livez returns 200 (process liveness)
    const livez1 = await request(url1, '/api/livez');
    assert.equal(livez1.status, 200);
    assert.equal(livez1.data.status, 'ok');

    // /readyz returns 200 with database: connected
    const readyz1 = await request(url1, '/api/readyz');
    assert.equal(readyz1.status, 200);
    assert.equal(readyz1.data.database, 'connected');
  });
});
