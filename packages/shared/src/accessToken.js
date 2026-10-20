const TOKEN_KEY = 'cafe:auth_token';
let inMemoryToken = null;

export const getAccessToken = () => {
  if (inMemoryToken) return inMemoryToken;
  try {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      if (stored) {
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
