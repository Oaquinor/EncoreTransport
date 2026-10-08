const cacheName='encore-driver-shell-v5';
const assets=['./','./index.html','./styles.css','./app.mjs','./manifest.webmanifest','./icon.svg','../../packages/shared/styles.css','../../packages/shared/api.mjs','../../packages/shared/ui.mjs'];
self.addEventListener('install',e=>e.waitUntil(caches.open(cacheName).then(c=>c.addAll(assets))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==cacheName).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')){e.respondWith(fetch(e.request));return}e.respondWith(caches.match(e.request).then(c=>c??fetch(e.request)))});
