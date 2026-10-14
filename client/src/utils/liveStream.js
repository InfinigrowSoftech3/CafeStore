import { getResolvedTenantSlug, getResolvedTenantId } from './tenantHelper';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const subscribeToLiveStream = (path, { headers = {}, onEvent }) => {
  const controller = new AbortController();
  const baseUrl = String(import.meta.env.VITE_API_URL || (import.meta.env.PROD
    ? 'https://cafe-app-n8mn.onrender.com/api'
    : '/api')).replace(/\/$/, '');

  const run = async () => {
    while (!controller.signal.aborted) {
      try {
        const tenantSlug = getResolvedTenantSlug();
        const tenantId = getResolvedTenantId();

        if (!tenantSlug && !tenantId) {
          await wait(1500);
          continue;
        }

        const url = new URL(`${baseUrl}${path}`, window.location.origin);
        if (tenantSlug) {
          url.searchParams.set('cafe', tenantSlug);
        }

        const reqHeaders = {
          Accept: 'text/event-stream',
          ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
          ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
          ...headers,
        };

        const response = await fetch(url.toString(), {
          headers: reqHeaders,
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          if (response.status === 404) {
            await wait(5000);
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
              try { onEvent(type, data ? JSON.parse(data) : {}); } catch { /* Ignore malformed event payloads. */ }
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
