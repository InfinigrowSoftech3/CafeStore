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
 * On customer routes, the cafe comes from URL query params, table QR tokens,
 * active session storage, or verified custom tenant subdomains.
 */
export function getResolvedTenantSlug() {
  if (typeof window === 'undefined') return '';

  try {
    const params = new URLSearchParams(window.location.search);
    let urlTenant = (
      params.get('cafeSlug') ||
      params.get('cafe') ||
      params.get('cafeId') ||
      params.get('tenant') ||
      params.get('slug') ||
      ''
    ).trim();

    if (!urlTenant) {
      const token = params.get('tableToken') || params.get('token');
      if (token) {
        const extracted = extractTenantFromTableToken(token);
        if (extracted) urlTenant = extracted;
      }
    }

    if (urlTenant) {
      return urlTenant.toLowerCase();
    }

    // Check persistent active cafe slug in sessionStorage/localStorage
    const storedSlug =
      sessionStorage.getItem('active_cafe_slug') ||
      localStorage.getItem('active_cafe_slug');
    if (storedSlug && typeof storedSlug === 'string') {
      const cleanStored = storedSlug.trim().toLowerCase();
      if (cleanStored && !EXCLUDED_PLATFORM_DOMAINS.some((d) => cleanStored.includes(d))) {
        return cleanStored;
      }
    }

    // Check table token stored in session/local storage
    const storedToken =
      sessionStorage.getItem('active_table_token') ||
      localStorage.getItem('active_table_token');
    if (storedToken) {
      const extracted = extractTenantFromTableToken(storedToken);
      if (extracted) return extracted.toLowerCase();
    }

    const host = window.location.hostname.toLowerCase();
    if (host.endsWith('.localhost')) {
      const prefix = host.slice(0, -'.localhost'.length);
      if (prefix && prefix !== 'admin' && prefix !== 'www' && prefix !== 'cafe' && !prefix.includes('.')) {
        return prefix;
      }
    }

    // DO NOT treat deployment platforms (e.g. cafe-client-app.vercel.app) as custom tenant subdomains!
    const isPlatformDomain = EXCLUDED_PLATFORM_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
    if (!isPlatformDomain) {
      const parts = host.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'admin' && parts[0] !== 'cafe') {
        return parts[0];
      }
    }
  } catch {
    // ignore
  }

  return '';
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
    // Remove un-namespaced legacy keys
    sessionStorage.removeItem('cafe_tenant_slug');
    sessionStorage.removeItem('cafe_tenant_id');
    sessionStorage.removeItem('cafe_table_token');
    sessionStorage.removeItem('cafe_table_number');
    sessionStorage.removeItem('cafe_table_id');
    localStorage.removeItem('cafe_tenant_slug');
    localStorage.removeItem('cafe_tenant_id');
    localStorage.removeItem('brewhaus-cart');

    // Remove legacy cache keys and customer keys that belong to other slugs
    const normalizedNew = String(newSlug || '').toLowerCase().trim();
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

