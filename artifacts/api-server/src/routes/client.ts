import { Router } from "express";
import { db, adminConfig } from "@workspace/db";
import { sendOrderNotification, sendPasswordResetEmail, sendOrderConfirmation } from "../lib/mailer";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { loginRateLimit } from "../lib/rateLimits";
import { signAdminToken } from "../lib/adminJwt";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

function toB64url(buf: Uint8Array): string { return Buffer.from(buf).toString("base64url"); }
function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(s, "base64url");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) as Uint8Array<ArrayBuffer>;
}
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/types";

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

// In-memory rate limiter (resetuje sa pri reštarte servera — dostatočné)
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

// ── WebAuthn konfigurácia ─────────────────────────────────────────────────────
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const rpId = (() => { try { return new URL(APP_URL).hostname; } catch { return "localhost"; } })();
const expectedOrigins = rpId === "localhost"
  ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"]
  : [APP_URL];

interface ChallengeEntry { challenge: string; expires: number; }
const regChallenges = new Map<string, ChallengeEntry>();
const authChallenges = new Map<string, ChallengeEntry>();
const CHALLENGE_TTL = 120_000;

function popChallenge(store: Map<string, ChallengeEntry>, key: string): string | null {
  const e = store.get(key);
  store.delete(key);
  if (!e || Date.now() > e.expires) return null;
  return e.challenge;
}

interface BiometricAuthEntry {
  ts: string;
  ok: boolean;
  ip: string;
  credId?: string;
  event?: "register" | "auth";  // typ udalosti
  device?: string;              // čitateľný label: "iPhone · Safari"
  ua?: string;                  // plný user-agent (pre forenznú analýzu)
  origin?: string;              // origin requestu (odhalí RPID/origin mismatch)
  reason?: string;              // príčina zlyhania (error kód/text) — prázdne pri úspechu
}

// Parsuje user-agent na čitateľný "Zariadenie · Prehliadač" label
function parseDevice(ua: string): string {
  if (!ua) return "Neznáme zariadenie";
  let device = "Počítač";
  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua)) device = "iPad";
  else if (/Android/.test(ua)) device = /Mobile/.test(ua) ? "Android telefón" : "Android tablet";
  else if (/Macintosh|Mac OS X/.test(ua)) device = "Mac";
  else if (/Windows/.test(ua)) device = "Windows";
  else if (/Linux/.test(ua)) device = "Linux";
  let browser = "Prehliadač";
  if (/CriOS|Chrome/.test(ua) && !/Edg|OPR/.test(ua)) browser = "Chrome";
  else if (/Edg/.test(ua)) browser = "Edge";
  else if (/FxiOS|Firefox/.test(ua)) browser = "Firefox";
  else if (/Safari/.test(ua) && !/Chrome|CriOS/.test(ua)) browser = "Safari";
  else if (/OPR|Opera/.test(ua)) browser = "Opera";
  return `${device} · ${browser}`;
}

// Zostaví kontext requestu pre bio log (IP, zariadenie, origin)
function bioReqCtx(req: { headers: Record<string, unknown>; ip?: string }): { ip: string; ua: string; device: string; origin: string } {
  const ua = (req.headers["user-agent"] as string) ?? "";
  return {
    ip: (req.headers["cf-connecting-ip"] as string) ?? req.ip ?? "unknown",
    ua,
    device: parseDevice(ua),
    origin: (req.headers["origin"] as string) ?? "?",
  };
}

interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  createdAt: string;
}

const router = Router();

