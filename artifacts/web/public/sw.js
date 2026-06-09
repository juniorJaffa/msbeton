const CACHE = "msbeton-v5";
const OFFLINE = "/offline.html";
const OFFLINE_HTML = '<!DOCTYPE html><html lang="sk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MS-BETON — Offline</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#001D3D;font-family:system-ui,sans-serif;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}.logo{font-size:26px;font-weight:900;margin-bottom:20px}.ms{color:#EDC531}.btn{display:inline-block;background:#EDC531;color:#001D3D;font-weight:800;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;text-decoration:none;border-radius:2px;margin-top:20px}</style></head><body><div><div class="logo"><span class="ms">MS</span>-BETON</div><p style="color:rgba(255,255,255,.5);font-size:14px">Bez internetu. Skúcte znova.</p><a href="/" class="btn">Skúšať znova</a><p style="margin-top:20px;font-size:13px;color:rgba(255,255,255,.35)"><a href="tel:+421909205205" style="color:#EDC531">+421 909 205 205</a></p></div></body></html>';

const offlineFallback = () =>
  caches.match(OFFLINE).then(r => r ?? new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }));

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

  // Navigácia — vždy sieť, cache bez UTM/fbclid params, vždy platný Response
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
            .then(cached => cached ?? caches.match("/"))
            .then(cached => cached ?? offlineFallback())
        )
    );
    return;
  }

  // Statické assety — cache ak úspešné, fallback na offline (vždy platný Response)
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
        caches.match(e.request, { ignoreSearch: true })
          .then(cached => cached ?? offlineFallback())
      )
  );
});
