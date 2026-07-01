# Fáza 2 — Plán

> Stav: **plánované, ďalší fakturačný cyklus**
> Sadzba: 50 €/h · 1 MD = 8 h

---

## Sekcia A — Editácia objednávky + Čerpací listok

> Pôvodná špecifikácia: [editacia-objednavky.md](editacia-objednavky.md)

### Kontext / problém

Po skutočnej zákazke sa niekedy menia parametre objednávky (kubíky, čerpanie, čakačky, čas pumpy, umývanie). Zákazníčka navyše **skenuje ručný čerpací listok** (EVČ, vodič, časy, prečerpané m³…) spolu s objednávkou z kalkulačky ako interný hotovostný záznam. Cieľ: nemusieť skenovať + vedieť upraviť objednávku po realizácii.

**Dve oddelené potreby:**
- **Peťo:** pridať k PDF **3. možnosť „kalkulačka"** — údaje z objednávky sa prekopírujú do kalkulačky, tam sa upravia (engine prepočíta cenu).
- **Klientka:** prepísať priamo objednávku — kubíky, čakačky, čas pumpy, umývanie.
- **Spoločné:** doplniť polia z ručného listka priamo do objednávky → digitálny čerpací listok.

### A1 — Cenová úprava (cez kalkulačku)

| Variant | Čas | Cena |
|---------|-----|------|
| Full | 2–2,5 MD | 800–1 000 € |
| MVP (m³/čerpanie/čakačky/umývanie; doťaženie/podmienky neskôr) | 1,5 MD | 600 € |

### A2 — Čerpací listok v objednávke

~12 nových polí (EVČ, vodič, časy, prečerpané m³, chémia, podpisy) + sekcia v detaile + PDF render.

| | Čas | Cena |
|---|-----|------|
| Časť A2 | 1 MD | 400 € |

### Otvorené otázky
- Podpisy: tlačené linky vs čisto digitálne?
- Cenová úprava: uloží do existujúcej objednávky (history?) alebo audit zmeny?
- „Prečerpané množstvo" (reálne) vs „kubíky" (fakturačné) — prepojiť alebo nezávislé?

| Sekcia A (celkom) | 3–3,5 MD | 1 200–1 400 € |
|---|---|---|

---

## Sekcia B — Mailing / Klientský feedback

### B1 — Review email po objednávke ⭐ (najvyšší ROI)

Po N dňoch od `status → vyplatená/odoslaná` → email klientovi s linkom na Google Maps recenziu.

- Stub v `mailer.ts` existuje, komentár: *"Bez review CTA — predčasné"*
- 1 Google recenzia > 100 € reklamy pre B2B betón
- Odhadovaný čas: **3–4 h**

### B2 — Onboarding email pri prvej biometrii

Trigger: `biometricAuthLog` — prvý záznam → email klientovi "Biometria aktivovaná, rýchly prístup kedykoľvek".

- Odhadovaný čas: **1–2 h**

### B3 — Admin notifikácia — engagement milestones

Keď klient zmení heslo / aktivuje biometriu / prvýkrát objedná → notifikácia adminovi v dashboarde alebo emailom.

- Teraz viditeľné len pri ručnom otvorení karty klienta
- Odhadovaný čas: **2–3 h**

| Sekcia B (celkom) | ~1 MD | ~400 € |
|---|---|---|

---

## Súhrn Fázy 2

| Sekcia | Čas | Cena |
|--------|-----|------|
| A — Editácia + čerpací listok (full) | 3–3,5 MD | 1 200–1 400 € |
| B — Mailing / feedback | ~1 MD | ~400 € |
| **Fáza 2 celkom** | **4–4,5 MD** | **~1 600–1 800 €** |
