/**
 * Service Worker — enables offline usage and PWA install.
 * Uses a cache-first strategy for static assets and serves
 * index.html for all navigation requests (SPA support).
 */

const CACHE_NAME = 'rewardsiq-cache-v1';

// Skip waiting so the new SW activates immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Claim all open clients so the new SW takes control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin requests
  if (!request.url.startsWith(self.location.origin)) return;

  // For navigation requests (HTML), serve from cache with network fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put('index.html', response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // For all other GET requests: cache-first, then network
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Only cache successful responses for same-origin resources
          if (response.ok && response.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, response.clone())
            );
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve cached index.html for HTML requests
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('index.html') as Promise<Response>;
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});
