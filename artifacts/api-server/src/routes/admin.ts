import { Router } from "express";
import { db, adminConfig } from "@workspace/db";
import { eq } from "drizzle-orm";

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
  try { await setConfig(KEYS.clients, req.body); res.json({ ok: true }); }
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

export default router;
