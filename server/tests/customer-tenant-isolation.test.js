import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || `mongodb://127.0.0.1:27017/cafe_tenant_iso_${process.pid}`;
process.env.JWT_SECRET = 'customer-isolation-test-jwt-secret-must-be-long';
process.env.TABLE_QR_SECRET = 'customer-isolation-test-qr-secret-must-be-long';
process.env.TENANT_DEFAULT_SLUG = 'brewhaus';
process.env.TENANT_BASE_DOMAIN = 'saas.test';

const { default: Tenant } = await import('../models/Tenant.js');
const { default: Category } = await import('../models/Category.js');
const { default: Product } = await import('../models/Product.js');
const { default: Table } = await import('../models/Table.js');
const { default: User } = await import('../models/User.js');
const { default: Order } = await import('../models/Order.js');
const { createTableQrToken } = await import('../utils/tableQr.js');
const { createAccessToken } = await import('../utils/authTokens.js');
const { runWithTenant, runWithSystemTenantAccess } = await import('../utils/tenantContext.js');
const { createApp } = await import('../index.js');

test('Customer Site Multi-Tenant Isolation Suite', async (t) => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
  await mongoose.connection.dropDatabase();

  // Create Café A ("BrewHaus") and Café B ("Apna Dost") and Café C ("Chai Point")
  const cafeA = await runWithSystemTenantAccess(() =>
    Tenant.create({
      name: 'BrewHaus Café',
      slug: 'brewhaus',
      status: 'active',
      plan: 'pro',
      settings: { cafeName: 'BrewHaus Café', primaryColor: '#0F3D2E', accentColor: '#C93A1C' },
    })
  );

  const cafeB = await runWithSystemTenantAccess(() =>
    Tenant.create({
      name: 'APNA DOST',
      slug: 'dostii',
      status: 'active',
      plan: 'pro',
      settings: { cafeName: 'APNA DOST', primaryColor: '#0F3D2E', accentColor: '#C93A1C' },
    })
  );

  const cafeC = await runWithSystemTenantAccess(() =>
    Tenant.create({
      name: 'Chai Point',
      slug: 'chaipoint',
      status: 'active',
      plan: 'pro',
      settings: { cafeName: 'Chai Point', primaryColor: '#2563EB', accentColor: '#DC2626' },
    })
  );

  // Create owner for Café A
  const ownerA = await runWithTenant(cafeA._id, async () => {
    return User.create({
      name: 'Owner A',
      email: 'ownerA@example.test',
      password: 'password123',
      role: 'owner',
    });
  });
  const ownerAToken = createAccessToken(ownerA._id, cafeA._id);

  // Fixtures for Café A
  const fixturesA = {};
  await runWithTenant(cafeA._id, async () => {
    fixturesA.category = await Category.create({ name: 'Coffee & Brews' });
    fixturesA.product = await Product.create({
      name: 'Signature Latte A',
      price: 150,
      category: fixturesA.category._id,
      available: true,
    });
    fixturesA.table = await Table.create({ tableNumber: 1, label: 'Table 1', active: true });
    fixturesA.qrToken = createTableQrToken(fixturesA.table._id, cafeA._id);
  });

  // Fixtures for Café B
  const fixturesB = {};
  await runWithTenant(cafeB._id, async () => {
    fixturesB.category = await Category.create({ name: 'Dosti Specials' });
    fixturesB.product = await Product.create({
      name: 'Dosti Kadak Chai B',
      price: 60,
      category: fixturesB.category._id,
      available: true,
    });
    fixturesB.table = await Table.create({ tableNumber: 7, label: 'Table 7', active: true });
    fixturesB.qrToken = createTableQrToken(fixturesB.table._id, cafeB._id);
  });

  // Fixtures for Café C
  const fixturesC = {};
  await runWithTenant(cafeC._id, async () => {
    fixturesC.category = await Category.create({ name: 'Ginger Teas' });
    fixturesC.product = await Product.create({
      name: 'Ginger Cardamom Tea C',
      price: 80,
      category: fixturesC.category._id,
      available: true,
    });
  });

  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // ── TEST 1: Logged in as Owner A, open Café B's menu -> Shows B's name and items ONLY ──
  await t.test('Owner A token is ignored on customer public menu for Cafe B', async () => {
    const res = await fetch(`${baseUrl}/api/menu?cafe=dostii`, {
      headers: {
        Authorization: `Bearer ${ownerAToken}`,
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.products));
    const names = data.products.map((p) => p.name);
    assert.ok(names.includes('Dosti Kadak Chai B'), 'Must include Cafe B product');
    assert.ok(!names.includes('Signature Latte A'), 'Must NOT include Cafe A product');
  });

  // ── TEST 2: Logged in as Owner A, open Café A's menu -> Shows A's name and items ──
  await t.test('Customer public menu for Cafe A shows Cafe A items', async () => {
    const res = await fetch(`${baseUrl}/api/menu?cafe=brewhaus`, {
      headers: {
        Authorization: `Bearer ${ownerAToken}`,
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const names = data.products.map((p) => p.name);
    assert.ok(names.includes('Signature Latte A'), 'Must include Cafe A product');
    assert.ok(!names.includes('Dosti Kadak Chai B'), 'Must NOT include Cafe B product');
  });

  // ── TEST 3: Logged out, open any café's menu -> Works ──
  await t.test('Logged out request without any token or cookies loads cafe menu correctly', async () => {
    const resB = await fetch(`${baseUrl}/api/menu?cafe=dostii`);
    assert.equal(resB.status, 200);
    const dataB = await resB.json();
    assert.equal(dataB.products[0].name, 'Dosti Kadak Chai B');

    const resA = await fetch(`${baseUrl}/api/menu?cafe=brewhaus`);
    assert.equal(resA.status, 200);
    const dataA = await resA.json();
    assert.equal(dataA.products[0].name, 'Signature Latte A');
  });

  // ── TEST 4: Public Cafe Details endpoint /api/public/cafes/:slug ──
  await t.test('Public cafe endpoints resolve correctly by slug', async () => {
    const resB = await fetch(`${baseUrl}/api/public/cafes/dostii`);
    assert.equal(resB.status, 200);
    const dataB = await resB.json();
    assert.equal(dataB.data.name, 'APNA DOST');
    assert.equal(dataB.data.slug, 'dostii');

    const resA = await fetch(`${baseUrl}/api/public/cafes/brewhaus`);
    assert.equal(resA.status, 200);
    const dataA = await resA.json();
    assert.equal(dataA.data.name, 'BrewHaus Café');
    assert.equal(dataA.data.slug, 'brewhaus');
  });

  // ── TEST 5: Switching from Cafe B's URL to Cafe C's URL returns Cafe C's items ──
  await t.test('Switching from Cafe B to Cafe C returns Cafe C items only', async () => {
    const resC = await fetch(`${baseUrl}/api/menu?cafe=chaipoint`);
    assert.equal(resC.status, 200);
    const dataC = await resC.json();
    const namesC = dataC.products.map((p) => p.name);
    assert.ok(namesC.includes('Ginger Cardamom Tea C'));
    assert.ok(!namesC.includes('Dosti Kadak Chai B'));
    assert.ok(!namesC.includes('Signature Latte A'));
  });

  // ── TEST 6: Invalid or unknown slug returns 404 (NEVER falls back) ──
  await t.test('Invalid or missing slug returns 404 and does not fall back to logged-in owner cafe', async () => {
    // Unknown slug with Owner A token
    const resUnknown = await fetch(`${baseUrl}/api/menu?cafe=nonexistent-cafe-slug-xyz`, {
      headers: {
        Authorization: `Bearer ${ownerAToken}`,
      },
    });
    assert.equal(resUnknown.status, 404);
    const errData = await resUnknown.json();
    assert.equal(errData.code, 'TENANT_NOT_FOUND');

    // Unknown slug on public cafe details
    const resPubUnknown = await fetch(`${baseUrl}/api/public/cafes/nonexistent-cafe-slug-xyz`);
    assert.equal(resPubUnknown.status, 404);
  });

  // ── TEST 7: Customer request carrying owner session cookie still returns only slug cafe data ──
  await t.test('Cookie with Owner A session is ignored on public customer routes', async () => {
    const resCookie = await fetch(`${baseUrl}/api/menu?cafe=dostii`, {
      headers: {
        Cookie: `brewhaus_access_token=${ownerAToken}`,
      },
    });
    assert.equal(resCookie.status, 200);
    const data = await resCookie.json();
    const names = data.products.map((p) => p.name);
    assert.ok(names.includes('Dosti Kadak Chai B'));
    assert.ok(!names.includes('Signature Latte A'));
  });

  // ── TEST 8: Placing an order with an item ID from another cafe is rejected ──
  await t.test('Placing an order with product from another cafe is rejected', async () => {
    const orderPayload = {
      tableNumber: 7,
      tableToken: fixturesB.qrToken,
      customer: { name: 'Customer Test', phone: '9876543210' },
      items: [
        // Attempting to buy Product A (from BrewHaus) while seated at Table 7 of Apna Dost!
        { productId: String(fixturesA.product._id), quantity: 1 },
      ],
      paymentMethod: 'cash',
      idempotencyKey: 'test-cross-order-key-12345678',
    };

    const res = await fetch(`${baseUrl}/api/orders?cafe=dostii`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    assert.equal(res.status, 400);
    const errData = await res.json();
    assert.equal(errData.code, 'PRODUCT_CAFE_MISMATCH');
  });

  // ── TEST 9: Placing an order with table token from another cafe is rejected ──
  await t.test('Placing an order with table token from another cafe is rejected', async () => {
    const orderPayload = {
      tableNumber: 1,
      tableToken: fixturesA.qrToken, // From Cafe A, but calling Cafe B
      customer: { name: 'Customer Test', phone: '9876543210' },
      items: [{ productId: String(fixturesB.product._id), quantity: 1 }],
      paymentMethod: 'cash',
      idempotencyKey: 'test-cross-table-key-12345678',
    };

    const res = await fetch(`${baseUrl}/api/orders?cafe=dostii`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    assert.equal(res.status, 404);
  });
});
