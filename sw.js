// COMETEC Bilan 1.8.1 – fonctionnement hors ligne
const CACHE='cometec-bilan-1.8.1-4825eb2c';
const FILES=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon-64.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())) });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())) });
// réseau d'abord (pour avoir toujours la dernière version), cache si pas d'Internet
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{ const copy=r.clone(); if(r.ok&&new URL(e.request.url).origin===location.origin) caches.open(CACHE).then(c=>c.put(e.request,copy)); return r }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html')))) });
