import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || `mongodb://127.0.0.1:27017/cafe_storefront_fix_${process.pid}`;
process.env.JWT_SECRET = 'storefront-fix-test-jwt-secret-must-be-long-32-chars';
process.env.TABLE_QR_SECRET = 'storefront-fix-test-qr-secret-must-be-long-32-chars';
process.env.TENANT_BASE_DOMAIN = 'cafestore.infinigrowsoftech.com';

const { default: Tenant } = await import('../models/Tenant.js');
const { default: Category } = await import('../models/Category.js');
const { default: Product } = await import('../models/Product.js');
const { default: Table } = await import('../models/Table.js');
const { createTableQrToken } = await import('../utils/tableQr.js');
const { runWithTenant, runWithSystemTenantAccess } = await import('../utils/tenantContext.js');
const { createApp } = await import('../index.js');

test('Critical Multi-Tenant Storefront Fix Verification Suite', async (t) => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();

  // Create Velvetrossie and Hiren cafes
  let velvetCafe;
  let hirenCafe;

  await runWithSystemTenantAccess(async () => {
    velvetCafe = await Tenant.create({
      name: 'Velvetrossie Artisan Roastery',
      slug: 'velvetrossie',
      status: 'active',
      plan: 'pro',
      settings: {
        cafeName: 'Velvetrossie Artisan Roastery',
        primaryColor: '#7A3316',
        accentColor: '#B5702F',
        currency: 'INR',
        taxRate: 5,
      },
    });

    hirenCafe = await Tenant.create({
      name: 'Hiren Specialty Coffee',
      slug: 'hiren',
      status: 'active',
      plan: 'pro',
      settings: {
        cafeName: 'Hiren Specialty Coffee',
        primaryColor: '#1E3A8A',
        accentColor: '#3B82F6',
        currency: 'INR',
        taxRate: 5,
      },
    });
  });

  // Setup Velvetrossie fixtures
  const velvetFixtures = {};
  await runWithTenant(velvetCafe._id, async () => {
    velvetFixtures.category = await Category.create({
      tenantId: velvetCafe._id,
      name: 'Velvet Brews',
      active: true,
    });
    velvetFixtures.product = await Product.create({
      tenantId: velvetCafe._id,
      name: 'Velvet Truffle Mocha',
      price: 240,
      category: velvetFixtures.category._id,
      available: true,
    });
    velvetFixtures.table = await Table.create({
      tenantId: velvetCafe._id,
      tableNumber: 10,
      label: 'Velvet Table 10',
      active: true,
    });
    velvetFixtures.qrToken = createTableQrToken(velvetFixtures.table._id, velvetCafe._id);
  });

  // Setup Hiren fixtures
  const hirenFixtures = {};
  await runWithTenant(hirenCafe._id, async () => {
    hirenFixtures.category = await Category.create({
      tenantId: hirenCafe._id,
      name: 'Hiren Pour-Overs',
      active: true,
    });
    hirenFixtures.product = await Product.create({
      tenantId: hirenCafe._id,
      name: 'Hiren Single Origin Geisha',
      price: 320,
      category: hirenFixtures.category._id,
      available: true,
    });
    hirenFixtures.table = await Table.create({
      tenantId: hirenCafe._id,
      tableNumber: 5,
      label: 'Hiren Table 5',
      active: true,
    });
    hirenFixtures.qrToken = createTableQrToken(hirenFixtures.table._id, hirenCafe._id);
  });

  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // ── TEST 1: Velvetrossie URL loads Velvetrossie ─────────────────────────────
  await t.test('1. Velvetrossie URL loads Velvetrossie', async () => {
    // Via query parameter
    const resQuery = await fetch(`${baseUrl}/api/menu?cafe=velvetrossie`);
    assert.equal(resQuery.status, 200);
    const dataQuery = await resQuery.json();
    assert.ok(Array.isArray(dataQuery.products));
    const namesQuery = dataQuery.products.map((p) => p.name);
    assert.ok(namesQuery.includes('Velvet Truffle Mocha'), 'Must include Velvetrossie product');
    assert.ok(!namesQuery.includes('Hiren Single Origin Geisha'), 'Must NOT include Hiren product');

    // Via X-Tenant-Slug header
    const resHeader = await fetch(`${baseUrl}/api/menu`, {
      headers: { 'X-Tenant-Slug': 'velvetrossie' },
    });
    assert.equal(resHeader.status, 200);
    const dataHeader = await resHeader.json();
    const namesHeader = dataHeader.products.map((p) => p.name);
    assert.ok(namesHeader.includes('Velvet Truffle Mocha'));
    assert.ok(!namesHeader.includes('Hiren Single Origin Geisha'));

    // Via Subdomain Host
    const resSubdomain = await fetch(`${baseUrl}/api/menu`, {
      headers: {
        Host: 'velvetrossie.cafestore.infinigrowsoftech.com',
        'X-Forwarded-Host': 'velvetrossie.cafestore.infinigrowsoftech.com',
      },
    });
    assert.equal(resSubdomain.status, 200);
    const dataSubdomain = await resSubdomain.json();
    const namesSubdomain = dataSubdomain.products.map((p) => p.name);
    assert.ok(namesSubdomain.includes('Velvet Truffle Mocha'));

    // Public cafe details
    const resDetails = await fetch(`${baseUrl}/api/public/cafes/velvetrossie`);
    assert.equal(resDetails.status, 200);
    const details = await resDetails.json();
    assert.equal(details.data.slug, 'velvetrossie');
    assert.equal(details.data.name, 'Velvetrossie Artisan Roastery');
  });

  // ── TEST 2: Hiren URL loads Hiren ──────────────────────────────────────────
  await t.test('2. Hiren URL loads Hiren', async () => {
    // Via query parameter
    const resQuery = await fetch(`${baseUrl}/api/menu?cafe=hiren`);
    assert.equal(resQuery.status, 200);
    const dataQuery = await resQuery.json();
    assert.ok(Array.isArray(dataQuery.products));
    const namesQuery = dataQuery.products.map((p) => p.name);
    assert.ok(namesQuery.includes('Hiren Single Origin Geisha'), 'Must include Hiren product');
    assert.ok(!namesQuery.includes('Velvet Truffle Mocha'), 'Must NOT include Velvet product');

    // Via X-Tenant-Slug header
    const resHeader = await fetch(`${baseUrl}/api/menu`, {
      headers: { 'X-Tenant-Slug': 'hiren' },
    });
    assert.equal(resHeader.status, 200);
    const dataHeader = await resHeader.json();
    const namesHeader = dataHeader.products.map((p) => p.name);
    assert.ok(namesHeader.includes('Hiren Single Origin Geisha'));
    assert.ok(!namesHeader.includes('Velvet Truffle Mocha'));

    // Via Subdomain Host
    const resSubdomain = await fetch(`${baseUrl}/api/menu`, {
      headers: {
        Host: 'hiren.cafestore.infinigrowsoftech.com',
        'X-Forwarded-Host': 'hiren.cafestore.infinigrowsoftech.com',
      },
    });
    assert.equal(resSubdomain.status, 200);
    const dataSubdomain = await resSubdomain.json();
    const namesSubdomain = dataSubdomain.products.map((p) => p.name);
    assert.ok(namesSubdomain.includes('Hiren Single Origin Geisha'));

    // Public cafe details
    const resDetails = await fetch(`${baseUrl}/api/public/cafes/hiren`);
    assert.equal(resDetails.status, 200);
    const details = await resDetails.json();
    assert.equal(details.data.slug, 'hiren');
    assert.equal(details.data.name, 'Hiren Specialty Coffee');
  });

  // ── TEST 3: Each cafe's QR loads the correct cafe ──────────────────────────
  await t.test('3. Each cafe QR loads the correct cafe', async () => {
    // Velvetrossie QR
    const resVelvet = await fetch(`${baseUrl}/api/public/cafes/resolve?token=${encodeURIComponent(velvetFixtures.qrToken)}`);
    assert.equal(resVelvet.status, 200);
    const velvetData = await resVelvet.json();
    assert.equal(velvetData.data.cafe.id, String(velvetCafe._id));
    assert.equal(velvetData.data.cafe.slug, 'velvetrossie');
    assert.equal(velvetData.data.cafe.name, 'Velvetrossie Artisan Roastery');
    assert.equal(velvetData.data.table.id, String(velvetFixtures.table._id));
    assert.equal(velvetData.data.table.number, 10);

    // Hiren QR
    const resHiren = await fetch(`${baseUrl}/api/public/cafes/resolve?token=${encodeURIComponent(hirenFixtures.qrToken)}`);
    assert.equal(resHiren.status, 200);
    const hirenData = await resHiren.json();
    assert.equal(hirenData.data.cafe.id, String(hirenCafe._id));
    assert.equal(hirenData.data.cafe.slug, 'hiren');
    assert.equal(hirenData.data.cafe.name, 'Hiren Specialty Coffee');
    assert.equal(hirenData.data.table.id, String(hirenFixtures.table._id));
    assert.equal(hirenData.data.table.number, 5);
  });

  // ── TEST 4: Invalid cafe slug returns 404 ──────────────────────────────────
  await t.test('4. Invalid cafe slug returns 404 and NEVER falls back to default cafe', async () => {
    // Via public cafes endpoint
    const resPublic = await fetch(`${baseUrl}/api/public/cafes/non-existent-cafe-slug-xyz`);
    assert.equal(resPublic.status, 404);
    const errPublic = await resPublic.json();
    assert.equal(errPublic.error.code, 'CAFE_NOT_FOUND');

    // Calling /default must return 404 and NEVER return Velvetrossie
    const resDefault = await fetch(`${baseUrl}/api/public/cafes/default`);
    assert.equal(resDefault.status, 404);

    // Via customer menu with invalid query slug
    const resMenu = await fetch(`${baseUrl}/api/menu?cafe=non-existent-cafe-slug-xyz`);
    assert.equal(resMenu.status, 404);
    const errMenu = await resMenu.json();
    assert.equal(errMenu.code, 'TENANT_NOT_FOUND');

    // Customer route with NO tenant context at all must return 404
    const resNoTenant = await fetch(`${baseUrl}/api/menu`);
    assert.equal(resNoTenant.status, 404);
  });

  // ── TEST 5: Invalid QR token returns 404 ───────────────────────────────────
  await t.test('5. Invalid QR token returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/public/cafes/resolve?token=completely_tampered_invalid_qr_token`);
    assert.equal(res.status, 404);
    const err = await res.json();
    assert.equal(err.error.code, 'QR_NOT_FOUND');
  });

  // ── TEST 6: Expired QR returns 410 ─────────────────────────────────────────
  await t.test('6. Expired QR returns 410', async () => {
    const pastTimestamp = Date.now() - (3 * 365 * 24 * 60 * 60 * 1000); // 3 years ago
    const expiredToken = createTableQrToken(velvetFixtures.table._id, velvetCafe._id, pastTimestamp);

    const res = await fetch(`${baseUrl}/api/public/cafes/resolve?token=${encodeURIComponent(expiredToken)}`);
    assert.equal(res.status, 410);
    const err = await res.json();
    assert.equal(err.error.code, 'QR_EXPIRED');
  });

  // ── TEST 7: Wrong cafe/table combination is rejected ───────────────────────
  await t.test('7. Wrong cafe/table combination is rejected with 409 TABLE_CAFE_MISMATCH', async () => {
    // Attempting to resolve Velvetrossie slug with Hiren table
    const resMismatch = await fetch(`${baseUrl}/api/public/cafes/resolve?cafeSlug=velvetrossie&tableSlug=${hirenFixtures.table._id}`);
    assert.equal(resMismatch.status, 409);
    const errMismatch = await resMismatch.json();
    assert.equal(errMismatch.error.code, 'TABLE_CAFE_MISMATCH');

    // Attempting to resolve Hiren slug with Velvetrossie table
    const resMismatch2 = await fetch(`${baseUrl}/api/public/cafes/resolve?cafeSlug=hiren&tableSlug=${velvetFixtures.table._id}`);
    assert.equal(resMismatch2.status, 409);
    const errMismatch2 = await resMismatch2.json();
    assert.equal(errMismatch2.error.code, 'TABLE_CAFE_MISMATCH');

    // Attempting to resolve Hiren QR token while claiming velvetrossie slug
    const resMismatchQr = await fetch(`${baseUrl}/api/public/cafes/resolve?token=${encodeURIComponent(hirenFixtures.qrToken)}&cafeSlug=velvetrossie`);
    assert.equal(resMismatchQr.status, 409);
    const errMismatchQr = await resMismatchQr.json();
    assert.equal(errMismatchQr.error.code, 'TABLE_CAFE_MISMATCH');
  });

  // ── TEST 8: Orders cannot contain products from another cafe ───────────────
  await t.test('8. Orders cannot contain products from another cafe', async () => {
    // Place order for Velvetrossie with Hiren's product via public orders endpoint
    const resOrderPublic = await fetch(`${baseUrl}/api/public/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cafe-Id': String(velvetCafe._id),
      },
      body: JSON.stringify({
        tableId: String(velvetFixtures.table._id),
        items: [
          { productId: String(hirenFixtures.product._id), quantity: 1 },
        ],
        customer: { name: 'Customer Test', phone: '9876543210' },
        paymentMethod: 'cash',
      }),
    });
    assert.equal(resOrderPublic.status, 409);
    const errPublic = await resOrderPublic.json();
    assert.equal(errPublic.error.code, 'PRODUCT_CAFE_MISMATCH');

    // Place order for Velvetrossie with Hiren's product via /api/orders
    const resOrderStandard = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': 'velvetrossie',
      },
      body: JSON.stringify({
        tableNumber: 10,
        tableToken: velvetFixtures.qrToken,
        idempotencyKey: 'test-idemp-key-velvet-cross-cafe-1234',
        items: [
          { productId: String(hirenFixtures.product._id), quantity: 1 },
        ],
        customer: { name: 'Customer Test', phone: '9876543210' },
        paymentMethod: 'cash',
      }),
    });
    assert.equal(resOrderStandard.status, 400);
    const errStandard = await resOrderStandard.json();
    assert.equal(errStandard.code, 'PRODUCT_CAFE_MISMATCH');
  });
});