// In-memory cache — DB sa nezaťažuje pri každom načítaní stránky (TTL: 30s)
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
  canPridatBetonOwn?: boolean;
  allowExtraOverload?: boolean;
  deliveryZoneId?: string;
  canZimneOpatrenia?: boolean;
  hotovostDph?: number;
  manualPrices?: Record<string, number>;
  active?: boolean;
  webauthnCredentials?: WebAuthnCredential[];
  biometricAuthLog?: BiometricAuthEntry[];
  // legacy záložné polia
  name?: string;
  discountPct?: number;
  sharedLink?: string;
  smsOrderDisabled?: boolean;
  smsShareOnly?: boolean;
  adminReader?: boolean;
  adminRole?: string; // "manager" (Správca) | "reader" (Čítateľ) — vyššie ako adminReader bool
  noOrderConfirm?: boolean; // neposielať potvrdzovací email (šablónové/zľavové účty)
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

  // 2. Skús legacy client_accounts
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
    canPridatBetonOwn: account.canPridatBetonOwn ?? true,
    allowExtraOverload: account.allowExtraOverload ?? false,
    deliveryZoneId: account.deliveryZoneId,
    canZimneOpatrenia: account.canZimneOpatrenia ?? false,
    hotovostDph: account.hotovostDph,
    manualPrices: account.manualPrices,
    sharedLink: account.sharedLink || undefined,
    smsOrderDisabled: account.smsOrderDisabled ?? false,
    smsShareOnly: account.smsShareOnly ?? false,
    adminReader: account.adminReader ?? false,
    adminRole: account.adminRole ?? (account.adminReader ? "reader" : undefined),
  };
}

// Odvodená admin rola klienta: manager > reader > žiadna. Backward-compat s adminReader bool.
function clientAdminRole(account: UnifiedClient): "manager" | "reader" | undefined {
  if (account.adminRole === "manager") return "manager";
  if (account.adminRole === "reader" || account.adminReader) return "reader";
  return undefined;
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
    // Klient povýšený superadminom dostane admin token podľa roly: manager (Správca) / reader (Čítateľ)
    const role = clientAdminRole(account);
    const adminToken = role ? signAdminToken(role) : undefined;
    return res.json({ ok: true, client: buildClientResponse(account), ...(adminToken ? { adminToken } : {}) });
  } catch (err) {
    req.log.error({ err }, "Client login failed");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// Obnovenie session — volané pri štarte aplikácie pre čerstvé dáta bez re-loginu
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
  if (!secret) return true; // preskočiť ak nie je nakonfigurované
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
    // Honeypot: skryté pole — ľudia ho nechajú prázdne, boti ho vyplnia
    if (order._hp) return res.status(400).json({ ok: false, error: "Chýbajú dáta objednávky" });

    const turnstileToken = order.turnstileToken as string | undefined;
    const ip = (req.headers["cf-connecting-ip"] as string) ?? req.ip ?? "unknown";
    // Prihlásený klient (clientId overený voči DB) nepotrebuje Turnstile ani rate limit
    let isVerifiedClient = false;
    if (order.clientId) {
      const accounts = await getClientAccounts();
      isVerifiedClient = accounts.some((a) => (a.loginId === String(order.clientId) || a.id === String(order.clientId)) && a.active !== false);
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
    const nowIso = new Date().toISOString();
    // updatedAt = nová objednávka je "stamped" → prežije súbežný admin save (merge ju nezahodí)
    const updated = [...existing, { ...order, createdAt: nowIso, updatedAt: nowIso }];
    await db
      .insert(adminConfig)
      .values({ key: "orders", data: updated })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
    // Fire-and-forget — neblokuje odpoveď
    sendOrderNotification(order as Record<string, unknown>).catch(() => {});
    // Potvrdzovací email KLIENTOVI (ak má email + zapnuté v nastaveniach, default zap)
    (async () => {
      try {
        const sRow = await db.select().from(adminConfig).where(eq(adminConfig.key, "transport_settings"));
        const settings = (sRow.length > 0 ? sRow[0].data : {}) as Record<string, unknown>;
        if (settings.orderConfirmEmail === false) return; // globálne vypnuté
        let toEmail = order.email ? String(order.email) : "";
        if (order.clientId) {
          const accts = await getClientAccounts();
          const acc = accts.find((a) => a.loginId === String(order.clientId) || a.id === String(order.clientId));
          if (!toEmail && acc?.email) toEmail = acc.email;
          if (acc?.noOrderConfirm) return; // per-klient opt-out (napr. šablónové zľavové účty)
        }
        if (!toEmail) return;
        // Vlastná doména = šablónové/interné účty (info@msbeton.sk…) → neposielať potvrdenku sebe
        if (toEmail.toLowerCase().endsWith("@msbeton.sk")) return;
        await sendOrderConfirmation(toEmail, order as Record<string, unknown>);
      } catch { /* ignore */ }
    })();
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// Objednávky klienta — filtrované podľa jeho loginId (overenie cez id z session)
router.get("/orders", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false });
    const accounts = await getClientAccounts();
    const account = accounts.find((a) => a.id === String(id) && a.active !== false);
    if (!account) return res.status(404).json({ ok: false });
    const ordersRaw = await db.select().from(adminConfig).where(eq(adminConfig.key, "orders"));
    const all = Array.isArray(ordersRaw[0]?.data) ? ordersRaw[0].data as Array<{ id: string; createdAt: string; status: string; clientId?: string; concreteType?: string; concreteCategory?: string; quantity?: number; totalQty?: number; totalBezDph?: number; totalSDph?: number; tab?: string; address?: string; priceMode?: string }> : [];
    const mine = all
      .filter((o) => o.clientId != null && (o.clientId === account.loginId || o.clientId === account.id))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 50)
      .map((o) => ({
        id: o.id, createdAt: o.createdAt, status: o.status,
        concreteType: o.concreteType, concreteCategory: o.concreteCategory,
        quantity: o.quantity, totalQty: o.totalQty,
        totalBezDph: o.totalBezDph, totalSDph: o.totalSDph,
        tab: o.tab, address: o.address, priceMode: o.priceMode,
      }));
    return res.json({ ok: true, orders: mine });
  } catch (err) {
    req.log.error({ err }, "Client orders failed");
    return res.status(500).json({ ok: false });
  }
});

