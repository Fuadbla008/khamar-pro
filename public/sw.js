/* Khamar service worker — dependency-free and Turbopack-safe. */

const PREFIX = "khamar-";
const VERSION = "v1";
const SHELL_CACHE = `${PREFIX}${VERSION}-shell`;
const ROUTE_CACHE = `${PREFIX}${VERSION}-routes`;
const DATA_CACHE = `${PREFIX}${VERSION}-data`;
const STATIC_CACHE = `${PREFIX}${VERSION}-static`;
const ACTIVE_CACHES = [SHELL_CACHE, ROUTE_CACHE, DATA_CACHE, STATIC_CACHE];

const SHELL_URLS = [
  "/",
  "/~offline",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

const DATA_TIMEOUT_MS = 2500;
const MAX_DATA_ENTRIES = 60;
const MAX_ROUTE_ENTRIES = 40;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(PREFIX) && !ACTIVE_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (isSupabase(url)) {
    event.respondWith(networkFirstData(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (isDataRequest(url, request)) {
    event.respondWith(networkFirstData(request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isSupabase(url) {
  return url.hostname === "supabase.co" || url.hostname.endsWith(".supabase.co");
}

function isDataRequest(url, request) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1"
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|mjs|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)$/i.test(
      url.pathname
    )
  );
}

function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DATA_TIMEOUT_MS);
  return fetch(request, { signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function trimCache(cache, limit) {
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(
    keys.slice(0, keys.length - limit).map((key) => cache.delete(key))
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(ROUTE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      cache.put(request, response.clone()).catch(() => undefined);
      trimCache(cache, MAX_ROUTE_ENTRIES).catch(() => undefined);
    }
    return response;
  } catch {
    const cached = await cache.match(request).catch(() => undefined);
    if (cached) return cached;

    const offline =
      (await caches.match("/~offline")) ||
      (await caches.match("/offline.html"));
    if (offline) return offline;

    return new Response(
      "<!doctype html><html lang='bn'><meta charset='utf-8'><title>অফলাইন</title><body><h1>আপনি অফলাইন আছেন</h1><p>সংযোগ ফিরে এলে আবার চেষ্টা করুন।</p></body></html>",
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetchWithTimeout(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => undefined);
      trimCache(cache, MAX_DATA_ENTRIES).catch(() => undefined);
    }
    return response;
  } catch {
    const cached = await cache.match(request).catch(() => undefined);
    if (cached) return cached;

    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request).catch(() => undefined);

  const network = fetch(request)
    .then((response) => {
      if (
        response &&
        response.ok &&
        (response.type === "basic" || response.type === "opaque")
      ) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) return cached;
  return (await network) || new Response("", { status: 504 });
}
