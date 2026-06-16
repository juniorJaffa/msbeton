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
  company: "MS-BETON, spol. s r.o.",
  discountBeton: 0,
  discountDoprava: 0,
  discountSluzby: 0,
  discountCelkovo: 0,
  canHotovost: true,
  canPridatBeton: true,
  canPridatBetonOwn: true,
};

// ── WebAuthn pomocné funkcie ──────────────────────────────────────────────────

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// Serializácia PublicKeyCredential (registrácia) do JSON objektu pre server
function serializeRegistration(cred: PublicKeyCredential): Record<string, unknown> {
  const resp = cred.response as AuthenticatorAttestationResponse;
  return {
    id: cred.id,
    rawId: b64url(cred.rawId),
    response: {
      clientDataJSON: b64url(resp.clientDataJSON),
      attestationObject: b64url(resp.attestationObject),
      transports: resp.getTransports?.() ?? [],
    },
    type: "public-key",
    clientExtensionResults: cred.getClientExtensionResults(),
  };
}

// Serializácia PublicKeyCredential (autentifikácia) do JSON objektu pre server
function serializeAuthentication(cred: PublicKeyCredential): Record<string, unknown> {
  const resp = cred.response as AuthenticatorAssertionResponse;
  return {
    id: cred.id,
    rawId: b64url(cred.rawId),
    response: {
      clientDataJSON: b64url(resp.clientDataJSON),
      authenticatorData: b64url(resp.authenticatorData),
      signature: b64url(resp.signature),
      userHandle: resp.userHandle ? b64url(resp.userHandle) : null,
    },
    type: "public-key",
    clientExtensionResults: cred.getClientExtensionResults(),
  };
}

// ── Obmedzenie počtu pokusov ──────────────────────────────────────────────────

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

// ── Biometria / WebAuthn ──────────────────────────────────────────────────────

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

// Registrácia biometrie klienta — serverová výzva + uloženie verejného kľúča
export async function registerClientBiometric(
  clientInternalId: string,  // session.id (UUID)
  loginId: string,           // session.clientId (loginId pre autentifikačnú výzvu)
  displayName: string
): Promise<{ ok: boolean; error?: string; already?: boolean }> {
  try {
    // 1. Získaj registračnú výzvu zo servera
    const challengeRes = await fetch("/api/client/webauthn/reg-challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientInternalId }),
    });
    const challengeData = await challengeRes.json() as { ok: boolean; options?: Record<string, unknown>; error?: string };
    if (!challengeData.ok || !challengeData.options) return { ok: false, error: challengeData.error ?? "Server nedostupný" };

    const opts = challengeData.options as {
      challenge: string;
      rp: { name: string; id: string };
      user: { id: string; name: string; displayName: string };
      pubKeyCredParams: PublicKeyCredentialParameters[];
      authenticatorSelection?: AuthenticatorSelectionCriteria;
      excludeCredentials?: Array<{ id: string; type: string }>;
      timeout?: number;
    };

    // 2. Vytvor credential na zariadení
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: b64urlDecode(opts.challenge),
        rp: opts.rp,
        user: {
          id: b64urlDecode(opts.user.id),
          name: opts.user.name,
          displayName: displayName || opts.user.displayName,
        },
        pubKeyCredParams: opts.pubKeyCredParams,
        authenticatorSelection: opts.authenticatorSelection,
        excludeCredentials: (opts.excludeCredentials ?? []).map((c) => ({
          id: b64urlDecode(c.id),
          type: c.type as PublicKeyCredentialType,
        })),
        timeout: opts.timeout ?? 60000,
      },
    }) as PublicKeyCredential;

    // 3. Pošli credential serveru na overenie + uloženie
    const completeRes = await fetch("/api/client/webauthn/reg-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientInternalId,
        credential: serializeRegistration(cred),
      }),
    });
    const completeData = await completeRes.json() as { ok: boolean; error?: string };
    if (!completeData.ok) return { ok: false, error: completeData.error ?? "Registrácia zlyhala" };

    // 4. Ulož credential ID lokálne (pre vyhľadanie pri autentifikácii)
    localStorage.setItem(CLIENT_WEBAUTHN_KEY, JSON.stringify({ credId: cred.id, loginId }));
    return { ok: true };
  } catch (err) {
    const msg = String(err);
    // InvalidStateError = zariadenie už MÁ passkey pre tento účet (napr. macOS iCloud Keychain
    // zdieľaný Safari↔Chrome). Biometria je teda už aktívna a server credential má → úspech.
    if (msg.includes("InvalidStateError")) {
      localStorage.setItem(CLIENT_WEBAUTHN_KEY, JSON.stringify({ credId: "device-passkey", loginId }));
      return { ok: true, already: true };
    }
    if (msg.includes("NotAllowedError")) return { ok: false, error: "Registrácia zrušená (Face ID neschválené)" };
    if (msg.includes("NotSupportedError")) return { ok: false, error: "Zariadenie nepodporuje biometriu" };
    if (msg.includes("SecurityError")) return { ok: false, error: "Biometria nie je dostupná — skúste obnoviť stránku" };
    return { ok: false, error: "Registrácia zlyhala — skúste znova" };
  }
}

