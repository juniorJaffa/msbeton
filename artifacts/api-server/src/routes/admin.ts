import { Router } from "express";
import { db, adminConfig } from "@workspace/db";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { execSync } from "child_process";
import { readdirSync, statSync } from "fs";
import { randomBytes, randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { invalidateClientCache } from "./client";
import { sendRegistrationEmail, sendCredentialsEmail, sendAdminResetCodeEmail } from "../lib/mailer";
import { signAdminToken, requireAdminJwt, requireSuper } from "../lib/adminJwt";
import { logEvent, getEvents } from "../lib/eventLog";
import { loginRateLimit } from "../lib/rateLimits";
import { touchPresence, getActivePresence } from "../lib/adminPresence";
import type { Request } from "express";

const router = Router();

// Firemný email kam chodí admin reset kód (hardcoded — kontakt vlastníka)
const ADMIN_RESET_EMAIL = process.env.ADMIN_RESET_EMAIL ?? "info@msbeton.sk";

// Overí admin heslo: najprv DB hash (admin_secret, ak bol nastavený resetom),
// inak fallback na ENV ADMIN_PASSWORD. Migrácia ENV→DB je tým spätne kompatibilná.
async function verifyAdminPassword(password: string): Promise<boolean> {
  const secret = await getConfig("admin_secret") as { hash?: string } | null;
  if (secret?.hash) return bcrypt.compare(password, secret.hash);
  const envPassword = process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV !== "production" ? "Msbeton2023" : undefined);
  return !!envPassword && password === envPassword;
}

router.post("/login", loginRateLimit, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const adminUser = (process.env.ADMIN_USER ?? "msbeton").toLowerCase();

  if (!username || !password) {
    res.status(400).json({ ok: false, error: "Chýbajú prihlasovacie údaje" });
    return;
  }
  if (username.trim().toLowerCase() !== adminUser || !(await verifyAdminPassword(password))) {
    res.status(401).json({ ok: false, error: "Nesprávne prihlasovacie údaje" });
    return;
  }
  res.json({ ok: true, token: signAdminToken() });
});

// ── Admin reset hesla — overovací kód na firemný email ────────────────────────
// 1. Požiadavka — vygeneruj 6-cif. kód, ulož hash do DB, pošli kód na firemný email
router.post("/password/reset-request", loginRateLimit, async (req, res) => {
  try {
    const code = String(randomInt(100000, 1000000)); // 6 číslic
    const hash = await bcrypt.hash(code, 10);
    await setConfig("admin_reset", { hash, expires: Date.now() + 600_000, attempts: 0 }); // TTL 10 min
    const mail = await sendAdminResetCodeEmail({ toEmail: ADMIN_RESET_EMAIL, code });
    if (!mail.ok) req.log.error({ err: mail.error }, "admin reset email failed");
    // Vždy ok (neprezrádzaj stav emailu). Maskovaný email pre UI.
    const masked = ADMIN_RESET_EMAIL.replace(/^(.).*(@.*)$/, (_m, a, d) => `${a}•••${d}`);
    res.json({ ok: true, sentTo: masked });
  } catch (err) {
    req.log.error({ err }, "admin reset-request failed");
    res.status(500).json({ ok: false, error: "Nepodarilo sa odoslať kód" });
  }
});

// 2. Overenie — skontroluj kód, nastav nové heslo (uloží sa hash do DB, prebíja ENV)
router.post("/password/reset-verify", loginRateLimit, async (req, res) => {
  try {
    const { code, newPassword } = req.body as { code?: string; newPassword?: string };
    if (!code || !newPassword) { res.status(400).json({ ok: false, error: "Chýba kód alebo heslo" }); return; }
    if (newPassword.length < 6) { res.status(400).json({ ok: false, error: "Heslo musí mať aspoň 6 znakov" }); return; }
    const r = await getConfig("admin_reset") as { hash: string; expires: number; attempts: number } | null;
    if (!r || Date.now() > r.expires) { res.status(400).json({ ok: false, error: "Kód vypršal. Požiadajte o nový." }); return; }
    if (r.attempts >= 5) { res.status(429).json({ ok: false, error: "Príliš veľa pokusov. Požiadajte o nový kód." }); return; }
    const match = await bcrypt.compare(String(code), r.hash);
    if (!match) {
      await setConfig("admin_reset", { ...r, attempts: r.attempts + 1 });
      res.status(401).json({ ok: false, error: "Nesprávny kód" });
      return;
    }
    await setConfig("admin_secret", { hash: await bcrypt.hash(newPassword, 10), updatedAt: new Date().toISOString() });
    await setConfig("admin_reset", null);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "admin reset-verify failed");
    res.status(500).json({ ok: false, error: "Obnova zlyhala" });
  }
});

// ── Admin bio log (informačný — admin bio sa overuje lokálne v zariadení, nie serverom) ──
interface AdminBioEntry { ts: string; ok: boolean; event: "register" | "auth"; device?: string; ip?: string; reason?: string }

