# PDF a SMS export

Referenčný súbor: `artifacts/web/src/components/Calculator.tsx` → funkcie `exportPDF()`, `exportSMS()`

---

## exportPDF()

Generuje HTML blob, otvorí v novom tabe + `window.print()`.

### Štruktúra tabulky

```
thead: # | Popis | Množstvo | Jedn. cena | Spolu

sectionRow("Produkty – {mainBetonLabel}")   ← zlatý, mainBetonLabel = ci.label bez qty
  betonRows         ← IBA concreteBreakdown[0] (hlavná položka)
  transportRow      ← concreteBreakdown[0].transport (nie origItems.transport!)
  fillupRow         ← concreteBreakdown[0].transportFillup
  zimneRow          ← totalQty × zimneServicePrice (globálne)
  subSectionRow("Služby – Pumpa" | "Čakačky")  ← svetlo-zlatý, iba ak hasMainSluzby
    Čerpanie / Hadice / Umývanie / Chémia / Čakačky (main values)

extraRows           ← loop cez concreteBreakdown.slice(1)
  sectionRow("Pridaná položka N – {kategória}")   ← N = idx+1 (1-based)
  betón row
  doprava row (ak transport > 0)
  doťaženie row (ak transportFillup > 0)
  subSectionRow("Služby – Pumpa" | "Čakačky")  ← iba ak hasExtraSvc
    čerpanie / hadice / umývanie / čakačky (ak svcXxxCost > 0)
```

**Dve úrovne section row:**
- `sectionRow(title)` → `background:#EDC531` (zlatý) — pre položky
- `subSectionRow(title)` → `background:#fdf6d8` + `padding-left:18px` (svetlo-zlatý) — pre služby pod položkou

Items s `qty=0` (prázdne množstvo) **nie sú** v `concreteBreakdown` → nikdy sa neobjavia v PDF.

> **Kľúčový bug pattern**: `origItems.transport` = **súčet všetkých** položiek. Pre hlavnú položku v PDF vždy použi `concreteBreakdown[0].transport * dopravaFactor`.

### Watermark / signing box

- Background watermark: **ODSTRÁNENÝ** (spôsoboval prázdne strany)
- Signing box (zostal): `"Vypracovala spoločnosť"` + malé auto (36mm, opacity 0.22) + `"Podpis zákazníka"` rámček — side-by-side layout, kompaktný

### Ceny v PDF — dvojité zobrazenie so zľavou

Keď má klient zľavu (`hasDiscount = true`), každý riadok zobrazuje **pôvodnú (preškrtnutú) aj zľavnenú hodnotu**.

#### Betón

| Stav | orig | disc |
|------|------|------|
| Faktura | `ci.bezDph` | `ci.bezDphFinal` |
| Hotovosť | `ci.bezDph * (1 + VAT_HOTOVOST)` | `ci.bezDphFinalHotovost` |

*Jedn. cena stĺpec*: `~~origRate~~<br>discRate €/m³` — podmienka `Math.abs(origRate - discRate) > 0.001`
*Spolu stĺpec*: `trow(...)` → `crossed` span (preškrtnutý orig) + disc value

#### Doprava

- *Jedn. cena*: vždy `"—"`
- *orig*: `ci.transport` (raw z `calcTransport`)
- *disc*: `ci.transport * dopravaFactor`
- Preškrtnutie: iba ak `effectiveDoprava > 0` alebo `discountCelkovo > 0` (inak `dopravaFactor = 1` → `Math.abs = 0`)

#### Služby (čerpanie, hadice, umývanie, chémia, čakačky)

Pomocná funkcia `svcRateStr(rate, suffix)`:
```typescript
const svcRateStr = (rate: number, suffix: string) => {
  const discRate = rate * sluzbyFactor;
  if (hasDiscount && Math.abs(rate - discRate) > 0.001)
    return `~~${rate}~~ ${suffix}<br>${discRate} ${suffix}`;  // HTML s preškrtnutím
  return `${discRate} ${suffix}`;
};
```

- *Jedn. cena*: `svcRateStr(pumpServicePrice, "€/h")` atď.
- *orig*: `rawCost` (napr. `mainPumpTime * pumpServicePrice`)
- *disc*: `rawCost * sluzbyFactor`
- Platí pre hlavnú aj extra položky

#### Hotovosť vs Faktúra

`VAT_HOTOVOST` sa aplikuje **iba na betón**. Doprava a služby sú rovnaké v oboch režimoch:
```typescript
hotovostBaseItems.transport = items.transport  // bez VAT_HOTOVOST
hotovostBaseItems.pump      = items.pump       // bez VAT_HOTOVOST
```

#### clientBlock v PDF

Vždy obsahuje:
- Meno + firma klienta (ak prihlásený)
- `Doprava: Pumpa/Miešačka/Vlastná doprava – {zoneName}`
- `Zľavy: Betón X%, Doprava Y%, ...` (iba ak `hasDiscount`)

---

## exportSMS()

Kopíruje text do clipboardu. Formát:

```
-------------------------------
          MS-BETON
       Cenová ponuka
-------------------------------
[adresa] - [km]km
-------------------------------
Dátum vystavenia - DD.MM.YYYY
Čas vystavenia   - HH:MM
-------------------------------
[loop concreteBreakdown]
  Betón C25/30                    ← cleanType() bez "Betón " prefix
  29m³ x 76.88 €       = 2229.46 €
  Doprava od 30km do 50km
  29m³ x 53.82 €       = 1558.20 €
  Doťaženie do 10m³
  1m³ x 53.82 €        = 53.82 €
[/loop]
-------------------------------
[Služby sekcia ak pumpa/mix]
-------------------------------
Cena bez DPH         = 6712.71 €
Cena s DPH           = 8256.63 €
(zľavy: ...)
Tel: +421 909 205 205
```

### Doprava v SMS — else vetva

Keď `!transportZone` a `!transportIsMin` (km/auto typ):
```typescript
lines.push(row("Doprava", transportDisc));
// nie: lines.push(`Doprava: ${transportDisc.toFixed(2)} €`)
```

`row(label, val)` = `label.padEnd(22) + "= " + val.toFixed(2) + " €"` — zarovnaný formát.

### cleanType()

```typescript
function cleanType(lbl: string) {
  return lbl
    .replace(/ – [\d.]+ € \/ m³/, "")
    .replace(/ – [\d,.]+ €\/m³/, "")
    .replace(/^Betón\s+/i, "");  // ← kľúčové: zabraňuje "Betón Betón C25/30"
}
```
