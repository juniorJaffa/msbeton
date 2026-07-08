import { bioErrorToSk } from "./bioPlatform";

const TOKEN_KEY = "msbeton_admin_token";
const ATTEMPTS_KEY = "msbeton_login_attempts";
const WEBAUTHN_KEY = "msbeton_webauthn_cred";
const DEVICE_FP_KEY = "msbeton_admin_bio_device";
const SESSION_ID_KEY = "msbeton_admin_session_id";
const DEVICE_NAME_KEY = "msbeton_admin_device_name";

// Stabilné ID tohto admin zariadenia/prehliadača — pre presence + audit log.
// Viacero ľudí zdieľa login "msbeton" (Peter mobil, administratorka NB) → rozlíši ich session, nie login.
// KRITICKÉ: identita = náhodné UUID, NIE label. Dva rovnaké iPhony = dve rôzne UUID = dve session.
export function getAdminSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// Vlastný názov zariadenia (voliteľný) — admin si pomenuje "Peter iPhone" / "Vladko iPhone".
// Rieši 2 rovnaké telefóny: auto-label je u oboch "iPhone Safari", custom názov ich odlíši.
export function getAdminDeviceName(): string {
  return localStorage.getItem(DEVICE_NAME_KEY) ?? "";
}
export function setAdminDeviceName(name: string): void {
  const v = name.trim().slice(0, 40);
  if (v) localStorage.setItem(DEVICE_NAME_KEY, v);
  else localStorage.removeItem(DEVICE_NAME_KEY);
}

// Auto názov zariadenia z userAgent — "iPhone Safari", "Mac Chrome", "Windows Edge"…
export function getAdminDeviceAuto(): string {
  const ua = navigator.userAgent;
  let os = "Zariadenie";
  if (/iPhone/.test(ua)) os = "iPhone";
  else if (/iPad/.test(ua)) os = "iPad";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Macintosh|Mac OS X/.test(ua)) os = "Mac";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Linux/.test(ua)) os = "Linux";
  let br = "";
  if (/Edg\//.test(ua)) br = "Edge";
  else if (/OPR\/|Opera/.test(ua)) br = "Opera";
  else if (/Chrome\//.test(ua)) br = "Chrome";
  else if (/Firefox\//.test(ua)) br = "Firefox";
  else if (/Version\/.*Safari/.test(ua)) br = "Safari";
  return br ? `${os} ${br}` : os;
}

// Label posielaný na server: custom názov ak je, inak auto + krátky hash session
// (#a3f2) aby 2 rovnaké zariadenia boli rozlíšiteľné aj bez custom názvu.
export function getAdminDeviceLabel(): string {
  const custom = getAdminDeviceName();
  if (custom) return custom;
  return `${getAdminDeviceAuto()} · #${getAdminSessionId().replace(/-/g, "").slice(0, 4)}`;
}


const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000;

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function loginWithApi(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json() as { ok: boolean; token?: string; error?: string };
    if (data.ok && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      resetAttempts();
      return { ok: true };
    }
    return { ok: false, error: data.error ?? "Nesprávne prihlasovacie údaje" };
  } catch {
    return { ok: false, error: "Server nedostupný" };
  }
}

export function checkCredentials(_username: string, _password: string): boolean {
  // Zachované pre kompatibilitu — skutočné overenie je na serveri cez loginWithApi
  return false;
}

export function isLoggedIn(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Date.now() / 1000 < (payload.exp as number);
  } catch {
    return false;
  }
}

// Rola z admin JWT. Hierarchia: admin (superadmin msbeton) > manager (Správca) > reader (Čítateľ)
export function getAdminRole(): "admin" | "manager" | "reader" | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (Date.now() / 1000 >= (payload.exp as number)) return null;
    return payload.role === "reader" ? "reader" : payload.role === "manager" ? "manager" : "admin";
  } catch {
    return null;
  }
}

export function isReader(): boolean {
  return getAdminRole() === "reader";
}

// Správca — môže upravovať, ale nie povyšovať/mazať klientov/server destruktívne
export function isManager(): boolean {
  return getAdminRole() === "manager";
}

// Superadmin (msbeton) — plný prístup vrátane povyšovania adminov a server akcií
export function isSuper(): boolean {
  return getAdminRole() === "admin";
}