function parseDeviceUA(ua: string): string {
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

async function appendAdminBioLog(req: { headers: Record<string, unknown>; ip?: string }, entry: Omit<AdminBioEntry, "device" | "ip"> & { deviceLabel?: string }): Promise<void> {
  try {
    const ua = (req.headers["user-agent"] as string) ?? "";
    const ip = (req.headers["cf-connecting-ip"] as string) ?? req.ip ?? "unknown";
    // Prefer client-sent deviceLabel (includes custom name + session hash) over UA parse
    const device = entry.deviceLabel?.trim() || parseDeviceUA(ua);
    const { deviceLabel: _dl, ...rest } = entry;
    const full: AdminBioEntry = { ...rest, device, ip };
    const existing = await getConfig("admin_bio_log");
    const log = Array.isArray(existing) ? existing as AdminBioEntry[] : [];
    await setConfig("admin_bio_log", [...log, full].slice(-40)); // posledných 40 udalostí
  } catch { /* non-critical */ }
}

// Biometrický (WebAuthn) token — vydaný po úspešnom overení passkey na strane klienta.
// Rate-limited rovnako ako prihlásenie heslom — ochrana proti brute-force.
router.post("/biometric-token", loginRateLimit, (req, res) => {
  void appendAdminBioLog(req, { ts: new Date().toISOString(), ok: true, event: "auth" });
  res.json({ ok: true, token: signAdminToken() });
});

// Admin bio udalosť — klient hlási registráciu / zlyhanie (admin bio je client-side)
router.post("/biometric-event", loginRateLimit, async (req, res) => {
  const { event, ok, reason, deviceLabel } = req.body as { event?: string; ok?: boolean; reason?: string; deviceLabel?: string };
  const ev: "register" | "auth" = event === "register" ? "register" : "auth";
  await appendAdminBioLog(req, { ts: new Date().toISOString(), ok: ok === true, event: ev, reason: reason ? String(reason).slice(0, 120) : undefined, deviceLabel: deviceLabel ? String(deviceLabel).slice(0, 60) : undefined });
  res.json({ ok: true });
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

// ── Item-level merge (multi-admin concurrency) ──────────────────────────────────
// Zlúči prichádzajúce pole s aktuálnym DB stavom per-položku podľa `updatedAt`:
//   - id v oboch     → vyhráva novší updatedAt
//   - id len v DB    → ak DB.updatedAt > baseSync (iný admin pridal/zmenil po mojom
//                       syncu) ZACHOVAJ; inak (= ja som zmazal) zahoď
//   - id len incoming → nová/moja položka, zachovaj
// Rekurzívne aj na vnorené `types` (betóny → typy betónu).
// appendOnlyFields: názvy polí ktoré sú append-only arrays (statusHistory, deposit.transactions)
//   → vždy sa UNION-ujú z oboch verzií (winner + loser) aby sa nestratili záznamy
type Item = Record<string, unknown> & { id?: unknown; updatedAt?: unknown; types?: unknown };
function ts(v: unknown): number { const t = new Date(String(v ?? 0)).getTime(); return isNaN(t) ? 0 : t; }

// Union dvoch append-only arrays — dedupuje podľa dedup kľúča
// changedAt+status+changedBy pre statusHistory; id pre deposit.transactions
function unionAppendOnly(a: unknown[], b: unknown[], dedupKey: (x: unknown) => string): unknown[] {
  const seen = new Set<string>();
  const result: unknown[] = [];
  for (const item of [...a, ...b]) {
    const k = dedupKey(item);
    if (!seen.has(k)) { seen.add(k); result.push(item); }
  }
  // Zoradiť chronologicky podľa changedAt/createdAt ak existuje
  return result.sort((x, y) => {
    const xr = x as Record<string, unknown>;
    const yr = y as Record<string, unknown>;
    const ta = xr.changedAt ?? xr.createdAt;
    const tb = yr.changedAt ?? yr.createdAt;
    return ta && tb ? ts(ta) - ts(tb) : 0;
  });
}

// preserveUnstamped: položky bez updatedAt chýbajúce v incoming → zachovať (clients: out-of-band insert
// ochrana, napr. Ľubica). Pre orders=false: legacy bez updatedAt sa dá zmazať (inak by sa vracali).
function mergeItems(incoming: Item[], current: Item[], baseSyncMs: number, preserveUnstamped = true,
  appendOnlyFields: string[] = [], stickyTrueFields: string[] = []
): Item[] {
  const curById = new Map(current.filter(c => c.id != null).map(c => [String(c.id), c] as const));
  const incIds = new Set(incoming.filter(i => i.id != null).map(i => String(i.id)));
  const result: Item[] = [];
  // 1) Prejdi incoming — pre každú porovnaj s DB verziou (novší updatedAt vyhráva)
  for (const inc of incoming) {
    const id = inc.id != null ? String(inc.id) : null;
    const cur = id ? curById.get(id) : undefined;
    if (!cur) { result.push(inc); continue; }
    const winner = ts(cur.updatedAt) > ts(inc.updatedAt) ? cur : inc;
    const loser  = winner === cur ? inc : cur;
    let merged: Item = winner;
    // Vnorené types merge (ak existujú v oboch)
    if (Array.isArray(inc.types) && Array.isArray(cur.types)) {
      merged = { ...merged, types: mergeItems(inc.types as Item[], cur.types as Item[], baseSyncMs, preserveUnstamped, appendOnlyFields, stickyTrueFields) };
    }
    // stickyTrueFields: polia ktoré raz nastavené na truthy hodnotu nikdy stratia pri concurrent edite
    // boolean true → zachovaj true; string (napr. deletedAt ISO timestamp) → zachovaj string
    // Ak loser mal truthy a winner nemá → zachovaj z losera (excelConfirmed, deletedAt, etc.)
    if (stickyTrueFields.length > 0) {
      const overrides: Record<string, unknown> = {};
      for (const field of stickyTrueFields) {
        const loserVal = loser[field];
        const mergedVal = merged[field];
        if (loserVal && !mergedVal) overrides[field] = loserVal;
      }
      if (Object.keys(overrides).length > 0) merged = { ...merged, ...overrides };
    }
    // Append-only polia — vždy union z oboch (winner + loser), aby sa nestratili záznamy
    // Podporuje dot-notation: "deposit.transactions" naviguje do vnoreného objektu
    const dedupKey = (x: unknown): string => {
      const r = x as Record<string, unknown>;
      if (r.id) return String(r.id);
      // statusHistory: changedAt|status|changedBy
      if (r.changedAt != null || r.status != null || r.changedBy != null)
        return `${r.changedAt ?? ""}|${r.status ?? ""}|${r.changedBy ?? ""}`;
      // photoHistory / iné at-based záznamy: at|type — ISO timestamp je unikátny per event
      if (r.at != null) return `${r.at}|${r.type ?? ""}`;
      // fallback: deep compare
      return JSON.stringify(x);
    };
    for (const field of appendOnlyFields) {
      const parts = field.split(".");
      // Získaj nested arrays z merged a loser
      const getVal = (obj: Item, parts: string[]): unknown => parts.reduce((v: unknown, k) => (v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), obj as unknown);
      const winArr = Array.isArray(getVal(merged, parts)) ? getVal(merged, parts) as unknown[] : [];
      const loseArr = Array.isArray(getVal(loser, parts)) ? getVal(loser, parts) as unknown[] : [];
      if (loseArr.length === 0) continue;
      const unified = unionAppendOnly(winArr, loseArr, dedupKey);
      if (parts.length === 1) {
        merged = { ...merged, [parts[0]]: unified };
      } else if (parts.length === 2) {
        // Napr. "deposit.transactions" → update merged.deposit.transactions + recalc balance
        const parent = (merged[parts[0]] as Record<string, unknown> | undefined) ?? {};
        let updated: Record<string, unknown> = { ...parent, [parts[1]]: unified };
        // Ak je to deposit.transactions → prepočítaj balance z transakcií
        if (parts[0] === "deposit" && parts[1] === "transactions") {
          const newBal = (unified as Array<Record<string, unknown>>).reduce((s: number, t: Record<string, unknown>) => {
            return s + (typeof t.amount === "number" ? t.amount : 0);
          }, 0);
          updated = { ...updated, balance: Math.round((newBal as number) * 100) / 100 };
        }
        merged = { ...merged, [parts[0]]: updated };
      }
    }
    // paidAmount recompute (orders): ak merged má payments[], server prepočíta sumu zo zdroja pravdy.
    // Zabraňuje stale paidAmount keď payments[] appendOnly merger pridal nové platby z losera.
    // Bezpečné pre klientov — nemajú payments[], takže Array.isArray vráti false → no-op.
    {
      const mergedPayments = Array.isArray(merged.payments)
        ? (merged.payments as Array<Record<string, unknown>>)
        : null;
      if (mergedPayments !== null) {
        const computed = mergedPayments.reduce(
          (s: number, p: Record<string, unknown>) => s + (typeof p.amount === "number" ? p.amount : 0),
          0
        );
        merged = { ...merged, paidAmount: Math.round(computed * 100) / 100 };
      }
    }
    // Photo loss protection: ak winner (merged) prišiel bez fotiek ale loser (DB) mal fotky,
    // skontroluj či strata fotiek je vysvetlená explicitnými delete záznamami v photoHistory.
    // Bez tohto: orphan-cleanup s čerstvým updatedAt prepísal DB → fotky trvalo stratené.
    {
      const mergedPhotos = Array.isArray(merged.photos) ? (merged.photos as unknown[]) : [];
      const loserPhotos = Array.isArray(loser.photos) ? (loser.photos as unknown[]) : [];
      if (loserPhotos.length > mergedPhotos.length) {
        // Koľko fotiek zmizlo? Porovnaj s počtom explicitných "delete" zápisov v photoHistory
        // ktoré vznikli PO poslednom loser updatedAt (= po úmyselnom mazaní)
        const loserTs = ts(loser.updatedAt);
        const mergedHistory = Array.isArray(merged.photoHistory) ? (merged.photoHistory as Array<Record<string, unknown>>) : [];
        const explicitDeletes = mergedHistory.filter(h => h.type === "delete" && ts(h.at) > loserTs).length;
        const lostCount = loserPhotos.length - mergedPhotos.length;
        if (lostCount > explicitDeletes) {
          // Viac fotiek zmizlo ako je vysvetlené explicitnými delete zápismi → obnov z losera
          console.warn(`[mergeItems] Photo loss protection triggered for client ${String(merged.id ?? "?")}:` +
            ` lost ${lostCount} photos but only ${explicitDeletes} explicit deletes — restoring from loser`);
          merged = { ...merged, photos: loserPhotos };
        }
      }
    }
    // locationPhoto GPS protection: ak winner (merged) nemá GPS ale loser mal,
    // obnov z losera — zábrán premazaniu GPS pri concurrent admin save s stale dátami.
    // Výnimka: ak winner mal explicitné vymazanie GPS (loser.locationPhoto existoval ale winner.locationPhoto je undefined
    // a updatedAt winnera > updatedAt losera) — vtedy neobnov (zámerné vymazanie).
    {
      const mergedLoc = merged.locationPhoto as Record<string, unknown> | undefined;
      const loserLoc  = loser.locationPhoto  as Record<string, unknown> | undefined;
      const mergedHasGps = mergedLoc && typeof mergedLoc.lat === "number";
      const loserHasGps  = loserLoc  && typeof loserLoc.lat  === "number";
      if (!mergedHasGps && loserHasGps) {
        // Loser mal GPS, winner nemá — obnov GPS z losera (ochrana pred stale-data premazaním)
        console.warn(`[mergeItems] GPS loss protection triggered for client ${String(merged.id ?? "?")}: restoring locationPhoto from loser`);
        merged = { ...merged, locationPhoto: loserLoc };
      }
    }
    // note protection (orders): ak winner nemá note ale loser mal → obnov loserovu note.
    // Zabraňuje premazaniu poznámky pri concurrent status zmene.
    // Ak winner mal note="" (zámerné vymazanie) → neprepíše (winner.note je falsy ale zámerné — OK, akceptujeme).
    // Ak winner má novšiu note (existuje) → nemeň (winner wins podľa updatedAt).
    {
      const mergedNote = merged.note as string | undefined;
      const loserNote  = loser.note  as string | undefined;
      if (!mergedNote && loserNote) {
        merged = { ...merged, note: loserNote };
      }
    }

    result.push(merged);
  }
  // 2) Položky len v DB (chýbajú v incoming):
  //    - bez updatedAt → ZACHOVAJ ak preserveUnstamped (clients: ochrana out-of-band insertu, bug s Ľubicou)
  //    - s updatedAt > baseSync → iný admin pridal/zmenil po mojom syncu → zachovaj
  //    - inak (updatedAt <= baseSync, alebo unstamped pri preserveUnstamped=false) → zmazané → nezachovávaj
  for (const cur of current) {
    const id = cur.id != null ? String(cur.id) : null;
    if (id && incIds.has(id)) continue;
    if ((cur.updatedAt == null && preserveUnstamped) || (cur.updatedAt != null && ts(cur.updatedAt) > baseSyncMs)) result.push(cur);
  }
  return result;
}

// ── Diff pre audit log — čo tento admin pridal / zmenil / zmazal vs DB ──────────
interface SaveDiff { added: string[]; modified: string[]; removed: string[]; others: string[] }
function computeDiff(incoming: Item[], current: Item[], baseSyncMs: number): SaveDiff {
  const curById = new Map(current.filter(c => c.id != null).map(c => [String(c.id), c] as const));
  const incIds = new Set(incoming.filter(i => i.id != null).map(i => String(i.id)));
  const added: string[] = [], modified: string[] = [], removed: string[] = [], others: string[] = [];
  for (const inc of incoming) {
    const id = inc.id != null ? String(inc.id) : null; if (!id) continue;
    const cur = curById.get(id);
    if (!cur) added.push(id);
    else if (ts(inc.updatedAt) > ts(cur.updatedAt)) modified.push(id);
  }
  for (const cur of current) {
    const id = cur.id != null ? String(cur.id) : null; if (!id) continue;
    if (incIds.has(id)) continue;
    if (ts(cur.updatedAt) > baseSyncMs) others.push(id); // iný admin pridal/zmenil po mojom syncu
    else removed.push(id);                               // tento admin zámerne zmazal
  }
  return { added, modified, removed, others };
}

// Ľudský názov položky pre audit (klient = meno/firma, ostatné = name/label)
function labelOf(key: string, item: Item | undefined): string {
  if (!item) return "?";
  if (key === KEYS.clients) {
    const n = [item.firstName, item.lastName].filter(Boolean).map(String).join(" ").trim();
    return n || String(item.company ?? "") || String(item.loginId ?? "") || String(item.id ?? "?");
  }
  return String(item.name ?? item.label ?? item.id ?? "?");
}

export interface AuditEntry {
  ts: string; session: string; device: string; ip: string; role: string;
  key: string; added: string[]; modified: string[]; removed: string[];
}
interface Actor { session: string; device: string; ip: string; role: string }
function actorOf(req: Request): Actor {
  return {
    session: String(req.get("X-Admin-Session") ?? "").slice(0, 16) || "?",
    device: String(req.get("X-Admin-Device") ?? "").slice(0, 48) || "Zariadenie",
    ip: (req.headers["cf-connecting-ip"] as string) ?? req.ip ?? "?",
    role: (req as Request & { adminRole?: string }).adminRole ?? "admin",
  };
}
const AUDIT_KEY = "audit_log";
const AUDIT_CAP = 400;
async function appendAudit(entry: AuditEntry): Promise<void> {
  // Vlastný riadok (audit_log) — žiadna kontencia s clients. FOR UPDATE pre atomický append.
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(adminConfig).where(eq(adminConfig.key, AUDIT_KEY)).for("update").limit(1);
    const log = Array.isArray(rows[0]?.data) ? rows[0]!.data as AuditEntry[] : [];
    log.push(entry);
    const capped = log.slice(-AUDIT_CAP);
    await tx.insert(adminConfig)
      .values({ key: AUDIT_KEY, data: capped })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: capped, updatedAt: new Date() } });
  });
}

