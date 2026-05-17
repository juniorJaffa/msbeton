import { Router } from "express";
import { db, adminConfig } from "@workspace/db";
import { eq } from "drizzle-orm";
import { invalidateClientCache } from "./client";
import { sendRegistrationEmail } from "../lib/mailer";

const router = Router();

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

router.get("/categories", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.categories) }); }
  catch (err) { req.log.error({ err }, "Failed to get categories"); res.status(500).json({ error: "Internal server error" }); }
});
router.put("/categories", async (req, res) => {
  try { await setConfig(KEYS.categories, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save categories"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/delivery", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.delivery) }); }
  catch (err) { req.log.error({ err }, "Failed to get delivery"); res.status(500).json({ error: "Internal server error" }); }
});
router.put("/delivery", async (req, res) => {
  try { await setConfig(KEYS.delivery, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save delivery"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/services", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.services) }); }
  catch (err) { req.log.error({ err }, "Failed to get services"); res.status(500).json({ error: "Internal server error" }); }
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

router.get("/transport-zones", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.transportZones) }); }
  catch (err) { req.log.error({ err }, "Failed to get transport zones"); res.status(500).json({ error: "Internal server error" }); }
});
router.put("/transport-zones", async (req, res) => {
  try { await setConfig(KEYS.transportZones, req.body); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }, "Failed to save transport zones"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/transport-settings", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.transportSettings) }); }
  catch (err) { req.log.error({ err }, "Failed to get transport settings"); res.status(500).json({ error: "Internal server error" }); }
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

function ga4Rows(data: unknown): Array<{ dims: string[]; vals: string[] }> {
  const d = data as { rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }> };
  return (d.rows ?? []).map(r => ({
    dims: r.dimensionValues.map(v => v.value),
    vals: r.metricValues.map(v => v.value),
  }));
}

router.get("/analytics", async (req, res) => {
  try {
    const token = await getGa4Token();
    if (!token) { res.status(503).json({ error: "GA4_KEY_JSON not configured" }); return; }

    const range30 = { startDate: "30daysAgo", endDate: "today" };
    const range90 = { startDate: "90daysAgo", endDate: "today" };

    const [overview30, overview90, daily, events30, devices, sources, pages, countries] = await Promise.all([
      ga4Report(token, { dateRanges: [range30], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "newUsers" }, { name: "eventCount" }] }),
      ga4Report(token, { dateRanges: [range90], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "newUsers" }] }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }, { name: "activeUsers" }], orderBys: [{ dimension: { dimensionName: "date" } }] }),
      ga4Report(token, { dateRanges: [range90], dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], orderBys: [{ metric: { metricName: "eventCount" }, desc: true }], limit: 25 }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "sessions" }, { name: "activeUsers" }] }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "sessionDefaultChannelGrouping" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 10 }),
      ga4Report(token, { dateRanges: [range30], dimensions: [{ name: "country" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 6 }),
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
    });
  } catch (err) {
    req.log.error({ err }, "GA4 analytics error");
    res.status(502).json({ error: "GA4 fetch failed" });
  }
});

export default router;