// Aktualizácia loginId / emailu klienta (vyžaduje overenie aktuálneho hesla)
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
      const resetUrl = `${process.env["APP_URL"] ?? "https://msbeton.sk"}/klient-reset?token=${token}`;
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

    // Jednorázové použitie: ihneď zmazať
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

// ── WebAuthn pomocné funkcie ──────────────────────────────────────────────────
async function saveWebAuthnCredential(clientId: string, cred: WebAuthnCredential): Promise<void> {
  const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, "clients"));
  if (!rows.length || !Array.isArray(rows[0].data)) return;
  const clients = rows[0].data as UnifiedClient[];
  const updated = clients.map((c) => {
    if (c.id !== clientId) return c;
    const existing = (c.webauthnCredentials ?? []).filter((e) => e.id !== cred.id);
    // až 8 zariadení per klient (iPhone, iPad, Mac, Chrome, Safari… multi-device)
    return { ...c, webauthnCredentials: [...existing, cred].slice(-8) };
  });
  await db.insert(adminConfig).values({ key: "clients", data: updated })
    .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
  invalidateClientCache();
}

// ── WebAuthn endpointy ────────────────────────────────────────────────────────

// 1. Generuj registračnú výzvu (klient musí byť prihlásený heslom)
router.post("/webauthn/reg-challenge", async (req, res) => {
  try {
    const { clientInternalId } = req.body ?? {};
    if (!clientInternalId) return res.status(400).json({ ok: false });
    const accounts = await getClientAccounts();
    const client = accounts.find((a) => a.id === String(clientInternalId) && a.active !== false);
    if (!client) return res.status(404).json({ ok: false, error: "Klient nenájdený" });
    const loginId = client.loginId ?? client.id;
    const displayName = [client.firstName, client.lastName].filter(Boolean).join(" ") || client.name || loginId;
    const options = await generateRegistrationOptions({
      rpName: "MS-BETON Klient",
      rpID: rpId,
      userName: loginId,
      userDisplayName: displayName,
      excludeCredentials: (client.webauthnCredentials ?? []).map((c) => ({ id: c.id, type: "public-key" as const })),
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60000,
    });
    regChallenges.set(String(clientInternalId), { challenge: options.challenge, expires: Date.now() + CHALLENGE_TTL });
    return res.json({ ok: true, options });
  } catch (err) {
    req.log.error({ err }, "WebAuthn reg-challenge failed");
    return res.status(500).json({ ok: false });
  }
});

