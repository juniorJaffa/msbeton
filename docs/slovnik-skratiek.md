# Slovník skratiek — MS-BETON

Jednoduché vysvetlenie skratiek a pojmov, ktoré padajú pri webe, SEO a marketingu.

---

## SEO a Google nástroje

| Skratka | Celý názov | Čo to je (jednoducho) |
|---------|-----------|------------------------|
| **SEO** | Search Engine Optimization | Optimalizácia pre vyhľadávače — aby stránka bola vysoko v Google. |
| **SERP** | Search Engine Results Page | Stránka s výsledkami vyhľadávania (čo Google ukáže po zadaní hľadania). |
| **GSC** | Google Search Console | Nástroj Google — ukazuje ako si stránka stojí vo vyhľadávaní (pozície, kliky, indexovanie). |
| **GA4** | Google Analytics 4 | Meranie návštevnosti — koľko ľudí príde, odkiaľ, čo robia. |
| **GTM** | Google Tag Manager | Správca meracích kódov (GA4 a iné) na stránke. Načítava sa ako skript. |
| **GBP** | Google Business Profile | Firemný profil v Google (mapy, recenzie, otváracie hodiny, fotky). |
| **CTR** | Click-Through Rate | Miera prekliku — koľko % ľudí čo videli odkaz, naň aj klikne. |
| **Indexovanie** | — | Keď Google stránku „prečíta" a zaradí do vyhľadávania. Neindexovaná = neukáže sa. |
| **Crawl** | — | Keď Google robot prechádza (číta) stránku. |
| **Sitemap** | mapa stránok (`sitemap.xml`) | Zoznam všetkých stránok pre Google — pomôže mu ich nájsť. |
| **robots.txt** | — | Súbor s pravidlami čo Google smie/nesmie prechádzať. |
| **canonical** | kanonická URL | „Hlavná" adresa stránky — zabráni duplicite v Google. |
| **noindex** | — | Príkaz pre Google: túto stránku NEindexuj (napr. prihlásenie, súkromné). |
| **hreflang** | — | Označenie jazyka/krajiny stránky (pre viacjazyčné weby). MS-BETON má len SK. |
| **backlink** | spätný odkaz | Odkaz z inej stránky na nás — posilňuje autoritu v Google. |
| **long-tail keyword** | dlhý kľúčový výraz | Konkrétne hľadanie (napr. „koľko betónu na základovú dosku"). |

## Rýchlosť stránky (Core Web Vitals)

Google meria rýchlosť — je to **ranking faktor** (rýchla stránka = vyššie v Google).

| Skratka | Celý názov | Čo meria | Cieľ |
|---------|-----------|----------|------|
| **CWV** | Core Web Vitals | Súhrn kľúčových metrík rýchlosti od Google. | — |
| **FCP** | First Contentful Paint | Kedy sa zobrazí prvý obsah (prvý pixel textu/obrázka). | < 1,8 s |
| **LCP** | Largest Contentful Paint | Kedy sa zobrazí najväčší prvok (hlavný obsah). | < 2,5 s |
| **CLS** | Cumulative Layout Shift | Či obsah „neposkakuje" počas načítania. | < 0,1 |
| **INP** | Interaction to Next Paint | Ako rýchlo stránka reaguje na klik/tap. | < 200 ms |
| **TBT** | Total Blocking Time | Ako dlho je stránka „zamrznutá" počas načítania. | < 200 ms |
| **TTI** | Time To Interactive | Kedy sa dá so stránkou plne pracovať. | čím menej |
| **SI** | Speed Index | Ako rýchlo sa vizuálne naplní obrazovka. | čím menej |
| **PSI** | PageSpeed Insights | Nástroj Google na meranie rýchlosti (pagespeed.web.dev). |
| **Lighthouse** | — | Merací engine za PSI (rýchlosť, dostupnosť, SEO…). |

## Technológie webu

| Skratka | Celý názov | Čo to je |
|---------|-----------|----------|
| **SPA** | Single Page Application | Web, kde sa obsah mení bez znovunačítania celej stránky (rýchle prepínanie, ale vykreslí sa až po JS). MS-BETON je SPA (React). |
| **SSR** | Server-Side Rendering | HTML sa vyrenderuje na serveri → rýchlejší prvý obraz. |
| **Prerender / SSG** | Static Site Generation | Predgenerovanie HTML stránok vopred (rýchle, ale zložitejšie pre dynamický obsah). |
| **JS** | JavaScript | Programovací jazyk čo „oživuje" stránku (kalkulačka, menu…). |
| **CSS** | — | Štýly (farby, rozloženie, fonty). |
| **DOM** | Document Object Model | Stromová štruktúra stránky v prehliadači. |
| **PWA** | Progressive Web App | Web čo sa správa ako appka (ikona na ploche, offline stránka). |
| **SW** | Service Worker | Skript na pozadí — cache, offline režim. |
| **woff2** | Web Open Font Format | Formát webového fontu (Montserrat). |
| **font-display: swap** | — | Text sa zobrazí hneď náhradným fontom, kým sa načíta pekný font (žiaden neviditeľný text). |
| **lazy load** | lenivé načítanie | Načítanie až keď je potrebné (obrázky/komponenty mimo obrazovky). |
| **CDN** | Content Delivery Network | Sieť serverov čo doručuje obsah rýchlo (Cloudflare). |
| **DNS** | Domain Name System | „Telefónny zoznam" internetu — preklad domény na IP. |
| **nginx** | — | Webový server (servíruje stránku, presmerovania). |
| **API** | Application Programming Interface | Rozhranie na komunikáciu medzi systémami (web ↔ server). |
| **cron** | — | Naplánovaná úloha čo beží automaticky (napr. záloha DB). |

## Stavové kódy a presmerovania

| Kód | Význam |
|-----|--------|
| **200** | OK — stránka funguje. |
| **301** | Trvalé presmerovanie (stará URL → nová). Prenáša SEO hodnotu. |
| **404** | Stránka neexistuje. |
| **500** | Chyba servera. |
| **soft 404** | Stránka vráti „200 OK" ale obsah je „nenájdené" — mätie Google. |

## Štruktúrované dáta (schema / JSON-LD)

Neviditeľný kód čo Google povie „čo stránka je" → krajší výsledok vo vyhľadávaní.

| Typ | Na čo |
|-----|-------|
| **JSON-LD** | Formát štruktúrovaných dát. |
| **LocalBusiness** | Lokálna firma (adresa, telefón, hodiny). |
| **WebApplication** | Online nástroj (kalkulačka). |
| **FAQPage** | Často kladené otázky → môžu sa zobraziť priamo v Google. |
| **HowTo** | Návod „ako na to" → rich result. |
| **BreadcrumbList** | Drobčeky (Domov › Kalkulačka) v Google výsledku. |

## Autentifikácia a bezpečnosť

| Skratka | Čo to je |
|---------|----------|
| **WebAuthn / passkey** | Prihlásenie biometriou (Face ID, odtlačok) bez hesla. |
| **biometria** | Overenie odtlačkom prsta / tvárou. |
| **OAuth** | Prihlásenie cez tretiu stranu (napr. Google účet) bez zdieľania hesla. |
| **JWT** | JSON Web Token — „lístok" čo dokazuje že si prihlásený. |
| **bcrypt** | Bezpečné zašifrovanie hesla (nedá sa spätne prečítať). |
| **rate limit** | Obmedzenie počtu pokusov (ochrana proti útoku). |
| **CAPTCHA / Turnstile** | Overenie „nie si robot". |

## Dane a právne

| Skratka | Čo to je |
|---------|----------|
| **DPH** | Daň z pridanej hodnoty. SK štandard **23 %** (od 1.1.2025, predtým 20 %). |
| **SOI** | Slovenská obchodná inšpekcia — kontroluje aj zobrazovanie cien spotrebiteľom (musí byť cena s DPH). |
| **B2B** | Business-to-business — predaj firmám (počítajú v cenách bez DPH). |
| **B2C** | Business-to-consumer — predaj spotrebiteľom (cena s DPH). |
| **IČ DPH** | IČ pre DPH — firma platca DPH. |

## Reklama (Ads)

| Skratka | Čo to je |
|---------|----------|
| **Ads** | Google Ads — platená reklama vo vyhľadávaní. |
| **CPC** | Cost Per Click — cena za jeden klik. |
| **PMax** | Performance Max — automatická kampaň naprieč Google (mapy, YouTube, web). |
| **RSA** | Responsive Search Ad — reklama s viacerými nadpismi čo Google kombinuje. |
| **keyword** | kľúčové slovo — výraz na ktorý sa reklama zobrazí. |
| **landing page** | cieľová stránka kam reklama vedie (u nás `/kalkulacka-beton`). |
| **konverzia** | želaná akcia (objednávka, telefonát). |

## Betón (odborné)

| Skratka | Čo to je |
|---------|----------|
| **m³** | Kubík (kubický meter) — jednotka množstva betónu. |
| **C16/20 – C35/45** | Triedy pevnosti betónu (vyššie číslo = pevnejší). |
| **Dmax** | Maximálna veľkosť zrna kameniva (napr. Dmax16). |
| **fill-up / doťaženie** | Doplnenie do minimálneho objemu auta. |

---

*Doc sa dá dopĺňať. Skratku ktorú nepoznáš — napíš, doplním.*
