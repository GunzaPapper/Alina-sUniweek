// FILE: service-worker.js

/* =========================================================
   UniWeek Service Worker
   - cache-first for static assets
   - offline friendly
   - no external dependencies
========================================================= */

const CACHE_VERSION = "uniweek-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",

  "./js/storage.js",
  "./js/schedule.js",
  "./js/csvParser.js",
  "./js/calendar.js",
  "./js/nextLesson.js",
  "./js/swipe.js",

  "./js/quiz.js",
  "./js/memory.js",
  "./js/achievements.js",
  "./js/progress.js",
  "./js/praise.js",

  "./js/notes.js",

  "./manifest.webmanifest",

  // icons are optional (user will add them); SW should not fail if missing
  // We intentionally DO NOT precache icons to avoid install failure on 404.
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("uniweek-") && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // only handle GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // only same-origin
  if (url.origin !== self.location.origin) return;

  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);

  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);

    // cache successful basic responses
    if (fresh && fresh.status === 200 && fresh.type === "basic") {
      cache.put(req, fresh.clone());
    }

    return fresh;
  } catch {
    // fallback to index for navigation
    if (req.mode === "navigate") {
      const fallback = await cache.match("./index.html");
      if (fallback) return fallback;
    }

    // last resort: try cached root
    const root = await cache.match("./");
    if (root) return root;

    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}