export function login(): void {
  // noop — token is set by loginWithApi
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAttemptInfo(): { count: number; locked: boolean; remainingMs: number } {
  const raw = localStorage.getItem(ATTEMPTS_KEY);
  if (!raw) return { count: 0, locked: false, remainingMs: 0 };
  try {
    const { count, lockedUntil } = JSON.parse(raw);
    const now = Date.now();
    if (lockedUntil && now < lockedUntil) {
      return { count, locked: true, remainingMs: lockedUntil - now };
    }
    if (lockedUntil && now >= lockedUntil) {
      resetAttempts();
      return { count: 0, locked: false, remainingMs: 0 };
    }
    return { count, locked: false, remainingMs: 0 };
  } catch {
    return { count: 0, locked: false, remainingMs: 0 };
  }
}

export function recordFailedAttempt(): number {
  const { count } = getAttemptInfo();
  const newCount = count + 1;
  const lockedUntil = newCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : null;
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count: newCount, lockedUntil }));
  return newCount;
}

export function resetAttempts(): void {
  localStorage.removeItem(ATTEMPTS_KEY);
}

// ── WebAuthn / Biometric ──────────────────────────────────────────────────────

export function isBiometricAvailable(): boolean {
  return typeof window !== "undefined"
    && !!window.PublicKeyCredential
    && typeof navigator.credentials?.create === "function";
}

export function hasStoredCredential(): boolean {
  return !!localStorage.getItem(WEBAUTHN_KEY);
}

export function clearBiometric(): void {
  localStorage.removeItem(WEBAUTHN_KEY);
  localStorage.removeItem(DEVICE_FP_KEY); // cleanup legacy fingerprint
}

function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

// Nahlás admin bio udalosť na server (informačný log — admin bio je client-side)
export function reportAdminBioEvent(event: "register" | "auth", ok: boolean, reason?: string): void {
  try {
    fetch("/api/admin/biometric-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ok, reason, deviceLabel: getAdminDeviceLabel() }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* fire-and-forget */ }
}

export async function registerBiometric(): Promise<{ ok: boolean; error?: string }> {
  try {
    await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: "MS-BETON Admin", id: location.hostname },
        user: {
          id: new TextEncoder().encode("msbeton-admin"),
          name: "msbeton",
          displayName: "MS-BETON Admin",
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
    });
    // Store only a flag — NOT the rawId. Each device discovers its own passkey
    // via iCloud Keychain during auth (no allowCredentials). Storing rawId caused
    // cross-device invalidation: iPhone register → new credId in iCloud → Mac auth
    // fails with stored old credId → NotAllowedError → clearBiometric → re-register loop.
    localStorage.setItem(WEBAUTHN_KEY, "1");
    localStorage.removeItem(DEVICE_FP_KEY); // cleanup legacy fingerprint
    reportAdminBioEvent("register", true);
    return { ok: true };
  } catch (err: unknown) {
    reportAdminBioEvent("register", false, bioErrorToSk(err));
    return { ok: false, error: String(err) };
  }
}

export async function authenticateBiometric(): Promise<{ ok: boolean; error?: string }> {
  if (!localStorage.getItem(WEBAUTHN_KEY)) return { ok: false, error: "No credential stored" };
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId: location.hostname,
        // No allowCredentials — let platform/iCloud pick the passkey.
        // Pinning to a specific rawId causes NotAllowedError when iCloud syncs
        // a new credId from another device (iPhone↔Mac re-register loop).
        userVerification: "required",
        timeout: 60000,
      },
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = String(err);
    // NotSupportedError = platform permanently can't do WebAuthn → clear flag
    // NotAllowedError = user cancelled OR no passkey — don't auto-clear (user can retry or use password fallback)
    if (msg.includes("NotSupportedError")) {
      clearBiometric();
    }
    return { ok: false, error: msg };
  }
}

// Combines WebAuthn challenge + server JWT issuance.
// Replaces the old pattern of authenticateBiometric() + login() (noop).
export async function authenticateBiometricAndGetToken(): Promise<{ ok: boolean; error?: string }> {
  const bioResult = await authenticateBiometric();
  if (!bioResult.ok) return bioResult;
  try {
    const res = await fetch("/api/admin/biometric-token", { method: "POST" });
    const data = await res.json() as { ok: boolean; token?: string };
    if (data.ok && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      return { ok: true };
    }
    return { ok: false, error: "Token refresh failed" };
  } catch {
    return { ok: false, error: "Server nedostupný" };
  }
}
