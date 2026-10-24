import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import { findDefaultTenant } from '../utils/defaultTenant.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { verifyTableQrToken } from '../utils/tableQr.js';

const cleanHost = (value) => String(value || '').split(',')[0].trim().split(':')[0].toLowerCase();

const getSlugFromHost = (host) => {
  const baseDomain = String(process.env.TENANT_BASE_DOMAIN || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  if (baseDomain && host.endsWith(`.${baseDomain}`)) {
    const prefix = host.slice(0, -(baseDomain.length + 1));
    if (prefix && !prefix.includes('.') && prefix !== 'admin' && prefix !== 'www' && prefix !== 'cafe') return prefix;
  }
  if (host.endsWith('.localhost')) {
    const prefix = host.slice(0, -'.localhost'.length);
    if (prefix && !prefix.includes('.') && prefix !== 'admin' && prefix !== 'www' && prefix !== 'cafe') return prefix;
  }
  return null;
};

const isCustomerTenantHost = (host) => {
  if (host.endsWith('.localhost')) {
    const prefix = host.slice(0, -'.localhost'.length);
    return Boolean(prefix) && !prefix.includes('.') && prefix !== 'admin' && prefix !== 'www' && prefix !== 'cafe';
  }
  const baseDomain = String(process.env.TENANT_BASE_DOMAIN || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  return Boolean(baseDomain && host.endsWith(`.${baseDomain}`) && !host.slice(0, -(baseDomain.length + 1)).startsWith('admin.'));
};

const isAllowedTenantHost = (host) => {
  if (!host) return false;
  const clean = cleanHost(host);
  if (!clean) return false;
  if (['development', 'test'].includes(process.env.NODE_ENV) || !process.env.NODE_ENV) {
    if (clean === 'localhost' || clean.endsWith('.localhost') || clean === '127.0.0.1') return true;
  }
  const baseDomain = String(process.env.TENANT_BASE_DOMAIN || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  if (baseDomain && (clean === baseDomain || clean.endsWith(`.${baseDomain}`))) return true;

  // Explicit allowed frontend hosts
  for (const urlStr of [
    process.env.CLIENT_URL,
    process.env.CUSTOMER_APP_URL,
    process.env.ADMIN_CLIENT_URL,
    process.env.ADMIN_APP_URL,
    process.env.CLIENT_URLS,
    process.env.ADMIN_CLIENT_URLS,
  ]) {
    if (!urlStr) continue;
    for (const item of String(urlStr).split(',')) {
      try {
        const parsed = new URL(item.trim());
        if (cleanHost(parsed.hostname) === clean) return true;
      } catch (_err) {
        // Ignore malformed configured URLs and continue checking the remaining entries.
      }
    }
  }
  return false;
};

const cleanTenantError = (res, status, message) => res.status(status).json({ error: message, code: status === 423 ? 'TENANT_SUSPENDED' : 'TENANT_NOT_FOUND' });

/**
 * Checks whether a request path is customer-facing.
 * Customer routes are strictly unauthenticated and tenant-scoped by slug or tableToken.
 * They MUST ignore any Authorization header or admin session cookie.
 */
export const isCustomerPublicRoute = (req) => {
  const p = req.path;
  if (p.startsWith('/api/public') || p.startsWith('/public')) return true;
  if (p === '/api/menu' || p.startsWith('/api/menu/')) {
    return req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  }
  if (p === '/api/categories') {
    return req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  }
  if (p === '/api/orders' && req.method === 'POST') return true;
  if (p.startsWith('/api/orders/') && (p.endsWith('/receipt') || req.query.accessToken)) return true;
  if (p === '/api/tables/qr/validate') return true;
  if (p.startsWith('/api/tables/') && (p.endsWith('/call-waiter') || p.endsWith('/request-bill'))) return true;
  // Customer-scoped dining-session endpoints (unauthenticated, tenant-scoped by
  // slug/tableToken). Staff-only session endpoints are intentionally excluded below
  // so tenantResolver derives the café from the authenticated staff token instead of
  // falling back to the default café (which previously caused a misleading 404).
  if (p === '/api/session' && req.method === 'POST') return true;
  if (p === '/api/session/validate') return true;
  if (p === '/api/session/bill') return true;
  if (p === '/api/session/request' && req.method === 'POST') return true;
  if (p === '/api/session/bill/receipt-data') return true;
  if (p === '/api/session/bill/receipt') return true;
  if (p === '/api/session/bill/cash' && req.method === 'POST') return true;
  if (p === '/api/session/bill/payment/create' && req.method === 'POST') return true;
  if (p === '/api/session/bill/payment/verify' && req.method === 'POST') return true;
  if (p === '/api/gallery' && req.method === 'GET') return true;
  if (p === '/api/reviews' && (req.method === 'GET' || req.method === 'POST')) return true;
  if (p === '/api/coupons/validate') return true;
  if (p === '/api/contact' && req.method === 'POST') return true;
  if (p === '/api/tenant' && req.method === 'GET') return true;
  if (p.startsWith('/api/payment/') && p !== '/api/payment/webhook') return true;
  return false;
};

export const tenantResolver = async (req, res, next) => {
  if (
    req.path === '/health' ||
    req.path === '/api/health' ||
    req.path === '/ready' ||
    req.path === '/api/ready' ||
    req.path === '/readyz' ||
    req.path === '/api/readyz' ||
    req.path === '/api/debug/ip' ||
    req.path.startsWith('/api/platform') ||
    req.path === '/api/billing/webhook' ||
    req.path === '/api/auth/me' ||
    req.path === '/api/auth/refresh' ||
    req.path === '/api/auth/login' ||
    req.path === '/api/auth/logout' ||
    req.path === '/api/auth/forgot-password' ||
    req.path === '/api/auth/reset-password' ||
    req.path.startsWith('/api/public') ||
    req.path.startsWith('/public') ||
    req.path === '/api/cafes'
  ) {
    return next();
  }
  try {
    let tenant = null;
    let tenantId = null;

    // 1. URL search params have HIGHEST priority for tenant identity (?cafe=..., ?cafeSlug=..., ?slug=..., ?tenant=...)
    const querySlug = String(
      req.query?.cafe ||
      req.query?.cafeSlug ||
      req.query?.slug ||
      req.query?.tenant ||
      req.query?.cafeId ||
      ''
    ).trim();

    if (querySlug) {
      if (mongoose.isValidObjectId(querySlug)) {
        tenant = await Tenant.findById(querySlug).lean();
      }
      if (!tenant) {
        tenant = await Tenant.findOne({ slug: querySlug.toLowerCase() }).lean();
      }
      if (!tenant) {
        // Explicit slug requested but not found -> strictly return 404. Never fall back to anything else!
        return cleanTenantError(res, 404, 'Café not found. Please scan a table QR code or specify a valid café.');
      }
      tenantId = tenant._id;
    }

    // 2. Explicit X-Tenant-Slug header or body cafeSlug
    if (!tenant) {
      const headerTenantSlug = req.headers['x-tenant-slug'] || req.body?.cafeSlug;
      if (headerTenantSlug) {
        const rawSlug = String(headerTenantSlug).trim();
        if (mongoose.isValidObjectId(rawSlug)) {
          tenant = await Tenant.findById(rawSlug).lean();
        }
        if (!tenant) {
          tenant = await Tenant.findOne({ slug: rawSlug.toLowerCase() }).lean();
        }
        if (tenant) {
          tenantId = tenant._id;
        }
      }
    }

    // 3. Explicit X-Tenant-Id header or body tenantId
    if (!tenant) {
      const headerTenantId = req.headers['x-tenant-id'] || req.headers['x-cafe-id'] || req.body?.tenantId;
      if (headerTenantId && mongoose.isValidObjectId(headerTenantId)) {
        tenant = await Tenant.findById(headerTenantId).lean();
        if (tenant) tenantId = tenant._id;
      }
    }

    // 3b. Order ID lookup (for payment / receipt / order-confirm actions)
    if (!tenant && (req.body?.orderId || req.query?.orderId)) {
      const oId = req.body?.orderId || req.query?.orderId;
      if (mongoose.isValidObjectId(oId)) {
        const existingOrder = await mongoose.connection.collection('orders').findOne(
          { _id: new mongoose.Types.ObjectId(oId) },
          { projection: { tenantId: 1 } }
        );
        if (existingOrder?.tenantId) {
          tenant = await Tenant.findById(existingOrder.tenantId).lean();
          if (tenant) tenantId = tenant._id;
        }
      }
    }

    // 4. Authenticated staff/owner token on ADMIN / non-customer routes
    // STRICT MULTI-TENANT ISOLATION RULE:
    // Customer/public routes MUST NEVER derive tenant from admin auth tokens or admin session cookies.
    // They must ignore any Authorization header or owner session.
    if (!tenant && !isCustomerPublicRoute(req)) {
      const token = (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : req.cookies?.brewhaus_access_token) || '';
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
          if (decoded.tokenUse === 'access' && decoded.tenantId) {
            tenant = await Tenant.findById(decoded.tenantId).lean();
            if (tenant) tenantId = tenant._id;
          }
        } catch { /* Handled later by auth middleware */ }
      }
    }

    // 4. Hostname / Origin / Referer subdomain resolution (e.g. dostii.localhost or dostii.cafe.infinigrowsoftech.com)
    if (!tenant) {
      const rawRequestHost = cleanHost(req.get('x-forwarded-host') || req.get('host'));
      const requestHost = isAllowedTenantHost(rawRequestHost) ? rawRequestHost : '';
      let rawOriginHost = '';
      try { rawOriginHost = cleanHost(new URL(req.get('origin')).hostname); } catch { rawOriginHost = ''; }
      const originHost = isAllowedTenantHost(rawOriginHost) ? rawOriginHost : '';
      let rawRefererHost = '';
      try { rawRefererHost = cleanHost(new URL(req.get('referer')).hostname); } catch { rawRefererHost = ''; }
      const refererHost = isAllowedTenantHost(rawRefererHost) ? rawRefererHost : '';

      const explicitTenantSubdomain = (h) => {
        if (!h) return null;
        if (h.endsWith('.localhost')) {
          const prefix = h.slice(0, -'.localhost'.length);
          return Boolean(prefix) && !prefix.includes('.') && prefix !== 'admin' && prefix !== 'www' && prefix !== 'cafe' ? prefix : null;
        }
        const baseDomain = String(process.env.TENANT_BASE_DOMAIN || '').toLowerCase().replace(/^\.+|\.+$/g, '');
        if (!baseDomain || !h.endsWith(`.${baseDomain}`)) return null;
        const prefix = h.slice(0, -(baseDomain.length + 1));
        return Boolean(prefix) && !prefix.includes('.') && prefix !== 'admin' && prefix !== 'www' && prefix !== 'cafe' ? prefix : null;
      };

      const extractedSubdomain = explicitTenantSubdomain(requestHost) ||
        explicitTenantSubdomain(originHost) ||
        explicitTenantSubdomain(refererHost);

      if (extractedSubdomain) {
        tenant = await Tenant.findOne({ slug: extractedSubdomain }).lean();
        if (tenant) {
          tenantId = tenant._id;
        } else {
          return cleanTenantError(res, 404, 'Café not found. Please scan a table QR code or specify a valid café.');
        }
      }

      if (!tenant) {
        const host = explicitTenantSubdomain(requestHost) ? requestHost
          : (isCustomerTenantHost(originHost) ? originHost : requestHost);
        const slug = getSlugFromHost(host);
        if (slug) {
          tenant = await Tenant.findOne({ slug }).lean();
          if (tenant) tenantId = tenant._id;
        }
      }
    }

    // 5. Cryptographically signed tableToken (from query, header, or body)
    // NOTE: /api/tables/qr/validate validates the token against the host/origin tenant and must not adopt token's tenant.
    if (!tenant && req.path !== '/api/tables/qr/validate') {
      const queryTableToken = req.query?.tableToken || req.headers['x-table-token'] || req.headers['x-qr-token'] || req.body?.tableToken || req.body?.qrToken;
      if (queryTableToken) {
        const claims = verifyTableQrToken(queryTableToken);
        if (claims?.tenantId && mongoose.isValidObjectId(claims.tenantId)) {
          tenant = await Tenant.findById(claims.tenantId).lean();
          if (tenant) tenantId = tenant._id;
        }
      }
    }

    // 6. Payment webhook lookup
    if (!tenant && req.path === '/api/payment/webhook') {
      const payment = req.body?.payload?.payment?.entity;
      const refund = req.body?.payload?.refund?.entity;
      const collection = mongoose.connection.collection('payments');
      let record = payment?.order_id ? await collection.findOne({ razorpayOrderId: String(payment.order_id) }, { projection: { tenantId: 1 } }) : null;
      if (!record && refund?.payment_id) record = await collection.findOne({ razorpayPaymentId: String(refund.payment_id) }, { projection: { tenantId: 1 } });
      if (!record?.tenantId) return cleanTenantError(res, 404, 'Payment tenant not found.');
      tenant = await Tenant.findById(record.tenantId).lean();
      if (!tenant) return cleanTenantError(res, 404, 'Payment tenant not found.');
      tenantId = tenant._id;
    }

    // 7. Test fallback for localhost test runs ONLY if no explicit query slug was given
    if (!tenant && process.env.NODE_ENV === 'test') {
      const rawRequestHost = cleanHost(req.get('x-forwarded-host') || req.get('host'));
      if (rawRequestHost === 'localhost' || rawRequestHost === '127.0.0.1' || !rawRequestHost) {
        const defaultSlug = String(process.env.TENANT_DEFAULT_SLUG || 'brewhaus').toLowerCase();
        tenant = await Tenant.findOne({ slug: defaultSlug }).lean();
        if (tenant) tenantId = tenant._id;
      }
    }

    // 7b. Customer route fallback to the configured default café when no explicit query slug was requested
    if (!tenant && !querySlug && isCustomerPublicRoute(req)) {
      tenant = await findDefaultTenant();
      if (tenant) tenantId = tenant._id;
    }

    if (!tenant) {
      if (
        req.path.startsWith('/api/public') ||
        req.path === '/api/cafes' ||
        req.path.startsWith('/api/admin')
      ) {
        return next();
      }
      // No café could be resolved. If the client provided no auth credentials, the
      // route's own auth middleware (protect) is responsible for the response, so
      // return a proper 401 instead of a misleading "Café not found" 404. If auth
      // credentials were supplied but still no tenant matched, the café genuinely
      // does not exist for this caller -> 404.
      const hasAuth =
        (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) ||
        req.cookies?.brewhaus_access_token;
      if (!hasAuth) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' },
          message: 'Authentication is required.',
        });
      }
      return cleanTenantError(res, 404, 'Café not found. Please scan a table QR code or specify a valid café.');
    }
    if (tenant.status !== 'active') return cleanTenantError(res, 423, 'This café account is suspended.');

    req.tenant = tenant;
    req.tenantId = tenantId;
    return runWithTenant(tenantId, next);
  } catch (error) { return next(error); }
};

export const tenantFromAuthenticatedUser = (req, res, next) => {
  if (!req.user?.tenantId || String(req.user.tenantId) !== String(req.tenantId)) return cleanTenantError(res, 404, 'Café not found.');
  return next();
};
