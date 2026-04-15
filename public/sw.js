/* eslint-disable no-undef */
/**
 * Zirat service worker — tiny, focused, offline-aware.
 *
 * Strategy:
 *   - App shell pre-cache: logo, manifest — lets the install screen feel instant.
 *   - Runtime caches by request type:
 *       · /_next/static/*     → cache-first, 30 days
 *       · /logo*, /fonts/*    → cache-first, 30 days
 *       · /api/*              → network-first, fallback cached 10m
 *       · Everything else     → network-first, offline page fallback
 *
 * Versioning: bump CACHE_VERSION when SW logic changes; old caches are
 * cleaned up on activate.
 */

const CACHE_VERSION = "zirat-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const PRECACHE_URLS = ["/manifest.json", "/logo.webp", "/logo-sticker.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ttf")
  );
}

function isImage(url) {
  return /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

async function networkFirst(request, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const copy = fresh.clone();
      const headers = new Headers(copy.headers);
      headers.set("x-sw-cached-at", Date.now().toString());
      const body = await copy.blob();
      cache.put(
        request,
        new Response(body, {
          status: copy.status,
          statusText: copy.statusText,
          headers,
        })
      );
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const ts = Number(cached.headers.get("x-sw-cached-at") || 0);
      if (!maxAgeMs || Date.now() - ts < maxAgeMs) return cached;
    }
    throw new Error("offline-no-cache");
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache auth or payment endpoints
  if (
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/upload") ||
    url.pathname.startsWith("/api/stripe") ||
    url.pathname.includes("/webhooks/")
  ) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (isImage(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      networkFirst(request, API_CACHE, 10 * 60 * 1000).catch(
        () =>
          new Response(
            JSON.stringify({ offline: true, error: "offline" }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          )
      )
    );
    return;
  }

  // HTML navigations → network-first with lightweight offline fallback
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      networkFirst(request, RUNTIME_CACHE, 24 * 60 * 60 * 1000).catch(
        () =>
          new Response(
            `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>לא מחובר לאינטרנט</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050505;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:24px;margin:0 0 8px;color:#C9A84C}p{opacity:.75}</style></head><body><div><h1>זירה - לא מחוברים</h1><p>ברגע שהחיבור יחזור, דפדפי שוב והכל יהיה שם.</p></div></body></html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          )
      )
    );
  }
});

// Push notifications — graceful no-op if browser doesn't support it
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "זירה", body: event.data.text() };
  }
  const title = data.title || "זירה";
  const options = {
    body: data.body || "",
    icon: "/logo-sticker.webp",
    badge: "/logo-sticker.webp",
    dir: "rtl",
    lang: "he",
    tag: data.tag || "zirat",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.navigate(url).then(() => client.focus());
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