// Generický merge-save pre array kľúče. baseSync z hlavičky X-Base-Sync.
// SELECT FOR UPDATE zamkne riadok — paralelné requesty čakajú, nie race condition.
// Zároveň zaznamená audit (kto čo pridal/zmenil/zmazal) a vráti mergedFromOthers
// (počet položiek iného admina ktoré sa zlúčili → frontend re-sync + toast).
async function mergeSaveArray(key: string, body: unknown, baseSyncHeader: unknown, actor: Actor | null, transform?: (incoming: Item[], current: Item[]) => Item[], preserveUnstamped = true, appendOnlyFields: string[] = [], stickyTrueFields: string[] = []): Promise<{ kept: number; preserved: number; mergedFromOthers: number }> {
  const incomingRaw = Array.isArray(body) ? body as Item[] : [];
  const baseSyncMs = baseSyncHeader != null ? ts(baseSyncHeader) : -1;

  const { merged, diff, current, incoming } = await db.transaction(async (tx) => {
    // Zamkni riadok — iný admin musí počkať kým táto transakcia skončí
    const rows = await tx.select().from(adminConfig).where(eq(adminConfig.key, key)).for("update").limit(1);
    const cur = (rows[0]?.data as Item[] | null) ?? [];
    // transform (napr. manager sanitizácia) beží vnútri zámku s čerstvým `cur`
    const inc = transform ? transform(incomingRaw, cur) : incomingRaw;
    const m = mergeItems(inc, cur, baseSyncMs, preserveUnstamped, appendOnlyFields, stickyTrueFields);
    const d = computeDiff(inc, cur, baseSyncMs);
    await tx.insert(adminConfig)
      .values({ key, data: m })
      .onConflictDoUpdate({ target: adminConfig.key, set: { data: m, updatedAt: new Date() } });
    return { merged: m, diff: d, current: cur, incoming: inc };
  });

  // Audit — len ak tento admin reálne niečo zmenil
  if (actor && (diff.added.length || diff.modified.length || diff.removed.length)) {
    const curById = new Map(current.filter(c => c.id != null).map(c => [String(c.id), c] as const));
    const incById = new Map(incoming.filter(i => i.id != null).map(i => [String(i.id), i] as const));
    try {
      await appendAudit({
        ts: new Date().toISOString(),
        session: actor.session, device: actor.device, ip: actor.ip, role: actor.role,
        key,
        added: diff.added.map(id => labelOf(key, incById.get(id))),
        modified: diff.modified.map(id => labelOf(key, incById.get(id))),
        removed: diff.removed.map(id => labelOf(key, curById.get(id))),
      });
    } catch { /* audit nesmie zhodiť uloženie */ }
  }

  return { kept: merged.length, preserved: merged.length - incoming.length, mergedFromOthers: diff.others.length };
}

