const defaultApiUrl = import.meta.env.PROD
  ? 'https://cafe-app-n8mn.onrender.com/api'
  : 'http://localhost:5000/api';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || defaultApiUrl).trim().replace(/\/+$/, '');
const apiUrl = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;

const rawCustomerUrl = String(import.meta.env.VITE_CUSTOMER_APP_URL || '').trim();
const customerUrl = (!rawCustomerUrl || rawCustomerUrl.includes('infinigrowsoftech.com'))
  ? 'https://cafe-client-app.vercel.app'
  : rawCustomerUrl;

const rawAdminUrl = String(import.meta.env.VITE_ADMIN_APP_URL || '').trim();
const adminUrl = (!rawAdminUrl || rawAdminUrl.includes('infinigrowsoftech.com'))
  ? 'https://admincafe-panel.vercel.app'
  : rawAdminUrl;

export const env = {
  apiUrl,
  customerUrl,
  adminUrl,
};
