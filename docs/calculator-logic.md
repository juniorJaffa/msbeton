# Kalkulačka — výpočtová logika

Referenčný súbor: `artifacts/web/src/components/Calculator.tsx`
Pôvodný WP zdroj: `calculator-utils.php`, `calculator-pump.php`, `calculator-mixer.php`

---

## concreteBreakdown — štruktúra

`concreteBreakdown` je pole všetkých betónových položiek vypočítaných v `useMemo`:

```
concreteBreakdown[0]   = hlavná položka (quantity + selectedType)
concreteBreakdown[1..] = extra položky ("+Pridať položku")
```

Každý prvok (`ConcreteBreakdownItem`) obsahuje:

| Pole | Typ | Popis |
|------|-----|-------|
| `label` | string | `"Betón C25/30 – 5 m³"` |
| `qty` | number | objem m³ |
| `bezDph` | number | raw cena bez zľavy |
| `bezDphFinal` | number | fakturovaná cena (po zľave betónu) |
| `bezDphFinalHotovost` | number | hotovostná cena (po zľave + VAT_HOTOVOST) |
| `transport` | number | raw doprava (0 ak `noTransport` alebo vlastná) |
| `transportFillup` | number | cena doťaženia |
| `transportFillupM3` | number | m³ doťaženia |
| `transportFillupTarget` | number | cieľový objem (5 alebo 10 m³) |
| `transportIsMin` | boolean | platí minimálna sadzba |
| `transportTrucks` | number | počet áut pre túto položku |
| `svcPumpCost` | number | čerpanie (per extra item, 0 ak hlavná) |
| `svcPumpHrs/Ms` | number | čas čerpania |
| `svcHoseMeters` | number | bm hadíc |
| `svcHoseCost` | number | cena hadíc |
| `svcWashing` | boolean | umývanie mimo stavby |
| `svcWashCost` | number | cena umývania |
| `svcWaitIntervals` | number | počet × 15 min |
| `svcWaitCost` | number | cena čakačky |
| `svcWaitLabel` | string | textový popis čakačky |

> **Dôležité**: `cleanType(label)` odstraňuje cenovú príponu (`– X.XX €/m³`) aj leading prefix `"Betón "`, aby nevznikalo `"Betón Betón C25/30"`.

---

## Logika zliav

Referencia: `calculator-utils.php` → `get_discount_with_type()`

Každý klient má 4 zľavy:

```typescript
effectiveBeton   = discountBeton   > 0 ? discountBeton   : discountCelkovo
effectiveDoprava = discountDoprava > 0 ? discountDoprava : discountCelkovo
effectiveSluzby  = discountSluzby  > 0 ? discountSluzby  : discountCelkovo
```

Faktory použité vo výpočte:

```typescript
betonFactor   = 1 - effectiveBeton   / 100
dopravaFactor = 1 - effectiveDoprava / 100
sluzbyFactor  = 1 - effectiveSluzby  / 100
```

V UI sa zobrazujú **raw nakonfigurované hodnoty** (nie odvodené efektívne).

### Pravidlo dvojitého zobrazovania cien

Keď je `hasDiscount = effectiveBeton > 0 || effectiveDoprava > 0 || effectiveSluzby > 0`, každý cenový výstup zobrazuje **obe hodnoty** — pôvodnú (preškrtnutú) aj zľavnenú:

- **Betón** (`betonFactor`): orig cena preškrtnutá, zľavnená tučná pod ňou
- **Doprava** (`dopravaFactor`): preškrtnuté + zľavnené — iba ak `effectiveDoprava > 0` ALEBO `discountCelkovo > 0`
- **Služby** (`sluzbyFactor`): preškrtnuté + zľavnené — iba ak `effectiveSluzby > 0` ALEBO `discountCelkovo > 0`

Podmienka preškrtnutia vždy: `hasDiscount && Math.abs(orig - disc) > 0.001`

Kategória BEZ špecifickej zľavy ale S `discountCelkovo` zdedí efektívnu zľavu → zobrazí preškrtnutie.
Kategória BEZ akejkoľvek zľavy (`factor = 1`) → `Math.abs(orig - disc) = 0` → žiadne preškrtnutie (správne).

---

## Transportná logika

### Standard typ (zóny podľa km)

