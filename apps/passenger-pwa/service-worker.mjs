const cacheName = 'encore-passenger-shell-v2';
const assets = [
  './',
  './index.html',
  './styles.css',
  './app.mjs',
  './manifest.webmanifest',
  './icon.svg',
  '../../packages/shared/styles.css',
  '../../packages/shared/api.mjs',
  '../../packages/shared/business-rules.mjs',
  '../../packages/shared/domain.mjs',
  '../../packages/shared/ui.mjs'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
