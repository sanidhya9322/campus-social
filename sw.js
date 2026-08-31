const CACHE_NAME = 'campus-social-v2';
const CORE_ASSETS = [
    '/',
    '/dashboard.html',
    '/dashboard.css',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install & Cache Core Assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) return caches.delete(cache);
                })
            );
        })
    );
});

// Stale-While-Revalidate Strategy for fast loading
self.addEventListener('fetch', (event) => {
    // Exclude Firebase API calls from Service Worker caching
    if (event.request.url.includes('firestore.googleapis.com')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});