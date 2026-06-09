# Marketing & SEO — MS-BETON

Plán na vytlačenie **kalkulačky betónu** (`/kalkulacka-beton`) na špičku Google + lokálny marketing.
**Hlavný cieľ:** jedinečná online kalkulačka betónu — konkurencia (RBR, ZAPA, CEMMAC) takú nemá.

---

## 1. SEO — stav a plán

### ✅ Hotové (on-page)
- Dedikovaná indexovateľná stránka `/kalkulacka-beton` (H1, long-form obsah)
- WebApplication + FAQPage + BreadcrumbList JSON-LD schema
- Sitemap priorita 0.95 (hneď za homepage)
- Interné odkazy: navbar „Kalkulačka" + cennik CTA + footer → `/kalkulacka-beton`
- Feature-rich texty: presný výpočet m³, doplnky (hadice, čakačky), flexibilné čerpanie, klientske zľavy na betón/služby/dopravu
- `/kontakt` ako samostatná indexovateľná stránka (nie hash `#contact`)
- 301 presmerovania starých WP URL (`/vypocet-ceny`, `/domov`, `/kontakt`, `/registracia`, `/administratorska-zona`…)
- 404 stránka `noindex` (žiadne soft-404 v Google)
- Cennik: ceny bez DPH aj **s DPH 20 %** (SOI/spotrebiteľská compliance)
- Z verejných textov odstránené inzerovanie „bez DPH" (compliance)

