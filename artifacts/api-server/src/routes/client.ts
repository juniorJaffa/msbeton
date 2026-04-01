import { Router } from "express";
import { db, adminConfig } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

interface ClientAccount {
  id: string;
  clientId: string;
  password: string;
  name: string;
  discountPct: number;
  discountGroup: string;
  active: boolean;
}

const DEFAULT_CLIENT_ACCOUNTS: ClientAccount[] = [
  { id: "ca1", clientId: "20", password: "1234", name: "Testovací klient", discountPct: 20, discountGroup: "B", active: true },
];

async function getClientAccounts(): Promise<ClientAccount[]> {
  const rows = await db.select().from(adminConfig).where(eq(adminConfig.key, "client_accounts"));
  if (rows.length > 0 && Array.isArray(rows[0].data) && (rows[0].data as ClientAccount[]).length > 0) {
    return rows[0].data as ClientAccount[];
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
      (a) => a.clientId === String(clientId) && a.password === String(password) && a.active
    );
    if (!account) {
      return res.status(401).json({ ok: false, error: "Nesprávne prihlasovacie údaje" });
    }
    res.json({
      ok: true,
      client: {
        id: account.id,
        clientId: account.clientId,
        name: account.name,
        discountPct: account.discountPct,
        discountGroup: account.discountGroup,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Client login failed");
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
