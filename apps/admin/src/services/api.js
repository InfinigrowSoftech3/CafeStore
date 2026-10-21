import axios from 'axios';
import { env } from '../config/env';
import { getAccessToken, setAccessToken } from './accessToken';

const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let refreshPromise = null;

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
  const token = getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeBranchId = localStorage.getItem('admin:activeBranchId') || localStorage.getItem('activeBranchId');
  if (activeBranchId && !config.headers['X-Branch-Id'] && !config.headers['x-branch-id']) {
    config.headers['X-Branch-Id'] = activeBranchId;
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

    // 429 Rate Limit Interceptor: extract Retry-After and provide a friendly countdown message
    if (error.response?.status === 429) {
      const retryAfterHeader = error.response.headers?.['retry-after'];
      const retryAfterSec =
        Number(retryAfterHeader) ||
        Number(error.response.data?.retryAfterSeconds) ||
        Number(error.response.data?.retryAfter) ||
        60;

      const friendlyMsg =
        error.response.data?.message ||
        error.response.data?.error ||
        `Too many attempts. Please try again in ${retryAfterSec} seconds.`;

      const normalized = new Error(friendlyMsg);
      normalized.code = 'RATE_LIMITED';
      normalized.status = 429;
      normalized.retryAfter = retryAfterSec;
      normalized.response = error.response;
      return Promise.reject(normalized);
    }

    if (error.response?.status === 401) {
      const requestUrl = String(config?.url || '');
      const isAuthRequest = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/me', '/platform/auth'].some((path) =>
        requestUrl.includes(path)
      );

      if (config && !config._refreshAttempted && !isAuthRequest) {
        config._refreshAttempted = true;
        try {
          refreshPromise ||= api.post('/auth/refresh').then(({ data }) => {
            setAccessToken(data.token);
            return data.token;
          }).finally(() => {
            refreshPromise = null;
          });
          const token = await refreshPromise;
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        } catch {
          setAccessToken(null);
        }
      }

      const publicPaths = ['/login', '/signup', '/super-admin'];
      // Avoid redirecting or hard-reloading when already on a public route, or when checking /auth/me on initial boot
      if (
        typeof window !== 'undefined' &&
        !publicPaths.some((p) => window.location.pathname.startsWith(p)) &&
        !requestUrl.includes('/auth/me')
      ) {
        window.location.href = '/login';
      }
    }

    const rawError = error.response?.data?.error;
    const rawMsg = error.response?.data?.message;
    let message = (typeof rawError === 'string' ? rawError : rawError?.message) || (typeof rawMsg === 'string' ? rawMsg : null);

    if (isTimeoutOrNetworkError(error)) {
      message = 'Server is taking too long. Please try again';
    } else if (!message) {
      message = error.message || 'Request failed';
    }

    // Never show raw timeout message to user
    if (typeof message === 'string' && /timeout.*exceeded/i.test(message)) {
      message = 'Server is taking too long. Please try again';
    }

    // Normalize error.response.data.error to string so callers accessing error.response?.data?.error never receive an object {code, message}
    if (error.response?.data && typeof error.response.data.error === 'object' && error.response.data.error !== null) {
      error.response.data.error = error.response.data.error.message || error.response.data.error.code || 'Request failed';
    }

    const normalized = new Error(typeof message === 'string' ? message : 'Request failed');
    normalized.code = isTimeoutOrNetworkError(error) ? 'ECONNABORTED' : error.response?.data?.code || (typeof rawError === 'object' ? rawError?.code : undefined);
    normalized.status = error.response?.status;
    normalized.response = error.response;
    normalized.isTimeout = isTimeoutOrNetworkError(error);
    return Promise.reject(normalized);
  }
);

// Share one in-flight GET per URL, and cache responses when ttlMs > 0 to eliminate duplicate bootstrap fetches
const inflight = new Map();
const cache = new Map();

export const getOnce = (url, ttlMs = 0) => {
  const now = Date.now();
  if (ttlMs > 0 && cache.has(url)) {
    const entry = cache.get(url);
    if (entry.expiresAt > now) {
      return Promise.resolve(entry.data);
    }
    cache.delete(url);
  }

  if (!inflight.has(url)) {
    const promise = api.get(url).then((res) => {
      if (ttlMs > 0) {
        cache.set(url, { data: res, expiresAt: Date.now() + ttlMs });
      }
      return res;
    }).finally(() => {
      inflight.delete(url);
    });
    inflight.set(url, promise);
  }
  return inflight.get(url);
};

export const clearApiCache = (url) => {
  if (url) cache.delete(url);
  else cache.clear();
};

export const wakeServer = () => {
  try {
    const base = String(env.apiUrl || '').trim().replace(/\/+$/, '');
    const url = base.endsWith('/api') ? `${base}/health` : `${base}/api/health`;
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch(url, { method: 'GET', cache: 'no-store' }).catch(() => {});
    }
  } catch {
    // Silent
  }
};

export default api;
