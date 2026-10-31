import axios from 'axios';
import { getResolvedTenantSlug, getCustomerStorageKey } from '../utils/tenantHelper';
import useCartStore from '../context/cartStore';

const defaultApiUrl = import.meta.env.PROD
  ? 'https://cafestore-nmue.onrender.com/api'
  : '/api';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || defaultApiUrl).trim().replace(/\/+$/, '');
const apiUrl = configuredApiUrl.endsWith('/api') || configuredApiUrl.startsWith('/api')
  ? configuredApiUrl
  : `${configuredApiUrl}/api`;

/**
 * Dedicated Customer API Client
 * - withCredentials: false (never sends admin session cookies across ports/origins)
 * - Never attaches Authorization header
 * - Strictly tenant-scoped by URL slug via X-Tenant-Slug header
 * - Never injects stale un-namespaced X-Tenant-Id
 */
const api = axios.create({
  baseURL: apiUrl,
  timeout: 60000,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTimeoutOrNetworkError = (error) => {
  // Never retry if server responded with an HTTP status code (4xx, 5xx)
  if (error.response) return false;
  return (
    error.code === 'ECONNABORTED' ||
    Boolean(error.message && /timeout|network\s*error/i.test(error.message))
  );
};

api.interceptors.request.use((config) => {
  // Authoritative tenant context: strictly scoped by the resolved tenant slug
  const tenantSlug = getResolvedTenantSlug();
  if (tenantSlug) {
    config.headers['X-Tenant-Slug'] = tenantSlug;
  } else {
    delete config.headers['X-Tenant-Slug'];
    delete config.headers['x-tenant-slug'];
  }

  // Strictly remove any stale Authorization on customer calls
  delete config.headers['Authorization'];
  delete config.headers['authorization'];

  // Only attach X-Tenant-Id if it strictly belongs to the current tenantSlug in active session
  const activeSlug = sessionStorage.getItem('active_cafe_slug');
  const activeTenantId = sessionStorage.getItem('active_tenant_id');

  if (
    tenantSlug &&
    activeSlug &&
    tenantSlug.toLowerCase() === activeSlug.toLowerCase() &&
    activeTenantId
  ) {
    config.headers['X-Tenant-Id'] = activeTenantId;
  } else {
    // Never attach an unrelated stored tenant ID as fallback
    delete config.headers['X-Tenant-Id'];
    delete config.headers['x-tenant-id'];
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('tableToken') || params.get('token');
    const storeToken = useCartStore.getState()?.tableToken;
    const sessionToken = tenantSlug
      ? sessionStorage.getItem(getCustomerStorageKey(tenantSlug, 'table_token'))
      : null;
    const activeTableToken = sessionStorage.getItem('active_table_token');

    const tableToken = urlToken || storeToken || sessionToken || activeTableToken;
    if (tableToken && !config.headers['X-Table-Token'] && !config.headers['x-table-token']) {
      config.headers['X-Table-Token'] = tableToken;
      config.headers['X-QR-Token'] = tableToken;
    }
  } catch {
    // Ignore storage and URL query parsing errors
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Retry interceptor: up to 2 retries (1.5s then 3s delay) ONLY for timeouts and network errors with NO response
    if (config && isTimeoutOrNetworkError(error)) {
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= 2) {
        const delayMs = config._retryCount === 1 ? 1500 : 3000;
        await sleep(delayMs);
        return api(config);
      }
    }

    // Normalize error message
    const data = error.response?.data;
    const rawError = data?.error;
    const rawMsg = data?.message;
    let msg = (typeof rawError === 'string' ? rawError : rawError?.message) || (typeof rawMsg === 'string' ? rawMsg : null);

    if (isTimeoutOrNetworkError(error)) {
      msg = 'Server is taking too long. Please try again';
    } else if (!msg) {
      msg = error.message || 'Network error. Please try again.';
    }

    if (typeof msg === 'string' && /timeout.*exceeded/i.test(msg)) {
      msg = 'Server is taking too long. Please try again';
    }

    if (data && typeof data.error === 'object' && data.error !== null) {
      data.error = data.error.message || data.error.code || 'Request failed';
    }

    const err = new Error(typeof msg === 'string' ? msg : 'Network error. Please try again.');
    if (data?.code || (typeof rawError === 'object' && rawError?.code)) err.code = data?.code || rawError?.code;
    err.status = error.response?.status;
    err.response = error.response;
    err.isTimeout = isTimeoutOrNetworkError(error);
    return Promise.reject(err);
  }
);

// In-flight GET request deduplication strictly partitioned by tenant slug
const inFlightRequests = new Map();
const originalGet = api.get.bind(api);

api.get = function (url, config) {
  const method = config?.method?.toLowerCase() || 'get';
  if (method !== 'get') {
    return originalGet(url, config);
  }

  const tenantSlug = getResolvedTenantSlug() || 'no-tenant';
  const key = `${tenantSlug}:${method}:${url}_${JSON.stringify(config?.params || {})}`;
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const reqPromise = originalGet(url, config).finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, reqPromise);
  return reqPromise;
};

export const wakeServer = () => {
  try {
    const base = String(apiUrl || '').trim().replace(/\/+$/, '');
    const url = base.endsWith('/api') ? `${base}/health` : `${base}/api/health`;
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch(url, { method: 'GET', cache: 'no-store' }).catch(() => {});
    }
  } catch {
    // Silent
  }
};

export default api;
