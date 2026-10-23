const cacheName='encore-driver-shell-v6';
const assets=['./','./index.html','./styles.css','./enhancements.css','./app.mjs','./manifest.webmanifest','./icon.svg','../../packages/shared/styles.css','../../packages/shared/api.mjs','../../packages/shared/ui.mjs','/logo.svg'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(assets)))});
self.addEventListener('activate',event=>{self.clients.claim();event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==cacheName).map(key=>caches.delete(key)))))});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.pathname.startsWith('/api/'))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)).then(response=>response??new Response('Offline',{status:503,statusText:'Offline'})));});
