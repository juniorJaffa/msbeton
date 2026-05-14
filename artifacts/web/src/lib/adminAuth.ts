const AUTH_KEY = "msbeton_admin_auth";
const ATTEMPTS_KEY = "msbeton_login_attempts";
const WEBAUTHN_KEY = "msbeton_webauthn_cred";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000;

const ADMIN_USER = "msbeton";
const ADMIN_PASS_HASH = btoa("Msbeton2023");

export function checkCredentials(username: string, password: string): boolean {
  return username.trim().toLowerCase() === ADMIN_USER && btoa(password) === ADMIN_PASS_HASH;
}

export function isLoggedIn(): boolean {
  const token = localStorage.getItem(AUTH_KEY);
  if (!token) return false;
  try {
    const { expiry } = JSON.parse(atob(token));
    return Date.now() < expiry;
  } catch {
    return false;
  }
}

export function login(): void {
  const expiry = Date.now() + 8 * 60 * 60 * 1000;
  localStorage.setItem(AUTH_KEY, btoa(JSON.stringify({ expiry, user: ADMIN_USER })));
  resetAttempts();
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
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
    return { ok: false, error: String(err) };
  }
}