// Ochrana klientov pred náhodným zmazaním cez PUT (stale localStorage race condition).
// Klienti chýbajúci v incoming sa VŽDY doplnia z DB — nezávisle od baseSyncMs.
// Zámer zmazania musí ísť cez DELETE /clients/:id (nie cez vypustenie z poľa).
// Pozn.: klienti s permanentlyDeleted:true sú výnimka — tí sa NEdoplnia (hard delete cez DELETE endpoint).
function preserveAllClients(incoming: Item[], current: Item[]): Item[] {
  const incIds = new Set(incoming.filter(i => i.id != null).map(i => String(i.id)));
  const missing = current.filter(c => c.id != null && !incIds.has(String(c.id)) && !c.permanentlyDeleted);
  if (missing.length > 0) {
    const names = missing.map(c => (c.firstName ?? c.loginId ?? c.id) as string).join(", ");
    console.warn(`[preserveAllClients] ${missing.length} klientov chýbalo v incoming, doplnení z DB: ${names}`);
  }
  return missing.length > 0 ? [...incoming, ...missing] : incoming;
}

// Manager (Správca) sanitizácia klientov — bezpečnostná hranica (nedá sa obísť, beží vnútri zámku):
//  1) NESMIE meniť admin rolu iných (adminRole/adminReader) → reštauruj z DB (zabráni privilege escalation)
//  2) NESMIE mazať klientov → klienti chýbajúci v incoming sa doplnia z DB
function sanitizeClientsForManager(incoming: Item[], current: Item[]): Item[] {
  const curById = new Map(current.filter(c => c.id != null).map(c => [String(c.id), c] as const));
  const protectedIncoming = incoming.map(inc => {
    const cur = inc.id != null ? curById.get(String(inc.id)) : undefined;
    // nový klient (cur undefined) → admin polia undefined (manager nevie vytvoriť admina)
    return { ...inc, adminRole: cur?.adminRole, adminReader: cur?.adminReader };
  });
  const incIds = new Set(incoming.filter(i => i.id != null).map(i => String(i.id)));
  const missing = current.filter(c => c.id != null && !incIds.has(String(c.id)) && !c.permanentlyDeleted);
  return [...protectedIncoming, ...missing];
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

// Presence heartbeat — každý admin request (vrátane pollu /presence) drží session živú.
router.use((req, _res, next) => {
  const sid = req.get("X-Admin-Session");
  if (sid) {
    const ip = (req.headers["cf-connecting-ip"] as string) ?? req.ip ?? "?";
    touchPresence(sid, req.get("X-Admin-Device") ?? "", ip, (req as Request & { adminRole?: string }).adminRole ?? "admin");
  }
  next();
});

// Kto je práve online (iní admini). isSelf = volajúci.
router.get("/presence", (req, res) => {
  const self = req.get("X-Admin-Session") ?? "";
  const sessions = getActivePresence().map(e => ({
    session: e.session.slice(0, 8), device: e.device, ip: e.ip, role: e.role,
    lastSeen: new Date(e.lastSeen).toISOString(), isSelf: e.session === self,
  }));
  res.json({ ok: true, sessions, count: sessions.length });
});

// Audit log — kto čo menil (multi-admin). Najnovšie hore.
router.get("/audit-log", async (req, res) => {
  try {
    const raw = await getConfig(AUDIT_KEY);
    const log = Array.isArray(raw) ? raw as AuditEntry[] : [];
    res.json({ ok: true, entries: [...log].reverse() });
  } catch (err) { req.log.error({ err }, "Failed to get audit log"); res.status(500).json({ error: "Internal server error" }); }
});

// In-memory ring buffer posledných udalostí (objednávky, klienti, emaile, rejecty)
router.get("/event-log", (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 150), 500);
  const evFilter = req.query.ev ? String(req.query.ev) : undefined;
  res.json({ ok: true, events: getEvents(limit, evFilter) });
});

