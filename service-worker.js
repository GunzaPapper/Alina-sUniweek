// sw.js (FULL)
// UniWeek Service Worker — GitHub Pages friendly (relative paths only)

const CACHE_VERSION = "uniweek-v6"; // <-- увеличивай, если хочешь принудительное обновление
const CACHE_NAME = `${CACHE_VERSION}`;

// ВАЖНО: только относительные пути "./..."
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",

  // если эти файлы есть в корне — кешируем их тоже
  "./calendar.js",
  "./csvParser.js",
  "./schedule.js",
  "./storage.js",
  "./nextLesson.js",
  "./swipe.js",
  "./progress.js",
  "./praise.js",
  "./memory.js",
  "./achievements.js",
  "./notes.js",
  "./quiz.js",
];

// Иконки — добавляй те, которые реально есть. Если некоторых нет — ничего страшного,
// ниже есть "safeCacheAll", он не уронит install из-за 404.
const ICON_ASSETS = [
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

// --- Helpers ---
async function safeCacheAll(cache, urls) {
  // Кешируем по одному, чтобы 404 не ломал install
  await Promise.all(
    urls.map(async (url) => {
      try {
        // cache: 'reload' просит свежую копию, важно при обновлениях
        const res = await fetch(url, { cache: "reload" });
        if (!res || !res.ok) return; // пропускаем 404/500
        await cache.put(url, res);
      } catch {
        // молча пропускаем сетевые ошибки
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      self.skipWaiting();
      const cache = await caches.open(CACHE_NAME);

      // Кешируем критичное + иконки безопасно
      await safeCacheAll(cache, CORE_ASSETS);
      await safeCacheAll(cache, ICON_ASSETS);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Удаляем старые кеши
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Только GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Не трогаем чужие домены
  if (url.origin !== self.location.origin) return;

  // Навигация (открытие страницы) — network-first, fallback to cache
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match("./index.html");
          return cached || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      })()
    );
    return;
  }

  // Для файлов (css/js/png/manifest) — cache-first, fallback to network
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        // Кешируем успешные ответы
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        // Если офлайн и нет кеша — просто отдаём 504
        return new Response("", { status: 504 });
      }
    })()
  );
});

// (опционально) получать сообщения из приложения, чтобы обновляться по кнопке
self.addEventListener("message", (event) => {
  if (event?.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
