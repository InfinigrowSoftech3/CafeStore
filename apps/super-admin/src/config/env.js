const defaultApiUrl = import.meta.env.PROD
  ? 'https://cafestore-nmue.onrender.com/api'
  : 'http://localhost:5000/api';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || defaultApiUrl).trim().replace(/\/+$/, '');
const apiUrl = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;

const rawCustomerUrl = String(import.meta.env.VITE_CUSTOMER_URL || import.meta.env.VITE_CUSTOMER_APP_URL || '').trim();
const customerUrl = rawCustomerUrl || (import.meta.env.PROD ? 'https://cafestore-customer.vercel.app' : 'http://localhost:5173');

const rawPosUrl = String(import.meta.env.VITE_POS_URL || '').trim();
const posUrl = rawPosUrl || (import.meta.env.PROD ? 'https://cafestore-pos.vercel.app' : 'http://localhost:5174');

const rawKdsUrl = String(import.meta.env.VITE_KDS_URL || '').trim();
const kdsUrl = rawKdsUrl || (import.meta.env.PROD ? 'https://cafestore-kds.vercel.app' : 'http://localhost:5175');

const rawAdminUrl = String(import.meta.env.VITE_ADMIN_URL || import.meta.env.VITE_ADMIN_APP_URL || '').trim();
const adminUrl = rawAdminUrl || (import.meta.env.PROD ? 'https://cafestore-admin.vercel.app' : 'http://localhost:5176');

const rawSuperAdminUrl = String(import.meta.env.VITE_SUPER_ADMIN_URL || '').trim();
const superAdminUrl = rawSuperAdminUrl || (import.meta.env.PROD ? 'https://cafestore-superadmin.vercel.app' : 'http://localhost:5177');

export const env = {
  apiUrl,
  customerUrl,
  posUrl,
  kdsUrl,
  adminUrl,
  superAdminUrl,
};
