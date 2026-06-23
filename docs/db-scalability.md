# Databáza — škálovateľnosť, archivácia, zálohovanie

> Stav: **Fáza 1 pripravená (alerts, stránkovanie)**
> Dátum návrhu: 2026-06-23
> Kontext: MS-BETON admin — objednávky + klienti v jednom JSONB blobe

---

## Aktuálna architektúra

Celý stav v jednej tabuľke `admin_config(key TEXT, data JSONB)`. Kľúče:
- `orders` — pole všetkých objednávok
- `clients` / `client_accounts` — klienti
- `categories`, `delivery`, `services`, `transport_zones`, `transport_settings`

**Každá nová objednávka = celé pole sa prepíše** (INSERT ON CONFLICT DO UPDATE). Pri malých objemoch (< ~1 000 objednávok) je to bezproblémové.

**UI stránkovanie objednávok:** `ORDERS_PAGE_SIZE = 30` (client-side, filter beží v pamäti).

---

## Kapacitné prahy — kedy zasiahnuť

| Počet objednávok | Problém | Odporúčaná akcia |
|-----------------|---------|-----------------|
| 122 (jún 2026) | Žiadna vzdialená záloha | **Teraz: email/remote backup** |
| **500+** | Client-side filter spomaľuje pri každom keystroke | Stránkovanie existuje (30/strana) — OK |
| **1 000+** | JSONB blob ~1 MB, admin load badateľnejší | Monitorovať; plán migrácie |
| **2 000+** | JSONB ~2 MB, DB UPDATE pomalší | Začať migráciu na `orders` tabuľku |
| **5 000+** | Kritické — každá nová objednávka prepíše 5+ MB blob | Migrácia nutná (viď Fáza 2) |

**Admin alerty** sú implementované v `ObjednavkyTab.tsx` — zobrazujú sa automaticky pri prekročení 1 000 / 2 000 / 5 000 objednávok s odkazom na tento dokument.

---

## Fáza 1 — Teraz (do konca júna 2026)

### 1. Vzdialená záloha — KRITICKÁ PRIORITA

Aktuálny stav: lokálny cron backup na VPS, 14 kópií, rotácia. **Žiadna vzdialená kópia.**

**Okamžité riešenie — email backup** (DB je 12 KB, mailový server funguje):
```bash
# Pridaj za lokálny backup v /root/backup-db.sh:
BACKUP_FILE="/root/backups/db/msbeton_$(date +%Y%m%d).sql.gz"
echo "Záloha DB $(date +%Y-%m-%d)" | \
  mail -s "[MS-BETON] DB záloha $(date +%Y-%m-%d)" \
    -A "$BACKUP_FILE" \
    peter@msbeton.sk
```

**Dlhodobé riešenie — Hetzner Object Storage** (~2 €/mes) s `rclone`:
```bash
# Inštalácia + konfigurácia
apt install rclone
rclone config  # → S3, endpoint: fsn1.your-objectstorage.com

# Pridaj do backup.sh:
rclone copy "$BACKUP_FILE" hetzner:msbeton-backups/db/
```

### 2. Stránkovanie UI — implementované

`ORDERS_PAGE_SIZE = 30` v `ObjednavkyTab.tsx`. Filtrovanie je client-side (celé pole v pamäti), zobrazovanie po 30. Výhodné do ~2 000 objednávok.

### 3. Archivácia (čakáme na rozhodnutie majiteľa)

Navrhovaná politika: **objednávky staršie ako X rokov** → príznak `archived: true` → skryté z hlavného zoznamu.

**TODO: Majiteľ Peter rozhodne o hodnote X** (pravdepodobne 2–3 roky). Zákonná povinnosť uchovávať faktúry: **5 rokov** (zákon 431/2002 Z.z., §35). Archivované ≠ vymazané.

Implementácia (keď bude rozhodnutie):
1. Pole `archived?: boolean` na `Order` type (bez migrácie DB, iba nový kľúč v JSONB)
2. Filter "Archív" v `ObjednavkyTab` (toggle aktívne / archív / všetko)
3. Voliteľne: cron na serveri pre auto-archiváciu starých objednávok

---

## Fáza 2 — ~1 000–2 000 objednávok (odhad 2027–2028)

### Migrácia: orders tabuľka

Jednorazová práca ~2 dni. Rieši škálovanosť natrvalo.

```sql
CREATE TABLE orders (
  id          TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'nova',
  client_id   TEXT,
  tab         TEXT,                    -- pumpa / mix / vlastnadoprava
  price_mode  TEXT,                    -- faktura / hotovost
  total_bez_dph NUMERIC(10,2),
  total_s_dph   NUMERIC(10,2),
  via_sms     BOOLEAN DEFAULT FALSE,
  archived    BOOLEAN DEFAULT FALSE,
  breakdown   JSONB,                   -- buildBreakdown() JSON (nezmenené)
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_client_id ON orders(client_id);
```

Migrácia existujúcich dát:
```bash
# Spustiť jednorázový skript po vytvorení tabuľky
node scripts/migrate-orders-to-table.mjs
```

### Server-side páging + search

Nový API endpoint:
```
GET /api/admin/orders?page=1&limit=50&status=nova&search=Novák&from=2026-01-01
```

Frontend prestane načítavať celé pole — dostane len 50 objednávok + celkový počet pre pagination controls.

### CSV/Excel export

```
GET /api/admin/orders/export?from=2026-01-01&to=2026-12-31
```
Výstup: CSV s ID, dátum, klient, celková suma, status — pre účtovníka / KROS.

---

## Fáza 3 — 5 000+ objednávok (odhad 2028+)

- **Automatická archivácia cron** — po rozhodnutí o X rokoch (viď Fáza 1)
- **Read-only archív** — archivované objednávky = žiadne editácie, iba čítanie + PDF
- **Klienti** — podobná migrácia ako orders (menej urgentné, klientov bude menej)
- **Fulltext search na PostgreSQL** (tsvector index na meno/firma/telefón)

---

## Zálohovanie — aktuálny stav

| Záloha | Stav | Detail |
|--------|------|--------|
| Lokálna (VPS) | ✅ aktívna | `/root/backup-db.sh`, cron 02:00, 14 kópií, gzip + integrity check |
| Vzdialená | ❌ chýba | **Kritická medzera — viď Fáza 1** |
| Záloha pred rollbackom | ✅ automatická | `rollback-db.sh` uloží snapshot pred obnovou |

### Rollback postup

```bash
# Zoznam dostupných záložných súborov:
/root/rollback-db.sh

# Obnova z konkrétnej zálohy:
/root/rollback-db.sh /root/backups/db/msbeton_20260623_020000.sql.gz

# Po rollbacku reštartovať API:
pm2 restart msbeton-api
```

---

## Súvisiace skripty

| Skript | Účel |
|--------|------|
| `/root/backup-db.sh` | Manuálny/cron backup + integrity check |
| `/root/rollback-db.sh` | Zoznam záložných súborov / obnova |
| `scripts/migrate-fix-fillup-targets.mjs` | Jednorazová oprava doťaženie labelov v starých objednávkach |
| `scripts/migrate-orders-to-table.mjs` | (Budúcnosť, Fáza 2) Migrácia JSONB pole → orders tabuľka |

---

## Otvorené otázky

- **Archivácia X rokov**: Peter rozhodne — 2, 3, alebo iný počet rokov pre auto-archív
- **Klienti**: rovnaká logika ako objednávky, ale až keď bude 200+ klientov
- **Vzdialená záloha**: email (okamžité) alebo Hetzner S3 (dlhodobé) — odporúčame oba
