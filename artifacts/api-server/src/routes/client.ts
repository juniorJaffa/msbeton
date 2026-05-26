import { Router } from "express";
import { db, adminConfig } from "@workspace/db";
import { sendOrderNotification, sendPasswordResetEmail } from "../lib/mailer";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { loginRateLimit } from "../lib/rateLimits";

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

// In-memory rate limiter (resets on server restart — good enough)
const rateMap = new Map<string, { count: number; firstAt: number }>();
const RATE_WINDOW = 60 * 60 * 1000; // 1h
const RATE_MAX = 3;
function checkRate(key: string, max = RATE_MAX, window = RATE_WINDOW): boolean {
  const now = Date.now();
  const e = rateMap.get(key);
  if (!e || now - e.firstAt > window) { rateMap.set(key, { count: 1, firstAt: now }); return true; }
  if (e.count >= max) return false;
  e.count++; return true;
}

interface ResetToken { clientId: string; expires: number; }
type ResetTokens = Record<string, ResetToken>;

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
  sharedLink?: string;
  smsOrderDisabled?: boolean;
  smsShareOnly?: boolean;
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
    email: account.email,
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
    sharedLink: account.sharedLink || undefined,
    smsOrderDisabled: account.smsOrderDisabled ?? false,
    smsShareOnly: account.smsShareOnly ?? false,
  };
}

