const CACHE = "msbeton-v3";
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
  if (url.pathname.startsWith("/api/") || url.protocol === "chrome-extension:") return;

  // Navigácia (otvorenie stránky) — vždy sieť, UTM/fbclid parametre ignorujeme pri cache fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(new Request(url.origin + url.pathname), clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(url.origin + url.pathname)
            .then(cached => cached ?? caches.match("/").then(root => root ?? caches.match(OFFLINE)))
        )
    );
    return;
  }

  // Statické assety (JS/CSS/fonts/images) — cache-first
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && url.pathname.match(/\.(js|css|woff2?|png|jpg|svg|ico)$/)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then(cached => cached ?? caches.match(OFFLINE))
      )
  );
});