**Kapacity a fill-up minimum — z admin Doprava nastavení:**
```
pumpCap   = clientDeliveryZone.pumpTruckCapacity ?? 7   // kapacita pumpy (m³)
mixCap    = clientDeliveryZone.truckCapacity     ?? 9   // kapacita mixéra (m³)
fillupMin = tsettings.minimumLoadM3              ?? 5   // min. objem na vozidlo
```
Zmena v admin → okamžite platí vo výpočte (kalkulačka, PDF, SMS, podmienky).

**Fill-up pravidlo — iba pre Standard, iba keď nie je `isMin`:**

*Bez podmienok (normálny výpočet, `overrideTrucks` = undefined):*
| Podmienka | Akcia |
|-----------|-------|
| `qty < fillupMin` | doplní na `fillupMin` m³ (celkové qty) |
| `qty > pumpCap && qty < 10` (pumpa) | doplní na 10 m³ |
| `qty > mixCap && qty < 10` (mix) | doplní na 10 m³ |

*S podmienkami (`overrideTrucks` definované — admin podmienky panel):*
```
qtyPerTruck = qty / overrideTrucks
cap         = mixCap   // vždy mixCap pre per-vozidlo výpočet
fillupPerTruck:
  qtyPerTruck < fillupMin          → fillupMin - qtyPerTruck
  qtyPerTruck > cap && < 10        → 10 - qtyPerTruck
  inak                             → 0
fillupM3 = round(fillupPerTruck × overrideTrucks, 1)
```

**Príklady (default: fillupMin=5, pumpCap=7, mixCap=9):**
| qty | overrideTrucks | qPT | fill-up |
|-----|---------------|-----|---------|
| 8 m³ | 1 | 8.0 | 0 (5≤8<9) ✓ |
| 20 m³ | 5 | 4.0 | 5×(5-4)=**5 m³** ✓ |
| 70 m³ | 8 | 8.75 | 0 (5≤8.75<9) ✓ |
| 8 m³ | – | – | 10-8=**2 m³** (pumpa, 7<8<10) ✓ |

**Min. doprava — fill-up sa neúčtuje:**
```
isMin = costPerTruck < minimumFee (tsettings.minimumFee, default 62.50 €)
if isMin → fillupM3 = 0, fillupCost = 0
```

Cena = `zone.ratePerM3 × totalQty` (vrátane fill-up m³)
Ak `costPerTruck < minRate` → platí `minRate × trucks`

### km typ

```
cost = km × ratePerKm × trucks
```
Bez fill-up, `trucks = ceil(qty / truckCapacity)`.

**Min. poplatok km** — pumpa a mix majú oddelené minimá:
```typescript
// manualPrices kľúče
`km_rate_${zoneId}`         → sadzba €/km (override zone.ratePerKm)
`km_min_pumpa_${zoneId}`    → min €/auto pre pumpu (override zone.minimumFeeKmPumpa)
`km_min_mix_${zoneId}`      → min €/auto pre mix (override zone.minimumFeeKmMix)

// Lookup poradie (tab = "pumpa" | "mix"):
kmMinBase = tab === "pumpa"
  ? (zone.minimumFeeKmPumpa ?? zone.minimumFeeKm)
  : (zone.minimumFeeKmMix   ?? zone.minimumFeeKm)
mainMinFeePerTruck = mp[kmMinKey] !== undefined ? mp[kmMinKey] : kmMinBase
```

Ak `cost < mainMinFeePerTruck × trucks` → `transportIsMin = true`, platí minimum.

### auto typ

```
cost = trucks × ratePerTruck
```
Bez fill-up.

**manualPrices kľúče auto:**
```typescript
`auto_rate_${zoneId}`   → paušál €/auto (override zone.ratePerTruck)
// min fee: zone.minimumFeeAuto (bez manualPrices override)
```

### Počet áut

- Pumpa: `1 pumpa + ceil(qty / mixCap)` mix áut (prvé auto = 7 m³, ďalšie = 9 m³)
- Mix: `ceil(qty / mixCap)` áut

---

## Mix čakačky pravidlo

Prvých 30 minút **zadarmo**. Potom každých začatých 15 min:

```typescript
waitIntervalsMix = Math.ceil(Math.max(0, waitTotalMins - 30) / 15)
```

Pumpa čakačky: počítajú sa v kusoch (1 ks = 15 min), bez voľného limitu.

