import axios from 'axios';
import { getResolvedTenantSlug, getCustomerStorageKey } from '../utils/tenantHelper';
import useCartStore from '../context/cartStore';

const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://cafe-app-n8mn.onrender.com/api'
  : '/api');

/**
 * Dedicated Customer API Client
 * - withCredentials: false (never sends admin session cookies across ports/origins)
 * - Never attaches Authorization header
 * - Strictly tenant-scoped by URL slug via X-Tenant-Slug header
 * - Never injects stale un-namespaced X-Tenant-Id
 */
const api = axios.create({
  baseURL: apiUrl,
  timeout: 35000,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

// Retry config — retry idempotent GET requests on transient 5xx or network/timeout errors (NOT on 429)
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.request.use((config) => {
  config._retryCount = config._retryCount ?? 0;

  // Single source of truth: strictly scoped by the URL slug
  const tenantSlug = getResolvedTenantSlug();
  if (tenantSlug) {
    config.headers['X-Tenant-Slug'] = tenantSlug;
  }

  // Strictly remove any stale Authorization or X-Tenant-Id on customer calls
  delete config.headers['Authorization'];
  delete config.headers['authorization'];
  delete config.headers['X-Tenant-Id'];
  delete config.headers['x-tenant-id'];

  try {
    const tableToken =
      new URLSearchParams(window.location.search).get('tableToken') ||
      new URLSearchParams(window.location.search).get('token') ||
      useCartStore.getState()?.tableToken ||
      sessionStorage.getItem(getCustomerStorageKey(tenantSlug, 'table_token'));
    if (tableToken && !config.headers['X-Table-Token'] && !config.headers['x-table-token']) {
      config.headers['X-Table-Token'] = tableToken;
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
    const status = error.response?.status;

    const isTimeoutOrNetwork =
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.message?.toLowerCase().includes('timeout');

    const is5xx = status >= 500 && status < 600;

    // Only retry GET requests on 5xx or network/timeout (NOT 429 — retrying rate-limit makes it worse)
    const shouldRetry =
      config &&
      config.method?.toLowerCase() === 'get' &&
      (is5xx || isTimeoutOrNetwork) &&
      config._retryCount < MAX_RETRIES;

    if (shouldRetry) {
      config._retryCount += 1;
      const delay = RETRY_DELAY_MS * config._retryCount;
      await sleep(delay);
      return api(config);
    }

    // Normalize error message
    const data = error.response?.data;
    const rawError = data?.error;
    const rawMsg = data?.message;
    let msg = (typeof rawError === 'string' ? rawError : rawError?.message) || (typeof rawMsg === 'string' ? rawMsg : null) || error.message || 'Network error. Please try again.';
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      msg = 'The server took too long to respond. Please check your connection or try again.';
    }

    if (data && typeof data.error === 'object' && data.error !== null) {
      data.error = data.error.message || data.error.code || 'Request failed';
    }

    const err = new Error(typeof msg === 'string' ? msg : 'Network error. Please try again.');
    if (data?.code || (typeof rawError === 'object' && rawError?.code)) err.code = data?.code || rawError?.code;
    err.status = status;
    err.response = error.response;
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

export default api;
