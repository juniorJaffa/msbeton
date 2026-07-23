# Editácia objednávky + Čerpací listok — špecifikácia

> Stav: **plánované, robí sa v najbližšej dobe**
> Dátum návrhu: 2026-06-18
> Sadzba: 50 €/h · 1 MD = 8 h (z `docs/audit.md`)

## Kontext / problém

Po skutočnej zákazke sa niekedy menia parametre objednávky (kubíky, čerpanie, čakačky, čas pumpy, umývanie). Zákazníčka navyše **skenuje ručný čerpací listok** (EVČ, vodič, časy, prečerpané m³…) spolu s objednávkou z kalkulačky ako interný hotovostný záznam. Cieľ: nemusieť skenovať + vedieť upraviť objednávku po realizácii.

**Dve oddelené potreby (dva pohľady):**
- **Peťo:** pridať k PDF **3. možnosť „kalkulačka"** — údaje z objednávky sa prekopírujú do kalkulačky, tam sa upravia (engine prepočíta cenu).
- **Klientka:** prepísať priamo objednávku — „najviac čo by sa určite menilo sú kubíky, čakačky prípadne čas pumpy s umývaním".
- **Spoločné:** doplniť polia z ručného listka priamo do objednávky → vyplnia sa po ukončení zákazky → vytlačí sa → **žiadne skenovanie**.

---

## Architektonický kontext (prečo to tak)

Objednávka je **snímka výpočtu** — ukladá `breakdown` (rozpis), `totalQty`, ceny. Cenu/rozpis počíta **kalkulačka** (engine: doprava, doťaženie, čerpanie, čakačky, zľavy, počet áut, podmienky). Objednávka ukladá surové vstupy ako m³, typ, km, adresa, podmienky, pumpTimer, zľavy — **ale služby (čerpanie h, čakačky, hadice, umývanie) NIE ako surové vstupy**, len v rozpise ako text.

→ Preto cenovú úpravu robiť **cez kalkulačku** (reálny engine), nie duplikovať cenovú logiku v editácii objednávky.

---

## Časť 1 — Cenová úprava (cez kalkulačku, Peťova cesta)

Objednávka → predvyplní kalkulačku → admin upraví reálne parametre → engine prepočíta → uloží späť do **tej istej** objednávky (nie nová).

**Práca:**
- Reverzné mapovanie objednávka → stav kalkulačky (m³, typ, km, adresa, podmienky, pumpTimer idú ľahko; **služby treba dorekonštruovať** + nové objednávky by mali ukladať surové vstupy služieb).
- „Edit mód" — kalkulačka viazaná na `orderId`; na uloženie aktualizuje existujúcu objednávku.
- Test všetkých vetiev výpočtu (doťaženie, extra položky, podmienky, zľavy).

**Plus:** cena/rozpis/PDF/SMS vždy správne (reálny engine). **Riziko:** edge-cases v reverznom mapovaní.

| Variant | Čas | Cena |
|---------|-----|------|
| Full | 2–2,5 MD (16–20 h) | 800–1 000 € |
| MVP (predvyplnenie + úprava m³/čerpanie/čakačky/umývanie + uloženie späť; doťaženie/extra/podmienky doladiť neskôr) | 1,5 MD | 600 € |

---

## Časť 2 — Čerpací listok v objednávke (rieši skenovanie)

Nové polia na objednávke, vyplnia sa **po ukončení zákazky** (niekedy), vykreslia sa v PDF/A5 → papier = digitálny listok.

