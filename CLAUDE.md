# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kontext projektu

Tento repozitár je **moderný redesign** existujúcej WordPress stránky [msbeton.sk](https://msbeton.sk/). Cieľom je zachovať všetku funkcionalitu pôvodnej stránky v novom tech stacku, nie len vizuálny redesign.

### Pôvodná stránka

- **Zdrojový kód starej stránky** (WordPress + vlastný PHP plugin): `/Applications/MAMP/htdocs/bokovky/msbeton/public_html`
- Kalkulačka: `/Applications/MAMP/htdocs/bokovky/msbeton/public_html/wp-content/plugins/kalkulacka-beton/`
- Kľúčové súbory starej kalkulačky: `calculator-pump.php`, `calculator-mixer.php`, `calculator-utils.php`, `concrete-calculator-script.js`

**Hlavné funkcie pôvodnej stránky, ktoré musí nová replikovať:**

1. **Kalkulačka betónu** — hlavná funkcia stránky. Tri režimy: pumpa, mix (domiešavač), vlastná doprava. Počíta cenu betónu + dopravy + služieb s/bez DPH, s/bez zľavy klienta.
2. **Správa klientov v admin UI** — vytváranie a editácia klientov s ich zľavami; `isOwner: true` označí klienta ako vlastníka firmy (korunka, nedá sa zmazať)
3. **Prihlásenie klienta do kalkulačky** — klient sa prihlási, kalkulačka automaticky aplikuje jeho zľavy
4. **Admin dashboard** — správa: Betóny (kategórie + typy + ceny), Doprava (zónové sadzby), Služby (čerpanie, umývanie, čakačky…), Klienti, Objednávky

### Firemné údaje (hardcoded v PDF exportoch)

- Firma: **MS-BETON, spol. s r.o.**, Turie 468, 013 12 Turie, Slovenská republika
- IČO: `55747591`, DIČ: `2122074603`, IČ DPH: `SK2122074603`
- Kontakt: Peter Staňo, 0944069305, peter@msbeton.sk

Tieto hodnoty sú hardcoded priamo v `Calculator.tsx` (PDF export kalkulačky) a `AdminDashboard.tsx` (exportClientPricePDF). **Nepatria do konfigurácie ani editovateľných polí.**

### Výpočtová logika kalkulačky

→ **[docs/calculator-logic.md](docs/calculator-logic.md)** — detaily: `concreteBreakdown` štruktúra, zľavy, transport (fill-up / km / auto), extra položky, hotovosť vs faktúra.

Skrátený prehľad:
- `concreteBreakdown[0]` = hlavná položka, `[1..]` = extra položky ("+Pridať položku")
- `origItems.transport` = **súčet všetkých** — pre PDF hlavnej položky použi `concreteBreakdown[0].transport`
- Fill-up len pre Standard typ; km typ: `cost = km × ratePerKm × trucks`; mix čakačky: prvých 30 min zadarmo

**km typ — pumpa/mix oddelené minimá** (kritické):
```typescript
// manualPrices kľúče
km_rate_{zoneId}        // sadzba €/km
km_min_pumpa_{zoneId}   // min €/auto pre pumpu → zone.minimumFeeKmPumpa ?? zone.minimumFeeKm
km_min_mix_{zoneId}     // min €/auto pre mix   → zone.minimumFeeKmMix   ?? zone.minimumFeeKm
auto_rate_{zoneId}      // paušál €/auto (auto typ)
```
Lookup vždy: `mp[key] !== undefined ? mp[key] : baseFromZone` — rovnaké v UI, PDF, SMS, info karte.

### PDF a SMS export

→ **[docs/pdf-sms-export.md](docs/pdf-sms-export.md)** — štruktúra tabulky, watermark/signing box, `cleanType()`, SMS formát a `row()` zarovnanie. **Vrátane buildBreakdown() JSON formátu a pravidla konzistencie PDF.**

### buildBreakdown() — kritické pravidlá

`buildBreakdown()` v `Calculator.tsx` generuje JSON uložený pri každej objednávke. Čítajú ho:
- Objednávky detail UI (`ObjednavkyTab.tsx`)
- Objednávky PDF (`exportOrderPDF`)

**Tabuľka PDF — Kalkulačka = Objednávky (rovnaké stĺpce):**
```
# | Popis | Množstvo | Jedn. cena | Spolu
```

**Sentinelové prefixe v `row.l`** (renderers ich detekujú a stylejú):
- `"HLAVNÁ "` — transport row hlavnej položky s addToMain extras (modrý badge)
- `"↑"` + `v===0` — addToMain info riadok (modrý bg)
- `"★"` + `v===0` — pretaženie info (žltý bg)
- `"⚠"` + `v===0` — minusové pretaženie (červený bg)

**NIKDY nevkladaj HTML do `row.l`** — ukladá sa do DB JSON a React ho renderuje ako text (XSS + literal tags).

**Množstvo (`row.q`)** — každý riadok musí mať `q?: string`:
- Betón: `"${ci.qty} m³"`
- Doprava: `"${nTrucks} autá (${qty} m³)"` alebo `"${qty}+${addToMainQty} m³"` pre HLAVNÁ
- Doťaženie: `"${fillupM3} m³"`
- Čerpanie: `"${hrs} h [min]"`, Hadice: `"${m} m"`, Chémia/Umývanie: `"1 ks"`, Čakačky: `"${n} int."`

**Retroaktívna oprava kategórie**: Staré objednávky mohli mať type name v `sec.h` namiesto category name. Oba renderers to opravujú runtime cez `allCategories` lookup (nie DB write).

### Admin vzory a schémy

→ **[docs/admin-patterns.md](docs/admin-patterns.md)** — `Service` schéma (serviceMode/maxMeters/activePeriod), `EditableField` správanie, client `loginId` vs `clientId`, `clientOverride` pre admin kalkulačku, search normalizácia.

### Kalkulačka – výsledok: poradie riadkov

Pre každú položku (hlavnú aj extra):
1. Betón (produkt)
2. Doprava
3. Doťaženie (ak aplikovateľné)
4. Služby (čerpanie / chémia / hadice / umývanie / čakačky)

Služby vždy **pod dopravou**.

### Kalkulačka – extra položky (Pridaná položka)

- Input form header: `Položka {idx+1}` (1-based, bez kategórie v nadpise)
- Result UI header: `Pridaná položka {idx}` kde idx pochádza z `concreteBreakdown.map((ci, idx)`, teda `idx=1` = prvá extra
- Items s prázdnym množstvom → **vylúčené z výpočtu** (`if (t && q > 0)` v calc loop) → červená karta + badge „nie je zahrnutá" ak `showResult && !item.quantity`

### Kalkulačka – transportMode "addToMain" — KRITICKÁ INVARIANTA

Extra položky s `transportMode === "addToMain"` zlučujú svoje m³ do dopravy Hlavnej položky. Platia **dve podmienky súčasne** — ak sa zmení jedna, musí sa zmeniť aj druhá:

1. **`extraTrucks = 0`** — extra addToMain položka nepridáva žiadne auto do celkového počtu
2. **`mainTrucks = calcPumpTrucks(qty + addToMainQty)`** — hlavná položka počíta autá pre celkové m³ (vrátane addToMain)

`addToMainQty` = `extraItems.reduce(...)` sum za všetky items kde `transportMode === "addToMain" && q > 0`.

**Kapacity (default):** `PUMP_TRUCK_CAPACITY = 7 m³`, `MIX_TRUCK_CAPACITY = 9 m³`  
Príklad: 12 + 2 addToMain = 14 m³ → `calcPumpTrucks(14)` = 1 pump + 1 mix = **2 vozidlá** (nie 3).

**`trucks` v `result`** = `concreteBreakdown.reduce((s, ci) => s + ci.transportTrucks, 0)` — sčítava PER-ITEM hodnoty, preto addToMain extra MUSÍ mať `transportTrucks = 0`. Ak nie, vznikne phantomové auto.

Toto isté `trucks` čerpá PDF (`result.mixTrucksCount`), SMS (`ci.transportTrucks`), aj Objednávky (`buildBreakdown` → `pdfTrucksLabel`). Chyba v jednom mieste → chyba vo všetkých troch.

PDF/SMS/Objednávky musia vždy súhlasiť s UI výpočtom — pri každej zmene dopravnej logiky overiť všetky tri exporty.

### Zobrazovanie zľavových cien — pravidlo pre VŠETKY kontexty

Keď je klient prihlásený (alebo je aktívny `clientOverride`) a má nejakú zľavu, **každý cenový výstup musí vždy zobraziť OBIDVE hodnoty** — pôvodnú (preškrtnutú) aj zľavnenú (tučnú). Toto platí pre každý typ zľavy nezávisle:

| Typ zľavy | Platí na |
|-----------|----------|
| `effectiveBeton` | cena betónu (€/m³, celková sum) |
| `effectiveDoprava` | doprava + doťaženie |
| `effectiveSluzby` | všetky služby (čerpanie, hadice, umývanie, chémia, čakačky) |

`effectiveX = discountX > 0 ? discountX : discountCelkovo` — kategória bez špecifickej zľavy zdedí celkovú.

**Kalkulačka UI** (`PriceRow`): `~~pôvodnáCena~~` sivá + tučná zľavnená pod ňou.

**PDF** (`exportPDF`):
- Betón *Jedn. cena*: `~~origRate~~<br>discRate €/m³` (ak `Math.abs(origRate - discRate) > 0.001`)
- Betón *Spolu*: `~~origTotal~~` (preškrtnuté) + discTotal
- Doprava *Jedn. cena*: `—` (vždy), *Spolu*: `~~origTotal~~` + discTotal
- Služby *Jedn. cena*: `svcRateStr(rate, suffix)` → `~~origRate~~<br>discRate` ak zľava
- Služby *Spolu*: `~~origTotal~~` + discTotal
- Podmienka pre preškrtnutie: `hasDiscount && Math.abs(orig - disc) > 0.001`

**SMS** (`exportSMS`): zobrazuje discountované ceny; sekcia `(zľavy: betón X%, ...)` na konci.

**Admin ClientPriceTable**: per-tab zobrazenie (Betóny / Služby / Doprava) s badge `−X%` pri aktívnych zľavách; editovateľné manuálne ceny (M badge) ukladajú **base cenu** (pred hotovostným DPH) do `manualPrices`.

> **Kľúčové**: v hotovostnom režime sa `VAT_HOTOVOST` aplikuje **iba na betón**, nie na dopravu/služby. PDF/SMS export musí rešpektovať `isFaktura` flag.

### Kalkulačka – info karta (pumpa / mix)

Zobrazuje sa vedľa výsledku kalkulačky, obsahuje 4 bunky (pumpa) resp. 3 bunky (mix) s dopravnými cenami pre zónu klienta.

**Kritické pravidlá:**
- `fT = dopravaFactor` — **NIKDY `result?.fTransport ?? 1`** — ten je null pred prvým výpočtom → žiadna zľava
- `fPump`, `fChem`, `fWaitM` sú komponento-scope premenné (nie v IIFE)

**pricingType → bunky:**

| pricingType | Pumpa bunka 1 | Pumpa bunka 2 | Pumpa bunka 3 | Pumpa bunka 4 |
|-------------|---------------|---------------|---------------|---------------|
| `standard`  | Min. doprava  | Doprava od (tzones[0] rate) | Čerpanie | Rozbeh. chémia |
| `km`        | Sadzba/km     | Min. doprava (pumpa/mix specific) | Čerpanie | Rozbeh. chémia |
| `auto`      | Paušál/auto   | Min. doprava  | Čerpanie | Rozbeh. chémia |

Mix: rovnaké transport bunky 1+2, tretia bunka = Čakačka / 15 min.

---

### Kalkulačka – PODMIENKY (admin override vozidiel)

Admin panel v kalkulačke umožňuje ručne nastaviť počet vozidiel namiesto automatického výpočtu.

**Stav:** `podmienkyEnabled`, `podmienkyPumpa`, `podmienkyMixC` (pumpa tab), `podmienkyTrucks` (mix tab)

**`effTrucksOverride`** = `podmienkyEnabled && totPodm > 0 ? totPodm : undefined` — odovzdáva sa do `calcTransport`

**`allowExtraOverload`** = `isAdminMode || (loggedClient?.allowExtraOverload ?? false)` — povolí MINUS (< kapacity)

#### Fill-up v podmienky režime

```typescript
// calcTransport – keď overrideTrucks je definované:
qtyPerTruck = qty / overrideTrucks
if qtyPerTruck < fillupMin → fillupPerTruck = fillupMin - qtyPerTruck
// qPT > cap (overloaded/RISK): žiadne fill-up — admin zvolil menej vozidiel zámerne
fillupM3 = round(max(0, fillupPerTruck) × overrideTrucks, 1)
if isMin → fillupM3 = 0  // pri min. doprave sa doťaženie neúčtuje
```

**KRITICKÉ — qPT > cap (RISK) nemá fill-up:** Keď admin nastaví menej vozidiel ako je kapacita (pretaženie), každé vozidlo vezie viac ako mixCap. Tento stav je zámerný — doťaženie by bolo fyzicky nemožné. Vetva `qPT > cap` bola odstránená z podmienky kódu.

**Kapacity a minimum z admin Doprava:**
```
pumpCap   = zone.pumpTruckCapacity ?? 7   // PUMPA Kapacita
mixCap    = zone.truckCapacity     ?? 9   // MIXÉR Kapacita
fillupMin = tsettings.minimumLoadM3 ?? 5  // MIN. OBJ.
```

**Príklady podmienky fill-up:**
| qty | overrideTrucks | qPT | fill-up | Poznámka |
|-----|---------------|-----|---------|---------|
| 3 m³ | 1 | 3.0 | 5−3=**+2 m³** | podnaplnené |
| 8 m³ | 1 | 8.0 | 0 | 8 ≥ fillupMin=5 |
| 20 m³ | 5 | 4.0 | 5×(5−4)=**+5 m³** | každé podnaplnené |
| 28 m³ | 3 (RISK) | 9.33 | 0 | pretažené, žiadne fill-up ✓ |
| 70 m³ | 8 (1P+7M) | 8.75 | 0 | 8.75 < mixCap=9, ok |

**isRisk — kapacitná formula (platí VŠADE: PDF, SMS, UI, buildBreakdown):**
```typescript
// pumpa tab — zahŕňa skutočný počet pump (nie vždy 1!)
isRisk = podmienkyPumpa * pumpCap + podmienkyMixC * mixCap < qty
// mix tab
isRisk = podmienkyTrucks * mixCap < qty
```
Staré `podmienkyMixC < calcPumpTrucks(qty) - 1` bolo nesprávne pre 2P scenáre.

**m3PerTruck v outputs — s fill-up (konzistentné):**
```typescript
// PDF, SMS, buildBreakdown, UI result display — všade rovnaké:
qPT = (qty + transportFillupM3) / totalTrucks
```

**UI feedback v podmienky paneli:**
- `m3PerT` (stepper live) = `qty / totalTrucks` — bez fill-up (pre quick feedback pri +/−)
- `podmienkyFillupPrev` — inline preview `+Xm³ doť.` vedľa ∅ m³/voz
- Fleet capacity badge: `pumpa × pumpCap + mix × mixCap` — zelená ≥ qty, červená < qty
- `buildBreakdown` PRETAŽENIE riadok: vždy zobrazený keď `podmienkyEnabled && idx === 0`

**KRITICKÉ — dve dimenzie pre addToMain + podmienky:**
- `extraTrucks = 0` pre addToMain extra (nepridal by auto)
- `mainTrucks = calcPumpTrucks(qty + addToMainQty)` pre hlavnú položku

**Admin limity podmienok** (tsettings):
```
condPumpaMin/Max  → min/max počet pumpa vozidiel (default 1/2)
condMixMin/Max    → min/max mixérov v pumpa tab (default 0/2)
adminMaxMix = isAdminMode ? max(99, ceil(qty/mixCap)*4) : condMixMax  // admin bez limitu (otočky)
```

---

### Admin Klienti – bezpečnostné pravidlá

- loginId `"msbeton"` **blokovaný** pri vytváraní aj editácii
- Default heslo pri novom klientovi: `"1234"`, loginId prázdny (povinný vstup)
- `autoComplete="off"` / `"new-password"` zamedzuje browser autofill do formulára

### Admin Klienti – Typ dopravy

Používa **pill toggle tlačidlá** (nie native `<select>`). Dôvod: iOS native `<select>` vždy zobrazí floating picker overlay bez ohľadu na CSS. Platí pre nový formulár aj expanded detail klienta.

### Admin Objednávky – farby a vizuál kariet

**Status farby** (konzistentné medzi filtrom a kartou):

| Status | Filter active | Ľavý pruh (border-left 4px) |
|--------|--------------|------------------------------|
| `nova` | `bg-blue-500` | `#3b82f6` (blue-500) |
| `potvrdena` | `bg-yellow-400` | — |
| `odoslana` | `bg-green-600` | — |

Pravidlo: **ľavý pruh farba = filter active farba** pre daný status. Nikdy nepoužívaj `#EDC531` (primary/gold) pre status pruh — ten je rezervovaný pre brand akcenty.

**Dnešné objednávky**: `bg-amber-50 border-amber-200` (solid, nie `bg-primary/5` — transparency prepúšťa betonovú textúru cez kartu).

**Dátum na karte**: ak `createdAt.slice(0,10) === todayStr` → `text-primary font-bold` + zobrazí "Dnes HH:MM"; ak včera → `text-blue-400 font-bold` + "Včera HH:MM".

**Filter Objednávky** — štruktúra riadkov (všetky labely `w-14 shrink-0`):
1. STAV — status buttony
2. TYP — typ vozidla (Pumpa/Mix/Vl. doprava)
3. PLATBA — Faktúra/Hotovosť (nie "TYP"!)
4. ZDROJ — Košík/SMS kanál
5. DÁTUM — quick buttons: Dnes/Včera/Týždeň/Mesiac/–N dní + od–do pickers
6. HĽADAJ — text search

**SMS vs Košík objednávky**:
- `viaSms: boolean` na `Order` type — rozlišuje kanál
- `buildBreakdown()` helper v `Calculator.tsx` — zdieľaný medzi SMS exportom aj Košík submitom
- Oba kanály posielajú email notifikáciu na `objednavky@msbeton.sk`

### Kalkulačka – mapa (deliveryMode "map")

- Klik myšou: okamžite umiestni pin (`setPinAt`), SK validácia beží na pozadí cez Geocoder
- **Nikdy** nečakaj na Geocoder pred `setPinAt` — geocoder môže zlyhať/byť pomalý → pin sa neobjaví
- Vzorec km: Distance Matrix API (rovnaký ako adresný režim) → `Math.round((oneWayKm * 2 + 2) * 10) / 10`
- `mapKmConfirmed` kontroluje viditeľnosť cez `display:none` (nie unmount) — Google Maps div musí ostať v DOM

### Testovacie prihlasovacie údaje

| Rola | Login ID | Heslo | Poznámka |
|------|----------|-------|----------|
| Admin | `msbeton` | `Msbeton2023` | `/admin/login` — client-side `btoa` kontrola |
| Klient | `20` | `1234` | 20% zľava na betón (discountBeton=20, ostatné 0) |

---

## Príkazy

### Lokálny vývoj

Oba servery musia bežať súčasne. Vite **vyhodí chybu** ak chýba `PORT` alebo `BASE_PATH`.

```bash
# API server (terminál 1)
PORT=3000 DATABASE_URL="postgresql://junior@localhost:5432/msbeton" ADMIN_PASSWORD=Msbeton2023 pnpm --filter @workspace/api-server dev

# Web dev server (terminál 2)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/web dev
```

Vite proxuje `/api` → `http://localhost:3000`, takže web automaticky komunikuje s lokálnym API.

### Zostavenie a typová kontrola

```bash
pnpm run build          # plný build (typecheck + všetky balíky)
pnpm run typecheck      # TypeScript project references check cez všetky balíky
pnpm --filter @workspace/web build        # iba web (vyžaduje PORT + BASE_PATH)
pnpm --filter @workspace/api-server build # iba API (esbuild → dist/index.mjs)
```

### Databáza

```bash
pnpm --filter @workspace/db push          # aplikuj schému do DB (vyžaduje DATABASE_URL)
pnpm --filter @workspace/db push-force    # force push (zmaže konflikty)
```

### API Codegen (pri zmene openapi.yaml)

```bash
pnpm --filter @workspace/api-spec codegen  # regeneruje api-zod + api-client-react
```

---

## Architektúra

### Monorepo štruktúra

```
artifacts/
  api-server/   Express 5 API — číta/zapisuje PostgreSQL cez @workspace/db
  web/          React 19 + Vite frontend — proxuje /api na api-server v dev

lib/
  db/           Drizzle ORM schéma + klient (exportuje db, adminConfig, Pool)
  api-spec/     OpenAPI 3.1 zdroj (openapi.yaml) + Orval codegen konfig
  api-zod/      Generované Zod schémy (z openapi.yaml cez Orval)
  api-client-react/  Generované React Query hooky + fetch klient
```

### Databáza: jediná JSONB tabuľka

Celý stav aplikácie je v jednej tabuľke:

```sql
admin_config(key TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP)
```

Kľúče: `categories`, `delivery`, `services`, `clients`, `transport_zones`, `transport_settings`, `client_accounts` (legacy).

Všetky operácie používajú `INSERT … ON CONFLICT DO UPDATE` — pri zmenách dát nie sú potrebné migrácie.

### Dátový tok frontendu

1. **Štart aplikácie** (`App.tsx` → `syncFromServer()`): načíta všetkých 6 admin kľúčov paralelne, uloží do localStorage (`msbeton_*`). Ak kľúč v DB chýba ale je v localStorage, automaticky ho odošle na server (prvotné naplnenie DB).

2. **Kalkulačka** (`Calculator.tsx`): číta výlučne z localStorage cez `adminData.*` gettery — žiadne API volania počas výpočtu. Celá logika (zóny, doťaženie, pumpa, zľavy) je client-side.

3. **Admin dashboard**: číta z localStorage, zapisuje do localStorage + `PUT` na API na pozadí (bez čakania). Zlyhania sú tiché (bez vrátenia zmien).

### Manuálne ceny (manualPrices) — kľúčové pravidlá

`manualPrices: Record<string, number>` je per-klient mapa `itemId → cena`. Kľúče:

| Kľúč | Platí na |
|------|----------|
| `t.id` (typ betónu) | cena betónu €/m³ |
| `s.id` (služba) | cena služby (čerpanie s1, chémia s2, umývanie s3, čakačka mix s4, čakačka pumpa s7, hadice s5) |
| `"min_fee"` | Standard min. cena/auto |
| `zone.id` | Standard sadzba danej zóny €/m³ |
| `km_rate_{zoneId}` | KM sadzba €/km |
| `auto_rate_{zoneId}` | AUTO paušál €/auto |

**Architektonické pravidlo:** `loggedClient` v `Calculator.tsx` je `useMemo` ktorý merguje čerstvé `manualPrices` + zľavy z `allClients` (čítaného z localStorage). Tým klient vidí zmeny ihneď po admin save bez potreby re-login. `adminData.saveClients` dispatches `admin-data-synced` → `revision` bump → `allClients` recompute.

**Všetky service prices** musia čítať `mp[svc.id]` PRED fallbackom na zónu/default:
```
pumpServicePrice = mp[pumpSvc.id] ?? zone.pumpHourlyRate ?? svc.price
waitServicePricePumpa = mp[waitPumpaSvc.id] ?? zone.waitingRate ?? svc.price  
chemServicePrice = mp[chemSvc.id] ?? svc.price
washServicePrice = mp[washSvc.id] ?? svc.price
hoseServicePrice = mp[hoseSvc.id] ?? svc.price
```

**Manuálne ceny — žiadne zľavy.** Ak `mp[svc.id]` je definované, faktor = 1 (nie `sluzbyFactor`). Rovnako pre transport — ak `mp[zone.id]`/`mp[km_rate_...]`/`mp[auto_rate_...]` je definované, faktor = 1 (nie `dopravaFactor`). Implementované cez:
```tsx
const fPump  = (pumpSvc  && mp[pumpSvc.id]  !== undefined) ? 1 : sluzbyFactor;
// ... fChem, fWash, fHose, fWaitP, fWaitM rovnako
// fTransport: určený vnútri result useMemo podľa pricingType + mp kľúčov
```
**KRITICKÉ:** `fPump` a spol. musia byť deklarované NESKÔR ako `sluzbyFactor` v tele komponenty — inak TDZ crash (biela stránka). Poradie: `mp` → service prices → discount factors → `sluzbyFactor` → `fPump/fChem/...`.

Faktory sa používajú v: `discountedItems`, `hotovostDiscItems`, UI `PriceRow`, PDF `trow`/`svcRateStr`, SMS export.

### Admin Doprava – typy dopravy UI

Každý typ dopravy (Standard / Kilometre / Počet aut) je vlastná karta s farebnými akcentmi:
- **Standard**: modrý lem `border-blue-200`, `h-1.5 bg-blue-500` accent pruh, header `bg-blue-50/70`
- **Kilometre**: navy lem `border-slate-300`, `h-1.5 bg-secondary` pruh, header `bg-slate-50`
- **Počet aut**: jantárový lem `border-amber-200`, `h-1.5 bg-amber-400` pruh, header `bg-amber-50/50`

Standard má dve nezávislé collapsible sekcie: `stdZonesOpen` (Zóny dopravy) a `stdDotazenieOpen` (Pravidlá doťaženia) — obe defaultne zatvorené.

### Autentifikácia

- **Admin**: JWT token cez `/api/admin/login` → uložený pod `msbeton_admin_token`. `isLoggedIn()` v `adminAuth.ts` dekóduje JWT expiry client-side. Admin biometria je **client-side only** (žiadny server) — credential ID v `msbeton_webauthn_cred`.
- **Klient**: `POST /api/client/login` → server overí voči `clients` kľúču v DB → vráti session objekt uložený pod `msbeton_client_session`. `clientAuth.ts` používa výlučne PostgreSQL (žiadny localStorage fallback).
- **Logout z Navbar**: `clientAuth.logout()` dispatchuje `client-session-changed` event. `Calculator.tsx` počúva tento event a syncuje svoj `loggedClient` stav.

### Biometria — architektúra a kritické pravidlá

→ **[docs/biometria.md](docs/biometria.md)** — kompletná dokumentácia.

Skrátené pravidlá pre AI:

**Dve oddelené biometrie — NIKDY nemiešať:**

| | Admin biometria | Klient biometria |
|---|---|---|
| Súbor | `adminAuth.ts` | `clientAuth.ts` |
| localStorage kľúč | `msbeton_webauthn_cred` | `msbeton_client_webauthn` |
| Overenie | **Client-side only** (žiadny server) | **Server-side** (`@simplewebauthn/server`) |
| Public key | Uložený iba v zariadení | Uložený v DB per klient |
| Credential | Viaže sa na `user: "msbeton-admin"` | Viaže sa na `loginId` klienta |

**KRITICKÝ BUG (opravený):** `ClientLogin.tsx` — ak admin je prihlásený (`isAdminLoggedIn()` = true), **NIKDY** nespúšťaj klientsku biometriu. Admin session je `msbeton_admin_token`, klient session je `msbeton_client_session` — sú to iné keys. `clientAuth.getLoggedClient()` vracia null pre admin → bez tejto ochrany sa klient bio auto-trigger spustí hoci admin je prihlásený.

```typescript
// ClientLogin.tsx useEffect — POVINNÉ PORADIE:
if (clientAuth.getLoggedClient()) { setLocation("/#calculator"); return; }
if (isAdminLoggedIn()) return; // ← admin kontext, zastaviť pred bio triggerom
if (isBiometricAvailable() && hasClientBiometric()) { /* bio auto-trigger */ }
```

**Stale credential handling:** Ak `authenticateClientBiometric()` zlyhá s `NotAllowedError` (zariadenie nemá daný credential), `clearClientBiometric()` je zavolaný automaticky. Po návrate z volania: `if (!hasClientBiometric()) setScreen("form")` — nikdy dead-end `bio-failed`.

**Banking logout pattern:** `clientAuth.logout()` **nevymaže** `msbeton_client_webauthn`. Credential prežije odhlásenie. Navbar → logout → `window.location.href = "/prihlasenie"` → auto-trigger na ďalšej návšteve.

### Kľúčové API routy

| Metóda | Cesta | Účel |
|--------|-------|------|
| GET | `/api/healthz` | Kontrola dostupnosti |
| GET/PUT | `/api/admin/clients` | Zoznam klientov |
| GET/PUT | `/api/admin/categories` | Typy betónu + ceny |
| GET/PUT | `/api/admin/transport-zones` | Zónové sadzby dopravy |
| GET/PUT | `/api/admin/transport-settings` | Min. poplatok, zimný príplatok… |
| GET/PUT | `/api/admin/services` | Služby (čerpanie, umývanie, čakačky…) |
| POST | `/api/client/login` | Prihlásenie klienta |
| POST | `/api/client/webauthn/reg-challenge` | WebAuthn registrácia — challenge |
| POST | `/api/client/webauthn/reg-complete` | WebAuthn registrácia — verifikácia + uloženie |
| POST | `/api/client/webauthn/auth-challenge` | WebAuthn auth — challenge |
| POST | `/api/client/webauthn/auth-complete` | WebAuthn auth — verifikácia + session |
| DELETE | `/api/client/webauthn/credential/:credId` | Zabudnúť zariadenie (klient) |
| DELETE | `/api/admin/clients/:id/webauthn` | Admin revoke biometrie klienta |
| GET | `/api/admin/biometric-stats` | Globálne bio štatistiky pre ServerTab |

### Kľúčové komponenty

- `PhoneInput` — globálny komponent pre telefónne čísla, formátuje na blur, normalizuje +421/00421 → 0xxx
- `Calculator.tsx` — celá logika kalkulačky vrátane extra položiek, per-item služieb, PDF exportu, SMS exportu
- `AdminDashboard.tsx` — všetky admin tabuľky; každá sekcia je samostatná funkcia (napr. `KlientiTab`, `ObjednavkyTab`)

### Štýlovanie

- Primárna farba: `#EDC531` (zlatá), Sekundárna: `#001D3D` (navy)
- Betónové textúry v `src/index.css`: `.concrete-bg` (raw), `.concrete-navy` (tmavé sekcie s navy overlay), `.concrete-light` (svetlé sekcie — overlay `rgba(234,231,226,0.58)` pre viditeľnú textúru)
- Tailwind v4 (Oxide compiler) — konfig je vo `vite.config.ts` cez `@tailwindcss/vite`, žiadny `tailwind.config.js`
- **`bg-navy` neexistuje** v Tailwind v4 konfig — správne je `bg-secondary` (`#001D3D`)
- `VersionChecker` banner: `fixed bottom-20 sm:bottom-4` — `bottom-20` zaručuje priestor nad mobilným nav (h-16)

### Produkčný deployment

Produkcia: [msbeton.sk](https://msbeton.sk), server `root@178.105.242.17`, adresár `/var/www/msbeton`. DNS migrovaný 2026-05-29 — `msbeton.sk` ukazuje na VPS. `demo.msbeton.sk` ukazuje na starú Webglobe hosting (už nie VPS).

**GitHub Action nasadzuje automaticky** pri každom `git push origin main`. Manuálny deploy len ak Action zlyhá alebo commity neboli pushnuté:

```bash
# Manuálny deploy
ssh -i ~/.ssh/id_ed25519_ms_beton root@178.105.242.17 "cd /var/www/msbeton && git pull && PORT=3000 BASE_PATH=/ pnpm --filter @workspace/web build && pnpm --filter @workspace/api-server build && DATABASE_URL='postgresql://msbeton:vPk83o1ITFyjeheEjgkeT4sucEea4Z@localhost:5432/msbeton' pnpm --filter @workspace/db push && pm2 restart msbeton-api --update-env && echo OK"
```

- `pnpm run build` na serveri ZLYHÁ kvôli pre-existujúcim framer-motion TS chybám v `Home.tsx` — vždy build web + API zvlášť
- `DATABASE_URL` je v `ecosystem.config.cjs` (nie v `.env` súbore)
- SMTP je v `ecosystem.config.cjs`: `SMTP_HOST: 'mail.webglobe.sk'`, port `587` STARTTLS. Port 465 je na VPS blokovaný.
- PM2 `--update-env` **nenačíta** nové env z `ecosystem.config.cjs` — treba `pm2 delete msbeton-api && pm2 start ecosystem.config.cjs`
- SSH kľúč: `id_ed25519_ms_beton` (GitHub Secret: `itikon-claude-code`)

Na serveri beží PostgreSQL — `DATABASE_URL` je nastavená v `ecosystem.config.cjs` pre pm2.

---

## Cloudflare Turnstile — architektúra a known bugs

### Ako funguje (2 cesty)

| Situácia | Klient | Server |
|----------|--------|--------|
| Neprihlásený (anonymný) | Widget vygeneruje `turnstileToken`, odošle s objednávkou | Overí token cez Cloudflare API. Rate limit 5/h per IP. |
| Prihlásený klient | `turnstileToken` odošle ak dostupný, inak `undefined` | Verifikuje `clientId` voči DB → ak aktívny klient, **Turnstile preskoč** |

### Kritický invariant — `clientId` = `loginId`, nie UUID

`LoggedClient.clientId` (z `/api/client/login` response) = **loginId** (napr. `"20"`), NIE UUID z databázy.

Objednávky ukladajú: `clientId: loggedClient.clientId` → loginId.

**Server-side Turnstile skip** (`client.ts`, endpoint `POST /order`):
```typescript
// SPRÁVNE — porovnávaj loginId (nie a.id):
isVerifiedClient = accounts.some(a => (a.loginId === String(order.clientId) || a.id === String(order.clientId)) && a.active !== false);
```

**Klient štatistiky** (`KlientiTab.tsx`):
```typescript
// SPRÁVNE — c.loginId (nie c.id):
const cOrders = allOrders.filter(o => o.clientId != null && (o.clientId === c.loginId || o.clientId === c.id));
```

**Bug história:** Pôvodne oboje porovnávalo `a.id`/`c.id` (UUID) s `order.clientId` (loginId) → Turnstile skip nefungoval, štatistiky boli vždy prázdne.

### Honeypot + Rate limit

- Pole `_hp: ""` posielané v objednávke (frontend). Boti ho vyplnia → server vráti 400.
- Rate limit: 5 objednávok/hodinu per IP pre anonymných. Prihlásení klienti sú vyňatí.
- Implementácia: `checkRate(key, max, windowMs)` v `client.ts`.

---

## Nginx — povinná konfigurácia (pri každej novej inštalácii servera)

**KRITICKÉ:** Tieto `location` bloky sú povinné na každom novom VPS. Bez nich nefunguje admin PWA ani error stránky.

```nginx
# Povinné location bloky v /etc/nginx/sites-available/msbeton:

# Admin PWA — musí servovať admin-index.html (iný manifest pre Add to Home Screen)
location /admin {
    try_files $uri $uri/ /admin-index.html;
}

# Klientská SPA — fallback na index.html
location / {
    try_files $uri $uri/ /index.html;
}

# Error stránky
error_page 500 502 503 504 /50x.html;
location = /50x.html {
    root /var/www/msbeton/artifacts/web/dist/public;
    internal;
}
```

**Prečo admin-index.html:** Build script (`package.json`) generuje `admin-index.html` — kópiu `index.html` s `href="/admin-manifest.json"` namiesto klientského manifestu. iOS Safari číta manifest link pri "Pridať na plochu" → bez tejto location by admin dostal klientský manifest a shortcut by spúšťal klientskú app namiesto admin dashboardu. `admin-manifest.json` má `scope: "/"` — celý web v scope, navigácia na `/` zostane v standalone mode.

**Overenie po nasadení:**
```bash
curl -s https://msbeton.sk/admin/login | grep manifest
# Musí vrátiť: href="/admin-manifest.json"
```

### PWA standalone — known issues a pravidlá

Testovanie iOS PWA odkazu odhalilo tieto problémy (opravené 2026-05-29):

**1. Navigácia cez `<a href="...">` v admin**

Wouter interceptuje všetky `<a>` tagy v SPA. V PWA standalone mode to spôsobí, že klik na logo (href="/") neopustí admin view.

**Pravidlo:** Každý link v admin UI, ktorý má vyjsť z admin kontextu, musí použiť `window.location.href`:
```tsx
<a href="/" onClick={(e) => { e.preventDefault(); window.location.href = "/"; }}>
```

**2. NIKDY nedávaj auto-redirect z `/` v standalone mode**

`App.tsx` mal `useEffect` ktorý pri `display-mode: standalone + adminLoggedIn + pathname="/"` presmeroval na `/admin/dashboard`. Spôsoboval blink pri kliku na logo — navigácia na `/` sa okamžite vrátila späť. **Tento pattern je zakázaný.** Standalone PWA si pamätá poslednú URL — redirect pri každom načítaní `/` je nesprávny.

**3. Admin PWA ikona je iná ako klientská**

- Klientská ikona: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (navy bg)
- Admin ikona: `admin-icon-192.png`, `admin-icon-512.png`, `admin-apple-touch-icon.png` (navy bg + gold shield+fingerprint badge vpravo dole)
- `admin-manifest.json` referencuje admin ikony

**4. Po zmene ikony treba na iPhone zmazať starý odkaz a pridať nový** — iOS cachuje ikony pri vytvorení odkazu, neaktualizuje ich automaticky.

## Nginx — custom error stránky (produkcia)

### Konfigurácia na serveri

Nginx musí mať v `/etc/nginx/sites-available/msbeton`:
```nginx
error_page 500 502 503 504 /50x.html;
location = /50x.html {
  root /var/www/msbeton/artifacts/web/dist;
  internal;
}
```

### Súbor `artifacts/web/public/50x.html`

- Animovaný betónomiešač SVG (valcový bubon, diagonálne lopatky, 3 kolesá)
- Statický HTML bez externých závislostí — funguje aj keď Node.js API je dole
- Vite kopíruje `public/` priamo do `dist/` → `50x.html` je v `dist/50x.html` po builde

### Nasadenie na produkciu (keď sa migruje na msbeton.sk)

1. Spustiť build (web): `pnpm --filter @workspace/web build`
2. Overiť: `ls /var/www/msbeton/artifacts/web/dist/50x.html`
3. Pridať nginx `error_page` direktívy (ak ešte nie sú)
4. `nginx -t && systemctl reload nginx`
5. Test: dočasne zastaviť PM2 (`pm2 stop msbeton-api`), navštíviť stránku → musí sa zobraziť 50x.html animácia, nie holý nginx error

**POZOR pri migrácii domény:** nginx config pre `msbeton.sk` musí mať rovnaké `error_page` direktívy ako demo konfig.

---

## Databázové zálohy a rollback (produkcia)

### Skripty na serveri (`root@178.105.242.17`, kľúč `id_ed25519_ms_beton`)

| Skript | Účel |
|--------|------|
| `/root/backup-db.sh` | Manuálny backup + integrity check (gzip pg_dump, overí `admin_config` hits) |
| `/root/rollback-db.sh` | Zoznam backupov / obnova zo zálohy (pred obnovou automaticky uloží pre-rollback snapshot) |

### Cron — automatický backup

```
0 2 * * *  /root/backup-db.sh >> /root/backups/db/backup.log 2>&1
```
Logy: `/root/backups/db/backup.log` — každý riadok: `YYYY-MM-DD HH:MM:SS OK file (size)`.  
Rotácia: posledných 14 kópií, staršie sa mažú automaticky.

### Postup rollbacku

```bash
# 1. Zoznam dostupných backupov
/root/rollback-db.sh

# 2. Obnova z konkrétneho súboru
/root/rollback-db.sh /root/backups/db/msbeton_20260529_065514.sql.gz

# 3. Po rollbacku reštartovať API (PM2 načíta čerstvé dáta)
pm2 restart msbeton-api
```

Skript automaticky vezme pre-rollback snapshot pred obnovou (prefix `pre_rollback_`) — možnosť vrátenia aj rollbacku samotného.

### Obmedzenia a TODO

- **Zálohy sú iba lokálne** (single point of failure). Pri strate VPS sú zálohy stratené.
- TODO: nastaviť remote backup (Hetzner Object Storage / Backblaze B2 / rsync na druhý server)
- Aktuálna DB je malá (~12KB) → email backup cez SMTP je reálna možnosť

---

## TypeScript projektové referencie

`tsconfig.json` v roote používa zložené projektové referencie. Každý balík má vlastný `tsconfig.json` s `"composite": true`. `tsc -b` z rootu typuje všetko v poradí závislostí.

`pnpm-workspace.yaml` prepisuje všetky Replit-špecifické natívne binárky (rollup, lightningcss, tailwindcss oxide) na `"-"`. Na macOS/Linux dev strojoch ich treba nainštalovať explicitne:

```bash
pnpm add -Dw @rollup/rollup-darwin-arm64 lightningcss-darwin-arm64 @tailwindcss/oxide-darwin-arm64
```
