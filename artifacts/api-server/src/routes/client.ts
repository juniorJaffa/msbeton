import { Router } from "express";
import { db, adminConfig } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";

const ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function encode64wp(buf: Buffer, count: number): string {
  let out = "", i = 0;
  do {
    let v = buf[i++];
    out += ITOA64[v & 0x3f];
    if (i < count) v |= buf[i] << 8;
    out += ITOA64[(v >> 6) & 0x3f];
    if (i++ >= count) break;
    if (i < count) v |= buf[i] << 16;
    out += ITOA64[(v >> 12) & 0x3f];
    if (i++ >= count) break;
    out += ITOA64[(v >> 18) & 0x3f];
  } while (i < count);
  return out;
}

function verifyWpPhpass(password: string, hash: string): boolean {
  if (!hash.startsWith("$P$") && !hash.startsWith("$H$")) return false;
  const countLog2 = ITOA64.indexOf(hash[3]);
  if (countLog2 < 7 || countLog2 > 30) return false;
  let count = 1 << countLog2;
  const salt = hash.slice(4, 12);
  if (salt.length !== 8) return false;
  let h = createHash("md5").update(salt + password, "binary").digest();
  do { h = createHash("md5").update(Buffer.concat([h, Buffer.from(password, "binary")])).digest(); } while (--count);
  return hash.slice(0, 12) + encode64wp(h, 16) === hash;
}

async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  // WP môže mať prefix $wp$ pred štandardným bcrypt hashom
  const hash = stored.startsWith("$wp$") ? stored.slice(4) : stored;
  if (hash.startsWith("$2y$") || hash.startsWith("$2b$") || hash.startsWith("$2a$")) {
    return bcrypt.compare(plain, hash.replace(/^\$2y\$/, "$2b$"));
  }
  if (hash.startsWith("$P$") || hash.startsWith("$H$")) {
    return verifyWpPhpass(plain, hash);
  }
  return plain === stored;
}

const router = Router();

// In-memory cache so DB isn't hit on every page load (TTL: 30s)
let clientCache: { data: UnifiedClient[]; ts: number } | null = null;
const CACHE_TTL = 30_000;

export function invalidateClientCache() { clientCache = null; }

interface UnifiedClient {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  loginId?: string;
  password?: string;
  discountBeton?: number;
  discountDoprava?: number;
  discountSluzby?: number;
  discountCelkovo?: number;
  canHotovost?: boolean;
  canPridatBeton?: boolean;
  deliveryZoneId?: string;
  canZimneOpatrenia?: boolean;
  hotovostDph?: number;
  manualPrices?: Record<string, number>;
  active?: boolean;
  // legacy fallback fields
  name?: string;
  discountPct?: number;
}

interface LegacyClientAccount {
  id: string;
  clientId: string;
  password: string;
  name: string;
  discountPct: number;
  discountGroup: string;
  active: boolean;
}

const DEFAULT_CLIENT_ACCOUNTS: UnifiedClient[] = [
  {
    id: "ca1", loginId: "20", password: "1234",
    firstName: "Test", lastName: "Klient", company: "Testovacia firma",
    discountBeton: 20, discountDoprava: 0, discountSluzby: 0, discountCelkovo: 0,
    canHotovost: true, canPridatBeton: true, active: true,
  },
];

async function getClientAccounts(): Promise<UnifiedClient[]> {
  if (clientCache && Date.now() - clientCache.ts < CACHE_TTL) return clientCache.data;
  let result: UnifiedClient[];

  // 1. Try unified clients list (new structure)
  const clientRows = await db.select().from(adminConfig).where(eq(adminConfig.key, "clients"));
  if (clientRows.length > 0 && Array.isArray(clientRows[0].data)) {
    const clients = clientRows[0].data as UnifiedClient[];
    const active = clients.filter((c) => c.loginId && c.password && c.active !== false);
    if (active.length > 0) {
      result = active;
      clientCache = { data: result, ts: Date.now() };
      return result;
    }
  }

  // 2. Try legacy client_accounts
  const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, "client_accounts"));
  if (rows.length > 0 && Array.isArray(rows[0].data) && (rows[0].data as LegacyClientAccount[]).length > 0) {
    const legacy = rows[0].data as LegacyClientAccount[];
    result = legacy.map((a) => ({
      id: a.id, loginId: a.clientId, password: a.password,
      name: a.name, discountBeton: a.discountPct ?? 0, active: a.active,
    }));
    clientCache = { data: result, ts: Date.now() };
    return result;
  }

  result = DEFAULT_CLIENT_ACCOUNTS;
  clientCache = { data: result, ts: Date.now() };
  return result;
}

function buildClientResponse(account: UnifiedClient) {
  return {
    id: account.id,
    clientId: account.loginId,
    name: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.name || "Klient",
    company: account.company ?? "",
    discountBeton: account.discountBeton ?? account.discountPct ?? 0,
    discountDoprava: account.discountDoprava ?? 0,
    discountSluzby: account.discountSluzby ?? 0,
    discountCelkovo: account.discountCelkovo ?? 0,
    phone: account.phone ?? "",
    canHotovost: account.canHotovost ?? true,
    canPridatBeton: account.canPridatBeton ?? true,
    deliveryZoneId: account.deliveryZoneId,
    canZimneOpatrenia: account.canZimneOpatrenia ?? false,
    hotovostDph: account.hotovostDph,
    manualPrices: account.manualPrices,
  };
}

router.post("/login", async (req, res) => {
  try {
    const { clientId, password } = req.body ?? {};
    if (!clientId || !password) {
      return res.status(400).json({ ok: false, error: "Chýba ID alebo heslo" });
    }
    const accounts = await getClientAccounts();
    // Viacero účtov môže zdieľať rovnaký loginId (šablónové zľavové účty) — skúš všetky
    const candidates = accounts.filter(
      (a) => a.loginId === String(clientId) && a.active !== false
    );
    let account: UnifiedClient | null = null;
    for (const c of candidates) {
      if (await verifyPassword(String(password), c.password ?? "")) { account = c; break; }
    }
    if (!account) {
      return res.status(401).json({ ok: false, error: "Nesprávne prihlasovacie údaje" });
    }
    return res.json({ ok: true, client: buildClientResponse(account) });
  } catch (err) {
    req.log.error({ err }, "Client login failed");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// Refresh session – called on app load to get fresh client data without re-login
router.get("/me", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false });
    const accounts = await getClientAccounts();
    const account = accounts.find((a) => a.id === String(id) && a.active !== false);
    if (!account) return res.status(404).json({ ok: false, error: "Klient nenájdený" });
    return res.json({ ok: true, client: buildClientResponse(account) });
  } catch (err) {
    req.log.error({ err }, "Client me failed");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

router.post("/order", async (req, res) => {
  try {
    const order = req.body;
    if (!order || !order.id) {
      return res.status(400).json({ ok: false, error: "Chýbajú dáta objednávky" });
    }
    // Append to orders list in DB
    const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, "orders"));
    const existing: unknown[] = rows.length > 0 && Array.isArray(rows[0].data) ? rows[0].data as unknown[] : [];
    const updated = [...existing, { ...order, createdAt: new Date().toISOString() }];
    await db
      .insert(adminConfig)
      .values({ key: "orders", data: updated })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