**Polia (cca 12, nikdy doteraz nepoužívané):**
- EVČ vozidla (napr. „AA168KL")
- Vodič / strojník (napr. „Mičky")
- Čas príjazdu / odjazdu na stavbu (13:35 → 14:30)
- Prečerpané množstvo (m³), prístavné km, km tam-späť na stavbu
- Rozbehová chémia (áno/nie), výplach čerpadla na stavenisku (áno/nie), čerpanie betónu s výstužou (áno/nie)
- Dodal / Prevzal — podpisové linky v tlači

**Práca:** ~12 polí na `Order` type + editačná sekcia v detaile objednávky + vykreslenie do A5/A4 PDF. Žiadny výpočet. Ukladá sa cez **už opravený merge** (žiadna concurrency práca navyše).

**Poznámka k podpisom:** na digitálnom doklade podpisové **linky** (podpíše sa po vytlačení). Ak čisto digitálne bez papiera → podpisy netreba. Doupresniť s klientkou.

| | Čas | Cena |
|---|-----|------|
| Časť 2 | 1 MD (8 h) | 400 € |

---

## Časť 3 — Prenos DPH per klient (§69 ods. 12 zákon o DPH)

> Pridané: 2026-07-23. Požiadavka: Klára (od Petra Staňa)

### Kontext

Pre niektorých klientov (B2B, platcovia DPH) sa fakturujú **stavebné práce** bez DPH — odberateľ si DPH odvedie sám ("prenesenie daňovej povinnosti"). Platí pre: čerpanie, umývanie, chémia, hadice. NEPLAT pre: čakačky, zimné opatrenie (nie stavebné práce).

### Technický rozsah

| Komponent | Čas |
|-----------|-----|
| `Client.prenosDph: boolean` + admin toggle (KlientiTab) | 1.5h |
| Calculator: split DPH kalkulácia (exempt vs. štandardné) | 1.5h |
| PDF: split DPH tabuľka + "Prenesenie daňovej povinnosti §69 ods. 12" text | 4h |
| Calculator UI: split totals + service badge "0% DPH" | 1.5h |
| buildBreakdown: `vatExempt: boolean` per riadok | 1h |
| SMS export | 0.5h |

### Prepoj na Editáciu objednávky (Časť 1)

Editácia cez kalkulačku automaticky zdedí klientov `prenosDph` flag — keďže beží cez reálny engine, PDF vygeneruje správnu split DPH. **Odporúčané poradie: Prenos DPH pred alebo spolu s Časťou 1.**

Ak Časť 1 príde BEZ Prenos DPH: edit mód nezapočíta reverse charge → PDF faktúry bude mať 23% DPH aj pre eligible klientov.

### Varianta

| Variant | Čas | Cena |
|---------|-----|------|
| MVP (flag + admin toggle + PDF split DPH) | 8h / 1 MD | 400 € |
| Full (+UI badges + buildBreakdown vatExempt + SMS) | 12h / 1,5 MD | 600 € |

---

## Súhrn a odporúčané poradie

| Časť | Čas | Cena |
|------|-----|------|
| 1 — Cenová úprava (full) | 2–2,5 MD | 800–1 000 € |
| 1 — Cenová úprava (MVP) | 1,5 MD | 600 € |
| 2 — Čerpací listok + tlač | 1 MD | 400 € |
| 3 — Prenos DPH per klient (full) | 1,5 MD | 600 € |
| **Obe (full) + Prenos DPH** | **4–5 MD** | **1 800–2 000 €** |

**Poradie:** Časť 2 (čerpací listok) **prvá** — lacná, nezávislá, priamo rieši skenovanie. Potom Prenos DPH (Časť 3) — zákonná požiadavka, demand od klienta. Nakoniec Časť 1 (cenová úprava) — zdedí Prenos DPH automaticky.

---

---

## Časť 3 — Marketing / CRM nápady (ďalší cyklus, neplánované)

Nápady na základe prvého klienta (TRINEKO) s aktívnou biometriou a zmeneným heslom.

### 3a — Review email po objednávke
Po N dňoch od `status → vyplatená/odoslaná` → email klientovi: "Bolo všetko v poriadku? ⭐" → priamy link na Google Maps recenziu msbeton.sk.
- Implementácia: cron na serveri + email šablóna v `mailer.ts` (stub je tam, komentár "Bez review CTA — predčasné")
- Odhadovaný čas: ~3–4 h
- Pozn.: najvyšší marketing ROI — 1 recenzia > 100 € reklamy

### 3b — Onboarding email pri prvej biometrii
Trigger: `biometricAuthLog` vytvorí prvý záznam → email klientovi "Biometria aktivovaná, rýchly prístup kedykoľvek". Buduje dôveru, pripomenie app.
- Odhadovaný čas: ~1–2 h

### 3c — Admin notifikácia — engagement milestones
Keď klient zmení heslo / aktivuje biometriu / prvýkrát objedná → notifikácia v admin dashboarde alebo email adminovi. Teraz viditeľné len pri ručnom otvorení karty klienta.
- Odhadovaný čas: ~2–3 h

---

## Otvorené otázky pred štartom
- Podpisy: tlačené linky vs čisto digitálne (bez papiera)?
- Cenová úprava: uloží späť do existujúcej objednávky (history?) alebo verzia/audit zmeny ceny?
- „Prečerpané množstvo" (časť 2, reálne) vs „kubíky" (časť 1, fakturačné) — majú sa prepojiť (real m³ → prepočet ceny) alebo ostávajú nezávislé polia?
