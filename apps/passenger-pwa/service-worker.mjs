const cacheName = 'encore-passenger-preview-v1';
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
  '../../packages/shared/mock-data.mjs',
  '../../packages/shared/ui.mjs'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cachedResponse) => cachedResponse ?? fetch(event.request)));
});