// Autentifikácia cez biometriu — pri úspechu vráti celú session
export async function authenticateClientBiometric(): Promise<{ ok: boolean; session?: LoggedClient; error?: string }> {
  const storedStr = localStorage.getItem(CLIENT_WEBAUTHN_KEY);
  if (!storedStr) return { ok: false, error: "Žiadna uložená biometria" };
  try {
    const stored: { credId: string; loginId: string } = JSON.parse(storedStr);
    if (!stored.credId || !stored.loginId) return { ok: false, error: "Poškodený záznam biometrie" };

    // 1. Získaj autentifikačnú výzvu zo servera
    const challengeRes = await fetch("/api/client/webauthn/auth-challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId: stored.loginId }),
    });
    const challengeData = await challengeRes.json() as { ok: boolean; options?: Record<string, unknown>; error?: string };
    if (!challengeData.ok || !challengeData.options) return { ok: false, error: "Server nedostupný" };

    const opts = challengeData.options as {
      challenge: string;
      rpId: string;
      allowCredentials?: Array<{ id: string; type: string }>;
      userVerification?: UserVerificationRequirement;
      timeout?: number;
    };

    // Server nevrátil žiadne allowCredentials — biometria nie je registrovaná na serveri
    if (!opts.allowCredentials?.length) {
      clearClientBiometric();
      return { ok: false, error: "Biometria nie je registrovaná" };
    }

    // 2. Vykonaj biometrickú autentifikáciu na zariadení
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: b64urlDecode(opts.challenge),
        rpId: opts.rpId,
        allowCredentials: opts.allowCredentials.map((c) => ({
          id: b64urlDecode(c.id),
          type: c.type as PublicKeyCredentialType,
        })),
        userVerification: opts.userVerification ?? "required",
        timeout: opts.timeout ?? 60000,
      },
    }) as PublicKeyCredential;

    // 3. Over assertion na serveri + získaj session
    const completeRes = await fetch("/api/client/webauthn/auth-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: stored.loginId,
        credential: serializeAuthentication(cred),
      }),
    });
    const completeData = await completeRes.json() as { ok: boolean; client?: LoggedClient; adminToken?: string; error?: string };
    if (!completeData.ok || !completeData.client) {
      // Server odmietol credential (nesúlad, crypto chyba, neznáme zariadenie) — vymaž starý lokálny kľúč
      clearClientBiometric();
      return { ok: false, error: completeData.error ?? "Overenie zlyhalo" };
    }
    // Povýšený klient (Správca/Čítateľ) cez biometriu → ulož admin token pre admin prostredie
    if (completeData.adminToken) localStorage.setItem("msbeton_admin_token", completeData.adminToken);
    return { ok: true, session: completeData.client };
  } catch (err: unknown) {
    const msg = String(err);
    // Vymaž starý lokálny credential ak ho zariadenie už nemá
    if (msg.includes("NotAllowedError") || msg.includes("NotSupportedError") || msg.includes("InvalidStateError")) {
      clearClientBiometric();
      return { ok: false, error: "Biometria zamietnutá alebo nedostupná" };
    }
    if (msg.includes("SecurityError")) return { ok: false, error: "Chyba konfigurácie biometrie — skúste obnoviť stránku" };
    return { ok: false, error: "Biometrická autentifikácia zlyhala" };
  }
}

// Odstráň biometriu zo servera + lokálneho úložiska
export async function forgetClientBiometric(): Promise<void> {
  const storedStr = localStorage.getItem(CLIENT_WEBAUTHN_KEY);
  if (storedStr) {
    try {
      const stored: { credId: string; loginId: string } = JSON.parse(storedStr);
      const session = localStorage.getItem("msbeton_client_session");
      if (session) {
        const client = JSON.parse(session) as LoggedClient;
        if (client.id && stored.credId) {
          await fetch(`/api/client/webauthn/credential/${encodeURIComponent(stored.credId)}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientInternalId: client.id }),
          }).catch(() => {});
        }
      }
    } catch {}
  }
  clearClientBiometric();
}

// ── Autentifikácia ────────────────────────────────────────────────────────────

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
    // Admin-čitateľ: server vydal read-only admin token (role:reader) → ulož pre admin prostredie
    if (result.adminToken) localStorage.setItem("msbeton_admin_token", result.adminToken);
    window.dispatchEvent(new Event("client-session-changed"));
    return { ok: true, client: result.client };
  },

  logout(): void {
    // Zachovaj CLIENT_WEBAUTHN_KEY — biometria prežije odhlásenie (bankový vzor)
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("msbeton_admin_token"); // zmaž aj prípadný reader admin token
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