// 2. Dokončenie registrácie — overenie + uloženie verejného kľúča
router.post("/webauthn/reg-complete", async (req, res) => {
  const ctx = bioReqCtx(req);
  const cid = String(req.body?.clientInternalId ?? "");
  try {
    const { clientInternalId, credential } = req.body ?? {};
    if (!clientInternalId || !credential) return res.status(400).json({ ok: false });
    const expectedChallenge = popChallenge(regChallenges, String(clientInternalId));
    if (!expectedChallenge) {
      void appendBioLog(cid, { ts: new Date().toISOString(), ok: false, event: "register", ...ctx, reason: "Výzva vypršala (TTL 120s)" });
      return res.status(400).json({ ok: false, error: "Výzva vypršala. Skúste znova." });
    }
    req.log.info({ rpId, expectedOrigins, ...ctx, credId: (credential as RegistrationResponseJSON)?.id?.slice(0, 12) }, "WebAuthn reg-complete: verifying");
    const verification = await verifyRegistrationResponse({
      response: credential as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpId,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      const reason = `Verifikácia neúspešná (origin ${ctx.origin} vs ${expectedOrigins.join(",")})`;
      req.log.warn({ rpId, expectedOrigins, origin: ctx.origin }, "WebAuthn reg-complete: verification.verified=false");
      void appendBioLog(cid, { ts: new Date().toISOString(), ok: false, event: "register", ...ctx, reason });
      return res.status(400).json({ ok: false, error: `Overenie biometrie zlyhalo (origin ${ctx.origin} vs ${expectedOrigins.join(",")}).` });
    }
    const { credential: vc } = verification.registrationInfo;
    await saveWebAuthnCredential(String(clientInternalId), {
      id: vc.id,
      publicKey: toB64url(vc.publicKey),
      counter: vc.counter,
      createdAt: new Date().toISOString(),
    });
    void appendBioLog(cid, { ts: new Date().toISOString(), ok: true, event: "register", ...ctx, credId: vc.id.slice(0, 8) });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "WebAuthn reg-complete failed");
    const detail = err instanceof Error ? err.message : String(err);
    void appendBioLog(cid, { ts: new Date().toISOString(), ok: false, event: "register", ...ctx, reason: detail });
    return res.status(500).json({ ok: false, error: `Registrácia zlyhala: ${detail}` });
  }
});

// 3. Generuj autentifikačnú výzvu
router.post("/webauthn/auth-challenge", async (req, res) => {
  try {
    const { loginId } = req.body ?? {};
    if (!loginId) return res.status(400).json({ ok: false });
    const ip = (req.headers["cf-connecting-ip"] as string) ?? req.ip ?? "unknown";
    if (!checkRate(`webauthn-auth:${ip}`, 20, 60_000)) return res.status(429).json({ ok: false, error: "Príliš veľa pokusov" });
    const accounts = await getClientAccounts();
    const client = accounts.find((a) => a.loginId === String(loginId) && a.active !== false);
    const allowCreds = (client?.webauthnCredentials ?? []).map((c) => ({ id: c.id, type: "public-key" as const }));
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials: allowCreds,
      userVerification: "required",
      timeout: 60000,
    });
    if (client && allowCreds.length > 0) {
      authChallenges.set(String(loginId), { challenge: options.challenge, expires: Date.now() + CHALLENGE_TTL });
    }
    return res.json({ ok: true, options });
  } catch (err) {
    req.log.error({ err }, "WebAuthn auth-challenge failed");
    return res.status(500).json({ ok: false });
  }
});

// Pomocník — pridaj záznam do biometricAuthLog (fire-and-forget pre chybové cesty)
async function appendBioLog(clientId: string, entry: BiometricAuthEntry): Promise<void> {
  try {
    const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, "clients"));
    if (!rows.length || !Array.isArray(rows[0].data)) return;
    const clients = rows[0].data as UnifiedClient[];
    const updated = clients.map((c) =>
      c.id === clientId
        ? { ...c, biometricAuthLog: [...(c.biometricAuthLog ?? []), entry].slice(-20) }
        : c
    );
    await db.insert(adminConfig).values({ key: "clients", data: updated })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
    invalidateClientCache();
  } catch { /* non-critical */ }
}

