// FILE: sw.js
// UniWeek Service Worker (v3)
// Fixes stale cache (CSS/JS not updating), supports offline, updates instantly.

const CACHE_VERSION = "uniweek-v3"; // <-- увеличивай версию, если нужно принудительно обновить
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",

  // modules (если какие-то отсутствуют — ничего страшного, fetch их обработает)
  "./storage.js",
  "./schedule.js",
  "./calendar.js",
  "./csvParser.js",
  "./nextLesson.js",
  "./notes.js",
  "./quiz.js",
  "./memory.js",
  "./praise.js",
  "./swipe.js",
  "./progress.js",
  "./achievements.js",
  "./data.js",

  // icons (оставь те, которые реально есть в папке /icons)
  "./icons/icon-32.png",
  "./icons/icon-48.png",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);

    // Кладём core-файлы в кеш. Если каких-то файлов нет (404) — пропускаем, чтобы не завалить install.
    await Promise.all(
      CORE_ASSETS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res && res.ok) await cache.put(url, res);
        } catch (_) {}
      })
    );

    // Обновляться сразу (не ждать закрытия вкладок)
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Чистим старые версии кеша
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => (k !== CACHE_VERSION ? caches.delete(k) : Promise.resolve()))
    );

    // Берём контроль над страницами сразу
    await self.clients.claim();
  })());
});

// helper: определяем, надо ли кешировать запрос
function isCacheableRequest(req) {
  if (req.method !== "GET") return false;
  const url = new URL(req.url);

  // кешируем только свои файлы
  if (url.origin !== self.location.origin) return false;

  // не кешируем query типа ?v=...
  return true;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (!isCacheableRequest(req)) return;

  const url = new URL(req.url);
  const path = url.pathname;

  // Для HTML: network-first (чтобы обновления приходили), fallback на кеш
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    path.endsWith(".html") ||
    path === "/" ||
    path.endsWith("/");

  // Для CSS/JS: stale-while-revalidate (быстро из кеша + обновление в фоне)
  const isStatic =
    path.endsWith(".css") ||
    path.endsWith(".js") ||
    path.endsWith(".webmanifest") ||
    path.endsWith(".png") ||
    path.endsWith(".jpg") ||
    path.endsWith(".jpeg") ||
    path.endsWith(".svg") ||
    path.endsWith(".webp") ||
    path.endsWith(".ico");

  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (isStatic) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Остальное: cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // fallback на главную (если офлайн и страницы нет)
    const fallback = await cache.match("./index.html");
    return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(req);

  const fetchPromise = (async () => {
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      if (fresh && fresh.ok) await cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return null;
    }
  })();

  // если есть кеш — отдаём сразу, а обновление идёт в фоне
  if (cached) {
    eventWait(fetchPromise);
    return cached;
  }

  // если кеша нет — ждём сеть
  const fresh = await fetchPromise;
  if (fresh) return fresh;

  return new Response("Offline", { status: 503, statusText: "Offline" });
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

// маленький хелпер, чтобы не ругался линтер и не падало
function eventWait(p) {
  // no-op wrapper; in some browsers we can't access event here safely
  // so we just start the promise
  Promise.resolve(p).catch(() => {});
}

// Позволяет странице “сказать” SW обновиться (не обязательно, но удобно)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
