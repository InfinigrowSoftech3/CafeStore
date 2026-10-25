import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { tenantFromAuthenticatedUser } from './tenant.js';
import { runWithSystemTenantAccess } from '../utils/tenantContext.js';
import { getRedisClient } from '../config/redis.js';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT secret is not configured or is too short.');
  }
  return secret;
};

// Per-IP + account login attempt tracker & lockout via Redis (atomic INCR + EXPIRE):
const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 mins
const LOCKOUT_DURATION_SECONDS = 30 * 60; // 30 mins

const INCR_EXPIRE_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

const getLockoutKeys = (ip, account) => {
  const normIp = String(ip || 'unknown').trim().toLowerCase();
  const normAccount = String(account || 'general').trim().toLowerCase();
  return {
    attemptsKey: `auth:attempts:${normIp}:${normAccount}`,
    lockoutKey: `auth:lockout:${normIp}:${normAccount}`,
  };
};

export const checkLoginLockout = async (ip, account) => {
  if (!ip || ip === 'unknown') return false;

  const redis = getRedisClient();
  if (!redis || typeof redis.get !== 'function') return false;
  if (redis.status && !['ready', 'connect', 'connecting'].includes(redis.status)) return false;

  const { attemptsKey, lockoutKey } = getLockoutKeys(ip, account);
  try {
    const isLocked = await Promise.race([
      redis.get(lockoutKey),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500)),
    ]);
    if (isLocked) return true;
    const attempts = await Promise.race([
      redis.get(attemptsKey),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500)),
    ]);
    if (attempts && parseInt(attempts, 10) >= LOCKOUT_THRESHOLD) {
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Auth Lockout] Redis check failed:', err.message);
    return false;
  }
};

export const checkIpLockout = checkLoginLockout;

export const recordLoginAttempt = async (ip, success, account) => {
  if (!ip || ip === 'unknown') return;

  const redis = getRedisClient();
  if (!redis) return;

  const { attemptsKey, lockoutKey } = getLockoutKeys(ip, account);
  try {
    if (success) {
      await redis.del(attemptsKey, lockoutKey);
      return;
    }

    let count;
    if (typeof redis.eval === 'function') {
      try {
        count = await redis.eval(INCR_EXPIRE_LUA, 1, attemptsKey, LOCKOUT_WINDOW_SECONDS);
      } catch {
        count = await redis.incr(attemptsKey);
        if (count === 1) {
          await redis.expire(attemptsKey, LOCKOUT_WINDOW_SECONDS);
        }
      }
    } else {
      count = await redis.incr(attemptsKey);
      if (count === 1) {
        await redis.expire(attemptsKey, LOCKOUT_WINDOW_SECONDS);
      }
    }

    if (count >= LOCKOUT_THRESHOLD) {
      await redis.set(lockoutKey, '1', 'EX', LOCKOUT_DURATION_SECONDS);
    }
  } catch (err) {
    console.warn('[Auth Lockout] Redis record failed:', err.message);
  }
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  if (req.cookies && req.cookies.brewhaus_access_token) return req.cookies.brewhaus_access_token;

  return null;
};

export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required.',
        },
        message: 'Authentication is required.',
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.tokenUse !== 'access') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication token is invalid or expired.',
        },
        message: 'Authentication token is invalid or expired.',
      });
    }
    if (!req.tenantId && decoded.tenantId) {
      req.tenantId = decoded.tenantId;
    }
    if (decoded.tenantId && req.tenantId && String(decoded.tenantId) !== String(req.tenantId)) {
      return res.status(404).json({ error: 'Café not found.', code: 'TENANT_NOT_FOUND' });
    }

    const user = await runWithSystemTenantAccess(async () => {
      return User.findById(decoded.id).select('-password');
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User not found.',
        },
        message: 'User not found.',
      });
    }

    if (user.tenantId && req.tenantId && String(user.tenantId) !== String(req.tenantId)) {
      return res.status(404).json({ error: 'Café not found.', code: 'TENANT_NOT_FOUND' });
    }
    req.user = user;
    if (decoded.impersonatedBy) {
      req.impersonatedBy = decoded.impersonatedBy;
      req.user.impersonatedBy = decoded.impersonatedBy;
    }
    return tenantFromAuthenticatedUser(req, res, next);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication token is invalid or expired.',
        },
        message: 'Token expired. Please login again.',
      });
    }
    if (error.message.includes('JWT secret')) {
      return res.status(500).json({ error: 'Server authentication is misconfigured.' });
    }
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid or expired.',
      },
      message: 'Invalid token.',
    });
  }
};

export const adminOnly = (req, res, next) => {
  return authorizeRoles('owner')(req, res, next);
};

export const staffOrAdmin = (req, res, next) => {
  return authorizeRoles('owner', 'manager', 'cashier', 'kitchen')(req, res, next);
};

export const effectiveRole = (user) => ({ admin: 'owner', staff: 'manager' }[user?.role] || user?.role);

export const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  const role = effectiveRole(req.user);
  if (!role || !allowedRoles.includes(role)) return res.status(403).json({ error: 'Your role is not allowed to perform this action.' });
  next();
};

export const ownerOrManager = authorizeRoles('owner', 'manager');
export const orderReaders = authorizeRoles('owner', 'manager', 'cashier', 'kitchen');
export const kitchenStaff = authorizeRoles('owner', 'manager', 'kitchen');
export const cashiers = authorizeRoles('owner', 'manager', 'cashier');
export const tableServiceStaff = authorizeRoles('owner', 'manager', 'cashier', 'kitchen');

export const checkIpLockoutForLogin = checkIpLockout;
export const recordLoginAttemptForIp = recordLoginAttempt;
