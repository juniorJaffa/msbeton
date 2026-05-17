import { clientApi, type LoggedClient } from "./api";
import { checkCredentials } from "./adminAuth";

const SESSION_KEY = "msbeton_client_session";
const CLIENT_WEBAUTHN_KEY = "msbeton_client_webauthn";
const CLIENT_ATTEMPTS_KEY = "msbeton_client_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000;

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
};

// ── WebAuthn helpers ──────────────────────────────────────────────────────────

function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// ── Rate limiting ──────────────────────────────────────────────────────────────

export function getClientAttemptInfo(): { count: number; locked: boolean; remainingMs: number } {
  const raw = localStorage.getItem(CLIENT_ATTEMPTS_KEY);
  if (!raw) return { count: 0, locked: false, remainingMs: 0 };
  try {
    const { count, lockedUntil } = JSON.parse(raw);
    const now = Date.now();
    if (lockedUntil && now < lockedUntil) return { count, locked: true, remainingMs: lockedUntil - now };
    if (lockedUntil && now >= lockedUntil) {
      localStorage.removeItem(CLIENT_ATTEMPTS_KEY);
      return { count: 0, locked: false, remainingMs: 0 };
    }
    return { count, locked: false, remainingMs: 0 };
  } catch { return { count: 0, locked: false, remainingMs: 0 }; }
}

export function recordClientFailedAttempt(): number {
  const { count } = getClientAttemptInfo();
  const newCount = count + 1;
  const lockedUntil = newCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : null;
  localStorage.setItem(CLIENT_ATTEMPTS_KEY, JSON.stringify({ count: newCount, lockedUntil }));
  return newCount;
}

export function resetClientAttempts(): void {
  localStorage.removeItem(CLIENT_ATTEMPTS_KEY);
}

// ── Biometric / WebAuthn ──────────────────────────────────────────────────────

export function isBiometricAvailable(): boolean {
  return typeof window !== "undefined"
    && !!window.PublicKeyCredential
    && typeof navigator.credentials?.create === "function";
}

export function hasClientBiometric(): boolean {
  return !!localStorage.getItem(CLIENT_WEBAUTHN_KEY);
}

export function clearClientBiometric(): void {
  localStorage.removeItem(CLIENT_WEBAUTHN_KEY);
}

export async function registerClientBiometric(clientId: string, displayName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: "MS-BETON Klient", id: location.hostname },
        user: {
          id: new TextEncoder().encode(`msbeton-client-${clientId}`),
          name: `klient-${clientId}`,
          displayName,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential;
    localStorage.setItem(CLIENT_WEBAUTHN_KEY, JSON.stringify({
      credId: b64url(cred.rawId),
      clientId,
    }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function authenticateClientBiometric(): Promise<{ ok: boolean; clientId?: string; error?: string }> {
  const storedStr = localStorage.getItem(CLIENT_WEBAUTHN_KEY);
  if (!storedStr) return { ok: false, error: "Žiadna uložená biometria" };
  try {
    const stored: { credId: string; clientId: string } = JSON.parse(storedStr);
    await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId: location.hostname,
        allowCredentials: [{ type: "public-key", id: b64urlDecode(stored.credId) }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return { ok: true, clientId: stored.clientId };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const clientAuth = {
  getLoggedClient(): LoggedClient | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as LoggedClient) : null;
    } catch { return null; }
  },

  async login(clientId: string, password: string): Promise<{ ok: boolean; error?: string; client?: LoggedClient }> {
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

  updateSession(client: LoggedClient): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(client));
    window.dispatchEvent(new Event("client-session-changed"));
  },

  async refreshSession(): Promise<void> {
    const current = this.getLoggedClient();
    if (!current || current.id === "admin") return;
    const result = await clientApi.me(current.id);
    if (result?.ok && result.client) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(result.client));
      window.dispatchEvent(new Event("client-session-changed"));
    }
  },
};
