import { Router } from "express";
import { db, adminConfig } from "@workspace/db";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { execSync } from "child_process";
import { readdirSync, statSync } from "fs";
import { randomBytes } from "crypto";
import { invalidateClientCache } from "./client";
import { sendRegistrationEmail, sendCredentialsEmail } from "../lib/mailer";
import { signAdminToken, requireAdminJwt } from "../lib/adminJwt";
import { loginRateLimit } from "../lib/rateLimits";

const router = Router();

router.post("/login", loginRateLimit, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const adminUser = (process.env.ADMIN_USER ?? "msbeton").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV !== "production" ? "Msbeton2023" : undefined);

  if (!username || !password) {
    res.status(400).json({ ok: false, error: "Chýbajú prihlasovacie údaje" });
    return;
  }
  if (username.trim().toLowerCase() !== adminUser || !adminPassword || password !== adminPassword) {
    res.status(401).json({ ok: false, error: "Nesprávne prihlasovacie údaje" });
    return;
  }
  res.json({ ok: true, token: signAdminToken() });
});

// Biometric (WebAuthn) token — issued after successful client-side passkey verification.
// Rate-limited same as password login to prevent brute-force token farming.
router.post("/biometric-token", loginRateLimit, (_req, res) => {
  res.json({ ok: true, token: signAdminToken() });
});

const KEYS = {
  categories: "categories",
  delivery: "delivery",
  services: "services",
  clients: "clients",
  transportZones: "transport_zones",
  transportSettings: "transport_settings",
  clientAccounts: "client_accounts",
  orders: "orders",
} as const;

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

// Public read-only endpoints — kalkulačka ich potrebuje bez admin JWT
router.get("/categories", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.categories) }); }
  catch (err) { req.log.error({ err }, "Failed to get categories"); res.status(500).json({ error: "Internal server error" }); }
});
router.get("/delivery", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.delivery) }); }
  catch (err) { req.log.error({ err }, "Failed to get delivery"); res.status(500).json({ error: "Internal server error" }); }
});
router.get("/services", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.services) }); }
  catch (err) { req.log.error({ err }, "Failed to get services"); res.status(500).json({ error: "Internal server error" }); }
});
router.get("/transport-zones", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.transportZones) }); }
  catch (err) { req.log.error({ err }, "Failed to get transport zones"); res.status(500).json({ error: "Internal server error" }); }
});
router.get("/transport-settings", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.transportSettings) }); }
  catch (err) { req.log.error({ err }, "Failed to get transport settings"); res.status(500).json({ error: "Internal server error" }); }
});

router.use(requireAdminJwt);

