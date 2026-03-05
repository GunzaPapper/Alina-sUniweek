// sw.js — DEV MODE: no cache (чтобы стили и js всегда обновлялись)
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  // ничего не кешируем
});
