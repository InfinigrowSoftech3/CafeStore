import axios from 'axios';
import { getAccessToken, setAccessToken } from '@cafe/shared';
import { env } from '../config/env';

const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 35000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeBranchId = localStorage.getItem('pos:activeBranchId') || localStorage.getItem('admin:activeBranchId');
  if (activeBranchId && !config.headers['X-Branch-Id'] && !config.headers['x-branch-id']) {
    config.headers['X-Branch-Id'] = activeBranchId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
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
      const config = error.config;
      const requestUrl = String(config?.url || '');
      const isAuthRequest = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/me'].some((path) =>
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
    }

    const rawError = error.response?.data?.error;
    const rawMsg = error.response?.data?.message;
    const message = (typeof rawError === 'string' ? rawError : rawError?.message) || (typeof rawMsg === 'string' ? rawMsg : null) || error.message || 'Request failed';

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

export const getOnce = (url, config = {}) => api.get(url, config);
export default api;