---

## Extra položky ("+Pridať položku")

Extra položky sú `extraItems` stav v komponente. Každá má:
- `categoryName`, `typeLabel`, `quantity` — výber betónu + objem
- `noTransport?: boolean` — ak `true`, transport = 0 pre túto položku
- `svc?: ExtraItemServices` — voliteľné per-item služby (pumpa/mix)

Extra položky sa pridávajú do `concreteBreakdown` (index 1+) v `useMemo`:

```typescript
for (const item of extraItems) {
  const q = parseFloat(item.quantity) || 0;
  if (t && q > 0) {                        // ← qty musí byť > 0, inak položka vynechaná
    const extraTC = (isOwn || item.noTransport) ? zeroTC : calcTransport(km, q, tab, ...)
    // ... vypočíta betón + transport + per-item svc
    concreteBreakdown.push({ ... })
  }
}
```

> **Dôsledok qty guard**: Item s prázdnym/nulovým množstvom **nikdy nevstúpi** do `concreteBreakdown` — nezobrazí sa v UI výsledku ani v PDF. UI zobrazí červenú kartu + badge „nie je zahrnutá" ak `showResult && !item.quantity`.

### UI labely extra položiek

| Miesto | Formát |
|--------|--------|
| Input form header | `Položka {idx+1}` (1-based, bez kategórie) |
| Result panel | `Pridaná položka {idx}` kde idx = index v `concreteBreakdown.map` (1 = prvá extra) |
| PDF section header | `Pridaná položka {idx+1} – {kategória}` kde `kategória = ci.label.replace(/ – [\d.,]+ m³$/, "")` |

`origItems.transport` je **súčet** transport nákladov všetkých položiek. Pri PDF exporte **nepoužívaj** `origItems.transport` pre hlavnú položku — použi `concreteBreakdown[0].transport`.

---

---

## buildTransportUnitStr — PDF Jedn. cena helper

```typescript
function buildTransportUnitStr(isMin: boolean, qty: number): string
```

Vracia správny unit string pre Jedn. cena stĺpec PDF transport riadku:

| pricingType | isMin=false | isMin=true |
|-------------|-------------|------------|
| `standard`  | `€/m³`      | `Min. €/auto` |
| `km`        | `€/km`      | `Min. €/auto` |
| `auto`      | `€/auto`    | `Min. €/auto` |

Implementácia závisí od `clientDeliveryZone?.pricingType` a `transportIsMin`.

---

## Info karta — transport pricing cells

Kalkulačka zobrazuje info kartu (Betónová pumpa / Domiešavač) s bunkami z dopravy pre aktuálnu zónu klienta. Pravidlá:

**Faktory:**
```typescript
const fT = dopravaFactor;  // NIE result?.fTransport — ten je null pred výpočtom
```

**pricingType → bunky:**

| pricingType | Cell 1 | Cell 2 |
|-------------|--------|--------|
| `standard`  | Min. doprava (minFeeStd · fT) | Doprava od (tzones[0].ratePerM3 · fT) |
| `km`        | Sadzba/km (kmRate · fT)       | Min. doprava (kmMinFee · fT) |
| `auto`      | Paušál/auto (autoRate · fT)   | Min. doprava (minimumFeeAuto · fT) |

Pre pumpu pridáva: Čerpanie (fPump), Rozbeh. chémia (fChem).
Pre mix pridáva: Čakačka / 15 min (fWaitM).

**Kritické**: `fPump`, `fChem`, `fWaitM` sú komponento-úrovňové premenné — nie z IIFE. `fT` musí byť `dopravaFactor` (komponento-úroveň), nie `result?.fTransport`.

---

## Hotovosť vs Faktúra

DPH na hotovosť (`VAT_HOTOVOST`, default 20%) sa aplikuje **iba na betón**, nie na dopravu/služby:

```typescript
hotovostBaseItems = {
  concrete: items.concrete * (1 + VAT_HOTOVOST),
  transport: items.transport,          // bez DPH
  pump: items.pump,                    // bez DPH
  zimne: items.zimne * (1 + VAT_HOTOVOST),
  // ...
}
```

`VAT_HOTOVOST` môže byť per-klient (`loggedClient.hotovostDph`), inak default `DEFAULT_VAT_HOTOVOST = 0.20`.
