# MS-BETON — Audit stav projektu

> Aktualizované: 2026-05-25 (iterácia #2)
> Prostredie: demo.msbeton.sk → finálna migrácia na msbeton.sk

---

## Audit stav — pred a po (všetky sekcie)

### 🔴 Bezpečnosť

| # | Problém | Pred | Po | Stav |
|---|---------|------|----|------|
| 1 | Admin heslo v JS bundle (`btoa`) | Viditeľné v DevTools | Server-side JWT (`POST /api/admin/login`) | ✅ |
| 2 | Rate limit na login | Žiadny | 10 req/15 min per IP (admin + klient) | ✅ |
| 3 | Security headers | Žiadne | `helmet.js` — HSTS, X-Frame, MIME | ✅ |
| 4 | CAPTCHA na objednávkach | Žiadna | Cloudflare Turnstile (invisible) | ✅ |
| 5 | Cloudflare proxy / WAF | Žiadny | Po migrácii na msbeton.sk | ⏳ |
| 6 | GeoIP blocking SK/CZ | Žiadny | Po Cloudflare proxy | ⏳ |
| 7 | CORS wildcard | `cors()` bez origin | Whitelist msbeton.sk + demo + localhost | ✅ |
| 8 | Circular import crash (502) | `loginRateLimit` undefined → 502 | `lib/rateLimits.ts` | ✅ |
| 9 | Rate limit IPv6 crash | `keyGenerator` bez IPv6 → ValidationError | `ipKeyGenerator()` helper | ✅ |
| 10 | Session v localStorage | XSS theft možný | HttpOnly cookie (po Cloudflare) | ⏳ |

### 🟡 GDPR / Právne

| # | Problém | Pred | Po | Stav |
|---|---------|------|----|------|
| 11 | GA4 bez cookie súhlasu | Spúšťal sa vždy | Consent Mode v2 — denied by default | ✅ |
| 12 | Cookie banner bez GA4 | Banner bez gtag | `accept()` → `gtag consent update` | ✅ |
| 13 | Ochrana osobných údajov | Chýbala | `/ochrana-osobnych-udajov` — plná GDPR politika | ✅ |
| 14 | VOP | Chýbali | `/vop` — 7 sekcií | ✅ |
| 15 | Footer linky | `href="#"` | Správne linky na OÚ + VOP | ✅ |

### 🟡 SEO

| # | Problém | Pred | Po | Stav |
|---|---------|------|----|------|
| 16 | robots.txt | `Allow: /` — demo sa indexovalo | `Disallow: /` | ✅ |
| 17 | noindex meta | Chýbal | `<meta name="robots" content="noindex,nofollow">` | ✅ |
| 18 | Canonical URL | Chýbal | `<link rel="canonical" href="https://msbeton.sk/">` | ✅ |
| 19 | Sitemap | Len 3 URL | +OÚ, +VOP (5 URL) | ✅ |
| 20 | Per-route meta description | Jedna pre celú SPA | `SEOHead` komponent — každá route má vlastný title/desc | ✅ |
| 21 | Self-host Montserrat | Google CDN latencia + GDPR | `@fontsource/montserrat` — 6 váh, žiadny CDN | ✅ |

### 🟡 UI/UX

| # | Problém | Pred | Po | Stav |
|---|---------|------|----|------|
| 22 | Admin nav 8 tabov preplnené | Na 1280px preplnené | SEO tab pridaný, grouping ešte chýba | ⚠ čiastočne |
| 23 | Kalkulačka — zdieľanie výsledku | Žiadne | Neplánované — chýba | ❌ |
| 24 | Objednávky — stránkovanie | Všetky naraz, pomalé 200+ | 30/stránku, pagination controls | ✅ |
| 25 | Kalkulačka — uložiť výpočet | Musí zadávať znova | Chýba | ❌ |
| 26 | CSV export objednávok | Žiadny | Chýba | ❌ |
| 27 | Offline stránka (PWA) | Biela stránka pri crash | `sw.js` + `offline.html` — service worker | ✅ |
| 28 | Admin login UX | Jednoduchý btoa formulár | WebAuthn biometria + math captcha + lockout | ✅ |
| 29 | Floating client indikátor | Objavoval sa až po pustení scroll | Zobrazuje sa počas scrollovania | ✅ |

### 🟢 Výkon

| # | Problém | Pred | Po | Stav |
|---|---------|------|----|------|
| 30 | Google Maps vždy načítaný | Pri každom otvorení webu | Lazy load — iba pri address/map mode | ✅ |
| 31 | Google Fonts z CDN | Latencia + GDPR | `@fontsource/montserrat` — self-hosted woff2 | ✅ |
| 32 | CDN pre statické assets | Žiadny | Cloudflare (po migrácii) | ⏳ |

### 🔵 CI/CD + DevOps

| # | Problém | Pred | Po | Stav |
|---|---------|------|----|------|
| 33 | Smoke test po deployi | Žiadny | HTTP 200 + `/api/healthz` v GH Action | ✅ |
| 34 | DB backup | Žiadny | `pg_dump` cron 3:17 AM, 30-dňová retencia | ✅ |
| 35 | PM2 `--update-env` | Nenačítal nové env | `pm2 delete + start` v deploy scripte | ✅ |
| 36 | GH Action DATABASE_URL | Hardcoded | Čítaná z `ecosystem.config.cjs` | ✅ |

### 🟡 Analýzy & Monitoring

| # | Problém | Pred | Po | Stav |
|---|---------|------|----|------|
| 37 | GA4 tab — JWT auth | `fetch` bez tokenu → 401 | `authFetch` helper | ✅ |
| 38 | Realtime tab — JWT auth | `fetch` bez tokenu → 401 | `authFetch` helper | ✅ |
| 39 | GSC SEO tab | Chýbala v desktop nav | Pridaná do `tabs` array | ✅ |
| 40 | GSC grafy | Chýbajú | Čaká na dáta od ~2026-06-01 | ⏳ |

### 📄 PDF / Exporty

| # | Problém | Pred | Po | Stav |
|---|---------|------|----|------|
| 41 | Minusové pretaženie PDF farba | Čierny text | Červený riadok `background:#fef2f2` | ✅ |
| 42 | Duplicitné ikony warning | Dve AlertTriangle vedľa seba | Jedna ikona | ✅ |

---

**Legenda:** ✅ Hotovo | ⏳ Čaká (externá podmienka) | ❌ Chýba | ⚠ Čiastočne

---

## Originálny audit — nájdené nedostatky (pred akýmikoľvek fixmi)

> Toto bol výsledok kompletnej analýzy projektu pri prvom audite (2026-05-25).
> Prioritizované podľa závažnosti — slúži ako referencia čo existovalo pred fixmi.

### 🔴 BEZPEČNOSŤ (kritické)

| # | Problém | Prečo riešiť | Riešenie |
|---|---------|--------------|----------|
| 1 | **Admin heslo v JS bundle** — `btoa("Msbeton2023")` v `adminAuth.ts` viditeľné každému v DevTools | Ktokoľvek otvorí Sources tab → vidí heslo | Presunúť admin auth na server (`POST /api/admin/login` + JWT) |
| 2 | **Žiadny rate limit na API** — `/api/client/login` bez obmedzenia | Brute force 1000 hesiel/sek | `express-rate-limit` — max 10 req/min per IP na login endpoint |
| 3 | **Žiadne security headers** — bez `helmet.js` | XSS, clickjacking, MIME sniffing | `app.use(helmet())` — 1 riadok, pokryje CSP, X-Frame-Options, HSTS |
| 4 | **Žiadny Cloudflare** | DDoS, boty, scraperi | Cloudflare free plan — DNS → proxy. Bot Fight Mode zapnutý zadarmo |
| 5 | **Žiadna CAPTCHA na objednávkach** | Spam objednávky, email flooding | Cloudflare Turnstile (zadarmo, privacy-friendly, lepší ako reCAPTCHA) |
| 6 | **Session v localStorage** (admin + klient) | XSS útok môže ukradnúť session | HttpOnly cookie pre session token (po presune na server auth) |

### 🟡 GDPR / PRÁVNE (pre SK trh povinné)

| # | Problém | Prečo riešiť |
|---|---------|--------------|
| 7 | **GA4 bez cookie consent bannera** | GDPR vyžaduje súhlas pred spustením analytiky — pokuta od ÚOOÚ |
| 8 | **Žiadna stránka Ochrana osobných údajov** | Povinná pre každý web zbierajúci dáta (GA4, objednávky) |
| 9 | **Žiadne VOP** | Záväzná objednávka bez VOP = právna šedá zóna |

Riešenie: lightweight consent banner → GA4 len po súhlase (`gtag('consent', 'update', ...)`). Pre SK trh stačí jednoduchý modal pri prvej návšteve.

### 🟡 SEO

| # | Problém | Prečo riešiť | Riešenie |
|---|---------|--------------|----------|
| 10 | **SPA — jedna meta description** | Google vidí rovnaký popis pre všetky stránky (/, /cennik, /vozovy-park) | `react-helmet-async` — per-route title + description |
| 11 | **Sitemap — len 3 URL** | Google neindexuje `/kontakt` ak existuje | Doplniť všetky verejné routes |
| 12 | **robots.txt Allow: / na demo** | noindex v HTML ho prekoná, ale lepší je `Disallow: /` pokiaľ je demo | Zmeniť na `Disallow: /` kým je demo — odstrániť po migrácii na prod |
| 13 | **Canonical URL chýba** | Demo URL môže konkurovať prod URL po migrácii | `<link rel="canonical" href="https://msbeton.sk/...">` |
| 14 | **Core Web Vitals — Google Maps script vždy načítaný** | Spomaľuje LCP na stránkach bez mapy | Lazy-load Maps API len na `/cennik` kde je kalkulačka |

### 🟡 UI/UX

| # | Problém | Prečo riešiť | Riešenie |
|---|---------|--------------|----------|
| 15 | **Admin nav 8 tabov** — na 1280px monitor preplnené | Príliš dlhé, horšia orientácia | Zoskupiť ŠTATISTIKY + ANALÝZY + SEO pod jeden "Analýzy" tab s vlastným subtab menu |
| 16 | **Kalkulačka — žiadne zdieľanie výsledku** | Klient chce poslať link s výsledkom obchodníkovi | "Kopírovať link" tlačidlo ktoré zakóduje parametre do URL |
| 17 | **Objednávky — žiadna stránkovanie/virtualizácia** | Po 200+ objednávkach DOM bude pomalý | Virtualizácia zoznamu alebo server-side pagination |
| 18 | **Kalkulačka — žiadny "Uložiť kalkuláciu"** | Klient musí zadávať znova pri ďalšej návšteve | localStorage uloženie poslednej kalkulácie |
| 19 | **Admin — žiadny CSV export objednávok** | Vedenie chce tabuľku na mesačné reporty | Export button → `orders.csv` |
| 20 | **Žiadna offline stránka** (PWA manifest existuje) | Keď server padne, biela stránka | Service worker + offline fallback stránka |

### 🟢 VÝKON

| # | Problém | Riešenie |
|---|---------|----------|
| 21 | Google Fonts načítava z CDN (latencia) | Self-host Montserrat (woff2) v `/public/fonts/` |
| 22 | Google Maps API vždy načítaný | Lazy import len keď klik na "Mapa" v kalkulačke |
| 23 | Žiadny CDN pre statické assets | Cloudflare (bod 4) rieši aj toto zadarmo |

### 🔵 CI/CD + DevOps

| # | Problém | Riešenie |
|---|---------|----------|
| 24 | Žiadne automatické testy | Aspoň smoke test — `curl demo.msbeton.sk/api/healthz` v GitHub Action po deployi |
| 25 | DB backup žiadny viditeľný | `pg_dump` cron na serveri → uložiť na B2/S3 |
| 26 | PM2 `--update-env` nefunguje (zdokumentované) | Vyriešiť raz natrvalo — `pm2 delete + start` v deploy scripte |

### Prioritné poradie (pôvodné odporúčanie)

1. **Cloudflare (bod 4)** — 30 min, zadarmo, rieši DDoS + CDN + bot filter
2. **Cookie consent + GDPR (bod 7–9)** — právna povinnosť
3. **Admin server-side auth (bod 1)** — kritická bezpečnostná diera
4. **Rate limit (bod 2) + Helmet (bod 3)** — 2 riadky kódu
5. **Turnstile CAPTCHA na objednávky (bod 5)**

---

## Changelog — čo sa zmenilo (pred → po)

| Iterácia | Dátum | Sekcia | Pred | Po |
|----------|-------|--------|------|----|
| #1 | 2026-05-25 | Bezpečnosť — Admin auth | btoa("Msbeton2023") v JS bundle (viditeľné každému) | JWT server-side, ADMIN_PASSWORD v ecosystem.config.cjs |
| #1 | 2026-05-25 | Bezpečnosť — Rate limit | Žiadny rate limit na login | express-rate-limit 10 req/15 min |
| #1 | 2026-05-25 | Bezpečnosť — CORS | Bez CORS whitelist | Povolené iba msbeton.sk, demo, localhost:5173 |
| #1 | 2026-05-25 | Bezpečnosť — Headers | Bez security headers | helmet.js (HSTS, X-Frame, MIME) |
| #1 | 2026-05-25 | Bezpečnosť — CAPTCHA | Žiadna ochrana na objednávky | Cloudflare Turnstile invisible |
| #1 | 2026-05-25 | Bezpečnosť — Circular import | loginRateLimit v app.ts → 502 crash pri štarte | Presunutý do lib/rateLimits.ts |
| #1 | 2026-05-25 | GDPR — GA4 | GA4 sleduje okamžite bez súhlasu | Consent Mode v2, default denied |
| #1 | 2026-05-25 | GDPR — Cookie banner | Banner bez GA4 integrácie | accept() → gtag consent update |
| #1 | 2026-05-25 | GDPR — Stránky | href="#" na footer linkoch, OÚ/VOP chýbali | Plné stránky /ochrana-osobnych-udajov + /vop |
| #1 | 2026-05-25 | SEO — robots.txt | Allow: / (demo sa indexovalo) | Disallow: / (pred migráciou na msbeton.sk) |
| #1 | 2026-05-25 | SEO — Sitemap | Chýbali OÚ a VOP URL | Doplnené s yearly/0.3 |
| #1 | 2026-05-25 | SEO — Canonical | Chýbal canonical tag | https://msbeton.sk/ v index.html |
| #1 | 2026-05-25 | CI/CD — PM2 | pm2 restart --update-env (nenačítal nové env) | pm2 delete + start (vždy čerstvé env) |
| #1 | 2026-05-25 | CI/CD — DB push | DATABASE_URL natvrdo v GH Action | Čítaná z ecosystem.config.cjs |
| #1 | 2026-05-25 | CI/CD — Health check | Žiadna verifikácia po deploy | HTTP 200 + /api/healthz JSON check |
| #1 | 2026-05-25 | CI/CD — DB backup | Žiadny backup | pg_dump cron 3:17 AM, 30-dňová retencia |
| #1 | 2026-05-25 | Analýzy — GA4 | /api/admin/analytics bez JWT → 401 (prázdna tab) | authFetch s Authorization: Bearer token |
| #1 | 2026-05-25 | Analýzy — GSC SEO tab | Chýbala SEO tab v desktop nav (len v "Viac") | Pridaná do tabs array |
| #1 | 2026-05-25 | Frontend — Maps | Google Maps načítavaný pre každého pri štarte | Lazy load iba pri address/map mode |
| #1 | 2026-05-25 | Frontend — Admin login | Jednoduchý btoa formulár | WebAuthn biometria + math captcha + lockout |
| #1 | 2026-05-25 | PDF — Minusové pretaženie | Čierny text (neviditeľný problém) | Červený riadok background:#fef2f2 |
| #1 | 2026-05-25 | PDF — Duplicitné ikony | Dve AlertTriangle ikony vedľa seba | Jedna ikona (text má ⚠ prefix) |
| #2 | 2026-05-25 | Bezpečnosť — Circular import | loginRateLimit v app.ts → 502 crash pri štarte API | Presunutý do lib/rateLimits.ts |
| #2 | 2026-05-25 | Bezpečnosť — Rate limit IPv6 | keyGenerator bez ipKeyGenerator → ValidationError crash | ipKeyGenerator() helper |
| #2 | 2026-05-25 | Analýzy — JWT auth | fetch bez Bearer tokenu → 401 na analytics/realtime/gsc | authFetch helper s getAdminToken() |
| #2 | 2026-05-25 | Admin login localhost | ADMIN_PASSWORD env var chýbal → vždy 401 na dev | Dev fallback ?? "Msbeton2023" ak NODE_ENV!=production |
| #2 | 2026-05-25 | Admin login lockout | 5 neúspešných pokusov → 5 min lockout v localStorage | Reset cez /admin/login?reset |

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
| 7b | Rate limit IPv6 | ipKeyGenerator helper — ValidationError crash fix | ✅ Hotovo |
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
| 20 | Per-route meta | SEOHead komponent — každá route má vlastný title/desc | ✅ Hotovo |
| 21 | Self-host Montserrat | `@fontsource/montserrat` — 6 váh woff2, žiadny CDN | ✅ Hotovo |

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
| 36 | Stránkovanie objednávok | Pre 200+ objednávok — 30/stránku, pagination controls | ✅ Hotovo |
| 37 | Uloženie výpočtu | Uložiť kalkuláciu do localStorage | ❌ Chýba |
| 38 | Offline PWA stránka | Service worker fallback offline page | ✅ Hotovo |

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
