import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBranding,
  validatePayments,
  buildBrandingPayload,
  buildPaymentPayload,
  restoreWizardState,
} from '../src/utils/wizardValidation.js';

test('Payments Step: blank keys are valid and optional', () => {
  const result = validatePayments({ keyId: '', keySecret: '', webhookSecret: '' });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.hasAnyKey, false);

  const payload = buildPaymentPayload({
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    completedSteps: ['branding', 'menu', 'tables'],
  });

  assert.deepEqual(payload.payment, { clear: true });
  assert.ok(payload.wizardProgress.completedSteps.includes('payments'));
  assert.equal(payload.wizardProgress.currentStep, 'qrcode');
  // Must NOT include cafeName or settings
  assert.equal(payload.settings, undefined);
});

test('Payments Step: valid rzp_test_ and rzp_live_ keys are accepted', () => {
  const testRes = validatePayments({
    keyId: 'rzp_test_1DP5mmOlF5G5ag',
    keySecret: 'sec_test_secret_value',
    webhookSecret: 'whsec_test_value',
  });
  assert.equal(testRes.valid, true);
  assert.deepEqual(testRes.errors, {});
  assert.equal(testRes.hasAnyKey, true);

  const liveRes = validatePayments({
    keyId: 'rzp_live_abc123xyz789',
    keySecret: 'live_secret_value',
    webhookSecret: 'live_webhook_value',
  });
  assert.equal(liveRes.valid, true);
  assert.deepEqual(liveRes.errors, {});

  const payload = buildPaymentPayload({
    keyId: 'rzp_test_1DP5mmOlF5G5ag',
    keySecret: 'sec_test_secret_value',
    webhookSecret: 'whsec_test_value',
    completedSteps: ['branding', 'menu', 'tables'],
  });
  assert.equal(payload.payment.keyId, 'rzp_test_1DP5mmOlF5G5ag');
  assert.equal(payload.payment.keySecret, 'sec_test_secret_value');
  assert.equal(payload.payment.webhookSecret, 'whsec_test_value');
  assert.ok(payload.wizardProgress.completedSteps.includes('payments'));
});

test('Payments Step: invalid keyId format produces field-level error on keyId', () => {
  const res = validatePayments({
    keyId: 'invalid_key_prefix_123',
    keySecret: 'sec123',
    webhookSecret: 'whsec123',
  });
  assert.equal(res.valid, false);
  assert.equal(res.errors.keyId, 'Key ID must start with rzp_test_ or rzp_live_.');
  assert.equal(res.errors.cafeName, undefined, 'Payments step must never produce a cafeName error');
});

test('Payments Step: missing secret produces field-level error on keySecret and webhookSecret', () => {
  const resSecret = validatePayments({
    keyId: 'rzp_test_12345',
    keySecret: '',
    webhookSecret: 'whsec123',
  });
  assert.equal(resSecret.valid, false);
  assert.equal(resSecret.errors.keySecret, 'Razorpay Key Secret is required when configuring payments.');

  const resWebhook = validatePayments({
    keyId: 'rzp_test_12345',
    keySecret: 'sec123',
    webhookSecret: '',
  });
  assert.equal(resWebhook.valid, false);
  assert.equal(resWebhook.errors.webhookSecret, 'Razorpay Webhook Secret is required when configuring payments.');
});

test('Branding Step: validates cafe name presence and length constraint', () => {
  const emptyRes = validateBranding({ cafeName: '   ' });
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.errors.cafeName, 'Café name is required and must be 100 characters or fewer.');

  const overLimitRes = validateBranding({ cafeName: 'A'.repeat(101) });
  assert.equal(overLimitRes.valid, false);
  assert.equal(overLimitRes.errors.cafeName, 'Café name is required and must be 100 characters or fewer.');

  const validRes = validateBranding({ cafeName: 'BrewHaus Specialty Roasters' });
  assert.equal(validRes.valid, true);
  assert.deepEqual(validRes.errors, {});

  const payload = buildBrandingPayload({
    cafeName: 'BrewHaus Specialty Roasters',
    primaryColor: '#c96b18',
    accentColor: '#1a0f08',
    address: '124 Coffee Lane',
    completedSteps: [],
  });
  assert.equal(payload.settings.cafeName, 'BrewHaus Specialty Roasters');
  assert.ok(payload.settings.wizardProgress.completedSteps.includes('branding'));
  assert.equal(payload.settings.wizardProgress.currentStep, 'menu');
});

test('Wizard Persistence: restores completed steps and saved values after refresh', () => {
  const restored = restoreWizardState({
    tenantSettings: {
      cafeName: 'Artisan Brews',
      primaryColor: '#ff5500',
      accentColor: '#000000',
      address: '77 Market St',
      wizardProgress: {
        completedSteps: ['branding', 'menu', 'tables'],
        currentStep: 'payments',
      },
    },
    tenantName: 'Artisan Brews',
    paymentData: {
      keyId: 'rzp_test_existingKey',
      configured: true,
    },
    products: [{ _id: 'p1', name: 'Espresso' }],
    tables: [{ _id: 't1', tableNumber: 1 }],
  });

  assert.equal(restored.cafeName, 'Artisan Brews');
  assert.equal(restored.keyId, 'rzp_test_existingKey');
  assert.equal(restored.savedStep, 'payments');
  assert.ok(restored.completedSteps.has('branding'));
  assert.ok(restored.completedSteps.has('menu'));
  assert.ok(restored.completedSteps.has('tables'));
  assert.ok(restored.completedSteps.has('payments'));
});
