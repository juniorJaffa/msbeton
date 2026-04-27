import { clientApi, type LoggedClient } from "./api";
import { checkCredentials } from "./adminAuth";

const SESSION_KEY = "msbeton_client_session";

export type { LoggedClient };

const ADMIN_CLIENT: LoggedClient = {
  id: "admin",
  clientId: "msbeton",
  name: "Admin",
  company: "MS-BETON s.r.o.",
  discountBeton: 0,
  discountDoprava: 0,
  discountSluzby: 0,
  discountCelkovo: 0,
  canHotovost: true,
  canPridatBeton: true,
  canZimneOpatrenia: true,
};

export const clientAuth = {
  getLoggedClient(): LoggedClient | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as LoggedClient) : null;
    } catch {
      return null;
    }
  },

  async login(clientId: string, password: string): Promise<{ ok: boolean; error?: string; client?: LoggedClient }> {
    // Admin sa môže prihlásiť do kalkulačky rovnakými údajmi ako do adminu
    if (checkCredentials(clientId, password)) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(ADMIN_CLIENT));
      window.dispatchEvent(new Event("client-session-changed"));
      return { ok: true, client: ADMIN_CLIENT };
    }
    const result = await clientApi.login(clientId, password);
    if (!result) return { ok: false, error: "Server nedostupný" };
    if (!result.ok || !result.client) return { ok: false, error: result.error ?? "Nesprávne prihlasovacie údaje" };
    localStorage.setItem(SESSION_KEY, JSON.stringify(result.client));
    window.dispatchEvent(new Event("client-session-changed"));
    return { ok: true, client: result.client };
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("client-session-changed"));
  },
};
