// sw.js - Service Worker for Aether PWA

// Cache name
const CACHE_NAME = 'aether-pwa-cache-v1';
// Files to cache. Note: Vite hashes filenames. These need to be updated dynamically or handled by a plugin.
// This simple cache list is often insufficient for dynamic builds.
// A more advanced approach uses Workbox or a Vite plugin to generate/manage cache.
const urlsToCache = [
  '/',
  '/index.html', // Will be processed to dist/index.html
  '/assets/main.css', // Will be processed to dist/assets/main-*.css
  '/assets/main.js', // Will be processed to dist/assets/main-*.js
  '/assets/manifest-DFBl5-c_.json', // Example of processed manifest name
  // Add other static assets like icons, fonts, etc. here
  // '/icons/icon-192x192.png',
  // '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Ensure the URLs added to cache are accessible
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});