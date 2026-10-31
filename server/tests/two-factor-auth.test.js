import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || `mongodb://127.0.0.1:27017/cafe_2fa_test_${process.pid}`;
process.env.JWT_SECRET = 'two-factor-auth-test-jwt-secret-min32chars!';
process.env.TABLE_QR_SECRET = 'two-factor-auth-test-qr-secret-min32chars!';
process.env.RAZORPAY_WEBHOOK_SECRET = 'two-factor-auth-test-webhook-secret!';
process.env.TENANT_DEFAULT_SLUG = 'brewhaus';

const { createApp } = await import('../index.js');
const { default: Tenant } = await import('../models/Tenant.js');
const { default: User } = await import('../models/User.js');
const { setupTestTenant } = await import('./tenantTestSetup.js');
const { totpAt } = await import('../utils/authTokens.js');

const app = createApp();

test('Two-Factor Authentication (2FA) Comprehensive Security & Lifecycle Suite', async (t) => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  const tenant = await setupTestTenant();

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const request = async (route, { method = 'GET', body, token, headers = {} } = {}) => {
    const reqHeaders = { ...headers };
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
    let reqBody = body;
    if (body !== undefined && typeof body !== 'string') {
      reqHeaders['Content-Type'] = 'application/json';
      reqBody = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${route}`, {
      method,
      headers: reqHeaders,
      body: reqBody,
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json()
      : await res.text();
    return { res, status: res.status, data };
  };

  // Seed two distinct admins and a manager for testing isolation and role flows
  await User.deleteMany({ email: { $in: ['admin.alpha@cafestore.test', 'admin.beta@cafestore.test', 'manager.gamma@cafestore.test'] } });

  const adminA = await User.create({
    name: 'Admin Alpha',
    email: 'admin.alpha@cafestore.test',
    password: 'AlphaPassword123!',
    role: 'admin',
    tenantId: tenant._id,
  });

  const adminB = await User.create({
    name: 'Admin Beta',
    email: 'admin.beta@cafestore.test',
    password: 'BetaPassword123!',
    role: 'admin',
    tenantId: tenant._id,
  });

  const manager = await User.create({
    name: 'Manager Gamma',
    email: 'manager.gamma@cafestore.test',
    password: 'GammaPassword123!',
    role: 'manager',
    tenantId: tenant._id,
  });

  let tokenA;
  let tokenB;
  let tokenManager;
  let totpSecretA;
  let backupCodesA = [];

  // Helper login
  const login = async (email, password, twoFactorCode) => {
    return request('/api/auth/login', {
      method: 'POST',
      body: { email, password, twoFactorCode },
    });
  };

  // Initial login for admin A, B, and manager
  const resLoginA = await login('admin.alpha@cafestore.test', 'AlphaPassword123!');
  assert.equal(resLoginA.status, 200);
  tokenA = resLoginA.data.token;

  const resLoginB = await login('admin.beta@cafestore.test', 'BetaPassword123!');
  assert.equal(resLoginB.status, 200);
  tokenB = resLoginB.data.token;

  const resLoginMgr = await login('manager.gamma@cafestore.test', 'GammaPassword123!');
  assert.equal(resLoginMgr.status, 200);
  tokenManager = resLoginMgr.data.token;

  // 1. Initial State A: Not Configured
  await t.test('Scenario 1: Initial state is Not Configured', async () => {
    const statusRes = await request('/api/auth/2fa/status', { token: tokenA });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.data.status, 'not_configured');
    assert.equal(statusRes.data.enabled, false);
    assert.equal(statusRes.data.hasAuthenticator, false);
    assert.equal(statusRes.data.hasPendingSetup, false);
    assert.equal(statusRes.data.secret, undefined); // Secret is never exposed

    // Verification attempt without setup in progress fails
    const verifyWithoutSetup = await request('/api/auth/2fa/verify-setup', {
      method: 'POST',
      token: tokenA,
      body: { code: '123456' },
    });
    assert.equal(verifyWithoutSetup.status, 400);
  });

  // 2. Configure a new authenticator (POST /api/auth/2fa/setup)
  await t.test('Scenario 2: Initiate 2FA setup returns secret and QR code', async () => {
    const setupRes = await request('/api/auth/2fa/setup', {
      method: 'POST',
      token: tokenA,
    });
    assert.equal(setupRes.status, 200);
    assert.ok(setupRes.data.secret, 'Must return secret key for manual setup');
    assert.ok(setupRes.data.qrCode, 'Must return QR code data URL');
    assert.ok(setupRes.data.otpauthUrl, 'Must return otpauth URI');
    totpSecretA = setupRes.data.secret;

    // Status now reports pending setup
    const statusRes = await request('/api/auth/2fa/status', { token: tokenA });
    assert.equal(statusRes.data.hasPendingSetup, true);
    assert.equal(statusRes.data.status, 'not_configured');
  });

  // 3. Verify OTP: reject invalid code, accept valid code, return recovery codes
  await t.test('Scenario 3: Verify OTP activates 2FA and generates recovery codes', async () => {
    // 3a. Invalid code format
    const badFormatRes = await request('/api/auth/2fa/verify-setup', {
      method: 'POST',
      token: tokenA,
      body: { code: 'abc' },
    });
    assert.equal(badFormatRes.status, 400);

    // 3b. Incorrect code
    const wrongCodeRes = await request('/api/auth/2fa/verify-setup', {
      method: 'POST',
      token: tokenA,
      body: { code: '000000' },
    });
    assert.equal(wrongCodeRes.status, 400);
    assert.match(wrongCodeRes.data.error, /Invalid or expired/i);

    // 3c. Valid code generated with totpAt
    const validCode = totpAt(totpSecretA, Date.now());
    const validVerifyRes = await request('/api/auth/2fa/verify-setup', {
      method: 'POST',
      token: tokenA,
      body: { code: validCode },
    });
    assert.equal(validVerifyRes.status, 200);
    assert.equal(validVerifyRes.data.enabled, true);
    assert.equal(validVerifyRes.data.status, 'enabled');
    assert.ok(Array.isArray(validVerifyRes.data.recoveryCodes), 'Must return recovery codes');
    assert.equal(validVerifyRes.data.recoveryCodes.length, 8);
    backupCodesA = validVerifyRes.data.recoveryCodes;

    // 3d. Subsequent setup attempt rejected with 409
    const secondSetup = await request('/api/auth/2fa/setup', {
      method: 'POST',
      token: tokenA,
    });
    assert.equal(secondSetup.status, 409);
  });

  // 4. Status reflects State B: Configured / Enabled
  await t.test('Scenario 4: 2FA Status persists as Configured/Enabled', async () => {
    const statusRes = await request('/api/auth/2fa/status', { token: tokenA });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.data.status, 'enabled');
    assert.equal(statusRes.data.enabled, true);
    assert.equal(statusRes.data.hasAuthenticator, true);
    assert.equal(statusRes.data.hasPendingSetup, false);
    assert.ok(statusRes.data.verifiedAt);
    assert.equal(statusRes.data.secret, undefined); // Secret is NEVER returned
  });

  // 5. Log out and log back in requires 2FA
  await t.test('Scenario 5: Login requires 2FA code when enabled', async () => {
    // 5a. Login without code -> 401 with requiresTwoFactor
    const withoutCode = await login('admin.alpha@cafestore.test', 'AlphaPassword123!');
    assert.equal(withoutCode.status, 401);
    assert.equal(withoutCode.data.requiresTwoFactor, true);

    // 5b. Login with wrong code -> 401
    const wrongCode = await login('admin.alpha@cafestore.test', 'AlphaPassword123!', '999999');
    assert.equal(wrongCode.status, 401);
    assert.match(wrongCode.data.error, /Invalid or expired/i);

    // 5c. Login with valid TOTP code succeeds
    const currentCode = totpAt(totpSecretA, Date.now());
    const validLogin = await login('admin.alpha@cafestore.test', 'AlphaPassword123!', currentCode);
    assert.equal(validLogin.status, 200);
    assert.ok(validLogin.data.token);
    assert.equal(validLogin.data.user.twoFactorEnabled, true);
    assert.equal(validLogin.data.user.twoFactorStatus, 'enabled');

    tokenA = validLogin.data.token; // Update token
  });

  // 6. Replay prevention: replaying the same code within the same time step is rejected
  await t.test('Scenario 6: Replayed OTP code within the same step is rejected', async () => {
    const currentCode = totpAt(totpSecretA, Date.now());
    // Since currentCode was already used in Scenario 5 login:
    const replayLogin = await login('admin.alpha@cafestore.test', 'AlphaPassword123!', currentCode);
    assert.equal(replayLogin.status, 401);
    assert.match(replayLogin.data.error, /already used|Please wait for a new code/i);
  });

  // 7. Emergency recovery codes login
  await t.test('Scenario 7: Can log in using backup recovery code, which cannot be reused', async () => {
    const singleCode = backupCodesA[0];
    const recLogin = await login('admin.alpha@cafestore.test', 'AlphaPassword123!', singleCode);
    assert.equal(recLogin.status, 200);
    assert.ok(recLogin.data.token);

    // Reusing the same recovery code must fail
    const reuseRecLogin = await login('admin.alpha@cafestore.test', 'AlphaPassword123!', singleCode);
    assert.equal(reuseRecLogin.status, 401);
  });

  // 8. Disable 2FA (State B -> State C)
  await t.test('Scenario 8: Disable 2FA requires password + current OTP', async () => {
    // 8a. Missing password
    const noPass = await request('/api/auth/2fa/disable', {
      method: 'POST',
      token: tokenA,
      body: { code: '123456' },
    });
    assert.equal(noPass.status, 400);

    // 8b. Wrong password
    const wrongPass = await request('/api/auth/2fa/disable', {
      method: 'POST',
      token: tokenA,
      body: { password: 'WrongPassword!', code: '123456' },
    });
    assert.equal(wrongPass.status, 401);

    // 8c. Wrong OTP
    const wrongOtp = await request('/api/auth/2fa/disable', {
      method: 'POST',
      token: tokenA,
      body: { password: 'AlphaPassword123!', code: '000000' },
    });
    assert.equal(wrongOtp.status, 400);

    // 8d. Valid password + valid OTP
    const currentCode = totpAt(totpSecretA, Date.now());
    const disableRes = await request('/api/auth/2fa/disable', {
      method: 'POST',
      token: tokenA,
      body: { password: 'AlphaPassword123!', code: currentCode },
    });
    assert.equal(disableRes.status, 200);
    assert.equal(disableRes.data.status, 'disabled');
    assert.equal(disableRes.data.enabled, false);

    // 8e. Status check confirms State C: Disabled
    const statusRes = await request('/api/auth/2fa/status', { token: tokenA });
    assert.equal(statusRes.data.status, 'disabled');
    assert.equal(statusRes.data.enabled, false);
    assert.equal(statusRes.data.hasAuthenticator, true); // Secret kept for reactivation
  });

  // 9. Re-enable 2FA from Disabled state (State C -> State B)
  await t.test('Scenario 9: Re-enable 2FA from disabled state with password + OTP', async () => {
    // 9a. Wrong password
    const wrongPass = await request('/api/auth/2fa/enable', {
      method: 'POST',
      token: tokenA,
      body: { password: 'WrongPassword!', code: '123456' },
    });
    assert.equal(wrongPass.status, 401);

    // 9b. Wrong OTP
    const wrongOtp = await request('/api/auth/2fa/enable', {
      method: 'POST',
      token: tokenA,
      body: { password: 'AlphaPassword123!', code: '000000' },
    });
    assert.equal(wrongOtp.status, 400);

    // 9c. Valid password + OTP
    const currentCode = totpAt(totpSecretA, Date.now());
    const enableRes = await request('/api/auth/2fa/enable', {
      method: 'POST',
      token: tokenA,
      body: { password: 'AlphaPassword123!', code: currentCode },
    });
    assert.equal(enableRes.status, 200);
    assert.equal(enableRes.data.status, 'enabled');
    assert.equal(enableRes.data.enabled, true);

    const statusRes = await request('/api/auth/2fa/status', { token: tokenA });
    assert.equal(statusRes.data.status, 'enabled');
  });

  // 10. Remove Authenticator (State B/C -> State A: Not Configured)
  await t.test('Scenario 10: Remove Authenticator wipes secrets and returns to Not Configured', async () => {
    // 10a. Wrong password rejected
    const wrongPass = await request('/api/auth/2fa/authenticator', {
      method: 'DELETE',
      token: tokenA,
      body: { password: 'WrongPassword!', code: '123456' },
    });
    assert.equal(wrongPass.status, 401);

    // 10b. Wrong OTP rejected
    const wrongOtp = await request('/api/auth/2fa/authenticator', {
      method: 'DELETE',
      token: tokenA,
      body: { password: 'AlphaPassword123!', code: '000000' },
    });
    assert.equal(wrongOtp.status, 400);

    // 10c. Valid password + OTP removes authenticator
    const currentCode = totpAt(totpSecretA, Date.now());
    const removeRes = await request('/api/auth/2fa/authenticator', {
      method: 'DELETE',
      token: tokenA,
      body: { password: 'AlphaPassword123!', code: currentCode },
    });
    assert.equal(removeRes.status, 200);
    assert.equal(removeRes.data.status, 'not_configured');
    assert.equal(removeRes.data.hasAuthenticator, false);

    // 10d. Verify database state is completely cleared
    const rawUser = await User.findById(adminA._id).select('+twoFactorSecretEncrypted +twoFactorPendingSecretEncrypted +recoveryCodes');
    assert.equal(rawUser.twoFactorEnabled, false);
    assert.equal(rawUser.twoFactorSecretEncrypted, '');
    assert.equal(rawUser.twoFactorPendingSecretEncrypted, '');
    assert.equal(rawUser.recoveryCodes.length, 0);

    // 10e. Fresh setup can now be started without 409 conflict
    const freshSetupRes = await request('/api/auth/2fa/setup', {
      method: 'POST',
      token: tokenA,
    });
    assert.equal(freshSetupRes.status, 200);
    assert.ok(freshSetupRes.data.secret);
  });

  // 11. Multi-admin isolation
  await t.test('Scenario 11: Admin A and Admin B have strictly isolated 2FA states', async () => {
    // Admin B is unconfigured
    const statusB = await request('/api/auth/2fa/status', { token: tokenB });
    assert.equal(statusB.data.status, 'not_configured');
    assert.equal(statusB.data.enabled, false);

    // Unauthenticated requests are rejected
    const unauth = await request('/api/auth/2fa/status');
    assert.equal(unauth.status, 401);
  });

  // 12. Non-2FA users (e.g. manager) can log in normally
  await t.test('Scenario 12: Manager without 2FA logs in directly without 2FA prompt', async () => {
    const mgrLogin = await login('manager.gamma@cafestore.test', 'GammaPassword123!');
    assert.equal(mgrLogin.status, 200);
    assert.ok(mgrLogin.data.token);
    assert.equal(mgrLogin.data.user.twoFactorEnabled, false);
    assert.equal(mgrLogin.data.requiresTwoFactor, undefined);
  });

  await mongoose.connection.close();
  server.close();
});
