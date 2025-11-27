const CACHE_NAME = "rahmetli-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/assets/css/reset.css",
  "/assets/css/variables.css",
  "/assets/css/layout.css",
  "/assets/css/components.css",
  "/assets/css/responsive.css",
  "/assets/js/app.js",
  "/manifest.json",
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy - Network First, Fall Back to Cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache API calls or non-GET requests
        if (
          !event.request.url.includes("/api/") &&
          event.request.method === "GET"
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Return offline page if available
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
  );
});

// Background Sync for offline actions (optional)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-comments") {
    event.waitUntil(syncComments());
  }
});

async function syncComments() {
  // Implement sync logic for offline comments
  console.log("Syncing offline comments...");
}

// Push Notifications (optional - za buduće notifikacije)
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "Nova obavijest",
    icon: "/assets/images/icon-192x192.png",
    badge: "/assets/images/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(self.registration.showNotification("Rahmetli.me", options));
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
