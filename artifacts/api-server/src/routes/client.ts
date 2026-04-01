import { Router } from "express";
import { db, adminConfig } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

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
  // 1. Try unified clients list (new structure)
  const clientRows = await db.select().from(adminConfig).where(eq(adminConfig.key, "clients"));
  if (clientRows.length > 0 && Array.isArray(clientRows[0].data)) {
    const clients = clientRows[0].data as UnifiedClient[];
    const active = clients.filter((c) => c.loginId && c.password && c.active !== false);
    if (active.length > 0) return active;
  }

  // 2. Try legacy client_accounts
  const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, "client_accounts"));
  if (rows.length > 0 && Array.isArray(rows[0].data) && (rows[0].data as LegacyClientAccount[]).length > 0) {
    const legacy = rows[0].data as LegacyClientAccount[];
    return legacy.map((a) => ({
      id: a.id, loginId: a.clientId, password: a.password,
      name: a.name, discountBeton: a.discountPct ?? 0, active: a.active,
    }));
  }

  return DEFAULT_CLIENT_ACCOUNTS;
}

router.post("/login", async (req, res) => {
  try {
    const { clientId, password } = req.body ?? {};
    if (!clientId || !password) {
      return res.status(400).json({ ok: false, error: "Chýba ID alebo heslo" });
    }
    const accounts = await getClientAccounts();
    const account = accounts.find(
      (a) => a.loginId === String(clientId) && a.password === String(password) && a.active !== false
    );
    if (!account) {
      return res.status(401).json({ ok: false, error: "Nesprávne prihlasovacie údaje" });
    }
    const fullName = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.name || "Klient";
    res.json({
      ok: true,
      client: {
        id: account.id,
        clientId: account.loginId,
        name: fullName,
        company: account.company ?? "",
        discountBeton: account.discountBeton ?? account.discountPct ?? 0,
        discountDoprava: account.discountDoprava ?? 0,
        discountSluzby: account.discountSluzby ?? 0,
        discountCelkovo: account.discountCelkovo ?? 0,
        canHotovost: account.canHotovost ?? true,
        canPridatBeton: account.canPridatBeton ?? true,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Client login failed");
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
