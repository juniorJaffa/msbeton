import { clientApi, type LoggedClient } from "./api";

const SESSION_KEY = "msbeton_client_session";

export type { LoggedClient };

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
    const result = await clientApi.login(clientId, password);
    if (!result) return { ok: false, error: "Nepodarilo sa pripojiť k serveru. Skúste znova." };
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
