/* Ndoti service worker: makes the app open and show the last data without network.
   Writes are not handled here; they go through the outbox (src/lib/outbox.ts). */
const VERSION = 'v1';
const STATIC = `ndoti-static-${VERSION}`;
const PAGES = `ndoti-pages-${VERSION}`;
const API = `ndoti-api-${VERSION}`;
const ROUTES = ['/', '/login', '/register', '/pending', '/h', '/h/request', '/c', '/c/dump', '/a'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const pages = await caches.open(PAGES);
    const statics = await caches.open(STATIC);
    for (const route of ROUTES) {
      try {
        const res = await fetch(route, { credentials: 'same-origin' });
        if (!res.ok) continue;
        await pages.put(route, res.clone());
        // Also save the JavaScript and CSS each screen needs.
        const html = await res.text();
        const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
        await Promise.all(assets.map((a) => statics.add(a).catch(() => {})));
      } catch { /* offline during install: pages get cached on first visit instead */ }
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (![STATIC, PAGES, API].includes(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'clear-api-cache') event.waitUntil(caches.delete(API));
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(request, { ignoreSearch: cacheName === PAGES });
    if (hit) return hit;
    if (fallbackUrl) { const fb = await cache.match(fallbackUrl); if (fb) return fb; }
    return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(req));
  } else if (url.pathname.startsWith('/api/')) {
    if (url.pathname.startsWith('/api/auth/')) return;
    event.respondWith(networkFirst(req, API));
  } else if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, PAGES, '/'));
  }
});
