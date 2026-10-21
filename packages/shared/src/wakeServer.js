export const wakeServer = (apiUrl) => {
  try {
    const base = String(apiUrl || '').trim().replace(/\/+$/, '');
    const url = base ? (base.endsWith('/api') ? `${base}/health` : `${base}/api/health`) : '/api/health';
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch(url, { method: 'GET', cache: 'no-store' }).catch(() => {});
    }
  } catch {
    // Silently ignore any errors during background wake-up
  }
};
