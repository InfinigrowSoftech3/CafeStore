import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Tenant from '../models/Tenant.js';
import AuditEvent from '../models/AuditEvent.js';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';
import { runWithSystemTenantAccess } from '../utils/tenantContext.js';
import { effectiveRole, protect, authorizeRoles, checkIpLockoutForLogin, recordLoginAttemptForIp } from '../middleware/auth.js';
import {
  createAccessToken,
  createRefreshToken,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  generateTotpSecret,
  verifyTotpCode,
} from '../utils/authTokens.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { sendSms } from '../services/smsService.js';
import { getRedisClient } from '../config/redis.js';
import { publicTenantSettings } from '../utils/tenantSecrets.js';

const router = express.Router();

export const setSessionCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
  res.cookie('brewhaus_access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('brewhaus_refresh_token', refreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_TTL_MS });
  res.clearCookie('brewhaus_admin_token', cookieOptions);
};

const clearAuthCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const options = { path: '/', httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax' };
  for (const name of ['brewhaus_access_token', 'brewhaus_refresh_token', 'brewhaus_admin_token']) res.clearCookie(name, options);
};

const issueSession = async (user, res) => {
  const accessToken = createAccessToken(user._id, user.tenantId);
  const refreshToken = createRefreshToken();
  await runWithSystemTenantAccess(async () => {
    user.refreshTokenHash = hashRefreshToken(refreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await user.save();
  });
  setSessionCookies(res, accessToken, refreshToken);
  return accessToken;
};

const publicUser = (user, tenant = null) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  tenantId: user.tenantId,
  tenantName: tenant ? (tenant.settings?.cafeName || tenant.name) : undefined,
  tenantSlug: tenant?.slug,
  tenant: tenant ? publicTenantSettings(tenant) : undefined,
});

