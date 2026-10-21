import axios from 'axios';
import { env } from '../config/env';

const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTimeoutOrNetworkError = (error) => {
  if (error.response) return false;
  return (
    error.code === 'ECONNABORTED' ||
    Boolean(error.message && /timeout|network\s*error/i.test(error.message))
  );
};

api.interceptors.request.use((config) => {
  const superAdminToken = sessionStorage.getItem('brewhaus_superadmin_token');
  if (superAdminToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${superAdminToken}`;
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

    // 429 Rate Limit Interceptor
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

    if (error.response?.status === 401 || error.response?.status === 403) {
      const requestUrl = String(config?.url || '');
      const isLoginRequest = requestUrl.includes('/platform/admin/login');

      if (!isLoginRequest) {
        sessionStorage.removeItem('brewhaus_superadmin_token');
        sessionStorage.removeItem('brewhaus_superadmin_user');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    const rawError = error.response?.data?.error;
    const rawMsg = error.response?.data?.message;
    let message =
      (typeof rawError === 'string' ? rawError : rawError?.message) ||
      (typeof rawMsg === 'string' ? rawMsg : null);

    if (isTimeoutOrNetworkError(error)) {
      message = 'Server is taking too long. Please try again';
    } else if (!message) {
      message = error.message || 'Request failed';
    }

    // Never show raw timeout error to user
    if (typeof message === 'string' && /timeout.*exceeded/i.test(message)) {
      message = 'Server is taking too long. Please try again';
    }

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
