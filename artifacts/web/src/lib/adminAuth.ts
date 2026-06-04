const TOKEN_KEY = "msbeton_admin_token";
const ATTEMPTS_KEY = "msbeton_login_attempts";
const WEBAUTHN_KEY = "msbeton_webauthn_cred";
const DEVICE_FP_KEY = "msbeton_admin_bio_device";

function getDeviceFingerprint(): string {
  return [navigator.platform, `${screen.width}x${screen.height}`, navigator.hardwareConcurrency ?? 0].join("|");
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
  // Kept for compatibility — actual check is server-side via loginWithApi
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
  if (!localStorage.getItem(WEBAUTHN_KEY)) return false;
  const fp = localStorage.getItem(DEVICE_FP_KEY);
  if (!fp) return true; // legacy registration without fingerprint
  return fp === getDeviceFingerprint();
}

export function clearBiometric(): void {
  localStorage.removeItem(WEBAUTHN_KEY);
  localStorage.removeItem(DEVICE_FP_KEY);
}

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

export async function registerBiometric(): Promise<{ ok: boolean; error?: string }> {
  try {
    const cred = await navigator.credentials.create({
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
    }) as PublicKeyCredential;
    localStorage.setItem(WEBAUTHN_KEY, b64url(cred.rawId));
    localStorage.setItem(DEVICE_FP_KEY, getDeviceFingerprint());
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

export async function authenticateBiometric(): Promise<{ ok: boolean; error?: string }> {
  const stored = localStorage.getItem(WEBAUTHN_KEY);
  if (!stored) return { ok: false, error: "No credential stored" };
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId: location.hostname,
        allowCredentials: [{ type: "public-key", id: b64urlDecode(stored) }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = String(err);
    // If credential not found on this device, clear stale key so next visit shows form directly
    if (msg.includes("NotAllowedError") || msg.includes("NotSupportedError") || msg.includes("InvalidStateError")) {
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