// Read-only enforcement: admin-čitateľ (reader) smie len GET; mutácie → 403.
// Server-side ochrana — frontend skrytie nestačí (reader by mohol volať API priamo).
router.use((req, res, next) => {
  if (req.method !== "GET" && (req as typeof req & { adminRole?: string }).adminRole === "reader") {
    res.status(403).json({ error: "Read-only: admin-čitateľ nemôže meniť dáta" });
    return;
  }
  next();
});

// Generická ochrana pre položkové polia (categories, delivery, services, zones).
// Rovnaký princíp ako preserveAllClients/Orders — chýbajúce položky z DB sa vždy doplnia.
// Zabráni náhodnej strate betónov/zón/služieb pri stale PUT (PWA cache, race).
function preserveAllItems(label: string): (incoming: Item[], current: Item[]) => Item[] {
  return (incoming: Item[], current: Item[]): Item[] => {
    const incIds = new Set(incoming.filter(i => i.id != null).map(i => String(i.id)));
    const missing = current.filter(c => c.id != null && !incIds.has(String(c.id)));
    if (missing.length > 0) {
      console.warn(`[preserveAllItems:${label}] ${missing.length} položiek chýbalo v incoming, doplnené z DB`);
    }
    return missing.length > 0 ? [...incoming, ...missing] : incoming;
  };
}

