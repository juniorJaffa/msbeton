# KROS integrácia — automatické faktúry z objednávok

> Stav: **plánované, špecifikácia pripravená**
> Dátum návrhu: 2026-06-22
> Kontext: objednávky MS-BETON → automatické vystavenie faktúry v KROS

## Cieľ

Pri objednávke (status → „vyúčtovaná" alebo manuálne tlačidlo „Vystaviť FA") vytvoriť faktúru v KROS cez API. Rešpektovať `priceMode` (faktúra vs hotovosť).

---

## 1. Cieľový produkt: KROS Fakturácia (online/cloud) + REST API

| Parameter | Hodnota |
|-----------|---------|
| Base URL | `https://api-economy.kros.sk/api/{resource}` (HTTPS povinné) |
| Auth | Bearer token — `Authorization: Bearer <token>` |
| Token | samoobslužne: *Nastavenia firmy → API prepojenia → Vygenerovať token* (po vygenerovaní sa nedá znova zobraziť, iba resetovať) |
| Formát | JSON, UTF-8, ISO 8601 dátumy, max 100 dokladov/dávka |
| Odberateľ | **zakladá sa automaticky** pri vytvorení faktúry (netreba samostatný create-customer) |
| Async | `202 Accepted` + `requestId`, detail cez **webhook** (HMAC-SHA256, hlavička `X-Kros-Signature-256`) |
| Rate limit | 10 req/s, 300 req/min (429); anti-duplicita ~120 s okno (409) |
| Dokumentácia | https://www.kros.sk/openapi-dokumentacia/ |
| Swagger (autoritatívne endpointy + JSON schéma) | `https://api-economy.kros.sk/swagger/index.html` |

**Cena:** Základ (5,90 €) + API doplnok (4,90 €) ≈ **10,80 €/mes.**, alebo **KROS Firma 14,90 €** (API v cene + sklad). Ceny overiť na aktuálnom cenníku.

**NEZAMIEŇAŤ:**
- „PREMIUM API" v KROS = bankové PSD2 prepojenie, **nie** fakturačné API
- `isklad.sk` ≠ KROS (samostatná fulfillment firma)
- iKROS = stará online fakturácia, nahradená KROS Fakturáciou; staré API nefunguje

**Kontakty KROS:** centrála 041/707 10 10, kros@kros.sk · podpora Fakturácia 041/707 10 01 · integrácie/e-shop +421 41/707 10 59

---

## 2. Hotovosť vs Faktúra — KRITICKÉ (zákonná vec, nie len technická)

Appka má `Order.priceMode: "faktura" | "hotovost"`.

| Režim | Tok | eKasa |
|-------|-----|-------|
| `faktura` (prevod) | KROS API → odberateľská faktúra | ❌ netreba |
| `hotovost` | faktúra cez API **NESTAČÍ zákonne** | ✅ **povinná eKasa** (pokladničný doklad) |

- Betón platený hotovosťou na mieste = tržba → musí prejsť cez **eKasu** (financnasprava.sk).
- KROS Fakturácia cloud **sama nie je eKasa pokladnica** — eKasa beží v OMEGA/ALFA s fiškálnym modulom, alebo cez VRP (Virtuálna RP, zadarmo, ~1000 dokladov/mes.) / ORP.
- Limit hotovosti medzi firmami: 5 000 €.

> **TODO pred štartom:** vyriešiť s účtovníkom MS-BETON, ako dnes riešia eKasu pri hotovostných betonážach. API pokryje len faktúry; hotovosť potrebuje samostatný eKasa tok.

---

## 3. Dátová medzera — Client/Order nemajú fakturačné polia

Aktuálny `Client` ([adminData.ts](../artifacts/web/src/lib/adminData.ts)) má len: `firstName`, `lastName`, `company`, `email`, `phone`.
**Chýba:** IČO, DIČ, IČ DPH, fakturačná adresa (ulica/mesto/PSČ/krajina).

`Order` má: `clientName`, `clientId`, `company`, `phone`, `email`, `totalBezDph`, `totalSDph`, `priceMode`, `breakdown` (rozpis položiek JSON), zľavy. **Nemá** billing údaje odberateľa.

Pre platnú faktúru treba minimálne **IČO + adresu odberateľa** (DIČ/IČ DPH ak platca DPH).

### Checklist — polia na rozšírenie

**`Client` (nové polia):**
- [ ] `ico?: string` — IČO odberateľa
- [ ] `dic?: string` — DIČ
- [ ] `icDph?: string` — IČ DPH (ak platca)
- [ ] `billingStreet?: string` — ulica + číslo
- [ ] `billingCity?: string` — mesto
- [ ] `billingZip?: string` — PSČ
- [ ] `billingCountry?: string` — krajina (default "SK")
- [ ] (voliteľné) `krosPartnerId?: string` — ID partnera v KROS po prvom založení

**`Order` (nové polia — snímka billing v čase objednávky + tracking):**
- [ ] `billing?: { name, ico?, dic?, icDph?, street?, city?, zip?, country? }` — snímka fakturačných údajov
- [ ] `krosInvoiceId?: string` — ID faktúry v KROS po vystavení
- [ ] `krosInvoiceNumber?: string` — číslo faktúry
- [ ] `krosStatus?: "none" | "pending" | "issued" | "error"` — stav vystavenia
- [ ] `krosError?: string` — chybová hláška (ak error)

