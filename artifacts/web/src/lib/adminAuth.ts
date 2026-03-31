const AUTH_KEY = "msbeton_admin_auth";
const ATTEMPTS_KEY = "msbeton_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

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