router.put("/categories", async (req, res) => {
  try { const r = await mergeSaveArray(KEYS.categories, req.body, req.get("X-Base-Sync"), actorOf(req), preserveAllItems("categories")); res.json({ ok: true, ...r }); }
  catch (err) { req.log.error({ err }, "Failed to save categories"); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/delivery", async (req, res) => {
  try { const r = await mergeSaveArray(KEYS.delivery, req.body, req.get("X-Base-Sync"), actorOf(req), preserveAllItems("delivery")); res.json({ ok: true, ...r }); }
  catch (err) { req.log.error({ err }, "Failed to save delivery"); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/services", async (req, res) => {
  try { const r = await mergeSaveArray(KEYS.services, req.body, req.get("X-Base-Sync"), actorOf(req), preserveAllItems("services")); res.json({ ok: true, ...r }); }
  catch (err) { req.log.error({ err }, "Failed to save services"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/clients", async (req, res) => {
  try { res.json({ data: await getConfig(KEYS.clients) }); }
  catch (err) { req.log.error({ err }, "Failed to get clients"); res.status(500).json({ error: "Internal server error" }); }
});
router.put("/clients", async (req, res) => {
  try {
    const actor = actorOf(req);
    // Všetky role: preserveAllClients zabraňuje náhodnej strate klientov cez stale PUT.
    // Manager: navyše sanitizácia admin rolí (privilege escalation ochrana).
    // Hard delete musí ísť cez DELETE /clients/:id (nie cez vypustenie z poľa).
    const transform = actor.role === "manager" ? sanitizeClientsForManager : preserveAllClients;
    // deposit.transactions je append-only — union z oboch verzií pri súbežných zmenách (topup + platba)
    // priceHistory = audit log zmien cien/zliav — append-only ako photoHistory (union pri concurrent PUT)
    const r = await mergeSaveArray(KEYS.clients, req.body, req.get("X-Base-Sync"), actor, transform, true, ["deposit.transactions", "photoHistory", "priceHistory"]);
    invalidateClientCache();
    const logFields = {
      ev: "clients_saved",
      kept: r.kept,
      preserved: r.preserved,
      mergedFromOthers: r.mergedFromOthers,
      device: actor.device,
      role: actor.role,
      session: actor.session?.slice(0, 8) ?? null,
      ip: String(req.headers["cf-connecting-ip"] ?? req.ip ?? "unknown"),
    };
    req.log.info(logFields, "Clients saved OK");
    logEvent(logFields);
    res.json({ ok: true, ...r });
  }
  catch (err) { req.log.error({ err }, "Failed to save clients"); res.status(500).json({ error: "Internal server error" }); }
});

// Trvalé zmazanie klienta — iba superadmin, len pre už soft-deleted (isDeleted:true).
// Toto je jediný správny spôsob hard delete — PUT array omission zachytí preserveAllClients.
router.delete("/clients/:id", requireSuper, async (req, res) => {
  try {
    const id = req.params.id;
    const raw = await getConfig(KEYS.clients);
    const clients = Array.isArray(raw) ? raw as Array<Record<string, unknown>> : [];
    const target = clients.find(c => String(c.id) === id);
    if (!target) { res.status(404).json({ error: "Client not found" }); return; }
    if (!target.isDeleted) { res.status(400).json({ error: "Client must be soft-deleted (isDeleted:true) before permanent deletion" }); return; }
    const updated = clients.filter(c => String(c.id) !== id);
    await setConfig(KEYS.clients, updated);
    invalidateClientCache();
    const actor = actorOf(req);
    try {
      await appendAudit({
        ts: new Date().toISOString(),
        session: actor.session, device: actor.device, ip: actor.ip, role: actor.role,
        key: KEYS.clients,
        added: [], modified: [],
        removed: [String(target.firstName ?? target.loginId ?? target.id)],
      });
    } catch { /* audit nesmie zlyhať save */ }
    res.json({ ok: true });
  }
  catch (err) { req.log.error({ err }, "Failed to hard-delete client"); res.status(500).json({ error: "Internal server error" }); }
});

// Zrušenie všetkých WebAuthn credentials + logu klienta — iba superadmin
router.delete("/clients/:id/webauthn", requireSuper, async (req, res) => {
  try {
    const clientId = req.params.id;
    const raw = await getConfig(KEYS.clients);
    const clients = Array.isArray(raw) ? raw as Array<Record<string, unknown>> : [];
    const updated = clients.map((c) =>
      String(c.id) === clientId
        ? { ...c, webauthnCredentials: [], biometricAuthLog: [] }
        : c
    );
    await setConfig(KEYS.clients, updated);
    invalidateClientCache();
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to revoke WebAuthn credentials");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Zabudnúť JEDNO zariadenie (per-device) — zmaže iba daný credential, ostatné ostanú. Iba superadmin.
router.delete("/clients/:id/webauthn/:credId", requireSuper, async (req, res) => {
  try {
    const { id: clientId, credId } = req.params;
    const raw = await getConfig(KEYS.clients);
    const clients = Array.isArray(raw) ? raw as Array<Record<string, unknown>> : [];
    const updated = clients.map((c) => {
      if (String(c.id) !== clientId) return c;
      const creds = Array.isArray(c.webauthnCredentials) ? c.webauthnCredentials as Array<{ id: string }> : [];
      return { ...c, webauthnCredentials: creds.filter((cr) => cr.id !== credId) };
    });
    await setConfig(KEYS.clients, updated);
    invalidateClientCache();
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete WebAuthn credential");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/transport-zones", async (req, res) => {
  try { const r = await mergeSaveArray(KEYS.transportZones, req.body, req.get("X-Base-Sync"), actorOf(req), preserveAllItems("transport-zones")); res.json({ ok: true, ...r }); }
  catch (err) { req.log.error({ err }, "Failed to save transport zones"); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/transport-settings", async (req, res) => {
  // Atomický field-merge: frontend posiela LEN zmenené polia (patch). Dvaja admini meniaci
  // rôzne nastavenia naraz → oba sa zachovajú (FOR UPDATE serializuje). Rovnaké pole → posledný vyhrá.
  try {
    const patch = (req.body && typeof req.body === "object" && !Array.isArray(req.body)) ? req.body as Record<string, unknown> : {};
    await db.transaction(async (tx) => {
      const rows = await tx.select().from(adminConfig).where(eq(adminConfig.key, KEYS.transportSettings)).for("update").limit(1);
      const cur = (rows[0]?.data && typeof rows[0].data === "object" && !Array.isArray(rows[0].data)) ? rows[0].data as Record<string, unknown> : {};
      const merged = { ...cur, ...patch };
      await tx.insert(adminConfig).values({ key: KEYS.transportSettings, data: merged })
        .onConflictDoUpdate({ target: adminConfig.key, set: { data: merged, updatedAt: new Date() } });
    });
    res.json({ ok: true });
  }
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
// Ochrana objednávok pred náhodnou stratou — rovnaký princíp ako preserveAllClients.
// Objednávky chýbajúce v incoming (stale admin list) sa vždy doplnia z DB.
// Soft delete (deletedAt set) zostáva v poli → správne zachytené; hard delete objednávok neexistuje.
function preserveAllOrders(incoming: Item[], current: Item[]): Item[] {
  const incIds = new Set(incoming.filter(i => i.id != null).map(i => String(i.id)));
  const missing = current.filter(c => c.id != null && !incIds.has(String(c.id)));
  return missing.length > 0 ? [...incoming, ...missing] : incoming;
}

router.put("/orders", async (req, res) => {
  // Atomický item-level merge (rovnako ako klienti) — zabráni strate zmien (paid→nová, delete→návrat)
  // pri súbežných adminoch a stale polloch.
  // preserveAllOrders: objednávky chýbajúce v incoming sa vždy doplnia z DB (rovnaký princíp ako clients).
  // preserveUnstamped=TRUE: klientske objednávky (POST /api/client/order) nemajú updatedAt — záložná ochrana.
  // appendOnlyFields: statusHistory sa union-uje z oboch verziií — nikdy nestratí záznamy pri súbežných zmenách
  // stickyTrueFields: excelConfirmed — raz potvrdené nikdy nestratí pri concurrent edite
  try { const r = await mergeSaveArray(KEYS.orders, req.body, req.get("X-Base-Sync"), null, preserveAllOrders, true,
  ["statusHistory", "payments"],   // appendOnly: platby ani statusy sa nestratia pri concurrent save
  ["excelConfirmed", "deletedAt"]  // stickyTrue: soft delete + excel confirm sú nevratné
); res.json({ ok: true, ...r }); }
  catch (err) { req.log.error({ err }, "Failed to save orders"); res.status(500).json({ error: "Internal server error" }); }
});

// ── Order presence (soft lock indicator) ─────────────────────────────────────
// In-memory: ephemeral (reset pri PM2 restart) — stačí pre soft lock UX
// Každý admin pri expand karty oznámi svoju prítomnosť; iní to vidia ako "Prezerá: Peter iPhone"
interface PresenceEntry { device: string; until: number }
const orderPresence = new Map<string, PresenceEntry[]>(); // orderId → zoznam admins
const PRESENCE_TTL_MS = 10 * 60 * 1000; // 10 min

function cleanPresence() {
  const now = Date.now();
  for (const [id, list] of orderPresence) {
    const alive = list.filter(e => e.until > now);
    if (alive.length === 0) orderPresence.delete(id);
    else orderPresence.set(id, alive);
  }
}

// Nahlásiť prítomnosť (PUT: expand), zrušiť (DELETE: collapse)
router.put("/orders/:id/presence", (req, res) => {
  const { id } = req.params;
  const device = String(req.body?.device ?? "admin").slice(0, 80);
  if (!id) { res.status(400).json({ ok: false }); return; }
  cleanPresence();
  const list = (orderPresence.get(id) ?? []).filter(e => e.device !== device);
  list.push({ device, until: Date.now() + PRESENCE_TTL_MS });
  orderPresence.set(id, list);
  res.json({ ok: true });
});

router.delete("/orders/:id/presence", (req, res) => {
  const { id } = req.params;
  const device = String(req.query.device ?? "").slice(0, 80);
  if (!id) { res.status(400).json({ ok: false }); return; }
  const list = (orderPresence.get(id) ?? []).filter(e => e.device !== device);
  if (list.length === 0) orderPresence.delete(id); else orderPresence.set(id, list);
  res.json({ ok: true });
});

// Vrátiť všetkých aktívnych presences (polling každých 30s z klientov)
router.get("/orders/presence", (_req, res) => {
  cleanPresence();
  const now = Date.now();
  const result: Record<string, string[]> = {};
  for (const [id, list] of orderPresence) {
    const alive = list.filter(e => e.until > now).map(e => e.device);
    if (alive.length) result[id] = alive;
  }
  res.json({ data: result });
});

router.post("/send-registration-email", async (req, res) => {
  const { toEmail, clientName, clientId, password } = req.body ?? {};
  if (!toEmail || !clientName || !clientId || !password) {
    res.status(400).json({ ok: false, error: "Missing required fields" });
    return;
  }
  // Sanitize mien — SMTP header injection ochrana (newline v mene)
  const safeName = String(clientName).replace(/[\r\n]/g, " ").trim();
  const result = await sendRegistrationEmail({ toEmail, clientName: safeName, clientId, password });
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
    const msg = String(err instanceof Error ? err.message : err);
    // GSC permission error → user-friendly message
    const isPermErr = msg.includes("403") || msg.includes("permission") || msg.includes("forbidden");
    const userMsg = isPermErr
      ? `GSC: Servisný účet nemá prístup k Search Console property. Pridaj ga4-claude-reader@ms-beton-sk.iam.gserviceaccount.com do GSC → Nastavenia → Používatelia a povolenia.`
      : msg;
    // 400 instead of 502 — 5xx triggers nginx/CF error page (returns HTML instead of JSON)
    res.status(400).json({ error: userMsg });
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

// Admin — odoslanie prihlasovacích údajov emailom klientovi
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

    const rawName = [client.firstName, client.lastName].filter(Boolean).join(" ") || (client.name as string) || "Klient";
    const name = rawName.replace(/[\r\n]/g, " ").trim(); // SMTP header injection ochrana
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

  // Uptime systému
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
  const security = await (async () => {
    const d = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const todayNginx = `${String(d.getDate()).padStart(2,"0")}/${months[d.getMonth()]}/${d.getFullYear()}`;

    let hits4xx = 0, hits5xx = 0, wpProbes = 0;
    const ipCounts: Record<string, number> = {};

    const nginxLog = safe(() => execSync("tail -n 3000 /var/log/nginx/access.log 2>/dev/null", { encoding: "utf-8", timeout: 4000 }), "");
    for (const line of nginxLog.split("\n")) {
      if (!line.includes(todayNginx)) continue;
      const ipM = line.match(/^(\S+)/);
      const stM = line.match(/"[^"]*"\s+(\d{3})\s/);
      if (!ipM || !stM) continue;
      const ip = ipM[1], status = parseInt(stM[1]);
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

    const rawBannedList = safe(() => {
      const out = execSync("fail2ban-client status nginx-wp-scan 2>/dev/null", { encoding: "utf-8", timeout: 3000 });
      const m = out.match(/Banned IP list:\s*(.+)/);
      if (!m || !m[1].trim()) return [] as string[];
      return m[1].trim().split(/\s+/).slice(0, 10);
    }, [] as string[]);

    const wpBantime = safe(() => {
      const out = execSync("fail2ban-client get nginx-wp-scan bantime 2>/dev/null", { encoding: "utf-8", timeout: 3000 });
      return parseInt(out.trim()) || 86400;
    }, 86400);

    // GeoIP info for banned IPs via ip-api.com batch (free, no key needed)
    interface IpGeo { ip: string; country?: string; countryCode?: string; org?: string; }
    let wpBannedList: IpGeo[] = rawBannedList.map(ip => ({ ip }));
    if (rawBannedList.length > 0) {
      try {
        const geoRes = await fetch("http://ip-api.com/batch?fields=query,country,countryCode,org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rawBannedList.map(ip => ({ query: ip }))),
          signal: AbortSignal.timeout(4000),
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json() as Array<{ query: string; country?: string; countryCode?: string; org?: string; status?: string }>;
          wpBannedList = rawBannedList.map(ip => {
            const g = geoData.find(r => r.query === ip);
            return { ip, country: g?.status !== "fail" ? g?.country : undefined, countryCode: g?.status !== "fail" ? g?.countryCode : undefined, org: g?.status !== "fail" ? g?.org : undefined };
          });
        }
      } catch { /* geo lookup optional */ }
    }

    const topIps = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));

    const cfGuard = safe(() => {
      const log = execSync("tail -n 50 /root/backups/db/cf-ban-guard.log 2>/dev/null", { encoding: "utf-8", timeout: 2000 });
      const lines = log.trim().split("\n").filter(Boolean);
      if (!lines.length) return { active: true, lastRun: null as string | null, lastUnbanned: 0 };
      const lastLine = lines[lines.length - 1];
      const lastRun = lastLine.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)?.[1] ?? null;
      const summaryLine = [...lines].reverse().find(l => l.includes("cf-ban-guard: unbanned"));
      const lastUnbanned = summaryLine ? (parseInt(summaryLine.match(/unbanned (\d+)/)?.[1] ?? "0") || 0) : 0;
      return { active: true, lastRun, lastUnbanned };
    }, { active: false, lastRun: null as string | null, lastUnbanned: 0 });

    return { hits4xx, hits5xx, wpProbes, rateLimitHits, bannedIps, wpBannedList, wpBantime, topIps, cfGuard };
  })();

  res.json({ pm2, disk, dbSize, uptime, backups, lastLog, sslExpiry, backupCron, security });
});

router.post("/server-backup", requireSuper, async (req, res) => {
  try {
    const out = execSync("/root/backup-db.sh 2>&1", { encoding: "utf-8", timeout: 30000 });
    res.json({ ok: true, output: out.trim() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.delete("/server-backup/:filename", requireSuper, (req, res) => {
  const filename = String(req.params.filename);
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

// ── Biometrické štatistiky ────────────────────────────────────────────────────
router.get("/biometric-stats", async (req, res) => {
  try {
    type BioLogEntry = { ts: string; ok: boolean; ip?: string; credId?: string; event?: string; device?: string; ua?: string; origin?: string; reason?: string };
    const raw = await getConfig(KEYS.clients);
    const clients = Array.isArray(raw) ? raw as Array<{
      id?: string;
      loginId?: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      company?: string;
      active?: boolean;
      webauthnCredentials?: unknown[];
      biometricAuthLog?: BioLogEntry[];
    }> : [];
    const active = clients.filter(c => c.active !== false);
    const totalClients = active.length;
    const bioClients = active.filter(c => (c.webauthnCredentials?.length ?? 0) > 0).length;

    const nowMs = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const oneHourAgoMs = nowMs - 3_600_000;

    let todaySuccess = 0, todayFailed = 0;
    const alerts: Array<{ clientId: string; clientName: string; failCount: number; lastIp: string; lastDevice: string; lastReason: string }> = [];
    // Globálny feed posledných udalostí naprieč všetkými klientmi
    const feed: Array<{ ts: string; ok: boolean; event: string; clientId: string; clientName: string; loginId: string; device: string; ip: string; origin: string; reason: string }> = [];

    const clientLabel = (c: typeof active[number]) =>
      [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name || c.company || c.loginId || String(c.id ?? "—");

    for (const c of active) {
      const log = c.biometricAuthLog ?? [];
      const todayLog = log.filter(e => new Date(e.ts).getTime() >= todayStartMs);
      todaySuccess += todayLog.filter(e => e.ok).length;
      todayFailed  += todayLog.filter(e => !e.ok).length;

      for (const e of log) {
        feed.push({
          ts: e.ts, ok: e.ok, event: e.event ?? "auth",
          clientId: String(c.id ?? ""), clientName: clientLabel(c), loginId: c.loginId ?? "",
          device: e.device ?? "—", ip: e.ip ?? "—", origin: e.origin ?? "—", reason: e.reason ?? "",
        });
      }

      // Bezpečnostný alert: >3 zlyhaní za poslednú hodinu
      const recentFails = log.filter(e => !e.ok && new Date(e.ts).getTime() >= oneHourAgoMs);
      if (recentFails.length > 3) {
        const lastFail = recentFails[recentFails.length - 1];
        alerts.push({ clientId: String(c.id ?? ""), clientName: clientLabel(c), failCount: recentFails.length, lastIp: lastFail?.ip ?? "", lastDevice: lastFail?.device ?? "—", lastReason: lastFail?.reason ?? "" });
      }
    }

    feed.sort((a, b) => (a.ts < b.ts ? 1 : -1)); // najnovšie hore
    const recent = feed.slice(0, 250); // 50/stranu × max 5 strán
    const lastActivity = feed.length > 0 ? feed[0].ts : null;

    // Admin bio log (client-side biometria — informačný self-reported záznam)
    const adminRaw = await getConfig("admin_bio_log");
    const adminLog = Array.isArray(adminRaw) ? adminRaw as Array<{ ts: string; ok: boolean; event: string; device?: string; ip?: string; reason?: string }> : [];
    const adminBio = adminLog.slice().reverse().slice(0, 20);
    // Metriky: počet zariadení čo zaregistrovali admin bio + dnešné OK/zamietnuté
    const adminDevices = new Set(adminLog.filter(e => e.event === "register" && e.ok && e.device).map(e => e.device)).size;
    const adminTodayOk = adminLog.filter(e => e.ok && new Date(e.ts).getTime() >= todayStartMs).length;
    const adminTodayFail = adminLog.filter(e => !e.ok && new Date(e.ts).getTime() >= todayStartMs).length;
    const adminLastActivity = adminLog.length > 0 ? adminLog[adminLog.length - 1].ts : null;
    const adminBioStats = { devices: adminDevices, todayOk: adminTodayOk, todayFail: adminTodayFail, lastActivity: adminLastActivity };

    res.json({ ok: true, stats: { totalClients, bioClients, todaySuccess, todayFailed, alerts, lastActivity, recent, adminBio, adminBioStats } });
  } catch (err) {
    req.log.error({ err }, "biometric-stats failed");
    res.status(500).json({ ok: false });
  }
});

export default router;
