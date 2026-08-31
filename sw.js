const CACHE_NAME = 'campus-social-v3';
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
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                CORE_ASSETS.map(path => 
                    cache.add(path).catch(err => console.warn(`Failed to cache: ${path}`, err))
                )
            );
        })
    );
});

// Clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (cache !== CACHE_NAME) return caches.delete(cache);
                    })
                );
            }),
            self.clients.claim()
        ])
    );
});

// Stale-While-Revalidate Strategy for fast loading
self.addEventListener('fetch', (event) => {
    // Exclude Firebase API calls from Service Worker caching
    if (event.request.url.includes('firestore.googleapis.com')) return;

    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Response aate hi turant clone kar lo
                const responseToCache = networkResponse.clone();
                
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                
                return networkResponse;
            }).catch(() => {
                // Agar internet band ho toh error crash na kare
                console.log("Offline mode active");
            });

            return cachedResponse || fetchPromise;
        })
    );
});