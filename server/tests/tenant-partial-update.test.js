import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || `mongodb://127.0.0.1:27017/cafe_tenant_partial_${process.pid}`;
process.env.JWT_SECRET ||= 'integration-test-jwt-secret-with-more-than-32-bytes';
process.env.TABLE_QR_SECRET ||= 'integration-test-table-qr-secret-with-32-bytes';
process.env.TENANT_CREDENTIALS_ENCRYPTION_KEY ||= Buffer.alloc(32, 23).toString('base64');

const { default: Tenant } = await import('../models/Tenant.js');
const { default: User } = await import('../models/User.js');
const { createAccessToken } = await import('../utils/authTokens.js');
const { runWithSystemTenantAccess, runWithTenant } = await import('../utils/tenantContext.js');
const { createApp } = await import('../index.js');

test('Onboarding Wizard & Tenant Partial Update Validation Suite', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  }

  const app = createApp();
  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // Provision test tenant and owner
  const testTenant = await runWithSystemTenantAccess(() =>
    Tenant.create({
      name: 'BrewHaus Roast Lab',
      slug: `roastlab-${Date.now()}`,
      status: 'active',
      plan: 'starter',
      settings: {
        cafeName: 'BrewHaus Roast Lab',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        taxRate: 5,
        primaryColor: '#c96b18',
        accentColor: '#1a0f08',
      },
    })
  );

  const testOwner = await runWithTenant(testTenant._id, () =>
    User.create({
      tenantId: testTenant._id,
      name: 'Lab Owner',
      email: `owner-${Date.now()}@brewhaus.test`,
      password: 'hashed-password-for-testing',
      role: 'owner',
    })
  );

  const ownerToken = createAccessToken(testOwner._id, testTenant._id, { role: 'owner' });

  const request = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
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
      // non-JSON response
    }
    return { status: res.status, data };
  };

  await t.test('1. Payments step save works with blank keys without requiring cafeName', async () => {
    const res = await request('/api/tenant/settings', {
      method: 'PATCH',
      body: {
        payment: { keyId: '', keySecret: '', webhookSecret: '', clear: true },
        wizardProgress: {
          completedSteps: ['branding', 'menu', 'tables', 'payments'],
          currentStep: 'qrcode',
        },
      },
    });

    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert.equal(res.data?.payment?.configured, false);
    assert.equal(res.data?.payment?.keyId, '');
    assert.ok(res.data?.tenant?.wizardProgress?.completedSteps?.includes('payments'));
    assert.equal(res.data?.tenant?.wizardProgress?.currentStep, 'qrcode');
  });

  await t.test('2. Payments step save with valid rzp_test_ keys succeeds, encrypts credentials, and never leaks secrets', async () => {
    const res = await request('/api/tenant/settings', {
      method: 'PATCH',
      body: {
        payment: {
          keyId: 'rzp_test_IntegrationKey123',
          keySecret: 'SuperSecretKey_98765',
          webhookSecret: 'WebhookSecretValue_4321',
        },
      },
    });

    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert.equal(res.data?.payment?.keyId, 'rzp_test_IntegrationKey123');
    assert.equal(res.data?.payment?.configured, true);
    // Secrets must NEVER appear in the response payload
    assert.equal(res.data?.payment?.keySecret, undefined);
    assert.equal(res.data?.payment?.webhookSecret, undefined);

    // Verify stored encrypted at rest
    const doc = await Tenant.findById(testTenant._id).select('+paymentCredentialsEncrypted').lean();
    assert.ok(doc.paymentCredentialsEncrypted);
    assert.equal(doc.paymentCredentialsEncrypted.includes('SuperSecretKey_98765'), false);
    assert.equal(doc.paymentCredentialsEncrypted.includes('WebhookSecretValue_4321'), false);
  });

  await t.test('3. Payments step save with invalid Key ID format returns field-level error on keyId, NOT cafeName error', async () => {
    const res = await request('/api/tenant/settings', {
      method: 'PATCH',
      body: {
        payment: {
          keyId: 'invalid_prefix_key_123',
          keySecret: 'ValidSecret_123',
          webhookSecret: 'ValidWebhook_123',
        },
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data?.field, 'keyId');
    assert.match(res.data?.error, /Key ID must start with rzp_test_ or rzp_live_/i);
    assert.doesNotMatch(res.data?.error, /Café name/i);
  });

  await t.test('4. Payments step save with missing secret returns field-level error for keySecret or webhookSecret', async () => {
    const resMissingSecret = await request('/api/tenant/settings', {
      method: 'PATCH',
      body: {
        payment: {
          keyId: 'rzp_test_validKey',
          keySecret: '',
          webhookSecret: 'ValidWebhook_123',
        },
      },
    });
    assert.equal(resMissingSecret.status, 400);
    assert.equal(resMissingSecret.data?.field, 'keySecret');
    assert.doesNotMatch(resMissingSecret.data?.error, /Café name/i);

    const resMissingWebhook = await request('/api/tenant/settings', {
      method: 'PATCH',
      body: {
        payment: {
          keyId: 'rzp_test_validKey',
          keySecret: 'ValidSecret_123',
          webhookSecret: '',
        },
      },
    });
    assert.equal(resMissingWebhook.status, 400);
    assert.equal(resMissingWebhook.data?.field, 'webhookSecret');
    assert.doesNotMatch(resMissingWebhook.data?.error, /Café name/i);
  });

  await t.test('5. Branding step save persists cafeName to both name and settings.cafeName', async () => {
    const res = await request('/api/tenant/settings', {
      method: 'PATCH',
      body: {
        settings: {
          cafeName: 'Velvet Mocha Lounge',
          primaryColor: '#7b3f00',
          accentColor: '#1c1c1c',
          address: '42 Espresso Blvd',
        },
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.tenant?.name, 'Velvet Mocha Lounge');
    assert.equal(res.data?.tenant?.cafeName, 'Velvet Mocha Lounge');
    assert.equal(res.data?.tenant?.settings?.cafeName, 'Velvet Mocha Lounge');

    const updatedDoc = await Tenant.findById(testTenant._id).lean();
    assert.equal(updatedDoc.name, 'Velvet Mocha Lounge');
    assert.equal(updatedDoc.settings.cafeName, 'Velvet Mocha Lounge');
  });

  await t.test('6. Cafe name validation only triggers when cafe name is being edited', async () => {
    const resEmpty = await request('/api/tenant/settings', {
      method: 'PATCH',
      body: {
        settings: {
          cafeName: '   ',
        },
      },
    });
    assert.equal(resEmpty.status, 400);
    assert.equal(resEmpty.data?.field, 'cafeName');
    assert.match(resEmpty.data?.error, /Café name is required and must be 100 characters or fewer/i);

    const resOver100 = await request('/api/tenant/settings', {
      method: 'PATCH',
      body: {
        settings: {
          cafeName: 'X'.repeat(101),
        },
      },
    });
    assert.equal(resOver100.status, 400);
    assert.equal(resOver100.data?.field, 'cafeName');
    assert.match(resOver100.data?.error, /Café name is required and must be 100 characters or fewer/i);
  });

  await t.test('7. PUT /api/tenant/settings accepts payment payload without requiring cafeName', async () => {
    const resPut = await request('/api/tenant/settings', {
      method: 'PUT',
      body: {
        payment: {
          clear: true,
        },
      },
    });

    assert.equal(resPut.status, 200, `Expected 200, got ${resPut.status}: ${JSON.stringify(resPut.data)}`);
    assert.equal(resPut.data?.payment?.configured, false);
  });

  await t.test('8. Dedicated step endpoints /settings/branding and /settings/payments work isolatedly', async () => {
    const resBranding = await request('/api/tenant/settings/branding', {
      method: 'PATCH',
      body: {
        cafeName: 'Final Verified Cafe',
        primaryColor: '#c96b18',
        accentColor: '#1a0f08',
      },
    });
    assert.equal(resBranding.status, 200);
    assert.equal(resBranding.data?.tenant?.name, 'Final Verified Cafe');

    const resPayment = await request('/api/tenant/settings/payments', {
      method: 'PATCH',
      body: {
        keyId: 'rzp_live_productionKey456',
        keySecret: 'ProdSecret_999',
        webhookSecret: 'ProdWebhook_888',
      },
    });
    assert.equal(resPayment.status, 200);
    assert.equal(resPayment.data?.payment?.keyId, 'rzp_live_productionKey456');
    assert.equal(resPayment.data?.payment?.configured, true);
    assert.equal(resPayment.data?.payment?.keySecret, undefined);
  });

  await t.test('9. GET /api/tenant/settings restores wizardProgress and payment configuration without leaking secrets', async () => {
    const res = await request('/api/tenant/settings', { method: 'GET' });
    assert.equal(res.status, 200);
    assert.equal(res.data?.tenant?.name, 'Final Verified Cafe');
    assert.equal(res.data?.payment?.keyId, 'rzp_live_productionKey456');
    assert.equal(res.data?.payment?.configured, true);
    assert.equal(res.data?.payment?.keySecret, undefined);
    assert.equal(res.data?.payment?.webhookSecret, undefined);
  });
});
