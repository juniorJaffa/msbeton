/**
 * autoCleanup — denné čistenie test/fake klientov bez objednávok
 *
 * Kritériá pre auto-delete:
 *  1. createdAt > 24h
 *  2. Žiadna objednávka (clientId === loginId alebo id)
 *  3. Vyzerá ako test účet (keyword ALEBO consonant cluster)
 *  4. NOT isOwner
 */

import { db, adminConfig } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 deň
const MIN_AGE_MS = 24 * 60 * 60 * 1000;          // min. 24h starý

// Keywords (lowercase, bez diakritiky)
const TEST_KEYWORDS = [
  "test", "skuska", "skuška", "trial", "fake", "dummy",
  "sample", "demo", "example", "pokus", "zkuska",
];

/** Normalizuj string: lowercase, strip diacritics */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** True ak meno obsahuje test keyword */
function hasTestKeyword(name: string): boolean {
  const n = norm(name);
  return TEST_KEYWORDS.some(k => n.includes(k));
}

/** True ak letters v mene nemajú takmer žiadne samohlásky (consonant cluster = random) */
function isConsonantCluster(name: string): boolean {
  const letters = norm(name).replace(/[^a-z]/g, "");
  if (letters.length < 4) return false;
  const vowels = letters.replace(/[^aeiou]/g, "").length;
  return vowels / letters.length < 0.15; // menej ako 15% samohlások
}

/** True ak klient vyzerá ako test/fake */
function isTestClient(c: Record<string, unknown>): boolean {
  const parts = [
    String(c.firstName ?? ""),
    String(c.lastName ?? ""),
    String(c.company ?? ""),
    String(c.loginId ?? ""),
  ].filter(Boolean);
  const fullName = parts.join(" ");
  return hasTestKeyword(fullName) || parts.some(p => isConsonantCluster(p));
}

async function getConfig(key: string): Promise<unknown | null> {
  const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, key));
  return rows.length > 0 ? rows[0].data : null;
}

async function setConfig(key: string, data: unknown): Promise<void> {
  await db
    .insert(adminConfig)
    .values({ key, data })
    .onConflictDoUpdate({
      target: adminConfig.key,
      set: { data, updatedAt: new Date() },
    });
}

export async function runAutoCleanup(): Promise<void> {
  try {
    const rawClients = await getConfig("clients");
    const rawOrders = await getConfig("orders");
    const clients = Array.isArray(rawClients) ? rawClients as Array<Record<string, unknown>> : [];
    const orders = Array.isArray(rawOrders) ? rawOrders as Array<Record<string, unknown>> : [];

    const now = Date.now();
    const toDelete: Array<Record<string, unknown>> = [];

    for (const c of clients) {
      if (c.isOwner) continue;
      // Vek > 24h
      const createdAt = c.createdAt ? new Date(String(c.createdAt)).getTime() : 0;
      if (now - createdAt < MIN_AGE_MS) continue;
      // Žiadna objednávka
      const hasOrder = orders.some(o =>
        o.clientId != null &&
        (o.clientId === c.loginId || o.clientId === c.id)
      );
      if (hasOrder) continue;
      // Test-like
      if (!isTestClient(c)) continue;
      toDelete.push(c);
    }

    if (toDelete.length === 0) {
      logger.info({ count: 0 }, "autoCleanup: žiadne test účty na vymazanie");
      return;
    }

    const deleteIds = new Set(toDelete.map(c => String(c.id)));
    const updated = clients.filter(c => !deleteIds.has(String(c.id)));
    await setConfig("clients", updated);

    const names = toDelete.map(c =>
      [c.firstName, c.lastName].filter(Boolean).join(" ") || String(c.company ?? c.loginId ?? c.id)
    );
    logger.info({ count: toDelete.length, names }, "autoCleanup: vymazané test účty");
  } catch (err) {
    logger.error({ err }, "autoCleanup: chyba pri čistení");
  }
}

/** Spustí cleanup raz hneď + potom každých 24h */
export function startAutoCleanupSchedule(): void {
  // Prvý beh po 60s (server startup buffer)
  setTimeout(() => {
    void runAutoCleanup();
    setInterval(() => { void runAutoCleanup(); }, CLEANUP_INTERVAL_MS);
  }, 60_000);
  logger.info("autoCleanup: schedule aktívny (každých 24h, prvý beh o 60s)");
}