router.post("/login", loginRateLimit, async (req, res) => {
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
    // Ulož lastLoginAt
    const clientRows2 = await db.select().from(adminConfig).where(eq(adminConfig.key, "clients"));
    if (clientRows2.length > 0) {
      const clients = clientRows2[0].data as UnifiedClient[];
      const updated = clients.map((c) => c.id === account!.id ? { ...c, lastLoginAt: new Date().toISOString() } : c);
      await db.insert(adminConfig).values({ key: "clients", data: updated })
        .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
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

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true; // skip if not configured
  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const data = await resp.json() as { success: boolean };
  return data.success === true;
}

router.post("/order", async (req, res) => {
  try {
    const order = req.body;
    if (!order || !order.id) {
      return res.status(400).json({ ok: false, error: "Chýbajú dáta objednávky" });
    }
    // Honeypot: hidden field — humans leave it empty, bots fill it
    if (order._hp) return res.status(400).json({ ok: false, error: "Chýbajú dáta objednávky" });

    const turnstileToken = order.turnstileToken as string | undefined;
    const ip = (req.headers["cf-connecting-ip"] as string) ?? req.ip ?? "unknown";
    // Prihlásený klient (clientId overený voči DB) nepotrebuje Turnstile ani rate limit
    let isVerifiedClient = false;
    if (order.clientId) {
      const accounts = await getClientAccounts();
      isVerifiedClient = accounts.some((a) => a.id === String(order.clientId) && a.active !== false);
    }
    // Rate limit: anonymní = 5 objednávok/hodinu per IP
    if (!isVerifiedClient && !checkRate(`order:${ip}`, 5, 60 * 60 * 1000)) {
      return res.status(429).json({ ok: false, error: "Príliš veľa objednávok. Skúste neskôr." });
    }
    if (process.env.TURNSTILE_SECRET && !turnstileToken && !isVerifiedClient) {
      return res.status(400).json({ ok: false, error: "Chýba overenie CAPTCHA" });
    }
    if (turnstileToken && !isVerifiedClient) {
      const ok = await verifyTurnstile(turnstileToken, ip);
      if (!ok) return res.status(400).json({ ok: false, error: "CAPTCHA overenie zlyhalo" });
    }
    // Append to orders list in DB
    const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, "orders"));
    const existing: unknown[] = rows.length > 0 && Array.isArray(rows[0].data) ? rows[0].data as unknown[] : [];
    const updated = [...existing, { ...order, createdAt: new Date().toISOString() }];
    await db
      .insert(adminConfig)
      .values({ key: "orders", data: updated })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
    // Fire-and-forget — neblokuje odpoveď
    sendOrderNotification(order as Record<string, unknown>).catch(() => {});
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// Update client loginId / email (requires current password verification)
router.put("/profile", async (req, res) => {
  try {
    const { id, currentPassword, newLoginId, newEmail, newPassword } = req.body ?? {};
    if (!id || !currentPassword) return res.status(400).json({ ok: false, error: "Chýba ID alebo aktuálne heslo" });
    if (!checkRate(`profile:${id}`)) return res.status(429).json({ ok: false, error: "Príliš veľa pokusov. Skúste znova o hodinu." });

    const accounts = await getClientAccounts();
    const account = accounts.find((a) => a.id === String(id) && a.active !== false);
    if (!account) return res.status(404).json({ ok: false, error: "Klient nenájdený" });
    if (!await verifyPassword(String(currentPassword), account.password ?? "")) {
      return res.status(401).json({ ok: false, error: "Nesprávne aktuálne heslo" });
    }
    if (newLoginId) {
      if (String(newLoginId).toLowerCase() === "msbeton") return res.status(400).json({ ok: false, error: "Toto ID nie je povolené" });
      if (accounts.find((a) => a.id !== account.id && a.loginId === String(newLoginId))) {
        return res.status(409).json({ ok: false, error: "Prihlasovacie ID je už obsadené" });
      }
    }
    if (newPassword && String(newPassword).length < 6) {
      return res.status(400).json({ ok: false, error: "Nové heslo musí mať aspoň 6 znakov" });
    }

    const clientRows = await db.select().from(adminConfig).where(eq(adminConfig.key, "clients"));
    if (!clientRows.length || !Array.isArray(clientRows[0].data)) return res.status(500).json({ ok: false, error: "Chyba databázy" });
    const clients = clientRows[0].data as UnifiedClient[];
    const hashedNew = newPassword ? await bcrypt.hash(String(newPassword), 10) : undefined;
    const updated = clients.map((c) => c.id === account.id ? {
      ...c,
      ...(newLoginId ? { loginId: String(newLoginId) } : {}),
      ...(newEmail !== undefined ? { email: String(newEmail) } : {}),
      ...(hashedNew ? { password: hashedNew } : {}),
    } : c);
    await db.insert(adminConfig).values({ key: "clients", data: updated })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
    invalidateClientCache();
    return res.json({ ok: true, client: buildClientResponse(updated.find((c) => c.id === account.id)!) });
  } catch (err) {
    req.log.error({ err }, "Client profile update failed");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// Send password reset link to registered email
router.post("/password-reset-request", async (req, res) => {
  try {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ ok: false, error: "Chýba ID" });
    if (!checkRate(`reset-req:${id}`)) return res.status(429).json({ ok: false, error: "Príliš veľa pokusov. Skúste znova o hodinu." });

    const accounts = await getClientAccounts();
    const account = accounts.find((a) => a.id === String(id) && a.active !== false);
    if (account?.email) {
      const token = randomBytes(32).toString("hex");
      const expires = Date.now() + 60 * 60 * 1000;
      const tokenRows = await db.select().from(adminConfig).where(eq(adminConfig.key, "password_reset_tokens"));
      const tokens: ResetTokens = (tokenRows.length > 0 && tokenRows[0].data && typeof tokenRows[0].data === "object" && !Array.isArray(tokenRows[0].data))
        ? tokenRows[0].data as ResetTokens : {};
      // Purge expired
      for (const [k, v] of Object.entries(tokens)) { if (v.expires < Date.now()) delete tokens[k]; }
      tokens[token] = { clientId: account.id, expires };
      await db.insert(adminConfig).values({ key: "password_reset_tokens", data: tokens })
        .onConflictDoUpdate({ target: adminConfig.key, set: { data: tokens, updatedAt: new Date() } });
      const name = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.name || "Klient";
      const resetUrl = `${process.env["APP_URL"] ?? "https://demo.msbeton.sk"}/klient-reset?token=${token}`;
      sendPasswordResetEmail({ toEmail: account.email, clientName: name, resetUrl }).catch(() => {});
    }
    // Always return ok — prevents email enumeration
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Password reset request failed");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// Confirm password reset via token
router.post("/password-reset-confirm", async (req, res) => {
  try {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword) return res.status(400).json({ ok: false, error: "Chýba token alebo heslo" });
    if (String(newPassword).length < 6) return res.status(400).json({ ok: false, error: "Heslo musí mať aspoň 6 znakov" });
    if (!checkRate(`reset-confirm:${String(token).slice(0, 16)}`)) return res.status(429).json({ ok: false, error: "Príliš veľa pokusov." });

    const tokenRows = await db.select().from(adminConfig).where(eq(adminConfig.key, "password_reset_tokens"));
    const tokens: ResetTokens = (tokenRows.length > 0 && tokenRows[0].data && typeof tokenRows[0].data === "object" && !Array.isArray(tokenRows[0].data))
      ? tokenRows[0].data as ResetTokens : {};
    const entry = tokens[String(token)];
    if (!entry || entry.expires < Date.now()) return res.status(400).json({ ok: false, error: "Neplatný alebo expirovaný odkaz na reset" });

    // Single-use: delete immediately
    delete tokens[String(token)];
    await db.insert(adminConfig).values({ key: "password_reset_tokens", data: tokens })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: tokens, updatedAt: new Date() } });

    const clientRows = await db.select().from(adminConfig).where(eq(adminConfig.key, "clients"));
    if (!clientRows.length || !Array.isArray(clientRows[0].data)) return res.status(500).json({ ok: false, error: "Chyba databázy" });
    const clients = clientRows[0].data as UnifiedClient[];
    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    const updated = clients.map((c) => c.id === entry.clientId ? { ...c, password: hashedPassword } : c);
    await db.insert(adminConfig).values({ key: "clients", data: updated })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
    invalidateClientCache();
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Password reset confirm failed");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
