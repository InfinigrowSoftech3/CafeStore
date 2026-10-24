/**
 * Structured server-side logger.
 *
 * Emits one JSON object per log line to stdout so log aggregators (Render, Sentry,
 * Cloudflare Logpush, etc.) can ingest fields directly. Secrets, passwords, tokens
 * and authorization headers are never logged.
 *
 * Usage:
 *   import { log, logLoginFailure, logRouteNotFound } from './logger.js';
 *   log('auth.login_failed', { reason: 'user_not_found', ip, email, requestId });
 *   logRouteNotFound(req);
 */

const SECRET_KEY = /password|token|secret|authorization|cookie|refresh|credential/i;

const redact = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (SECRET_KEY.test(String(key))) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redact(val);
      }
    }
    return out;
  }
  return value;
};

const buildEntry = (event, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: meta.level || 'info',
    event,
  };
  if (meta.requestId) entry.requestId = meta.requestId;
  if (meta.reason) entry.reason = meta.reason;
  if (meta.status) entry.status = meta.status;
  if (meta.path) entry.path = meta.path;
  if (meta.method) entry.method = meta.method;
  if (meta.ip) entry.ip = meta.ip;
  if (meta.email) entry.email = meta.email; // email is not a secret
  if (meta.role) entry.role = meta.role;
  if (meta.userId) entry.userId = meta.userId;
  if (meta.tenantId) entry.tenantId = meta.tenantId;
  if (Object.prototype.hasOwnProperty.call(meta, 'meta')) entry.meta = redact(meta.meta);
  return entry;
};

export const log = (event, meta = {}) => {
  console.log(JSON.stringify(buildEntry(event, meta)));
};

export const logLoginFailure = (req, reason, meta = {}) => {
  log('auth.login_failed', {
    level: 'warn',
    reason,
    path: req.path,
    method: req.method,
    ip: req.ip,
    email: req.body?.email ? String(req.body.email).trim().toLowerCase() : undefined,
    requestId: req.requestId,
    meta: redact(meta),
  });
};

export const logLoginSuccess = (req, meta = {}) => {
  log('auth.login_success', {
    level: 'info',
    path: req.path,
    method: req.method,
    ip: req.ip,
    email: req.body?.email ? String(req.body.email).trim().toLowerCase() : undefined,
    requestId: req.requestId,
    userId: meta.userId,
    tenantId: meta.tenantId,
    role: meta.role,
  });
};

export const logRouteNotFound = (req) => {
  log('http.route_not_found', {
    level: 'warn',
    path: req.path,
    method: req.method,
    ip: req.ip,
    requestId: req.requestId,
  });
};