// 4. Dokončenie autentifikácie — overenie assertion + vrátenie session
router.post("/webauthn/auth-complete", async (req, res) => {
  const ctx = bioReqCtx(req);
  try {
    const { loginId, credential } = req.body ?? {};
    if (!loginId || !credential) return res.status(400).json({ ok: false });
    const expectedChallenge = popChallenge(authChallenges, String(loginId));
    if (!expectedChallenge) return res.status(400).json({ ok: false, error: "Výzva vypršala. Skúste znova." });
    const accounts = await getClientAccounts();
    const client = accounts.find((a) => a.loginId === String(loginId) && a.active !== false);
    if (!client || !client.webauthnCredentials?.length) return res.status(401).json({ ok: false, error: "Biometria nenájdená" });
    const authResp = credential as AuthenticationResponseJSON;
    const stored = client.webauthnCredentials.find((c) => c.id === authResp.id);
    if (!stored) {
      void appendBioLog(client.id, { ts: new Date().toISOString(), ok: false, event: "auth", ...ctx, credId: authResp.id?.slice(0, 8), reason: "Neznáme zariadenie (credential nie je v DB)" });
      return res.status(401).json({ ok: false, error: "Neznáme zariadenie" });
    }
    const verification = await verifyAuthenticationResponse({
      response: authResp,
      expectedChallenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpId,
      credential: {
        id: stored.id,
        publicKey: fromB64url(stored.publicKey),
        counter: stored.counter,
      },
      requireUserVerification: true,
    });
    if (!verification.verified) {
      void appendBioLog(client.id, { ts: new Date().toISOString(), ok: false, event: "auth", ...ctx, credId: stored.id.slice(0, 8), reason: "Verifikácia podpisu zlyhala (counter/origin)" });
      return res.status(401).json({ ok: false, error: "Overenie biometrie zlyhalo" });
    }
    // Aktualizácia counter (anti-replay) + záznam úspechu
    const newCounter = verification.authenticationInfo.newCounter;
    const logEntry: BiometricAuthEntry = { ts: new Date().toISOString(), ok: true, event: "auth", ...ctx, credId: stored.id.slice(0, 8) };
    const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, "clients"));
    if (rows.length && Array.isArray(rows[0].data)) {
      const clients = rows[0].data as UnifiedClient[];
      const updated = clients.map((c) => c.id === client.id
        ? {
            ...c,
            lastLoginAt: new Date().toISOString(),
            webauthnCredentials: (c.webauthnCredentials ?? []).map((cr) => cr.id === stored.id ? { ...cr, counter: newCounter } : cr),
            biometricAuthLog: [...(c.biometricAuthLog ?? []), logEntry].slice(-20),
          }
        : c);
      await db.insert(adminConfig).values({ key: "clients", data: updated })
        .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
      invalidateClientCache();
    }
    // Povýšený klient (Správca/Čítateľ) → aj cez biometriu dostane admin token
    const role = clientAdminRole(client);
    const adminToken = role ? signAdminToken(role) : undefined;
    return res.json({ ok: true, client: buildClientResponse(client), ...(adminToken ? { adminToken } : {}) });
  } catch (err) {
    req.log.error({ err }, "WebAuthn auth-complete failed");
    return res.status(500).json({ ok: false, error: "Interná chyba" });
  }
});

// Zmazanie WebAuthn credential (zabudnúť toto zariadenie)
router.delete("/webauthn/credential/:credId", async (req, res) => {
  try {
    const { clientInternalId } = req.body ?? {};
    const credId = req.params.credId;
    if (!clientInternalId || !credId) return res.status(400).json({ ok: false });
    const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, "clients"));
    if (!rows.length || !Array.isArray(rows[0].data)) return res.status(500).json({ ok: false });
    const clients = rows[0].data as UnifiedClient[];
    const updated = clients.map((c) => c.id === String(clientInternalId)
      ? { ...c, webauthnCredentials: (c.webauthnCredentials ?? []).filter((cr) => cr.id !== credId) }
      : c);
    await db.insert(adminConfig).values({ key: "clients", data: updated })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: updated, updatedAt: new Date() } });
    invalidateClientCache();
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "WebAuthn credential delete failed");
    return res.status(500).json({ ok: false });
  }
});

export default router;
