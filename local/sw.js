const CACHE_VERSION = "tetris-local-v2";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./html5.html",
  "./swf/swf-app.js",
  "./shared/bindings.js",
  "./assets/tetris-n-blox.swf",
  "./ruffle/ruffle.js",
  "./ruffle/core.ruffle.1e2252bd248624027488.js",
  "./ruffle/core.ruffle.90db0a0ab193ed0c601b.js",
  "./ruffle/2c12a973805ecd509f19.wasm",
  "./ruffle/7988d187b08957e9c13e.wasm",
  "./favicon/favicon.ico"
];

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("offline", { status: 503 });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => (
      cache.addAll(CORE_ASSETS.map((url) => new Request(url, { cache: "reload" })))
    ))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
    ))
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  const bypassCache = url.searchParams.has("nocache") || url.searchParams.has("sw-reload");

  const path = url.pathname;
  const isRuffle = path.includes("/ruffle/");
  const isWasm = path.endsWith(".wasm");
  const isSwf = path.endsWith(".swf");
  const isHtml = path.endsWith(".html") || path === "/" || path.endsWith("/index.html");

  if (isRuffle || isWasm || isSwf) {
    if (bypassCache) {
      event.respondWith(fetch(new Request(request, { cache: "reload" })));
    } else {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  if (isHtml) {
    if (bypassCache) {
      event.respondWith(fetch(new Request(request, { cache: "reload" })));
    } else {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }
});
