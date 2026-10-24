// Production service worker for the Brewhaus customer PWA and push notifications.
//
// NOTE ON CACHE INVALIDATION:
// Bump SHELL_CACHE on every deployment that changes the shell/assets. The activate
// handler purges EVERY old shell cache (including the previously live one), so a
// redeploy never serves stale HTML/JS/CSS from a previous version.
const SHELL_CACHE = 'brewhaus-customer-shell-v3';
const SHELL_FILES = ['/', '/offline.html', '/manifest.webmanifest', '/app-icon.svg'];

const isSameOrigin = (url) => new URL(url).origin === self.location.origin;
const pathOf = (request) => new URL(request.url).pathname;
const isAsset = (pathname) => /\.(?:js|css|svg|webmanifest|webp|png|woff2?)$/i.test(pathname);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge every previous shell cache so stale assets from old deploys can never be
  // served again. Then claim uncontrolled clients so the fresh SW takes over now.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('brewhaus-customer-shell-'))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  if (request.method !== 'GET' || !isSameOrigin(url)) return;
  const pathname = pathOf(request);
  if (pathname.startsWith('/api/')) return; // never cache API calls

  if (request.mode === 'navigate') {
    // Navigations are network-first so users always get the latest index.html when
    // online; fall back to the cached shell or offline page when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')) || caches.match('/offline.html')),
    );
    return;
  }

  // Assets (JS/CSS/images/fonts): cache-first, but because activate() purges the
  // whole shell cache on a new version, a miss fetches the fresh asset from the
  // network and re-caches it under the new version.
  if (isAsset(pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return response;
          }),
      ),
    );
    return;
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '☕ Brewhaus Café';
    const actionUrl = data.data?.actionUrl || data.data?.url || data.actionUrl || data.url || '/menu';

    const options = {
      body: data.body || data.message || 'New exclusive special offer at Brewhaus Café!',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      image: data.image || undefined,
      vibrate: [150, 50, 150],
      tag: data.tag || `brewhaus-notice-${Date.now()}`,
      renotify: true,
      data: {
        url: actionUrl,
        actionUrl,
        offerCode: data.data?.offerCode || data.offerCode || '',
        sentAt: data.data?.sentAt || new Date().toISOString(),
      },
      actions: [
        { action: 'open', title: 'View Offer' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('☕ Brewhaus Café', {
        body: text || 'You have a new update from Brewhaus Café',
        icon: '/favicon.svg',
        data: { url: '/menu' },
      }),
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const rawTarget = event.notification.data?.url || event.notification.data?.actionUrl || '/menu';
  // Resolve against the service worker origin so relative paths open the
  // correct website page regardless of the client's current scope.
  let targetUrl = '/menu';
  try {
    targetUrl = new URL(rawTarget, self.location.origin).href;
  } catch {
    targetUrl = new URL('/menu', self.location.origin).href;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this application
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url && client.navigate) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

self.addEventListener('notificationclose', (event) => {
  // Graceful notification close handling
  console.log('Brewhaus notification closed by user:', event.notification.tag);
});
