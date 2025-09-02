self.addEventListener('install',e=>{e.waitUntil(caches.open('litewallet-v1').then(c=>c.addAll(['./index.html','./styles.css','./app.js','./manifest.json'])))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).catch(()=>caches.open('litewallet-v1').then(c=>c.match(e.request))))});