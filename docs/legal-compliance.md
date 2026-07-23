# MS-BETON — Právne a daňové riziká

> Vytvorené: 2026-07-23
> Sadzba: 50 €/h · 1 MD = 8h

**Legenda:** ✅ Pokryté | ⚠ Čiastočné / treba overiť | ❌ Nepokryté | 🔴 Aktívne riziko

---

## 1. Prenos DPH — §69 ods. 12 zákon č. 222/2004 Z.z.

**Stav: ❌ Plánované (Fáza 2, Sekcia C)**

Pre B2B klientov (platcovia DPH): stavebné práce sa fakturujú bez DPH. Odberateľ si DPH odvedie sám.

**Eligible služby (môžu byť 0%):** čerpanie, umývanie, chémia, hadice  
**Vždy 23% DPH:** čakačky, zimné opatrenie, betón, doprava

**Čo treba na faktúre:** text `"Prenesenie daňovej povinnosti podľa §69 ods. 12 zákona č. 222/2004 Z.z."` + split DPH tabuľka (základ 23% / základ 0%).

**Risk:** Klienti s právom na prenos DPH platia zbytočne 23% → strata klientov. Riešenie: [Fáza 2 Sekcia C](faza-2.md).

---

## 2. eKasa / Elektronická registračná pokladnica — zákon č. 289/2008 Z.z.

**Stav: 🔴 AKTÍVNE RIZIKO — treba overiť + riešiť**

MS-BETON je platca DPH (IČ DPH: `SK2122074603`). **Každá hotovostná platba musí byť zaevidovaná cez eKasa VRP** (Virtuálna registračná pokladnica) pripojenú online na Finančnú správu SR. Doklad musí obsahovať:
- QR kód z FS SR
- DIČ FS (unikátne číslo dokladu)
- Dátum a čas, sumu, základ DPH, DPH, sadzbu

### Situácia pri MS-BETON

Zákazníci (fyzické osoby stavajúce domy) platia **hotovosťou na ruku** — nechcú faktúru s DPH (nemôžu si DPH odpočítať, platia menej). Toto je bežná prax v slovenskom stavebníctve.

**Problém:** MS-BETON je povinný aj napriek tomu vydať eKasa doklad. Nevydanie = pokuta až 3 320 € pri prvom zistení, opakované = odobratie živnostenského oprávnenia.

### Čo app robí dnes

App generuje PDF "Cenová ponuka" pri hotovosti. **Toto NIE JE eKasa doklad.** DPH je zahrnutá v cene (`VAT_HOTOVOST = 20%` na betón), ale chýba legálny doklad z FS SR.

### Možnosti riešenia

| Riešenie | Čas | Cena | Poznámka |
|----------|-----|------|----------|
| Fyzická pokladnica (napr. FiskalPRO VRP) | externé | ~200 €/rok | Najrýchlejšie — mimo app, len info |
| API integrácia s VRP v app | 3–4 MD | 1 200–1 600 € | eKasa API Finančnej správy SR |
| Hybrid: app generuje XML, VRP odošle | 1–2 MD | 400–800 € | Ak majú VRP, len export |

**Okamžité odporúčanie:** Overiť s Petrom, či majú fyzickú pokladnicu. Ak nie — zaobstarať VRP softvér (napr. iKasa, FISCAL, FiskalPRO) bez zmeny v app. Integrácia do app = Fáza 3.

---

## 3. Náležitosti faktúry — §74 zákon o DPH + §10 zákon č. 431/2002 Z.z.

**Stav: ⚠ Čiastočné — app generuje ponuku, nie faktúru**

Právne záväzná faktúra musí obsahovať:

| Náležitosť | App teraz | Riešenie |
|------------|-----------|----------|
| Poradové číslo faktúry | ❌ chýba | KROS integrácia |
| Dátum vzniku daňovej povinnosti (dátum dodania) | ❌ chýba | editácia objednávky / čerpací listok |
| IČO/DIČ/IČ DPH odberateľa | ❌ chýba | per-klient polia |
| IBAN / bankový účet | ❌ chýba | hardcoded v PDF |
| Splatnosť | ❌ chýba | KROS integrácia |

**Nízke riziko teraz:** PDF je označený "Cenová ponuka" — nie faktúra. Faktúra vzniká inde (KROS alebo ručne). Risk nastane ak zákazníci začnú považovať PDF z app za faktúru.

Plán: [docs/kros-integracia.md](kros-integracia.md) — exportovať objednávky do KROS kde sa vystaví faktúra.

---

## 4. GDPR — Právo na výmaz (čl. 17 nariadenia EÚ 2016/679)

**Stav: ⚠ Čiastočne pokryté**

| Právo | Stav | Poznámka |
|-------|------|----------|
| Výmaz osobných údajov | ✅ Hard delete v admin (Klienti → Vymazať trvalo) | Implementované 2026-07 |
| Soft delete / Koš | ✅ Klient presunutý do koša, obnoviteľný | Implementované 2026-07 |
| Právo na prenosnosť (čl. 20) | ❌ Chýba | Export dát klienta v JSON/CSV |
| Dokumentovaný postup pre admina | ❌ Chýba | Interná SOP "Ako vymazať klienta GDPR" |
| Biometrické dáta | ✅ OK | WebAuthn ukladá credential ID, nie biometrické dáta; biometria zostáva na zariadení |

---

## 5. Archivovanie účtovných dokladov — zákon č. 431/2002 Z.z.

**Stav: ❌ Audit položka #72 (Remote DB backup)**

Faktúry a doklady musia byť archivované **10 rokov**. Aktuálne: PostgreSQL backup len lokálne na VPS, retencia 14 dní.

**Risk:** Strata VPS = strata všetkých objednávok/dokladov.

**Riešenie:** Remote backup (Hetzner Object Storage / Backblaze B2) — audit položka #72 ❌ ~1h.

---

## Súhrn rizík

| # | Zákon | Risk | Priorita | Cena riešenia |
|---|-------|------|----------|---------------|
| 1 | §69 ods. 12 — Prenos DPH | Klient stráca peniaze | HIGH | 400–600 € |
| 2 | Zákon č. 289/2008 — eKasa | 🔴 Pokuta FS SR | **URGENT** | VRP softvér externý ALEBO 400–1 600 € integrácia |
| 3 | §74 zákon o DPH — faktúra | LOW (ponuka ≠ faktúra) | LOW | KROS integrácia |
| 4 | GDPR čl. 17 — výmaz | SOFT (hard delete existuje) | LOW | ~2h doc |
| 5 | Zákon č. 431/2002 — archív 10r | MEDIUM | MEDIUM | ~1h remote backup |

---

## Otázky na Petra (nutné pred riešením eKasa)

1. Má MS-BETON fyzickú/virtuálnu registračnú pokladnicu (eKasa VRP)?
2. Kto vydáva doklad pri hotovostnej platbe — Peťo osobne, vodič, kancelária?
3. Vydáva sa zákazníkovi niečo po zaplatení hotovosti? (ručný blok, iný systém?)
4. Koľko % objednávok je hotovostných vs. fakturovaných?
