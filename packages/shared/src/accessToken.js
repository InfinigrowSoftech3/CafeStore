const TOKEN_KEY = 'cafe:auth_token';
let inMemoryToken = null;

export const isTokenExpired = (token) => {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && typeof payload.exp === 'number') {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch {
    return false;
  }
};

export const getAccessToken = () => {
  if (inMemoryToken) {
    if (isTokenExpired(inMemoryToken)) {
      setAccessToken(null);
      return null;
    }
    return inMemoryToken;
  }
  try {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      if (stored) {
        if (isTokenExpired(stored)) {
          setAccessToken(null);
          return null;
        }
        inMemoryToken = stored;
        return stored;
      }
    }
  } catch {
    // Ignore storage errors (private mode, SSR)
  }
  return inMemoryToken;
};

export const setAccessToken = (token) => {
  inMemoryToken = token || null;
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  } catch {
    // Ignore storage errors
  }
};
