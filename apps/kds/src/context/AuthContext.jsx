import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { getOnce } from '../services/api';
import { setAccessToken } from '@cafe/shared';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getOnce('/auth/me')
      .then((res) => {
        if (active) setUser(res.data.user);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setAccessToken(null);
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
