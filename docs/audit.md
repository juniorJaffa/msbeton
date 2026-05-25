# MS-BETON — Audit stav projektu

> Aktualizované: 2026-05-25  
> Prostredie: demo.msbeton.sk → finálna migrácia na msbeton.sk

---

## Bezpečnosť

| # | Sekcia | Popis | Stav |
|---|--------|-------|------|
| 1 | Admin auth | JWT server-side (ADMIN_PASSWORD + ADMIN_JWT_SECRET v ecosystem.config.cjs) | ✅ Hotovo |
| 2 | Admin btoa | Odstránené btoa("Msbeton2023") z JS bundle | ✅ Hotovo |
| 3 | Rate limiting | express-rate-limit 10 req/15 min na login endpointy | ✅ Hotovo |
| 4 | Security headers | helmet.js (HSTS, X-Frame-Options, MIME sniffing) | ✅ Hotovo |
| 5 | CORS whitelist | msbeton.sk, demo.msbeton.sk, www.msbeton.sk, localhost:5173 | ✅ Hotovo |
| 6 | Turnstile CAPTCHA | Invisible Cloudflare Turnstile na objednávky (site key + secret key) | ✅ Hotovo |
| 7 | Circular import fix | loginRateLimit presunutý do lib/rateLimits.ts (API 502 crash) | ✅ Hotovo |
| 8 | GeoIP blokovanie SK/CZ | Cloudflare WAF firewall rule — čaká na migráciu domény msbeton.sk | ⏳ Čaká (po migrácii) |
| 9 | Cloudflare proxy | DNS + WAF + Bot Fight Mode — čaká na migráciu | ⏳ Čaká (po migrácii) |

---

## GDPR & Súlad

| # | Sekcia | Popis | Stav |
|---|--------|-------|------|
| 10 | GA4 Consent Mode v2 | Default denied, update na granted po akceptovaní cookies | ✅ Hotovo |
| 11 | Cookie banner | Akceptovanie → gtag consent update; odkaz na OÚ stránku | ✅ Hotovo |
| 12 | OÚ stránka | /ochrana-osobnych-udajov — plná GDPR politika | ✅ Hotovo |
| 13 | VOP stránka | /vop — 7 sekcií obchodných podmienok | ✅ Hotovo |
| 14 | Footer linky | href opravené z "#" na /ochrana-osobnych-udajov a /vop | ✅ Hotovo |

---

## SEO & Indexovanie

| # | Sekcia | Popis | Stav |
|---|--------|-------|------|
| 15 | robots.txt | Disallow: / na demo (neindexovať pred migráciou) | ✅ Hotovo |
| 16 | Sitemap | /cennik, /vozovy-park, /ochrana-osobnych-udajov, /vop | ✅ Hotovo |
| 17 | Canonical URL | https://msbeton.sk/ v index.html | ✅ Hotovo |
| 18 | noindex meta | noindex,nofollow na demo.msbeton.sk | ✅ Hotovo |
| 19 | OG tags | og:title, og:description, og:image, og:url | ✅ Hotovo |
| 20 | Per-route meta | SEOHead komponent — chýba per-route title+description | ❌ Chýba |
| 21 | Self-host Montserrat | Fonts cez Google CDN → self-hosted (GDPR + výkon) | ❌ Chýba |

---

## CI/CD & Deploy

| # | Sekcia | Popis | Stav |
|---|--------|-------|------|
| 22 | GH Action PM2 | pm2 delete + start namiesto restart (načíta nové env) | ✅ Hotovo |
| 23 | GH Action DB push | DATABASE_URL z ecosystem.config.cjs cez node -e | ✅ Hotovo |
| 24 | Health check | Web HTTP 200 + API /healthz JSON check v GH Action | ✅ Hotovo |
| 25 | DB backup | pg_dump cron 3:17 AM → /var/backups/msbeton/ 30-dňová retencia | ✅ Hotovo |

---

## Analýzy & Monitoring

| # | Sekcia | Popis | Stav |
|---|--------|-------|------|
| 26 | GA4 Analýzy tab | JWT auth header na /api/admin/analytics (authFetch helper) | ✅ Hotovo |
| 27 | GA4 Realtime | authFetch na /api/admin/analytics/realtime | ✅ Hotovo |
| 28 | GSC SEO tab | GSC endpoint + SearchConsoleTab komponent | ✅ Hotovo |
| 29 | GSC grafy | Rozšírenie o grafy + integrácia za GA4 tab — čaká na dáta od ~2026-06-01 | ⏳ Čaká |

---

## Frontend & UX

| # | Sekcia | Popis | Stav |
|---|--------|-------|------|
| 30 | Lazy Maps | Google Maps API sa načíta iba keď user vyberie address/map režim | ✅ Hotovo |
| 31 | Turnstile widget | Invisible widget v Calculator pred submit tlačidlom | ✅ Hotovo |
| 32 | Admin login | WebAuthn biometria + math captcha + attempt lockout | ✅ Hotovo |
| 33 | Floating client indikátor | Zobrazuje sa počas scrollovania | ✅ Hotovo |
| 34 | CSV export objednávok | Export button → orders.csv v AdminDashboard | ❌ Chýba |
| 35 | Zdieľanie výpočtu | URL-enkódované parametre kalkulačky | ❌ Chýba |
| 36 | Virtualizácia objednávok | Pre 200+ objednávok (react-window alebo similar) | ❌ Chýba |
| 37 | Uloženie výpočtu | Uložiť kalkuláciu do localStorage | ❌ Chýba |
| 38 | Offline PWA stránka | Service worker fallback offline page | ❌ Chýba |

---

## PDF / Exporty

| # | Sekcia | Popis | Stav |
|---|--------|-------|------|
| 39 | Minusové pretaženie PDF | Červený riadok (background:#fef2f2) pre ⚠ warning riadky | ✅ Hotovo |
| 40 | Duplicitné ikony | Odstránená duplicitná AlertTriangle SVG v detail view | ✅ Hotovo |

---

## Legenda

| Stav | Význam |
|------|--------|
| ✅ Hotovo | Implementované a nasadené |
| ⏳ Čaká | Naplánované, blokuje externá podmienka |
| ❌ Chýba | Nebolo implementované, priorita na zváženie |
| 🔴 Bug | Aktívna chyba |
