const CACHE = "msbeton-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([OFFLINE])).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Preskočiť API volania a chrome-extension
  if (url.pathname.startsWith("/api/") || url.protocol === "chrome-extension:") return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache statické assets (JS/CSS/fonts/images)
        if (res.ok && (url.pathname.match(/\.(js|css|woff2?|png|jpg|svg|ico)$/) || url.pathname === "/")) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(cached => cached ?? caches.match(OFFLINE))
      )
  );
});
