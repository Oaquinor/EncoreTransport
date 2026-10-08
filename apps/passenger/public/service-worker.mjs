const cacheName='encore-passenger-v1';
const shell=['/passenger/','/passenger/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(shell))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==cacheName).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.pathname.startsWith('/api/')){event.respondWith(fetch(event.request));return;}event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
