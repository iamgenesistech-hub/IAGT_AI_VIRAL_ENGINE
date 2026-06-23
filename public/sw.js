/**
 * EVICS PWA Service Worker
 * Enables offline access, push notifications, and app-like experience.
 * Version: 1.0.0
 */

const CACHE_NAME = "evics-v1";
const OFFLINE_URL = "/offline.html";

// Assets to pre-cache for offline use
const PRE_CACHE = [
  "/",
  "/affiliate",
  "/trading-education",
  "/manifest.json",
  "/styles.css",
  "/offline.html",
];

// ── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE).catch(() => {
        // Non-fatal: cache what we can
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network-first, no caching
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ success: false, error: "You are offline. Please reconnect." }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "EVICS Alert", body: event.data.text() };
  }

  const options = {
    body: data.body || "You have a new notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || "evics-notification",
    data: data.actionUrl ? { url: data.actionUrl } : {},
    actions: [
      { action: "view", title: "View", icon: "/icons/icon-96.png" },
      { action: "dismiss", title: "Dismiss" },
    ],
    requireInteraction: data.priority === "high",
    silent: false,
    vibrate: data.priority === "high" ? [200, 100, 200] : [100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "EVICS", options)
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/affiliate";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
