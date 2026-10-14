import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { TenantNotFoundScreen, TenantSuspendedScreen } from '../components/ui/TenantErrorState';
import { getResolvedTenantSlug, setResolvedTenantSlug, setResolvedTenantId } from '../utils/tenantHelper';
import { clearClientCache } from '../utils/menuCache';

const TenantContext = createContext(null);
const fallback = { name: 'Café', currency: 'INR', taxRate: 5, primaryColor: '#C8963E', accentColor: '#17110C' };

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(fallback);
  const [tenantState, setTenantState] = useState({ status: 'loading', message: '' });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('tableToken');
    const cafeSlug = params.get('cafeSlug') || params.get('cafe') || params.get('cafeId');
    const tableSlug = params.get('tableSlug') || params.get('table') || params.get('tableId');

    const resolveEndpoint = () => {
      if (token) {
        return api.get('/public/cafes/resolve', { params: { token } });
      }
      if (cafeSlug && tableSlug) {
        return api.get('/public/cafes/resolve', { params: { cafeSlug, tableSlug } });
      }
      if (cafeSlug) {
        return api.get(`/public/cafes/${encodeURIComponent(cafeSlug)}`);
      }
      const cachedSlug = getResolvedTenantSlug();
      if (cachedSlug) {
        return api.get(`/public/cafes/${encodeURIComponent(cachedSlug)}`).catch(() => {
          try {
            sessionStorage.removeItem('cafe_tenant_slug');
            sessionStorage.removeItem('cafe_tenant_id');
            localStorage.removeItem('cafe_tenant_slug');
            localStorage.removeItem('cafe_tenant_id');
          } catch {
            /* ignore storage errors */
          }
          return api.get('/cafes').then(({ data }) => {
            const list = data?.data?.cafes || data?.cafes || [];
            const activeCafe = list.find((c) => c.status === 'active' && c.productCount > 0) || list.find((c) => c.status === 'active') || list[0];
            return activeCafe ? { data: { cafe: activeCafe } } : { data: { cafe: fallback } };
          });
        });
      }

      // Direct navigation without params (e.g. http://localhost:5173/menu):
      // Automatically load the active café so customer menu displays properly
      return api.get('/cafes')
        .then(({ data }) => {
          const list = data?.data?.cafes || data?.cafes || [];
          const activeCafe = list.find((c) => c.status === 'active' && c.productCount > 0) || list.find((c) => c.status === 'active') || list[0];
          if (activeCafe) {
            return {
              data: {
                cafe: activeCafe,
              },
            };
          }
          return { data: { cafe: fallback } };
        })
        .catch(() => ({
          data: {
            cafe: fallback,
          },
        }));
    };

    resolveEndpoint()
      .then(({ data }) => {
        if (!active) return;
        const cafeData = data.data?.cafe || data.data || data.tenant;
        const tableData = data.data?.table;
        const qrData = data.data?.qr;

        if (!cafeData) {
          setTenantState({ status: 'not_found', message: 'Café not found.' });
          return;
        }

        const prevSlug = getResolvedTenantSlug();
        if (prevSlug && prevSlug !== cafeData.slug) {
          clearClientCache();
        }

        const rawPrimary = cafeData.branding?.primaryColor || cafeData.settings?.primaryColor;
        const rawAccent = cafeData.branding?.secondaryColor || cafeData.settings?.accentColor;
        const primaryColor = rawPrimary && rawPrimary !== '#c96b18' && rawPrimary !== '#2563eb' ? rawPrimary : '#C8963E';
        const accentColor = rawAccent && rawAccent !== '#1a0f08' && rawAccent !== '#0f172a' ? rawAccent : '#17110C';

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
        setResolvedTenantSlug(cafeData.slug);
        setResolvedTenantId(cafeData.id || cafeData._id);

        if (tableData) {
          try {
            sessionStorage.setItem('cafe_table_number', String(tableData.number));
            sessionStorage.setItem('cafe_table_id', String(tableData.id));
            if (qrData?.token) {
              sessionStorage.setItem('cafe_table_token', String(qrData.token));
            }
          } catch {
            // Ignore sessionStorage access errors
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
            : error.response?.data?.error || 'QR code was not found or is no longer valid.';

        if (statusCode === 410 || errorCode === 'QR_EXPIRED' || statusCode === 423 || errorCode === 'TENANT_SUSPENDED') {
          setTenantState({ status: 'suspended', message: errorMessage });
          document.title = 'Café Suspended | Online Ordering Paused';
        } else {
          setTenantState({ status: 'not_found', message: errorMessage });
          document.title = 'Café Not Found';
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => tenant, [tenant]);

  if (tenantState.status === 'suspended') {
    return <TenantSuspendedScreen message={tenantState.message} />;
  }

  if (tenantState.status === 'not_found') {
    return <TenantNotFoundScreen message={tenantState.message} />;
  }

  if (tenantState.status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-[#17110C] font-sans">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C8963E] to-[#9E6E24] flex items-center justify-center text-white shadow-lg shadow-[#C8963E]/20 animate-pulse mb-4">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
        <p className="text-sm font-medium text-[#7D6E63] tracking-wide">Loading menu...</p>
      </div>
    );
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext) || fallback;