router.put("/categories", async (req, res) => {
  try { await setConfig(KEYS.categories, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save categories"); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/delivery", async (req, res) => {
  try { await setConfig(KEYS.delivery, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save delivery"); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/services", async (req, res) => {
  try { await setConfig(KEYS.services, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save services"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/clients", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.clients) }); }
  catch (err) { req.log.error({ err }, "Failed to get clients"); res.status(500).json({ error: "Internal server error" }); }
});
router.put("/clients", async (req, res) => {
  try { await setConfig(KEYS.clients, req.body); invalidateClientCache(); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save clients"); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/transport-zones", async (req, res) => {
  try { await setConfig(KEYS.transportZones, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save transport zones"); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/transport-settings", async (req, res) => {
  try { await setConfig(KEYS.transportSettings, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save transport settings"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/client-accounts", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.clientAccounts) }); }
  catch (err) { req.log.error({ err }, "Failed to get client accounts"); res.status(500).json({ error: "Internal server error" }); }
});
router.put("/client-accounts", async (req, res) => {
  try { await setConfig(KEYS.clientAccounts, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save client accounts"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/orders", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.orders) ?? [] }); }
  catch (err) { req.log.error({ err }, "Failed to get orders"); res.status(500).json({ error: "Internal server error" }); }
});
router.put("/orders", async (req, res) => {
  try { await setConfig(KEYS.orders, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save orders"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/send-registration-email", async (req, res) => {
  const { toEmail, clientName, clientId, password } = req.body ?? {};
  if (!toEmail || !clientName || !clientId || !password) {
    res.status(400).json({ ok: false, error: "Missing required fields" });
    return;
  }
  const result = await sendRegistrationEmail({ toEmail, clientName, clientId, password });
  res.json(result);
});

// ── GA4 Analytics ──────────────────────────────────────────────────────────────
import crypto from "crypto";

async function getGa4Token(): Promise<string | null> {
  const keyJson = process.env.GA4_KEY_JSON;
  if (!keyJson) return null;
  let key: { client_email: string; private_key: string };
  try { key = JSON.parse(keyJson); } catch { return null; }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(key.private_key, "base64url");
  const jwt = `${header}.${payload}.${sig}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) return null;
  const data = await resp.json() as { access_token?: string };
  return data.access_token ?? null;
}

async function ga4Report(token: string, body: object): Promise<unknown> {
  const propId = process.env.GA4_PROPERTY_ID ?? "531150585";
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GA4 ${r.status}`);
  return r.json();
}

async function ga4Realtime(token: string, body: object): Promise<unknown> {
  const propId = process.env.GA4_PROPERTY_ID ?? "531150585";
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propId}:runRealtimeReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GA4 Realtime ${r.status}`);
  return r.json();
}

function ga4Rows(data: unknown): Array<{ dims: string[]; vals: string[] }> {
  const d = data as { rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }> };
  return (d.rows ?? []).map(r => ({
    dims: r.dimensionValues.map(v => v.value),
    vals: r.metricValues.map(v => v.value),
  }));
}

// ── Google Search Console ──────────────────────────────────────────────────
async function getGscToken(): Promise<string | null> {
  // Path A: OAuth2 refresh token (user account — keď service account UI nefunguje)
  const refreshToken  = process.env.GSC_REFRESH_TOKEN;
  const oauthClientId = process.env.GSC_CLIENT_ID;
  const oauthSecret   = process.env.GSC_CLIENT_SECRET;
  if (refreshToken && oauthClientId && oauthSecret) {
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id:     oauthClientId,
        client_secret: oauthSecret,
        grant_type:    "refresh_token",
      }).toString(),
    });
    if (resp.ok) {
      const data = await resp.json() as { access_token?: string };
      if (data.access_token) return data.access_token;
    }
  }

  // Path B: Service account JWT (pôvodný prístup)
  const keyJson = process.env.GSC_KEY_JSON;
  if (!keyJson) return null;
  let key: { client_email: string; private_key: string };
  try { key = JSON.parse(keyJson); } catch { return null; }
  const crypto = await import("crypto");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(key.private_key, "base64url");
  const jwt = `${header}.${payload}.${sig}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) return null;
  const data = await resp.json() as { access_token?: string };
  return data.access_token ?? null;
}

async function gscQuery(token: string, body: object): Promise<unknown> {
  const siteUrl = encodeURIComponent(process.env.GSC_SITE_URL ?? "sc-domain:msbeton.sk");
  const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GSC ${r.status}: ${await r.text()}`);
  return r.json();
}

function gscRows(data: unknown): Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> {
  const d = data as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
  return d.rows ?? [];
}

router.get("/analytics/gsc", async (req, res) => {
  try {
    const token = await getGscToken();
    if (!token) { res.status(503).json({ error: "GSC not configured (chýba GSC_REFRESH_TOKEN alebo GSC_KEY_JSON)" }); return; }

    const end = new Date(); end.setDate(end.getDate() - 3); // GSC má 3-dňové oneskorenie
    const start28 = new Date(end); start28.setDate(start28.getDate() - 28);
    const start90 = new Date(end); start90.setDate(start90.getDate() - 90);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const [queries, pages, devices, countries, daily] = await Promise.all([
      gscQuery(token, { startDate: fmt(start28), endDate: fmt(end), dimensions: ["query"], rowLimit: 25, dataState: "final" }),
      gscQuery(token, { startDate: fmt(start28), endDate: fmt(end), dimensions: ["page"], rowLimit: 10, dataState: "final" }),
      gscQuery(token, { startDate: fmt(start28), endDate: fmt(end), dimensions: ["device"], rowLimit: 10, dataState: "final" }),
      gscQuery(token, { startDate: fmt(start28), endDate: fmt(end), dimensions: ["country"], rowLimit: 10, dataState: "final" }),
      gscQuery(token, { startDate: fmt(start90), endDate: fmt(end), dimensions: ["date"], rowLimit: 90, dataState: "final" }),
    ]);

    const qRows = gscRows(queries);
    const pRows = gscRows(pages);
    const dRows = gscRows(devices);
    const cRows = gscRows(countries);
    const dailyRows = gscRows(daily);

    const totClicks = qRows.reduce((s, r) => s + r.clicks, 0);
    const totImpr = qRows.reduce((s, r) => s + r.impressions, 0);

    res.json({
      summary: {
        clicks28: totClicks,
        impressions28: totImpr,
        avgCtr28: totImpr > 0 ? totClicks / totImpr : 0,
        avgPosition28: qRows.length > 0 ? qRows.reduce((s, r) => s + r.position, 0) / qRows.length : 0,
      },
      queries: qRows.map(r => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      pages: pRows.map(r => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      devices: dRows.map(r => ({ device: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr })),
      countries: cRows.map(r => ({ country: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
      daily: dailyRows.map(r => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
    });
  } catch (err) {
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.get("/analytics", async (req, res) => {
  try {
    const token = await getGa4Token();
    if (!token) { res.status(503).json({ error: "GA4_KEY_JSON not configured" }); return; }

    const range30 = { startDate: "30daysAgo", endDate: "today" };
    const range90 = { startDate: "90daysAgo", endDate: "today" };

    const [overview30, overview90, daily, events30, devices, sources, pages, countries, cities] = await Promise.all([
      ga4Report(token, { dateRanges: [range30], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "newUsers" }, { name: "eventCount" }] }),
      ga4Report(token, { dateRanges: [range90], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "newUsers" }] }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }, { name: "activeUsers" }], orderBys: [{ dimension: { dimensionName: "date" } }] }),
      ga4Report(token, { dateRanges: [range90], dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], orderBys: [{ metric: { metricName: "eventCount" }, desc: true }], limit: 25 }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "sessions" }, { name: "activeUsers" }] }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "sessionDefaultChannelGrouping" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 10 }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "country" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 6 }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "city" }, { name: "country" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 20 }),
    ]);

    const o30 = (overview30 as { rows?: Array<{ metricValues: Array<{ value: string }> }> }).rows?.[0]?.metricValues ?? [];
    const o90 = (overview90 as { rows?: Array<{ metricValues: Array<{ value: string }> }> }).rows?.[0]?.metricValues ?? [];

    res.json({
      overview: {
        activeUsers30: parseInt(o30[0]?.value ?? "0"),
        sessions30: parseInt(o30[1]?.value ?? "0"),
        pageViews30: parseInt(o30[2]?.value ?? "0"),
        newUsers30: parseInt(o30[3]?.value ?? "0"),
        events30: parseInt(o30[4]?.value ?? "0"),
        activeUsers90: parseInt(o90[0]?.value ?? "0"),
        sessions90: parseInt(o90[1]?.value ?? "0"),
        pageViews90: parseInt(o90[2]?.value ?? "0"),
        newUsers90: parseInt(o90[3]?.value ?? "0"),
      },
      daily: ga4Rows(daily).map(r => ({ date: r.dims[0], sessions: parseInt(r.vals[0]), users: parseInt(r.vals[1]) })),
      events: ga4Rows(events30).map(r => ({ name: r.dims[0], count: parseInt(r.vals[0]) })),
      devices: ga4Rows(devices).map(r => ({ device: r.dims[0], sessions: parseInt(r.vals[0]), users: parseInt(r.vals[1]) })),
      sources: ga4Rows(sources).map(r => ({ channel: r.dims[0], sessions: parseInt(r.vals[0]) })),
      pages: ga4Rows(pages).map(r => ({ path: r.dims[0], views: parseInt(r.vals[0]) })),
      countries: ga4Rows(countries).map(r => ({ country: r.dims[0], sessions: parseInt(r.vals[0]) })),
      cities: ga4Rows(cities).map(r => ({ city: r.dims[0], country: r.dims[1], sessions: parseInt(r.vals[0]) })),
    });
  } catch (err) {
    req.log.error({ err }, "GA4 analytics error");
    res.status(502).json({ error: "GA4 fetch failed" });
  }
});

// Admin — send login credentials email to client
router.post("/clients/:id/send-credentials", async (req, res) => {
  try {
    const clientId = req.params.id;
    const raw = await getConfig(KEYS.clients);
    const clients = Array.isArray(raw) ? raw as Array<Record<string, unknown>> : [];
    const client = clients.find((c) => String(c.id) === String(clientId));
    if (!client) return res.status(404).json({ ok: false, error: "Klient nenájdený" });
    const email = client.email as string | undefined;
    const loginId = (client.loginId ?? client.clientId) as string | undefined;
    if (!email) return res.status(400).json({ ok: false, error: "Klient nemá email" });
    if (!loginId) return res.status(400).json({ ok: false, error: "Klient nemá nastavené prihlasovacie ID" });

    // Create reset token (same mechanism as client password-reset-request)
    const token = randomBytes(32).toString("hex");
    const expires = Date.now() + 60 * 60 * 1000;
    const tokenRows = await db.select().from(adminConfig).where(eq(adminConfig.key, "password_reset_tokens"));
    const tokens: Record<string, { clientId: string; expires: number }> = (tokenRows.length > 0 && tokenRows[0].data && typeof tokenRows[0].data === "object" && !Array.isArray(tokenRows[0].data))
      ? tokenRows[0].data as Record<string, { clientId: string; expires: number }> : {};
    for (const [k, v] of Object.entries(tokens)) { if (v.expires < Date.now()) delete tokens[k]; }
    tokens[token] = { clientId: String(clientId), expires };
    await db.insert(adminConfig).values({ key: "password_reset_tokens", data: tokens })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: tokens, updatedAt: new Date() } });

    const name = [client.firstName, client.lastName].filter(Boolean).join(" ") || (client.name as string) || "Klient";
    const resetUrl = `${process.env["APP_URL"] ?? "https://msbeton.sk"}/klient-reset?token=${token}`;
    const result = await sendCredentialsEmail({ toEmail: email, clientName: name, loginId, resetUrl });
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error ?? "Chyba odoslania emailu" });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "send-credentials failed");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

router.get("/analytics/realtime", async (req, res) => {
  try {
    const token = await getGa4Token();
    if (!token) { res.status(503).json({ error: "GA4_KEY_JSON not configured" }); return; }

    const [totalData, minuteData, deviceData, pageData, countryData] = await Promise.all([
      ga4Realtime(token, { metrics: [{ name: "activeUsers" }] }),
      ga4Realtime(token, { dimensions: [{ name: "minutesAgo" }], metrics: [{ name: "activeUsers" }] }),
      ga4Realtime(token, { dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "activeUsers" }] }),
      ga4Realtime(token, { dimensions: [{ name: "unifiedScreenName" }], metrics: [{ name: "activeUsers" }], limit: 5 }),
      ga4Realtime(token, { dimensions: [{ name: "country" }], metrics: [{ name: "activeUsers" }], limit: 8 }),
    ]);

    const activeNow = parseInt(
      (totalData as { rows?: Array<{ metricValues: Array<{ value: string }> }> }).rows?.[0]?.metricValues?.[0]?.value ?? "0"
    );
    const minuteMap: Record<number, number> = {};
    ga4Rows(minuteData).forEach(r => { minuteMap[parseInt(r.dims[0])] = parseInt(r.vals[0]); });
    const byMinute = Array.from({ length: 30 }, (_, i) => ({ minutesAgo: i, users: minuteMap[i] ?? 0 }));

    res.setHeader("Cache-Control", "no-store");
    res.json({
      activeNow,
      byMinute,
      byDevice: ga4Rows(deviceData).map(r => ({ device: r.dims[0], users: parseInt(r.vals[0]) })),
      byPage: ga4Rows(pageData).map(r => ({ page: r.dims[0], users: parseInt(r.vals[0]) })),
      byCountry: ga4Rows(countryData).map(r => ({ country: r.dims[0], users: parseInt(r.vals[0]) })),
    });
  } catch (err) {
    req.log.error({ err }, "GA4 realtime error");
    res.status(502).json({ error: "GA4 realtime failed" });
  }
});

router.get("/server-status", async (req, res) => {
  const safe = <T>(fn: () => T, fallback: T): T => {
    try { return fn(); } catch { return fallback; }
  };

  // PM2
  const pm2Raw = safe(() => execSync("pm2 jlist 2>/dev/null", { encoding: "utf-8", timeout: 4000 }), "[]");
  let pm2 = { status: "unknown", uptimeMs: 0, restarts: 0, memoryBytes: 0 };
  try {
    type PM2Proc = { name: string; pm2_env: { status: string; pm_uptime: number; pm_restarts: number }; monit: { memory: number } };
    const procs = JSON.parse(pm2Raw) as PM2Proc[];
    const p = procs.find(x => x.name === "msbeton-api") ?? procs[0];
    if (p) pm2 = { status: p.pm2_env.status, uptimeMs: Date.now() - (p.pm2_env.pm_uptime ?? 0), restarts: p.pm2_env.pm_restarts ?? 0, memoryBytes: p.monit?.memory ?? 0 };
  } catch {}

  // Disk
  const diskRaw = safe(() => execSync("df -h / | tail -1", { encoding: "utf-8", timeout: 2000 }).trim(), "");
  const dp = diskRaw.split(/\s+/);
  const disk = { total: dp[1] ?? "?", used: dp[2] ?? "?", avail: dp[3] ?? "?", percent: dp[4] ?? "?", percentNum: parseInt(dp[4] ?? "0") };

  // DB size
  let dbSize = "?";
  try {
    const r = await db.execute(drizzleSql`SELECT pg_size_pretty(pg_database_size('msbeton')) as size`);
    dbSize = (r.rows[0] as { size: string }).size;
  } catch {}

  // System uptime
  const uptime = safe(() => execSync("uptime -p 2>/dev/null", { encoding: "utf-8", timeout: 2000 }).trim().replace(/^up\s+/, ""), "?");

  // Backups
  const BACKUP_DIR = "/root/backups/db";
  const backups = safe(() =>
    readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".sql.gz") && !f.startsWith("pre_rollback_"))
      .sort().reverse().slice(0, 10)
      .map(f => {
        const st = statSync(`${BACKUP_DIR}/${f}`);
        return { file: f, sizeKb: Math.round(st.size / 1024), mtime: st.mtime.toISOString() };
      }),
  [] as { file: string; sizeKb: number; mtime: string }[]);

  const lastLog = safe(() => execSync(`tail -3 ${BACKUP_DIR}/backup.log 2>/dev/null`, { encoding: "utf-8", timeout: 2000 }).trim(), "");

  // SSL cert expiry
  const sslExpiry = safe(() => {
    const out = execSync("openssl x509 -enddate -noout -in /etc/letsencrypt/live/msbeton.sk/fullchain.pem 2>/dev/null", { encoding: "utf-8", timeout: 3000 }).trim();
    // notAfter=Aug 27 09:25:48 2026 GMT
    const m = out.match(/notAfter=(.+)/);
    return m ? new Date(m[1]).toISOString() : null;
  }, null as string | null);

  // Next backup cron (hardcoded: daily 02:00)
  const backupCron = "0 2 * * * (každý deň 02:00)";

  // Security: nginx 4xx/5xx, WP probes, PM2 rate limits, fail2ban
  const security = (() => {
    const d = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const todayNginx = `${String(d.getDate()).padStart(2,"0")}/${months[d.getMonth()]}/${d.getFullYear()}`;

    let hits4xx = 0, hits5xx = 0, wpProbes = 0;
    const ipCounts: Record<string, number> = {};

    const nginxLog = safe(() => execSync("tail -n 3000 /var/log/nginx/access.log 2>/dev/null", { encoding: "utf-8", timeout: 4000 }), "");
    for (const line of nginxLog.split("\n")) {
      if (!line.includes(todayNginx)) continue;
      const m = line.match(/^(\S+) .+ (\d{3}) /);
      if (!m) continue;
      const ip = m[1], status = parseInt(m[2]);
      const isWp = line.includes("/wp-login.php") || line.includes("/xmlrpc.php") || line.includes("/.env");
      if (isWp) { wpProbes++; ipCounts[ip] = (ipCounts[ip] ?? 0) + 1; }
      if (status >= 400 && status < 500) { hits4xx++; ipCounts[ip] = (ipCounts[ip] ?? 0) + 1; }
      if (status >= 500) { hits5xx++; ipCounts[ip] = (ipCounts[ip] ?? 0) + 1; }
    }

    let rateLimitHits = 0;
    const pm2Log = safe(() => execSync("tail -n 1000 ~/.pm2/logs/msbeton-api-out.log 2>/dev/null", { encoding: "utf-8", timeout: 3000 }), "");
    for (const line of pm2Log.split("\n")) {
      if (line.includes('"statusCode":429') || line.includes('"status":429')) rateLimitHits++;
    }

    const bannedIps = safe(() => {
      const sshd = execSync("fail2ban-client status sshd 2>/dev/null", { encoding: "utf-8", timeout: 3000 });
      const wp   = execSync("fail2ban-client status nginx-wp-scan 2>/dev/null", { encoding: "utf-8", timeout: 3000 });
      const m1 = sshd.match(/Currently banned:\s*(\d+)/);
      const m2 = wp.match(/Currently banned:\s*(\d+)/);
      return (m1 ? parseInt(m1[1]) : 0) + (m2 ? parseInt(m2[1]) : 0);
    }, 0);

    const wpBannedList = safe(() => {
      const out = execSync("fail2ban-client status nginx-wp-scan 2>/dev/null", { encoding: "utf-8", timeout: 3000 });
      const m = out.match(/Banned IP list:\s*(.+)/);
      if (!m || !m[1].trim()) return [] as string[];
      return m[1].trim().split(/\s+/).slice(0, 10);
    }, [] as string[]);

    const wpBantime = safe(() => {
      const out = execSync("fail2ban-client get nginx-wp-scan bantime 2>/dev/null", { encoding: "utf-8", timeout: 3000 });
      return parseInt(out.trim()) || 86400;
    }, 86400);

    const topIps = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));

    return { hits4xx, hits5xx, wpProbes, rateLimitHits, bannedIps, wpBannedList, wpBantime, topIps };
  })();

  res.json({ pm2, disk, dbSize, uptime, backups, lastLog, sslExpiry, backupCron, security });
});

router.post("/server-backup", async (req, res) => {
  try {
    const out = execSync("/root/backup-db.sh 2>&1", { encoding: "utf-8", timeout: 30000 });
    res.json({ ok: true, output: out.trim() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.delete("/server-backup/:filename", (req, res) => {
  const { filename } = req.params;
  if (!/^msbeton_\d{8}_\d{6}\.sql\.gz$/.test(filename)) {
    res.status(400).json({ ok: false, error: "Neplatný názov súboru" });
    return;
  }
  const { unlinkSync } = require("fs") as typeof import("fs");
  const path = `/root/backups/db/${filename}`;
  try {
    unlinkSync(path);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
