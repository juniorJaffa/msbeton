# MS-BETON — Audit stav projektu

> Aktualizované: 2026-05-31 (iterácia #5)
> Prostredie: msbeton.sk (VPS 178.105.242.17) — DNS migrácia dokončená 2026-05-29

**Legenda:** ✅ Hotovo | ⏳ Čaká (externá podmienka) | ❌ Plánované | ⚠ Čiastočne

---

## Jednotná audit tabuľka

| # | Sekcia | Položka | Popis | Stav |
|---|--------|---------|-------|------|
| 1 | 🔐 Bezpečnosť | Admin heslo v JS bundle | `btoa("Msbeton2023")` bolo viditeľné každému v DevTools. Nahradené server-side JWT (`POST /api/admin/login`). | ✅ |
| 2 | 🔐 Bezpečnosť | Rate limiting | Bez obmedzenia — brute-force útok bol trivial. Pridaný `express-rate-limit` (10 req/15 min per IP) na login + objednávky. IPv6-kompatibilné. | ✅ |
| 3 | 🔐 Bezpečnosť | HTTP security headers | Žiadne bezpečnostné hlavičky. Pridaný `helmet.js` — HSTS, X-Frame-Options, MIME sniff ochrana. | ✅ |
| 4 | 🔐 Bezpečnosť | CAPTCHA na objednávkach | Bez ochrany — spam objednávky. Cloudflare Turnstile (invisible, privacy-friendly). | ✅ |
| 5 | 🔐 Bezpečnosť | CORS origin whitelist | `cors()` bez origin = wildcard. Nahradené whitelistom `msbeton.sk + demo + localhost`. | ✅ |
| 6 | 🔐 Bezpečnosť | Circular import 502 crash | `loginRateLimit` import vytváral circular dep → API padalo s 502. Presunuté do `lib/rateLimits.ts`. | ✅ |
| 7 | 🔐 Bezpečnosť | Rate limit IPv6 crash | `keyGenerator` nevracal string pre IPv6 → `ValidationError`. Opravené cez `ipKeyGenerator()` helper. | ✅ |
| 8 | 🔐 Bezpečnosť | allowExtraOverload bug | Neprihlásený používateľ / admin bez klienta mohol aktivovať "minusové pretaženie" (`?? true` fallback). Opravené: `false` pre všetkých bez explicitného povolenia. | ✅ |
| 9 | 🔐 Bezpečnosť | PODMIENKY Mix stepper min clamp | Mix stepper v PODMIENKY paneli dovolil ísť na 0 vozidiel aj bez povolenia extraOverload. Teraz minimum = `autoMixP` (štandardné min) keď klient nemá povolenie. | ✅ |
| 10 | 🔐 Bezpečnosť | Cloudflare WAF + CDN | Firewall, Bot Fight Mode, GeoIP blocking SK/CZ, DDoS ochrana. | ⏳ DNS migrovaný, čaká na prepnutie NS na Cloudflare |
| 11 | 🔐 Bezpečnosť | HttpOnly session cookie | Klientská session v localStorage (XSS riziko). Presunúť na HttpOnly cookie. | ❌ ~2h |
| 12 | ⚖️ GDPR | GA4 Consent Mode v2 | GA4 sa spúšťal vždy. Pridaný cookie banner + Consent Mode v2 — GA4 len po súhlase. | ✅ |
| 13 | ⚖️ GDPR | Stránka OÚ | Chýbala povinná politika GDPR. Vytvorená `/ochrana-osobnych-udajov` s kompletným znením. | ✅ |
| 14 | ⚖️ GDPR | Stránka VOP | Chýbali VOP — záväzná objednávka v právnej šedej zóne. Vytvorená `/vop` — 7 sekcií. | ✅ |
| 15 | ⚖️ GDPR | Footer linky OÚ + VOP | Linky viedli na `href="#"`. Opravené na správne routes. | ✅ |
| 16 | ⚖️ GDPR | Rozšírený consent banner | Kategórie cookies (nutné / analytické / marketingové), uloženie preferencie. | ❌ ~3h |
| 17 | 🔍 SEO | robots.txt — demo noindex | Demo doména sa indexovala Googlom. `Disallow: /` — po migrácii na prod sa prepne. | ✅ |
| 18 | 🔍 SEO | Canonical URL | Chýbal canonical — riziko duplicitného indexu po migrácii. `<link rel="canonical">` na každej route. | ✅ |
| 19 | 🔍 SEO | Sitemap | Len 3 URL. Rozšírený na 5 URL (+ OÚ, + VOP). | ✅ |
| 20 | 🔍 SEO | Per-route meta tagy | Jedna meta description pre celú SPA. `SEOHead` komponent — každá route má vlastný title/description/OG. | ✅ |
| 21 | 🔍 SEO | Self-host Montserrat | Písmo z Google CDN (latencia + GDPR). Nahradené `@fontsource/montserrat` — 6 váh, žiadny CDN. | ✅ |
| 22 | 🔍 SEO | Google Maps lazy load | Maps API sa načítaval pri každom otvorení webu (LCP penalizácia). Lazy load — len keď klik na Mapa. | ✅ |
| 23 | 🔍 SEO | GSC SEO tab v admin nave | Tab chýbal v desktop nav poli `tabs`. Pridaný. | ✅ |
| 24 | 🔍 SEO | Cloudflare CDN | Rýchlejšie načítanie pre SR — statické assets cez CDN cache. | ⏳ Čaká na Cloudflare NS prepnutie |
| 25 | 🧮 Kalkulačka | Tri módy dopravy | Pumpa, Domiešavač (mix), Vlastná doprava — každý s vlastnou cenovou logikou a UI. | ✅ |
| 26 | 🧮 Kalkulačka | Extra položky (addToMain) | "+ Pridať položku" — viac typov betónu v jednej objednávke. addToMain zlučuje m³ do dopravy hlavnej položky bez phantom vozidiel. | ✅ |
| 27 | 🧮 Kalkulačka | Zóny dopravy Standard/km/auto | Tri typy zón s vlastnými sadzbami a per pumpa/mix minimálnymi poplatkami. | ✅ |
| 28 | 🧮 Kalkulačka | Info karta — dopravné ceny | Vedľa výsledku zobrazí dopravné ceny pre zónu klienta (min. poplatok, sadzba/km, čerpanie, chémia). | ✅ |
| 29 | 🧮 Kalkulačka | Zľavy — preškrtnuté ceny | Zľavy na betón/dopravu/služby. Pôvodná preškrtnutá + zľavnená cena tučná — v UI, PDF aj SMS. | ✅ |
| 30 | 🧮 Kalkulačka | PODMIENKY — vozidlá (admin) | Admin môže ručne nastaviť počet vozidiel (pumpa + mix). Farebné varovanie (amber/red) pri pretažení. Viditeľné len pre admina. | ✅ |
| 31 | 🧮 Kalkulačka | Mapa — okamžitý pin bez blokovania | Pin sa umiestni okamžite po kliku. SK validácia beží na pozadí cez Geocoder (nesmie blokovať UX). | ✅ |
| 32 | 🧮 Kalkulačka | Presné scrollovanie /#calculator | `getBoundingClientRect()` pred načítaním hero obrázka → zlý offset. Nahradené `scrollIntoView` + 350ms delay. | ✅ |
| 33 | 🧮 Kalkulačka | Zdieľanie výpočtu (URL params) | Klient chce poslať link s nastaveným výpočtom. | ❌ ~2h |
| 34 | 🧮 Kalkulačka | Uloženie výpočtu (localStorage) | Klient musí zadávať znova pri každej návšteve. | ❌ ~1h |
| 35 | 👤 Admin — Klienti | Multi-search s diakritikou | Vyhľadávanie podľa mena, firmy, tel., emailu, loginId — AND logika, diakritikou-tolerantné. | ✅ |
| 36 | 👤 Admin — Klienti | Klient detail — Osobné údaje | Meno, firma, telefón (formátovaný), email, adresa, zdieľaný odkaz — editovateľné inline. | ✅ |
| 37 | 👤 Admin — Klienti | Klient detail — Prístup do kalkulačky | Login ID, heslo (skryté/viditeľné), aktivácia prístupu, odoslanie prihlasovacích údajov emailom. | ✅ |
| 38 | 👤 Admin — Klienti | Klient detail — Možnosti | Hotovosť (+ DPH %), pridanie položky, zimné opatrenia, SMS, zdieľanie, extraOverload — v kategóriách PLATBA / KALKULAČKA / SMS. Full-width pod 2-col gridom. | ✅ |
| 39 | 👤 Admin — Klienti | Hotovosť DPH input orezaný | Input `w-12` — číslo "100" sa orezávalo. Opravené na `w-16`. | ✅ |
| 40 | 👤 Admin — Klienti | Klient štatistiky | Počet objednávok, celkové m³, obrat bez DPH, posledná objednávka (dátum + typ + m³), 3-mesačný mini bar graf. Tlačidlo → tab Objednávky. | ✅ |
| 41 | 👤 Admin — Klienti | Manuálne ceny per-klient | Per-klient cenová mapa — iné ceny pre betón/dopravu/služby bez ovplyvnenia ostatných klientov. | ✅ |
| 42 | 👤 Admin — Klienti | Zľavové tabuľky + PDF export | Interaktívna tabuľka cien s aplikovanými zľavami. PDF s firemnou hlavičkou a pečaťou. | ✅ |
| 43 | 👤 Admin — Klienti | Typ dopravy — pill toggle | Výber Standard/Kilometre/Počet aut cez tlačidlá (iOS natívny picker vždy zobrazil floating overlay). | ✅ |
| 44 | 👤 Admin — Klienti | Admin kalkulačka per-klient | Admin môže v detaile klienta spustiť kalkulačku s jeho zľavami a cenami (clientOverride). | ✅ |
| 45 | 📋 Admin — Objednávky | Príjem — Košík + SMS kanál | Objednávky z kalkulačky (Košík) aj SMS kanálu. Email notifikácia na objednavky@msbeton.sk. | ✅ |
| 46 | 📋 Admin — Objednávky | Filter objednávok | Filter: Stav / Typ vozidla / Platba / Zdroj (Košík/SMS) / Dátum (quick buttons + od–do) / Hľadaj. | ✅ |
| 47 | 📋 Admin — Objednávky | Stránkovanie | Všetky naraz — pomalé pri 200+. Stránkovanie 30/stránku. | ✅ |
| 48 | 📋 Admin — Objednávky | Minusové pretaženie — PDF red row | Čierny text v PDF pri pretažení. Červený varovací riadok `background:#fef2f2`. | ✅ |
| 49 | 📋 Admin — Objednávky | Vyplatená suma + tringelt | Zobrazenie koľko klient zaplatil a prípadný rozdiel. | ✅ |
| 50 | 📋 Admin — Objednávky | CSV export | Hromadný export do Excelu/CSV pre účtovníctvo. | ❌ ~1h |
| 51 | 🚛 Admin — Doprava | Standard / km / auto karty | Každý typ dopravy je vlastná farebná karta (modrá/navy/amber). Collapsible sekcie. | ✅ |
| 52 | 🗂️ Admin — Navigácia | SEO tab pridaný do nav | Tab chýbal. Pridaný do `tabs` poľa. | ✅ |
| 53 | 🗂️ Admin — Navigácia | Nav grouping (Analýzy/SEO) | 8 tabov na 1280px — preplnené. Zoskupiť Štatistiky/GA4/SEO pod subtab menu. | ❌ ~30min |
| 54 | 📊 Analytics | GA4 tab — JWT auth | Fetch bez tokenu → 401. Opravené cez `authFetch` helper. | ✅ |
| 55 | 📊 Analytics | GSC grafy — dáta | GSC endpoint nainštalovaný. Grafy čakajú na akumuláciu dát. | ⏳ ~od 2026-06-01 |
| 56 | 📄 PDF / Export | Kalkulačka PDF — zľavy | Preškrtnutá pôvodná + zľavnená cena v každom riadku (betón, doprava, služby). | ✅ |
| 57 | 📄 PDF / Export | SMS export — zľavy | SMS zobrazuje diskontované ceny + sekcia "(zľavy: betón X%, ...)" na konci. | ✅ |
| 58 | 📄 PDF / Export | Minusové pretaženie — červený riadok | Červený warning riadok v PDF keď bolo aktivované pretaženie vozidiel. | ✅ |
| 59 | ⚡ Výkon & PWA | Offline stránka | Biela stránka pri výpadku servera. `sw.js` + `offline.html` — Service Worker cache. | ✅ |
| 60 | ⚡ Výkon & PWA | VersionChecker — phantom toast | Po kliknutí "Obnoviť" sa banner znova objavil. sessionStorage flag — banner po refreshi iba keď je fakt novšia verzia. | ✅ |
| 61 | ⚡ Výkon & PWA | Floating client indikátor | Objavoval sa až po pustení scrollu. Opravené — zobrazuje sa počas scrollovania. | ✅ |
| 62 | 🚀 CI/CD | Automatický deploy (GH Action) | Každý `git push` → automatický build + deploy na server. Smoke test `/api/healthz` po deployi. | ✅ |
| 63 | 🚀 CI/CD | DB backup | Žiadny backup. `pg_dump` cron 3:17 AM, 30-dňová retencia. | ✅ |
| 64 | 🚀 CI/CD | PM2 `--update-env` fix | `--update-env` nenačítal nové env z `ecosystem.config.cjs`. Deploy skript používa `pm2 delete + start`. | ✅ |
| 65 | 🔐 Admin login | WebAuthn biometria | Jednoduchý btoa formulár. Pridaný WebAuthn (Touch ID / Face ID) + math captcha + lockout po 5 pokusoch. | ✅ |
| 66 | ⚡ Výkon | Code splitting — Admin taby | AdminDashboard.tsx (~4500 riadkov) načíta všetkých 8 tabov naraz (~1MB bundle). Rozbiť na samostatné súbory + React.lazy(). Mobile FCP: 7.3s → ~4s, initial bundle -40%. | ❌ ~2-3h |
| 67 | 🔍 SEO | Google Business Profile | GBP profil vytvorený 2026-05-29. Kategória: Ready-Mix Concrete Supplier + Concrete contractor. 6 fotiek, logo, popis, 7 services. Čaká na overenie. | ⏳ Overenie do 5 dní |
| 68 | 🔍 SEO | Sociálne siete (FB/IG/LinkedIn) | Facebook page, Instagram, LinkedIn — sameAs linky v LocalBusiness JSON-LD. Ikony v footeri. Zdroj dopravy + brand awareness. | ❌ ~2h |
| 69 | 🔍 SEO | Reviews stratégia | Žiadne Google recenzie. QR kód na dodacom liste, email follow-up po objednávke, review link na stránke. Cieľ: 10+ recenzií za 3 mesiace. | ❌ ~1h |
| 70 | 🔍 SEO | GBP Posts (po overení) | Pravidelné posty na GBP — ponuky, aktuality. Zvyšuje viditeľnosť v Maps. | ⏳ Čaká na overenie GBP |
| 71 | 🔐 Bezpečnosť | fail2ban HTTP jail | Nginx logy plné WP scan pokusov (wp-login.php, xmlrpc.php). fail2ban HTTP jail — ban IP po 5 pokusoch. | ❌ ~30min |
| 72 | 🗄️ CI/CD | Remote DB backup | Zálohy iba lokálne na VPS (single point of failure). Rsync na druhý server alebo Hetzner Object Storage. | ❌ ~1h |

---

## Zhrnutie

| Stav | Počet |
|------|-------|
| ✅ Hotovo | 54 |
| ⏳ Čaká (externá podmienka) | 6 |
| ❌ Plánované | 12 |
| **Celkom** | **72** |

---

## Kalkulácia ceny — celá web aplikácia

*Sadzba: 50 €/h · 1 MD = 8h · Ceny bez DPH · Stav: 2026-05-25*

| Komponent | Popis | h | MD | ~€ |
|-----------|-------|---|----|----|
| 🌐 **Celá web aplikácia** | Kompletný redesign msbeton.sk | **240h** | **30 MD** | **12 000 €** |
| — | — | — | — | — |
| 🧮 **Kalkulačka betónu** | 3 módy dopravy (Pumpa / Mix / Vlastná), extra položky, addToMain logika, info karta, PODMIENKY vozidiel | 72h | 9 MD | 3 600 € |
| 🗂️ **Admin dashboard** | Správa betónov, dopravy, služieb, klientov, objednávok — kompletné CRUD operácie, filtrovanie, vyhľadávanie | 52h | 6.5 MD | 2 600 € |
| 🔐 **Autentifikácia + Bezpečnosť** | JWT server auth, klient login cez DB, WebAuthn biometria, rate limiting, HTTP security headers, Turnstile CAPTCHA | 32h | 4 MD | 1 600 € |
| 📄 **PDF a SMS export** | Cenové rozpisy so zľavami a DPH, watermark, podpisový box, výstražné riadky pri pretažení | 16h | 2 MD | 800 € |
| 📊 **Analytics a SEO reporting** | Google Analytics 4 tab, Google Search Console tab, interný štatistiky tab | 16h | 2 MD | 800 € |
| 👤 **Manuálne ceny klientov** | Per-klient cenová mapa, zľavové tabuľky, PDF export cenníka, klient štatistiky | 16h | 2 MD | 800 € |
| 🎨 **Design a UX** | Tailwind v4, betónová textúra, tmavý navy admin, responzívny dizajn, mobile optimalizácia | 16h | 2 MD | 800 € |
| ⚖️ **GDPR a právne** | Cookie consent banner (GA4 Consent Mode v2), Ochrana osobných údajov, VOP | 4h | 0.5 MD | 200 € |
| ⚡ **PWA a SEO technické** | Service Worker (offline stránka), per-route meta tagy + OG, sitemap.xml, self-hosted fonty | 4h | 0.5 MD | 200 € |
| 🚀 **Deployment a DevOps** | PM2, GitHub Actions CI/CD, PostgreSQL, SMTP email, automatický DB backup | 4h | 0.5 MD | 200 € |
| 🖥️ **Hosting setup + Webglobe** | VPS konfigurácia, Webglobe SMTP nastavenie, DNS záznamy, SSL certifikát, doménový management | 8h | 1 MD | 400 € |

> Nezahŕňa: projektové riadenie, UAT testovanie, migrácia z WordPress, Cloudflare setup (~+20–30%).
> Zostatok (plánované položky #11, #16, #33, #34, #50, #53): ~9 MD / ~3 600 €

---

## Changelog

### Iterácia #5 — 2026-05-31
- DNS migrácia msbeton.sk → VPS 178.105.242.17 dokončená 2026-05-29
- Nginx: merged msbeton-prod config do single `msbeton` (cleanup)
- Admin PWA: apple-touch-icon fix (iOS bral klientsku ikonu, nie admin)
- Admin PWA: auto-redirect z `/` v standalone mode odstránený (blink bug)
- Admin nav mobile: SERVER zobrazený 2x (main tab + VIAC) — opravené
- Footer mobile: 2-stĺpcový layout (Brand full-width, Odkazy|Kontakt vedľa seba)
- Footer: vertikálna deliaca čiara medzi Odkazy a Kontakt
- Klient štatistiky: oddeľovač tisícov pre € hodnotu (`toLocaleString`)
- SEO: LocalBusiness schema — Žilina adresa prevádzky + ConcreteContractor + areaServed
- GBP: profil vytvorený — Ready-Mix Concrete Supplier, 6 fotiek, logo, popis, 7 services
- Server security logs: nginx 4xx/5xx/WP probes/rate limits/fail2ban v ServerTab
- Nové položky: #67 GBP, #68 Sociálne siete, #69 Reviews, #70 GBP Posts, #71 fail2ban HTTP, #72 Remote backup

### Iterácia #4 — 2026-05-27
- buildBreakdown: sentinel prefix `"HLAVNÁ "` (HTML badge z `row.l` odstránený → čistý JSON), `q?` field pre Množstvo stĺpec
- Objednávky PDF: `#` + Množstvo stĺpce → konzistencia s Kalkulačka PDF (5 stĺpcov)
- Objednávky detail + PDF: retroaktívna oprava kategórie pre staré objednávky (type name → category name lookup pri zobrazení)
- SMS duplicate warning: amber banner v záväznej objednávke modal (`smsOrderCreated` + timeout fix)
- Extra položky: `categoryName` správne inicializovaný pri vytvorení (bol `null`)
- SEO: `robots.txt` prod-ready (`Allow: /`, `Disallow: /admin/ /api/`)
- SEO: `LocalBusinessSchema` adresa Turie (streetAddress, postalCode, geo coords 49.1503/18.6681, odstránené falošné Maps URL)
- SEO: `noindex` bug fix — `ClientLogin` + `ClientProfile` (prop `noIndex` → `noindex`)
- SEO: `sitemap.xml` lastmod dátumy pridané

### Iterácia #3 — 2026-05-25
- #8 Fix: `allowExtraOverload` — `?? true` fallback → anonymní vždy `false`
- #9 Fix: PODMIENKY Mix stepper min = `autoMixP` keď `!allowExtraOverload`
- #40 Feat: Klient štatistiky — počet objednávok, m³, €, posl. objednávka, 3-mes. bar
- Audit.md konsolidovaný do jednotnej tabuľky

### Iterácia #2 — 2026-05-25
- #32 Fix: `/#calculator` scroll — `scrollIntoView` + 350ms delay
- #39 Fix: Hotovosť DPH input `w-12→w-16`
- #38 Feat: MOŽNOSTI full-width, kategórie PLATBA/KALKULAČKA/SMS, originálny štýl
- #60 Fix: VersionChecker — sessionStorage flag, bez phantom toast
- Audit.md — kompletné pred/po tabuľky

### Iterácia #1 — 2026-05-25
- #1 Fix: Admin JWT server-auth (btoa → JWT)
- #2 Fix: Rate limiting + #7 IPv6 crash
- #3 Fix: Helmet
- #4 Feat: Turnstile CAPTCHA
- #6 Fix: Circular import 502 crash
- #12–15 Feat: GDPR — cookie banner, OÚ, VOP, footer linky
- #17–23 SEO — robots, canonical, sitemap, per-route meta, self-host fonts
- #54 Fix: authFetch pre analytics
- #59 Feat: Service Worker offline
- #47 Feat: Objednávky stránkovanie
- #62–64 CI/CD — smoke test, DB backup, PM2 fix

---

## Ďalšie priority (odporúčané poradie)

1. **#69 Reviews stratégia** — QR kód + review link na stránke — priamy vplyv na GBP ranking (~1h)
2. **#68 Sociálne siete** — FB page minimálne, pre sameAs + GBP prepojenie (~2h)
3. **#71 fail2ban HTTP jail** — WP skenery zapĺňajú logy (~30min)
4. **#16 GDPR consent banner (rozšírený)** — právna povinnosť (~3h)
5. **#11 HttpOnly session cookie** — bezpečnosť (~2h)
6. **#50 CSV export objednávok** — accounting need (~1h)
7. **#10, 24 Cloudflare** — čaká na NS prepnutie (externé)
8. **#72 Remote DB backup** — single point of failure (~1h)
