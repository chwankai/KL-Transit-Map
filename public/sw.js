const CACHE_NAME = "kv-transit-cache-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/images/favicon.png",
  "/images/apple-favicon.png",
  "/station_coords.json",
  "/station_schedules.json",
  "/rail_tracks.json",
  "/gtfs_data.json",
  "/rapid_bus_data.json",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn("Failed to cache asset during install:", url, err))
        )
      );
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isSelfOrigin = e.request.url.startsWith(self.location.origin);
  const isGoogleFont = url.hostname.includes("googleapis.com") || url.hostname.includes("gstatic.com");

  // Only intercept GET requests
  if (e.request.method !== "GET" || (!isSelfOrigin && !isGoogleFont)) return;

  // For HTML navigations, JavaScript modules, and CSS: Network-First strategy
  const isHtmlOrBundle =
    e.request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/assets/");

  if (isHtmlOrBundle) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(e.request).then((cached) => {
            return cached || caches.match("/index.html");
          });
        })
    );
    return;
  }

  // For static JSON datasets, images, and fonts: Cache-First strategy with revalidation
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