**UI:**
- [ ] Fakturačné polia do KlientiTab (formulár + detail klienta)
- [ ] Voliteľný IČO lookup (FinStat / RÚZ API) na auto-predvyplnenie adresy/DIČ
- [ ] ObjednávkyTab: tlačidlo „Vystaviť faktúru" + stav `krosStatus` (chip), iba pre `priceMode === "faktura"`

---

## 4. Architektúra integrácie

**Tok:**
```
Objednávka (status → "vyúčtovaná" / tlačidlo "Vystaviť FA")
  → frontend POST /api/admin/orders/:id/invoice
  → api-server: zostaví KROS payload z Order (breakdown → položky, totalBezDph/SDph, billing)
  → POST https://api-economy.kros.sk/api/... (Bearer token)
  → 202 + requestId → ulož krosStatus="pending"
  → webhook /api/kros/webhook (overiť X-Kros-Signature-256 HMAC)
  → ulož krosInvoiceId/Number, krosStatus="issued" (alebo "error")
```

**Mapping Order → KROS faktúra:**
- `Order.breakdown` (JSON `{v, s:[{h, rows:[{l, q, v}]}]}`) → riadky faktúry (popis `l`, množstvo `q`, suma `v`)
- `totalBezDph` / `totalSDph` → základ + DPH
- `billing` (IČO/adresa) → odberateľ (KROS auto-založí partnera)
- DPH logika: faktúra = štandardná DPH; pozn. hotovosť má `VAT_HOTOVOST` len na betón — ale hotovosť ide cez eKasu, nie API faktúru

**Token + secrets:** do `ecosystem.config.cjs` (ako `SMTP_*`, `DATABASE_URL`) — `KROS_API_TOKEN`, `KROS_WEBHOOK_SECRET`. NIE do gitu.

**Server route:** nová `artifacts/api-server/src/routes/kros.ts` + lib `krosClient.ts` (fetch wrapper, retry na 429/5xx, HMAC verify).

---

## 5. E-faktúra (povinná od 1.1.2027) — future-proof

KROS e-faktúru **ešte vyvíja**, nemá hotovú. Harmonogram ([kros.sk/efaktura](https://www.kros.sk/efaktura/)):
- Q1–Q2 2026: návrh riešenia
- Q3 2026: prvé testovanie
- **Q4 2026: nábeh + bezplatné testovacie obdobie**
- **1.1.2027: povinné** (platcovia DPH, B2B na SK)

Technicky: **Peppol BIS / EN 16931** (paneurópsky XML, nie starý ISDOC), odoslanie cez Peppol sieť + „digitálny poštár" z portálu Finančnej správy. V KROS „jedným tlačidlom" v programe (ALFA, OMEGA, **Fakturácia online**, ONIX).

> **Výhoda našej architektúry:** e-faktúra je **vrstva odoslania nad faktúrou**. My len vytvoríme faktúru cez API → KROS rieši Peppol odoslanie/validáciu. Keď KROS spustí e-faktúru (Q4 2026), naše API vytváranie funguje ďalej, e-faktúra sa zapne na strane KROS **bez zmeny nášho kódu**. Netreba vlastný Peppol prístupový bod.

---

## 6. Kroky na prepoj (poradie)

1. MS-BETON aktivuje **KROS Fakturácia + API** (alebo KROS Firma), vygeneruje token
2. Zo **Swageru** (`api-economy.kros.sk/swagger`) zistiť presnú JSON schému faktúry + partnera — **nepredpokladať endpointy z pamäte**
3. **Rozšíriť `Client` + `Order`** o billing polia (checklist §3) + UI v KlientiTab
4. Backend: `krosClient.ts` + route + webhook handler (HMAC verify); token do `ecosystem.config.cjs`
5. ObjednávkyTab: tlačidlo „Vystaviť FA" + `krosStatus` chip (iba `priceMode === "faktura"`)
6. **Vyriešiť hotovosť/eKasa s účtovníkom** — API pokryje len faktúry
7. Test v sandboxe (faktúra prevod → FA, overiť odberateľa, DPH, číslo)

---

## 7. Čo overiť/vypýtať u KROS

- Presná JSON schéma faktúry + partnera (Swagger) — názvy polí, povinné polia
- Webhook: formát payloadu, presná HMAC verifikácia (`X-Kros-Signature-256`)
- Či cloud Fakturácia vie **hotovostný/pokladničný doklad**, alebo treba OMEGA eKasa
- Testovací/sandbox token + prostredie

## Otvorené otázky

- IČO lookup: FinStat (platené API) vs RÚZ (register účtovných závierok) vs ručné zadanie?
- Faktúra trigger: automaticky pri statuse „vyúčtovaná", alebo vždy manuálne tlačidlo?
- Číslovanie faktúr: rad v KROS, alebo posielame vlastné číslo?
- Storno/dobropis: ako riešiť zrušenú objednávku po vystavení FA?
