const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Universal Server-Sent Events (SSE) subscriber
 * Supports both staff authenticated streams (with Authorization header / credentials)
 * and customer unauthenticated streams (with X-Tenant-Slug header / ?cafe= slug parameter).
 */
export const subscribeToLiveStream = (path, options = {}) => {
  const {
    onEvent,
    getAccessToken,
    onUnauthorized,
    tenantSlug,
    headers = {},
    credentials = 'include',
    baseUrl: customBaseUrl,
  } = options;

  const controller = new AbortController();
  const defaultBaseUrl = typeof window !== 'undefined' && window.__API_URL__
    ? window.__API_URL__
    : (import.meta.env?.VITE_API_URL || (import.meta.env?.PROD
      ? 'https://cafe-app-n8mn.onrender.com/api'
      : '/api'));

  const rawBase = customBaseUrl || defaultBaseUrl;
  const baseUrl = String(rawBase).replace(/\/$/, '');

  const run = async () => {
    while (!controller.signal.aborted) {
      try {
        const url = new URL(`${baseUrl}${path}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        if (tenantSlug) {
          url.searchParams.set('cafe', tenantSlug);
        }

        const open = async () => {
          const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
          const reqHeaders = {
            Accept: 'text/event-stream',
            ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
          };

          return fetch(url.toString(), {
            headers: reqHeaders,
            credentials,
            signal: controller.signal,
          });
        };

        let response = await open();
        if (response.status === 401 && typeof onUnauthorized === 'function') {
          const refreshed = await onUnauthorized();
          if (refreshed) {
            response = await open();
          }
        }

        if (!response.ok || !response.body) {
          if (response.status === 404) {
            await wait(4000);
          }
          throw new Error(`Live updates returned ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            let type = 'message';
            let data = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) type = line.slice(6).trim();
              if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            if (type !== 'message' || data) {
              try {
                if (typeof onEvent === 'function') {
                  onEvent(type, data ? JSON.parse(data) : {});
                }
              } catch {
                /* Ignore malformed event payloads. */
              }
            }
          }
        }
      } catch (error) {
        if (controller.signal.aborted) break;
      }
      if (!controller.signal.aborted) await wait(2500);
    }
  };

  run();
  return () => controller.abort();
};
