import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { getOnce } from '../services/api';
import { getAccessToken, setAccessToken } from '@cafe/shared';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // 1. Support seamless single sign-on from Admin Back Office
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const ssoToken = urlParams.get('sso') || urlParams.get('token');
        if (ssoToken) {
          setAccessToken(ssoToken);
          urlParams.delete('sso');
          urlParams.delete('token');
          const cleanSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
          window.history.replaceState({}, document.title, window.location.pathname + cleanSearch);
        }
      } catch {
        // Ignore URL parsing errors
      }
    }

    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    getOnce('/auth/me')
      .then((res) => {
        if (active) setUser(res.data.user);
      })
      .catch(() => {
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password, twoFactorCode) => {
    const { data } = await api.post('/auth/login', { email, password, ...(twoFactorCode && { twoFactorCode }) });
    const { user: authUser } = data;
    setAccessToken(data.token);
    setUser(authUser);
    return authUser;
  };

  const demoLogin = (role = 'cashier') => {
    const demoUser = {
      _id: 'demo-staff-pos',
      name: role === 'cashier' ? 'Pooja (Cashier)' : 'Rahul (Store Manager)',
      email: role === 'cashier' ? 'cashier@brewhaus.com' : 'manager@brewhaus.com',
      role: role,
      tenantName: 'Brewhaus Café',
      tenantId: 'demo-tenant',
    };
    setUser(demoUser);
    return demoUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = useMemo(() => ({
    user,
    loading,
    login,
    demoLogin,
    logout,
    updateUser,
    isAuthenticated: Boolean(user),
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
