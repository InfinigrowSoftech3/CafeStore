import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { TenantNotFoundScreen, TenantSuspendedScreen } from '../components/ui/TenantErrorState';
import {
  getResolvedTenantSlug,
  setCustomerSessionItem,
  cleanupPreviousTenantStorage,
} from '../utils/tenantHelper';
import { clearClientCache } from '../utils/menuCache';

const TenantContext = createContext(null);
const fallback = { name: 'Cafe', currency: 'INR', taxRate: 5, primaryColor: '#0F3D2E', accentColor: '#FFF1C9' };

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(fallback);
  const [tenantState, setTenantState] = useState({ status: 'loading', message: '' });
  const [currentSearch, setCurrentSearch] = useState(() => (typeof window !== 'undefined' ? window.location.search : ''));

  // Reactive URL search param detection (e.g. back/forward navigation or URL updates)
  useEffect(() => {
    const onLocationChange = () => {
      setCurrentSearch(window.location.search);
    };

    window.addEventListener('popstate', onLocationChange);
    // Listen for custom pushstate/replacestate if used
    window.addEventListener('urlchange', onLocationChange);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('urlchange', onLocationChange);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('tableToken');
    const cafeSlug = params.get('cafeSlug') || params.get('cafe') || params.get('cafeId') || params.get('tenant') || params.get('slug');
    const tableSlug = params.get('tableSlug') || params.get('table') || params.get('tableId');

    // Strict single source of truth:
    // If no token and no slug in query, check if a multi-tenant subdomain exists
    const resolvedSlug = cafeSlug || getResolvedTenantSlug();

    setTenantState({ status: 'loading', message: '' });

    const resolveEndpoint = () => {
      if (token) {
        return api.get('/public/cafes/resolve', { params: { token } });
      }
      if (resolvedSlug && tableSlug) {
        return api.get('/public/cafes/resolve', { params: { cafeSlug: resolvedSlug, tableSlug } });
      }
      if (resolvedSlug) {
        return api.get(`/public/cafes/${encodeURIComponent(resolvedSlug)}`);
      }
      // If no token or slug was provided in the URL or subdomain, resolve the default active cafe
      return api.get('/public/cafes/default');
    };

    resolveEndpoint()
      .then(({ data }) => {
        if (!active) return;
        const cafeData = data.data?.cafe || data.data || data.tenant;
        const tableData = data.data?.table;
        const qrData = data.data?.qr;

        if (!cafeData) {
          setTenantState({
            status: 'not_found',
            message: 'Cafe not found. Please scan your table QR code or check the URL.',
          });
          return;
        }

        // Clean up previous cafe storage when switching tenants
        clearClientCache();
        cleanupPreviousTenantStorage(cafeData.slug);

        const rawPrimary = cafeData.branding?.primaryColor || cafeData.settings?.primaryColor;
        const rawAccent = cafeData.branding?.secondaryColor || cafeData.settings?.accentColor;
        const primaryColor =
          rawPrimary &&
          !['#c96b18', '#2563eb', '#c8963e', '#c8963e'].includes(rawPrimary.toLowerCase())
            ? rawPrimary
            : '#0F3D2E';
        const accentColor =
          rawAccent &&
          !['#1a0f08', '#0f172a', '#17110c'].includes(rawAccent.toLowerCase())
            ? rawAccent
            : '#FFF1C9';

        const normalizedTenant = {
          id: cafeData.id || cafeData._id,
          name: cafeData.name,
          slug: cafeData.slug,
          logo: cafeData.logo || cafeData.settings?.logoUrl || '',
          logoUrl: cafeData.logoUrl || cafeData.logo || cafeData.settings?.logoUrl || '',
          tagline: cafeData.description || cafeData.settings?.tagline || '',
          primaryColor,
          accentColor,
          currency: cafeData.settings?.currency || 'INR',
          taxRate: cafeData.settings?.taxRate ?? 5,
          address: cafeData.settings?.address || '',
          contactPhone: cafeData.settings?.contactPhone || '',
          contactEmail: cafeData.settings?.contactEmail || '',
          openingHours: cafeData.settings?.openingHours || {},
        };

        setTenant(normalizedTenant);

        // Store active tenant slug and ID so checkout and cart requests retain cafe context
        if (cafeData.slug) {
          sessionStorage.setItem('active_cafe_slug', cafeData.slug);
          sessionStorage.setItem('active_tenant_id', String(cafeData.id || cafeData._id));
          localStorage.setItem('active_cafe_slug', cafeData.slug);
          localStorage.setItem('active_tenant_id', String(cafeData.id || cafeData._id));
        }

        const effectiveToken = qrData?.token || token;
        if (effectiveToken) {
          sessionStorage.setItem('active_table_token', effectiveToken);
          localStorage.setItem('active_table_token', effectiveToken);
        }

        // Store table info under customer namespaced keys
        if (tableData) {
          setCustomerSessionItem(cafeData.slug, 'table_number', tableData.number);
          setCustomerSessionItem(cafeData.slug, 'table_id', tableData.id);
          if (effectiveToken) {
            setCustomerSessionItem(cafeData.slug, 'table_token', effectiveToken);
          }
        }

        setTenantState({ status: 'active', message: '' });
        document.title = `${normalizedTenant.name} | Order Online`;
        if (normalizedTenant.primaryColor) {
          document.documentElement.style.setProperty('--tenant-primary', normalizedTenant.primaryColor);
          document.documentElement.style.setProperty('--brand', normalizedTenant.primaryColor);
        }
        if (normalizedTenant.accentColor) {
          document.documentElement.style.setProperty('--tenant-accent', normalizedTenant.accentColor);
        }
      })
      .catch((error) => {
        if (!active) return;
        clearClientCache();
        const statusCode = error.response?.status;
        const errObj = error.response?.data?.error;
        const errorCode = typeof errObj === 'object' ? errObj?.code : error.response?.data?.code;
        const errorMessage =
          typeof errObj === 'object'
            ? errObj?.message
            : error.response?.data?.error || 'Cafe not found. Please scan your table QR code.';

        if (statusCode === 410 || errorCode === 'QR_EXPIRED' || statusCode === 423 || errorCode === 'TENANT_SUSPENDED') {
          setTenantState({ status: 'suspended', message: errorMessage });
          document.title = 'Cafe Suspended | Online Ordering Paused';
        } else {
          setTenantState({ status: 'not_found', message: errorMessage });
          document.title = 'Cafe Not Found | Please Scan QR';
        }
      });

    return () => {
      active = false;
    };
  }, [currentSearch]);

  const value = useMemo(() => tenant, [tenant]);

  if (tenantState.status === 'suspended') {
    return <TenantSuspendedScreen message={tenantState.message} />;
  }

  if (tenantState.status === 'not_found') {
    return <TenantNotFoundScreen message={tenantState.message} />;
  }

  if (tenantState.status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF1C9] text-[#0F3D2E] font-sans">
        <div className="w-12 h-12 rounded-2xl bg-[#0F3D2E] flex items-center justify-center text-[#FFF1C9] shadow-lg animate-pulse mb-4">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#0F3D2E] tracking-wide">Loading menu...</p>
      </div>
    );
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext) || fallback;
