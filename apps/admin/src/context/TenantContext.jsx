import { createContext, useContext, useEffect, useState } from 'react';
import api, { getOnce } from '../services/api';
import { useAuth } from './AuthContext';

const Context = createContext(null);
const fallback = { name: 'Café', logoUrl: '', primaryColor: '#c96b18', accentColor: '#1a0f08' };

export const applyTenantThemeVariables = (primaryColor = '#c96b18', accentColor = '#1a0f08') => {
  const root = document.documentElement;
  root.style.setProperty('--tenant-primary', primaryColor);
  root.style.setProperty('--tenant-accent', accentColor);
  root.style.setProperty('--tenant-primary-subtle', `${primaryColor}1f`);
  root.style.setProperty('--tenant-primary-border', `${primaryColor}4d`);
  root.style.setProperty('--tenant-primary-hover', primaryColor);
};

export function TenantProvider({ children }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState(fallback);
  const [tenantError, setTenantError] = useState(null);

  const setBranding = (newBranding) => {
    setTenant(prev => {
      const merged = { ...prev, ...newBranding };
      applyTenantThemeVariables(merged.primaryColor, merged.accentColor);
      return merged;
    });
  };

  // 1. Immediately reflect tenant branding from authenticated user session
  useEffect(() => {
    if (user?.tenant) {
      setTenant(prev => ({
        ...prev,
        ...user.tenant,
        name: user.tenant.name || user.tenantName || prev.name,
      }));
      applyTenantThemeVariables(user.tenant.primaryColor, user.tenant.accentColor);
      document.title = `${user.tenant.name || user.tenantName} · Admin`;
    } else if (user?.tenantName && user.tenantName !== 'Café') {
      setTenant(prev => ({ ...prev, name: user.tenantName }));
      document.title = `${user.tenantName} · Admin`;
    }
  }, [user?.tenant, user?.tenantName]);

  // 2. Fetch /tenant/public - scoped to user tenant if authenticated
  useEffect(() => {
    let active = true;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const identifier = user?.tenantId || urlParams?.get('tenant') || urlParams?.get('cafe') || urlParams?.get('slug');
    if (!identifier) return;
    const queryParam = `?tenant=${encodeURIComponent(identifier)}`;
    api.get(`/tenant/public${queryParam}`).then(({ data }) => {
      if (!active) return;
      const t = data.tenant || fallback;
      setTenant(prev => ({ ...prev, ...t }));
      setTenantError(null);
      const displayName = t.name || user?.tenantName || 'Café';
      document.title = `${displayName} · Admin`;
      applyTenantThemeVariables(t.primaryColor || '#c96b18', t.accentColor || '#1a0f08');
    }).catch((error) => {
      if (!active) return;
      // If user is already logged in with tenant data, don't overwrite with generic 'Café'
      if (user?.tenant || (user?.tenantName && user.tenantName !== 'Café')) {
        return;
      }
      const status = error.response?.status || error.status;
      const message = (typeof error.response?.data?.error === 'string' ? error.response.data.error : error.response?.data?.error?.message) || error.message || 'Café not found.';
      if (status === 423) {
        setTenantError({ status: 423, title: 'Café Account Suspended', message });
      } else if (status === 404 || status >= 500) {
        setTenant(fallback);
        setTenantError(null);
        applyTenantThemeVariables(fallback.primaryColor, fallback.accentColor);
      }
    });
    return () => { active = false; };
  }, [user?.tenantId]);

  if (tenantError) {
    return (
      <main id="admin-tenant-error" role="main" className="flex min-h-screen flex-col items-center justify-center bg-stone-900 px-6 text-center text-stone-100">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl text-amber-400">
          ⚠️
        </div>
        <h1 className="font-serif text-2xl font-bold">{tenantError.title}</h1>
        <p className="mt-2 max-w-sm text-sm text-stone-400">{tenantError.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-full bg-amber-500 px-5 py-2 text-xs font-semibold text-stone-900 transition hover:bg-amber-400"
        >
          Reload
        </button>
      </main>
    );
  }

  const value = {
    ...tenant,
    currency: tenant?.currency || tenant?.settings?.currency || '₹',
    setBranding,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useTenant = () => useContext(Context) || { ...fallback, currency: '₹' };