const recordLoginFailure = async (user) => {
  await runWithSystemTenantAccess(async () => {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) user.loginLockUntil = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
  });
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (await checkIpLockoutForLogin(clientIp, normalizedEmail)) {
      return res.status(429).json({ error: 'Too many failed login attempts from this IP. Try again later.', code: 'IP_LOCKED' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await runWithSystemTenantAccess(async () => {
      return User.findOne({ email: normalizedEmail }).select('+password +failedLoginAttempts +loginLockUntil +twoFactorSecretEncrypted');
    });
    if (!user) {
      recordLoginAttemptForIp(clientIp, false, normalizedEmail).catch((err) => console.error('[Auth] Lockout record error:', err.message));
      runWithSystemTenantAccess(async () => {
        try {
          const defaultTenant = await Tenant.findOne({ slug: String(process.env.TENANT_DEFAULT_SLUG || 'brewhaus').toLowerCase() }).select('_id');
          if (defaultTenant) {
            await AuditEvent.create({
              tenantId: defaultTenant._id,
              actorId: null,
              actorEmail: normalizedEmail,
              actorRole: 'unknown',
              action: 'auth.login_failed',
              targetType: 'User',
              targetId: '',
              details: { ip: clientIp, reason: 'user_not_found' },
            });
          }
        } catch { /* ignore audit failure for missing tenant */ }
      }).catch((err) => console.error('[Audit] Log error:', err.message));
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.loginLockUntil && user.loginLockUntil > new Date()) {
      recordLoginAttemptForIp(clientIp, false, normalizedEmail).catch((err) => console.error('[Auth] Lockout record error:', err.message));
      return res.status(423).json({ error: 'Login is temporarily locked. Try again later.', code: 'LOGIN_LOCKED' });
    }

    if (user.tenantId) {
      const tenant = await runWithSystemTenantAccess(async () => Tenant.findById(user.tenantId).lean());
      if (tenant && tenant.status !== 'active') {
        return res.status(423).json({ error: 'This café account is suspended.', code: 'TENANT_SUSPENDED' });
      }
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      recordLoginFailure(user).catch((err) => console.error('[Auth] Record login failure error:', err.message));
      recordLoginAttemptForIp(clientIp, false, normalizedEmail).catch((err) => console.error('[Auth] Lockout record error:', err.message));
      runWithSystemTenantAccess(async () => {
        await AuditEvent.create({
          tenantId: user.tenantId,
          actorId: user._id,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'auth.login_failed',
          targetType: 'User',
          targetId: user._id,
          details: { ip: clientIp, reason: 'invalid_password' },
        });
      }).catch((err) => console.error('[Audit] Log error:', err.message));
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.twoFactorEnabled && effectiveRole(user) === 'owner') {
      const secret = decryptTwoFactorSecret(user.twoFactorSecretEncrypted);
      if (!verifyTotpCode(secret, req.body?.twoFactorCode)) {
        recordLoginFailure(user).catch((err) => console.error('[Auth] Record login failure error:', err.message));
        recordLoginAttemptForIp(clientIp, false, normalizedEmail).catch((err) => console.error('[Auth] Lockout record error:', err.message));
        runWithSystemTenantAccess(async () => {
          await AuditEvent.create({
            tenantId: user.tenantId,
            actorId: user._id,
            actorEmail: user.email,
            actorRole: user.role,
            action: 'auth.login_failed',
            targetType: 'User',
            targetId: user._id,
            details: { ip: clientIp, reason: 'invalid_2fa' },
          });
        }).catch((err) => console.error('[Audit] Log error:', err.message));
        return res.status(401).json({ error: 'A valid authenticator code is required.', code: 'TWO_FACTOR_REQUIRED' });
      }
    }

    // Reset login lock & failed attempts on successful login.
    // Await this save so it cannot overlap with the refresh-token save in issueSession().
    await runWithSystemTenantAccess(async () => {
      user.failedLoginAttempts = 0;
      user.loginLockUntil = null;
      await user.save();
    }).catch((err) => console.error('[Auth] Reset failed attempts error:', err.message));

    runWithSystemTenantAccess(async () => {
      await AuditEvent.create({
        tenantId: user.tenantId,
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'auth.login_success',
        targetType: 'User',
        targetId: user._id,
        details: { ip: clientIp },
      });
    }).catch((err) => console.error('[Audit] Log login_success error:', err.message));

    recordLoginAttemptForIp(clientIp, true, normalizedEmail).catch((err) => console.error('[Auth] Lockout record error:', err.message));
    const token = await issueSession(user, res);
    const tenant = user.tenantId
      ? await runWithSystemTenantAccess(async () => Tenant.findById(user.tenantId).lean())
      : null;

    const userRole = (user.role === 'owner' || user.role === 'admin') ? 'CAFE_ADMIN' : user.role.toUpperCase();
    const cafes = tenant ? [{
      id: String(tenant._id),
      name: tenant.settings?.cafeName || tenant.name,
      role: (user.role || 'owner').toUpperCase(),
    }] : [];

    res.json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          role: userRole,
          tenantName: tenant ? (tenant.settings?.cafeName || tenant.name) : undefined,
          tenantSlug: tenant?.slug,
        },
        cafes,
        accessToken: token,
      },
      token,
      accessToken: token,
      user: {
        ...publicUser(user, tenant),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error.message.includes('JWT secret')) {
      return res.status(500).json({ error: 'Authentication is not configured on the server.' });
    }
    res.status(500).json({ error: 'Server error during login.' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.brewhaus_refresh_token;
  if (refreshToken) {
    await User.updateOne({ refreshTokenHash: hashRefreshToken(refreshToken) }, { $set: { refreshTokenHash: '', refreshTokenExpiresAt: null } }).catch(() => {});
  }
  clearAuthCookie(res);
  res.json({ success: true });
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.brewhaus_refresh_token;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh session is missing.' });
  const providedHash = hashRefreshToken(refreshToken);
  const user = await runWithSystemTenantAccess(async () => {
    return User.findOne({ refreshTokenHash: providedHash, refreshTokenExpiresAt: { $gt: new Date() } }).select('+refreshTokenHash +refreshTokenExpiresAt');
  });
  if (!user) {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Refresh session has expired. Please sign in again.' });
  }
  try {
    // Token reuse detection: if the hash in DB doesn't match the provided hash, token was reused
    if (user.refreshTokenHash !== providedHash) {
      // Token reuse detected — revoke all sessions for this user
      await runWithSystemTenantAccess(async () => {
        await User.updateOne({ _id: user._id }, { $set: { refreshTokenHash: '', refreshTokenExpiresAt: null } });
        await AuditEvent.create({
          tenantId: user.tenantId,
          actorId: user._id,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'auth.token_reuse_detected',
          targetType: 'User',
          targetId: user._id,
          details: { ip: req.ip },
        });
      });
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Session invalidated due to token reuse. Please log in again.' });
    }

    // Rotate: generate new refresh token, invalidate old
    const newRefreshToken = createRefreshToken();
    user.refreshTokenHash = hashRefreshToken(newRefreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await user.save();

    const token = await issueSession(user, res);
    const tenant = user.tenantId
      ? await runWithSystemTenantAccess(async () => Tenant.findById(user.tenantId).lean())
      : null;
    return res.json({ token, user: publicUser(user, tenant) });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to refresh the admin session.' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const tenant = req.user?.tenantId
    ? await runWithSystemTenantAccess(async () => Tenant.findById(req.user.tenantId).lean())
    : null;
  res.json({
    user: {
      ...publicUser(req.user, tenant),
      impersonatedBy: req.impersonatedBy || null,
    },
  });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(400).json({ error: 'Email is already in use by another account.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: String(name).trim(), email: normalizedEmail },
      { new: true, runValidators: true }
    );

    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/auth/password
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

router.post('/2fa/setup', protect, authorizeRoles('owner'), async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorSecretEncrypted');
  if (user.twoFactorEnabled) return res.status(409).json({ error: 'Disable two-factor authentication before replacing its authenticator.' });
  const secret = generateTotpSecret();
  user.twoFactorSecretEncrypted = encryptTwoFactorSecret(secret);
  await user.save();
  const label = encodeURIComponent(`${user.email} (${req.tenant.name})`);
  const issuer = encodeURIComponent(req.tenant.name);
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  const qrCode = await QRCode.toDataURL(otpauthUrl, { width: 260, margin: 1 });
  return res.json({ secret, otpauthUrl, qrCode, enabled: Boolean(user.twoFactorEnabled) });
});

router.post('/2fa/enable', protect, authorizeRoles('owner'), async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorSecretEncrypted');
  if (!user.twoFactorSecretEncrypted) return res.status(409).json({ error: 'Set up an authenticator before enabling two-factor authentication.' });
  if (!verifyTotpCode(decryptTwoFactorSecret(user.twoFactorSecretEncrypted), req.body?.code)) return res.status(400).json({ error: 'Authenticator code is invalid.' });
  user.twoFactorEnabled = true;
  await user.save();
  return res.json({ enabled: true });
});

router.post('/2fa/disable', protect, authorizeRoles('owner'), async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorSecretEncrypted');
  if (!user.twoFactorEnabled || !verifyTotpCode(decryptTwoFactorSecret(user.twoFactorSecretEncrypted), req.body?.code)) return res.status(400).json({ error: 'Authenticator code is invalid.' });
  user.twoFactorEnabled = false;
  user.twoFactorSecretEncrypted = '';
  await user.save();
  return res.json({ enabled: false });
});

// POST /api/auth/setup (first-time admin setup)
// SECURITY: Requires ADMIN_SETUP_SECRET to prevent unauthorized admin creation
router.post('/setup', async (req, res) => {
  try {
    const setupSecret = process.env.ADMIN_SETUP_SECRET;

    // Setup endpoint disabled if secret is not configured
    if (!setupSecret || setupSecret === 'your_setup_secret_here') {
      return res.status(403).json({ error: 'Admin setup is not available.' });
    }

    const { name, email, password, setupToken } = req.body;

    // Verify setup token
    if (!setupToken || setupToken !== setupSecret) {
      return res.status(401).json({ error: 'Invalid or missing setup token.' });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: { $in: ['owner', 'admin'] } });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists. Setup cannot be repeated.' });
    }

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (String(password).length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters.' });
    }
      // Password complexity: min 12 chars, upper, lower, number, symbol
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{12,}$/.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 12 characters with uppercase, lowercase, number, and symbol.' });
      }

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password,
      role: 'owner',
    });

    const token = await issueSession(user, res);

    res.status(201).json({
      token,
      user: {
        ...publicUser(user),
      },
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await runWithSystemTenantAccess(async () => {
      return User.findOne({ email: normalizedEmail });
    });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    await runWithSystemTenantAccess(async () => {
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();
    });

    const baseAppUrl = process.env.ADMIN_APP_URL || process.env.CUSTOMER_APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${baseAppUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;
    try {
      await sendPasswordResetEmail({ to: normalizedEmail, resetUrl });
    } catch (mailErr) {
      console.error('[auth] Failed to send password reset email:', mailErr.message);
    }

    // For development, return token in response (remove in production)
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ success: true, message: 'Reset token generated.', devToken: resetToken });
    }

    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) {
      return res.status(400).json({ error: 'Token, email, and new password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await runWithSystemTenantAccess(async () => {
      return User.findOne({
        email: normalizedEmail,
        resetPasswordToken: hashedToken,
        resetPasswordExpiresAt: { $gt: new Date() },
      }).select('+password');
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    if (String(password).length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters.' });
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{12,}$/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 12 characters with uppercase, lowercase, number, and symbol.' });
    }

    await runWithSystemTenantAccess(async () => {
      user.password = password;
      user.resetPasswordToken = '';
      user.resetPasswordExpiresAt = null;
      user.failedLoginAttempts = 0;
      user.loginLockUntil = null;
      await user.save();

      // Revoke all existing sessions
      user.refreshTokenHash = '';
      user.refreshTokenExpiresAt = null;
      await user.save();

      await AuditEvent.create({
        tenantId: user.tenantId,
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'auth.password_reset',
        targetType: 'User',
        targetId: user._id,
        details: { method: 'forgot_password' },
      });
    });

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_SEC = 60; // 60 seconds
const OTP_MAX_ATTEMPTS = 5;

const getOtpCooldown = async (phone) => {
  const redis = getRedisClient();
  if (!redis) return null;
  const key = `brewhaus:otp:cooldown:${phone}`;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
};

const setOtpCooldown = async (phone, seconds = OTP_RESEND_COOLDOWN_SEC) => {
  const redis = getRedisClient();
  if (!redis) return;
  const key = `brewhaus:otp:cooldown:${phone}`;
  try {
    await redis.set(key, '1', 'EX', seconds);
  } catch {
    // Non-fatal
  }
};

const getOtpAttempts = async (phone) => {
  const redis = getRedisClient();
  if (!redis) return 0;
  const key = `brewhaus:otp:attempts:${phone}`;
  try {
    const val = await redis.get(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
};

const incrementOtpAttempts = async (phone, ttlSeconds = 300) => {
  const redis = getRedisClient();
  if (!redis) return 1;
  const key = `brewhaus:otp:attempts:${phone}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttlSeconds);
    return count;
  } catch {
    return 1;
  }
};

const clearOtpAttempts = async (phone) => {
  const redis = getRedisClient();
  if (!redis) return;
  const key = `brewhaus:otp:attempts:${phone}`;
  try {
    await redis.del(key);
  } catch {
    // Non-fatal
  }
};

const hashOtp = (code) => {
  const secret = process.env.JWT_SECRET || 'brewhaus-otp-secret-min32chars';
  return crypto.createHmac('sha256', secret).update(String(code)).digest('hex');
};

const verifyOtpHash = (inputCode, storedHash) => {
  if (!inputCode || !storedHash) return false;
  const inputHash = hashOtp(inputCode);
  const inputBuffer = Buffer.from(inputHash);
  const storedBuffer = Buffer.from(storedHash);
  if (inputBuffer.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(inputBuffer, storedBuffer);
};

// POST /api/auth/send-otp — Send OTP to phone for login
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) return res.status(400).json({ error: 'Invalid phone number format.' });

    // Check resend cooldown
    const cooldownActive = await getOtpCooldown(normalizedPhone);
    if (cooldownActive) {
      return res.status(429).json({ error: 'Please wait a minute before requesting another OTP.' });
    }

    // Find or create customer
    let customer = await Customer.findOne({ phone: normalizedPhone });
    if (!customer) {
      customer = await Customer.create({
        name: 'Guest',
        phone: normalizedPhone,
      });
    }

    // Generate 6-digit OTP
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS); // 5 minutes

    customer.otpCode = hashOtp(otpCode);
    customer.otpExpiresAt = otpExpiresAt;
    customer.otpVerified = false;
    await customer.save();

    // Reset attempt counter on fresh OTP issue
    await clearOtpAttempts(normalizedPhone);
    await setOtpCooldown(normalizedPhone, OTP_RESEND_COOLDOWN_SEC);

    const isProduction = process.env.NODE_ENV === 'production';
    const canLogDevCode = !isProduction && (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_OTP === 'true'));

    // Outside production, dev verification code logged only when NODE_ENV=development and ALLOW_DEV_OTP=true
    if (canLogDevCode) {
      console.log(`[auth/send-otp] Dev verification code for ${normalizedPhone}: ${otpCode}`);
    }

    // Dispatch SMS via provider
    let smsDispatched = false;
    let smsError = null;
    try {
      await sendSms({
        to: normalizedPhone,
        message: `Your BrewHaus verification code is ${otpCode}. Valid for 5 minutes.`,
      });
      smsDispatched = true;
    } catch (err) {
      smsError = err.message;
    }

    if (!smsDispatched && !canLogDevCode) {
      console.error(`[auth/send-otp] SMS delivery to ${normalizedPhone} failed: ${smsError || 'Provider unconfigured'}`);
      return res.status(503).json({ error: 'SMS service is currently unavailable. Please try again later.' });
    }

    res.json({
      success: true,
      message: 'OTP sent to your phone.',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// POST /api/auth/verify-otp — Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required.' });

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) return res.status(400).json({ error: 'Invalid phone number format.' });

    const attempts = await incrementOtpAttempts(normalizedPhone, 300);
    if (attempts > OTP_MAX_ATTEMPTS) {
      await Customer.updateOne(
        { phone: normalizedPhone },
        { $set: { otpCode: '', otpExpiresAt: null } }
      );
      return res.status(429).json({ error: 'Maximum verification attempts exceeded. Please request a new OTP.' });
    }

    const customer = await Customer.findOne({ phone: normalizedPhone }).select('+otpCode +otpExpiresAt');
    if (!customer) return res.status(404).json({ error: 'No account found with this phone number.' });

    if (!customer.otpCode || !customer.otpExpiresAt) {
      return res.status(400).json({ error: 'No active OTP found. Please request a new OTP.' });
    }

    if (customer.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired.' });
    }

    // Check hashed OTP with timingSafeEqual
    const isValid = verifyOtpHash(otp, customer.otpCode);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    // Mark OTP as verified and reset attempts
    await clearOtpAttempts(normalizedPhone);
    customer.otpVerified = true;
    customer.otpCode = '';
    customer.otpExpiresAt = null;
    await customer.save();

    // Issue session tokens (reuse issueSession from User auth)
    const User = (await import('../models/User.js')).default;
    const tempUser = await User.create({
      tenantId: req.tenantId,
      name: customer.name,
      email: customer.email || `${customer.phone}@guest.local`,
      password: crypto.randomBytes(32).toString('hex'), // Random password for guest accounts
      role: 'customer',
      roleAssignments: [{ role: 'customer' }],
    });

    const token = await issueSession(tempUser, res);
    
    res.json({
      token,
      accessToken: token,
      user: {
        ...publicUser(tempUser),
        customerId: customer._id,
        isGuest: true,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

export default router;
