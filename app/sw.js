// sw.js — the "service worker": a small helper Safari runs in the background so the
// app opens even without internet.
//
// Strategy: "network first". When online you always get the newest version of the app
// (and a copy is saved); when offline, the saved copy is used. Your data is NOT stored
// here — it lives in the database (db.js). This only stores the app's own files.

const CACHE = 'momentum-app-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Remove copies saved by older versions of this file.
    for (const name of await caches.keys()) {
      if (name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle the app's own files. Other requests (like the AI API later) go straight through.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request, { ignoreSearch: true });
      return cached ?? (await caches.match('./index.html')) ?? Response.error();
    }
  })());
});
