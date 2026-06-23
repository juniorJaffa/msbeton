#!/usr/bin/env node
/**
 * Jednorázová migrácia: opraví "Doťaženie do X m³" labely v uložených objednávkach.
 *
 * Dve chyby opravované:
 *   1. target < fillupMin (napr. "do 4 m³") → fillupMin (5)    [chýbal addToMainQty]
 *   2. target má desatinné (napr. "do 5.1 m³") → round integer  [1.25→1.3 rounding bug]
 *
 * Spustenie na serveri:
 *   DATABASE_URL='postgresql://...' node scripts/migrate-fix-fillup-targets.mjs
 *
 * Vypíše diff pred zápisom, môžeš použiť --dry-run pre preview bez zmien.
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// pg je v monorepo pnpm store — cestu hľadáme relatívne k skriptu
const pgPath = path.resolve(__dirname, "../node_modules/.pnpm/pg@8.20.0/node_modules/pg");
const pg = require(pgPath);

const DRY_RUN = process.argv.includes("--dry-run");
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Rovnaká logika ako ObjednavkyTab fixRows
function fixFillupLabel(label, fillupMin) {
  const dm = label.match(/Doťaženie do[\s ]*([\d.,]+)/);
  if (!dm) return { label, changed: false };

  const cur = parseFloat(dm[1].replace(",", "."));
  if (!cur || cur <= 0) return { label, changed: false };

  let fixed = cur;
  if (cur < fillupMin) {
    fixed = fillupMin;
  } else if (cur !== Math.round(cur)) {
    fixed = Math.round(cur);
  }

  if (fixed === cur) return { label, changed: false };

  const newLabel = label.replace(dm[0], dm[0].replace(dm[1], String(fixed)));
  return { label: newLabel, changed: true };
}

// Opraví aj dlhé desatinné čísla v texte (napr. "0.9000000000000004 m³")
function fixLongDecimals(s) {
  return s.replace(/\d+\.\d{4,}/g, (m) => String(Math.round(parseFloat(m) * 100) / 100));
}

function fixOrder(order, fillupMin) {
  if (!order.breakdown) return { order, changes: 0 };

  let changes = 0;
  // pg jsonb vracia JS objekt priamo (nie string)
  const bd = JSON.parse(JSON.stringify(order.breakdown)); // deep clone

  const sections = bd.s ?? [];
  for (const sec of sections) {
    const rows = sec.rows ?? sec.r ?? [];
    for (const row of rows) {
      if (row.l) {
        const cleaned = fixLongDecimals(row.l);
        if (cleaned !== row.l) { row.l = cleaned; changes++; }

        const { label: fixed, changed } = fixFillupLabel(row.l, fillupMin);
        if (changed) { row.l = fixed; changes++; }
      }
      if (row.q) {
        const cleaned = fixLongDecimals(row.q);
        if (cleaned !== row.q) { row.q = cleaned; changes++; }
      }
    }
  }

  // Oprav aj order.fillupTarget na root level (ak existuje)
  if (order.fillupTarget && order.fillupTarget !== Math.round(order.fillupTarget)) {
    order.fillupTarget = Math.round(order.fillupTarget);
    changes++;
  }

  return { order: { ...order, breakdown: bd }, changes };
}

async function main() {
  const client = await pool.connect();
  try {
    // Načítaj transport_settings pre fillupMin
    const tsRes = await client.query(
      "SELECT data FROM admin_config WHERE key = 'transport_settings'"
    );
    const tsData = tsRes.rows[0]?.data ?? {};
    const fillupMin = tsData.minimumLoadM3 ?? 5;
    console.log(`fillupMin = ${fillupMin}`);

    // Načítaj objednávky
    const ordRes = await client.query(
      "SELECT data FROM admin_config WHERE key = 'orders'"
    );
    if (!ordRes.rows.length) {
      console.log("Žiadne objednávky v DB.");
      return;
    }

    const orders = ordRes.rows[0].data;
    if (!Array.isArray(orders)) {
      console.log("orders nie je pole, skip.");
      return;
    }

    console.log(`Celkovo objednávok: ${orders.length}`);

    let totalChanged = 0;
    const fixed = orders.map((order) => {
      const { order: fixedOrder, changes } = fixOrder(order, fillupMin);
      if (changes > 0) {
        totalChanged++;
        const id = order.id ?? order.createdAt ?? "?";
        console.log(`  Opravená objednávka ${id}: ${changes} zmien`);
      }
      return fixedOrder;
    });

    console.log(`\nOpravených objednávok: ${totalChanged} z ${orders.length}`);

    if (totalChanged === 0) {
      console.log("Nič na opravu.");
      return;
    }

    if (DRY_RUN) {
      console.log("\n--dry-run: žiadny zápis.");
      return;
    }

    await client.query(
      "UPDATE admin_config SET data = $1::jsonb, updated_at = NOW() WHERE key = 'orders'",
      [JSON.stringify(fixed)]
    );
    console.log("✓ DB aktualizovaná.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Chyba:", err);
  process.exit(1);
});
