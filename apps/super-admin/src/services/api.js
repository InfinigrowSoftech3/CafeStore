import axios from 'axios';
import { env } from '../config/env';

const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 35000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

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
      const config = error.config;
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
    const message =
      (typeof rawError === 'string' ? rawError : rawError?.message) ||
      (typeof rawMsg === 'string' ? rawMsg : null) ||
      error.message ||
      'Request failed';

    if (error.response?.data && typeof error.response.data.error === 'object' && error.response.data.error !== null) {
      error.response.data.error = error.response.data.error.message || error.response.data.error.code || 'Request failed';
    }

    const normalized = new Error(typeof message === 'string' ? message : 'Request failed');
    normalized.code = error.response?.data?.code || (typeof rawError === 'object' ? rawError?.code : undefined);
    normalized.status = error.response?.status;
    normalized.response = error.response;
    return Promise.reject(normalized);
  }
);

export default api;