### ⏳ TODO (technické SEO — väčší efekt)
- **Rýchlosť / Core Web Vitals** — čiastočne (framer-motion odstránený z globálnych komponentov; `/kalkulacka-beton` bez 122 KB motion na initial load). Ďalej:
  - Prerender/SSR pre `/kalkulacka-beton` (raw HTML má default title — Google rendruje JS, ale prerender = istota + rýchlejšie)
  - Code splitting admin tabov (audit #66) — neťahá sa na verejné stránky
  - Obrázky WebP + rozmery (zabráni CLS)
- **Blog obsah** (long-tail keywords):
  - „Cena betónu 2026" → interný odkaz na kalkulačku
  - „Koľko betónu na základovú dosku / pásové základy"
  - „Betónová pumpa vs domiešavač — kedy čo"
- **Backlinky / zápisy:** azet.sk, zoznam.sk, firmy.sk, súrne.sk, stavebné portály → link na kalkulačku

### Meranie (GSC + GA4)
- GSC Pages → koľko verejných je „Indexed" (cieľ: `/`, `/kalkulacka-beton`, `/cennik`, `/kontakt`, `/vozovy-park`)
- GSC Performance → pozícia „kalkulačka betónu", „cena betónu", „betón Žilina cena"
- GA4 → konverzie (objednávky z `/kalkulacka-beton`)

---

## 2. Google Business Profile (GBP)

### Produkt (hotové/v procese)
- Názov: **Kalkulačka betónu — výpočet ceny online**
- Kategória: Kalkulačka betónu · cena prázdna · Landing URL: `https://msbeton.sk/kalkulacka-beton`
- Popis (viď nižšie)

### Recenzie (najsilnejší lokálny faktor) — cieľ 10+
- QR kód na dodací list → review link
- Email/SMS follow-up po objednávke

### Posts — 1×/týždeň (button „Learn more" → `/kalkulacka-beton`, foto)
Pozri sekciu 4.

---

## 3. Platená reklama (Ads)

### Google Ads Search (€350 kredit z GBP)
- Goal: Leads / Website traffic · typ Search
- Bidding: Maximize clicks → neskôr Max conversions
- Lokalita: Žilina + okruh 50 km
- **Landing: `https://msbeton.sk/kalkulacka-beton`** (NIE homepage)
- Rozpočet test: 5–10 €/deň
- Keywords (phrase match):
  ```
  "kalkulačka betónu"  "cena betónu"  "výpočet ceny betónu"
  "betón Žilina cena"  "cena betónu s dopravou"  "betón pumpa cena"  "cena betónu za m3"
  ```
- Negatívne: `zadarmo praca`, `kurz`, `marketing`
- RSA nadpisy: „Kalkulačka betónu online", „Cena betónu za 30 sekúnd", „Betón Žilina — pumpa aj domiešavač"
- Sitelinks: Cenník, Vozový park, Kontakt

### Meta Ads (FB/IG)
- Lokálne publikum: stavbári, murári, SHR, developeri (Žilina + okolie)
- Landing/CTA → kalkulačka (FB klikateľný link; IG link v bio)
- Reels demo kalkulačky = najväčší organický + platený dosah

---

## 4. Content — hotové posty (GBP / FB / IG)

**Použitie:**
- **GBP:** text → Posts → button „Learn more" → `/kalkulacka-beton` → foto
- **FB:** text + link `https://msbeton.sk/kalkulacka-beton` + 2–3 hashtagy
- **IG:** text + „Odkaz v bio 👆" (IG nedovolí klikateľný link) + 5–10 hashtagov + povinné foto/reel

**Hashtagy:** `#betón #betonZilina #kalkulackabetonu #stavba #betonovapumpa #domiesavac #zilina #stavebnictvo #cenabetonu #MSBETON`

**10 postov (1/týždeň = 10 týždňov):**
1. 💰 Cena betónu za 30 sekúnd — online. Zadajte triedu, množstvo a vzdialenosť, kalkulačka spočíta betón + dopravu + čerpanie. Bez telefonátu, Žilina a okolie.
2. 🏗️ Pumpa, domiešavač alebo vlastná doprava? Kalkulačka betónu presne porovná cenu pre všetky tri možnosti.
3. 📍 Neviete koľko zaplatíte za dopravu betónu? Zadajte vzdialenosť na mape alebo v km — kalkulačka vyráta presnú cenu dopravy aj čerpania.
4. 🧱 Betón C16/20 až C35/45, drvené aj riečne kamenivo — vyberte typ a hneď vidíte cenu za m³.
5. 📄 Vypočítané? Objednajte záväzne v systéme, vytvorte SMS s objednávkou alebo celkové zhrnutie v PDF. Celé online.
6. 🚛 Betónová pumpa 28 m a domiešavač 9 m³ — spočítajte si presnú cenu čerpania aj dopravy vopred.
7. 🤔 Koľko betónu na základovú dosku? Doska 8×10 m, hrúbka 15 cm = 12 m³. Vypočítajte množstvo aj cenu.
8. ⏱️ Žiadne čakanie na cenovú ponuku. Kalkulačka vám dá presnú cenu okamžite — betón, doprava, čerpanie, doťaženie.
9. 🏢 Firemný zákazník? Po prihlásení vidíte svoje zľavové ceny na betón, služby aj dopravu automaticky.
10. 🆓 Výpočet ceny betónu zadarmo a bez registrácie. Pumpa, mix aj vlastná doprava — všetko v jednej kalkulačke.

**Reels nápad:** 15–30 s nahrávka obrazovky — vypĺňanie kalkulačky → cena nabehne. Caption „cena betónu za 30s", link v bio.

**GBP popis produktu:**
> Online kalkulačka betónu zadarmo. Vyberte kategóriu a typ betónu (C16/20–C35/45, drvené aj riečne kamenivo), zadajte množstvo a vzdialenosť — na mape alebo v km. Kalkulačka presne vypočíta cenu betónu, dopravy, čerpania aj doťaženia pre betónovú pumpu 28 m, domiešavač 9 m³ aj vlastnú dopravu. Objednávku vytvoríte záväzne v systéme, ako SMS s objednávkou alebo celkové zhrnutie v PDF. Výpočet bez registrácie. Žilina a okolie.

---

## 5. Automatizácia (Fáza 2 — voliteľné)

### GBP Posts auto-publishing
- Vyžaduje **Business Profile API** prístup (formulár → Google schválenie, dni–týždne)
- OAuth GBP účtu + Location ID (Google Cloud projekt už existuje pre GA4/GSC)
- Po schválení: cron 1×/týždeň auto-postuje (striedanie textov/fotiek z tohto dokumentu)
- **Products cez API sa nedajú** — ostávajú manuálne
- Browser-automatizácia GBP UI = proti ToS, riziko banu → NEPOUŽÍVAŤ pre hlavný profil

### Google Ads automatizácia (Claude-driven)
- Vyžaduje: bežiacu Ads kampaň + developer token (API Center) + OAuth + Customer ID
- Funkcie: denný report na email, auto-pause slabých keywords, bid úpravy, návrhy keywords z GSC dát, napojenie GA4 konverzií
- Postup: najprv založiť kampaň → potom postaviť automation modul (`artifacts/api-server` cron + Ads API klient)

---

## Priorita (poradie)
1. ✅ On-page SEO kalkulačky (hotové)
2. 🔄 GBP: produkt + recenzie + týždenné posty (manuálne, teraz)
3. 🔄 Google Ads Search (€350 kredit) → landing kalkulačka
4. ⏳ Rýchlosť/prerender + blog obsah (technické SEO)
5. ⏳ FB/IG posty + reels
6. ⏳ Fáza 2 automatizácia (GBP API + Ads API)
