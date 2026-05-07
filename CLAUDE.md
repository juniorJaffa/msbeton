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

### PDF a SMS export

→ **[docs/pdf-sms-export.md](docs/pdf-sms-export.md)** — štruktúra tabulky, watermark/signing box, `cleanType()`, SMS formát a `row()` zarovnanie.

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

### Admin Klienti – bezpečnostné pravidlá

- loginId `"msbeton"` **blokovaný** pri vytváraní aj editácii
- Default heslo pri novom klientovi: `"1234"`, loginId prázdny (povinný vstup)
- `autoComplete="off"` / `"new-password"` zamedzuje browser autofill do formulára

### Admin Klienti – Typ dopravy

Používa **pill toggle tlačidlá** (nie native `<select>`). Dôvod: iOS native `<select>` vždy zobrazí floating picker overlay bez ohľadu na CSS. Platí pre nový formulár aj expanded detail klienta.

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
PORT=3000 DATABASE_URL="postgresql://junior@localhost:5432/msbeton" pnpm --filter @workspace/api-server dev

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

2. **Kalkulačka** (`Calculator.tsx`): číta výlučne z localStorage cez `adminData.*` gettery — žiadne API volania počas výpočtu. Celá logika (zóny, fill-up, pumpa, zľavy) je client-side.

3. **Admin dashboard**: číta z localStorage, zapisuje do localStorage + `PUT` na API na pozadí (bez čakania). Zlyhania sú tiché (bez vrátenia zmien).

### Autentifikácia

- **Admin**: iba client-side, `btoa`-enkódovaná kontrola prihlasovacích údajov v `adminAuth.ts`, session v localStorage. Žiadne API volania.
- **Klient**: `POST /api/client/login` → server overí voči `clients` kľúču v DB → vráti session objekt uložený pod `msbeton_client_session`. `clientAuth.ts` používa výlučne PostgreSQL (žiadny localStorage fallback).
- **Logout z Navbar**: `clientAuth.logout()` dispatchuje `client-session-changed` event. `Calculator.tsx` počúva tento event a syncuje svoj `loggedClient` stav.

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

Produkcia: [demo.msbeton.sk](https://demo.msbeton.sk), server `root@178.104.62.115`, adresár `/var/www/msbeton`.

**GitHub Action nasadzuje automaticky** pri každom `git push origin main`. Manuálny deploy len ak Action zlyhá alebo commity neboli pushnuté:

```bash
# Manuálny deploy
ssh -i ~/.ssh/id_ed25519_claude root@178.104.62.115 "cd /var/www/msbeton && git pull && PORT=3000 BASE_PATH=/ pnpm --filter @workspace/web build && pnpm --filter @workspace/api-server build && DATABASE_URL='postgresql://msbeton:vPk83o1ITFyjeheEjgkeT4sucEea4Z@localhost:5432/msbeton' pnpm --filter @workspace/db push && pm2 restart msbeton-api --update-env && echo OK"
```

- `pnpm run build` na serveri ZLYHÁ kvôli pre-existujúcim framer-motion TS chybám v `Home.tsx` — vždy build web + API zvlášť
- `DATABASE_URL` je v `ecosystem.config.cjs` (nie v `.env` súbore)
- SMTP je v `ecosystem.config.cjs`: `SMTP_HOST: 'mail.webglobe.sk'`, port `587` STARTTLS. Port 465 je na VPS blokovaný.
- PM2 `--update-env` **nenačíta** nové env z `ecosystem.config.cjs` — treba `pm2 delete msbeton-api && pm2 start ecosystem.config.cjs`
- SSH kľúč: `id_ed25519_claude` (GitHub Secret: `itikon-claude-code`)

Na serveri beží PostgreSQL — `DATABASE_URL` je nastavená v `ecosystem.config.cjs` pre pm2.

---

## TypeScript projektové referencie

`tsconfig.json` v roote používa zložené projektové referencie. Každý balík má vlastný `tsconfig.json` s `"composite": true`. `tsc -b` z rootu typuje všetko v poradí závislostí.

`pnpm-workspace.yaml` prepisuje všetky Replit-špecifické natívne binárky (rollup, lightningcss, tailwindcss oxide) na `"-"`. Na macOS/Linux dev strojoch ich treba nainštalovať explicitne:

```bash
pnpm add -Dw @rollup/rollup-darwin-arm64 lightningcss-darwin-arm64 @tailwindcss/oxide-darwin-arm64
```
