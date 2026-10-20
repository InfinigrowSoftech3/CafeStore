import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const Context = createContext(null);
const fallback = { name: 'Café', currency: '₹', logoUrl: '', primaryColor: '#0F3D2E', settings: { taxRate: 5, currency: '₹' } };

export function TenantProvider({ children }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState(fallback);

  useEffect(() => {
    if (user?.tenant) {
      setTenant(prev => ({
        ...prev,
        ...user.tenant,
        name: user.tenant.name || user.tenantName || prev.name,
      }));
    } else if (user?.tenantName && user.tenantName !== 'Café') {
      setTenant(prev => ({ ...prev, name: user.tenantName }));
    }
  }, [user?.tenant, user?.tenantName]);

  useEffect(() => {
    let active = true;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const identifier = user?.tenantId || urlParams?.get('tenant') || urlParams?.get('cafe') || urlParams?.get('slug');

    // Only query /tenant/public if a tenant identifier is present (avoids 404 when unauthenticated)
    if (!identifier) {
      return;
    }

    const queryParam = `?tenant=${encodeURIComponent(identifier)}`;
    api.get(`/tenant/public${queryParam}`).then(({ data }) => {
      if (!active) return;
      const t = data.tenant || fallback;
      setTenant(prev => ({ ...prev, ...t }));
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.tenantId]);

  const value = {
    ...tenant,
    currency: tenant?.currency || tenant?.settings?.currency || '₹',
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTenant() {
  const context = useContext(Context);
  return context || fallback;
}
