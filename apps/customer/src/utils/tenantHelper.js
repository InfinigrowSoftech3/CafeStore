/**
 * Safely extracts tenantId from a signed table QR token's payload (base64url JSON)
 * without validating the cryptographic signature (the server validates the signature).
 */
export function extractTenantFromTableToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(json);
    return parsed.tenantId || null;
  } catch {
    return null;
  }
}

const EXCLUDED_PLATFORM_DOMAINS = [
  'vercel.app',
  'onrender.com',
  'netlify.app',
  'github.io',
  'ngrok.io',
  'loca.lt',
  'herokuapp.com',
  'azurewebsites.net',
  'cloudfunctions.net',
  'run.app',
];

/**
 * Authoritative customer tenant slug resolver.
 * Strictly adheres to priority:
 * 1. Valid explicit cafe URL parameter.
 * 2. Signed QR token resolved and verified by backend.
 * 3. Verified custom cafe subdomain.
 * 4. No tenant context: show an error (returns empty string).
 * 
 * NEVER uses an old localStorage tenant slug to override a different cafe URL.
 */
export function getResolvedTenantSlug() {
  if (typeof window === 'undefined') return '';

  try {
    const params = new URLSearchParams(window.location.search);

    // 1. Valid explicit cafe URL parameter
    const urlTenant = (
      params.get('cafeSlug') ||
      params.get('cafe') ||
      params.get('cafeId') ||
      params.get('tenant') ||
      params.get('slug') ||
      ''
    ).trim();

    if (urlTenant && urlTenant.toLowerCase() !== 'default') {
      return urlTenant.toLowerCase();
    }

    // 2. Signed QR token resolved and verified by backend
    const token = params.get('tableToken') || params.get('token');
    if (token) {
      const extracted = extractTenantFromTableToken(token);
      if (extracted) return extracted.toLowerCase();
    }

    // 3. Verified custom cafe subdomain
    const host = window.location.hostname.toLowerCase();
    const baseDomain = String(
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TENANT_BASE_DOMAIN) ||
      'cafestore.infinigrowsoftech.com'
    ).toLowerCase().replace(/^\.+|\.+$/g, '');

    if (host.endsWith('.localhost')) {
      const prefix = host.slice(0, -'.localhost'.length);
      if (prefix && prefix !== 'admin' && prefix !== 'www' && prefix !== 'cafe' && !prefix.includes('.')) {
        return prefix;
      }
    }

    // Check against TENANT_BASE_DOMAIN (e.g. cafestore.infinigrowsoftech.com)
    if (baseDomain && host.endsWith(`.${baseDomain}`)) {
      const prefix = host.slice(0, -(baseDomain.length + 1));
      if (prefix && prefix !== 'admin' && prefix !== 'www' && prefix !== 'cafe' && !prefix.includes('.')) {
        return prefix;
      }
      return '';
    }

    if (baseDomain && host === baseDomain) {
      return '';
    }

    // DO NOT treat deployment platforms (e.g. cafe-client-app.vercel.app) as custom tenant subdomains!
    const isPlatformDomain = EXCLUDED_PLATFORM_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
    if (!isPlatformDomain) {
      const parts = host.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'admin' && parts[0] !== 'cafe') {
        return parts[0];
      }
    }

    // Tab-scoped active session (supports client-side in-app routing when search params are omitted)
    const sessionSlug = sessionStorage.getItem('active_cafe_slug');
    if (sessionSlug && !urlTenant) {
      const cleanSession = sessionSlug.trim().toLowerCase();
      if (cleanSession && cleanSession !== 'default' && !EXCLUDED_PLATFORM_DOMAINS.some((d) => cleanSession.includes(d))) {
        return cleanSession;
      }
    }

    // 4. No tenant context: return empty string (show an error)
    // NEVER fall back to an old localStorage tenant slug!
    return '';
  } catch {
    return '';
  }
}

export const getTenantSlug = getResolvedTenantSlug;

/**
 * Storage namespacing helpers for multi-tenant isolation.
 * Customer storage keys: customer:<slug>:<key>
 * Admin storage keys: admin:<key>
 */
export function getCustomerStorageKey(slug, key) {
  const safeSlug = (slug || getResolvedTenantSlug() || 'anon').toLowerCase().trim();
  return `customer:${safeSlug}:${key}`;
}

export function getCustomerSessionItem(slug, key) {
  try {
    return sessionStorage.getItem(getCustomerStorageKey(slug, key));
  } catch {
    return null;
  }
}

export function setCustomerSessionItem(slug, key, value) {
  try {
    sessionStorage.setItem(getCustomerStorageKey(slug, key), String(value));
  } catch {
    // ignore
  }
}

export function removeCustomerSessionItem(slug, key) {
  try {
    sessionStorage.removeItem(getCustomerStorageKey(slug, key));
  } catch {
    // ignore
  }
}

/**
 * Clears any legacy or previous cafe storage keys when switching cafes
 */
export function cleanupPreviousTenantStorage(newSlug) {
  if (typeof window === 'undefined') return;
  try {
    const normalizedNew = String(newSlug || '').toLowerCase().trim();

    // Remove un-namespaced legacy and active keys
    sessionStorage.removeItem('cafe_tenant_slug');
    sessionStorage.removeItem('cafe_tenant_id');
    sessionStorage.removeItem('cafe_table_token');
    sessionStorage.removeItem('cafe_table_number');
    sessionStorage.removeItem('cafe_table_id');
    sessionStorage.removeItem('active_cafe_slug');
    sessionStorage.removeItem('active_tenant_id');
    sessionStorage.removeItem('active_table_token');
    localStorage.removeItem('cafe_tenant_slug');
    localStorage.removeItem('cafe_tenant_id');
    localStorage.removeItem('active_cafe_slug');
    localStorage.removeItem('active_tenant_id');
    localStorage.removeItem('active_table_token');
    localStorage.removeItem('brewhaus-cart');
    localStorage.removeItem('customer-cart');

    // Remove legacy cache keys and customer keys that belong to other slugs from sessionStorage
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k) {
        if (k.startsWith('cafe_cache_') || k.startsWith('brewhaus_cache_')) {
          sessionStorage.removeItem(k);
        } else if (normalizedNew && k.startsWith('customer:') && !k.startsWith(`customer:${normalizedNew}:`)) {
          sessionStorage.removeItem(k);
        }
      }
    }

    // Remove legacy cache keys and customer keys that belong to other slugs from localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k) {
        if (k.startsWith('cafe_cache_') || k.startsWith('brewhaus_cache_') || k === 'brewhaus-cart' || k === 'customer-cart') {
          localStorage.removeItem(k);
        } else if (normalizedNew && k.startsWith('customer:') && !k.startsWith(`customer:${normalizedNew}:`)) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {
    // ignore
  }
}

const tenantHelper = {
  extractTenantFromTableToken,
  getResolvedTenantSlug,
  getTenantSlug,
  getCustomerStorageKey,
  getCustomerSessionItem,
  setCustomerSessionItem,
  removeCustomerSessionItem,
  cleanupPreviousTenantStorage,
};

export default tenantHelper;

