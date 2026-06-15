// In-memory presence tracking pre prihlásených adminov (multi-admin awareness).
// Každý admin klient posiela X-Admin-Session + X-Admin-Device na každom requeste.
// Heartbeat = samotný poll /presence drží lastSeen čerstvé.
//
// Nie je perzistované — po reštarte API sa zoznam vyprázdni a obnoví z ďalších heartbeatov.
// To je v poriadku: presence je "kto je práve online", nie audit (ten je v DB).

export interface PresenceEntry {
  session: string;
  device: string;
  ip: string;
  role: string;        // "admin" | "reader"
  lastSeen: number;    // epoch ms
}

const presence = new Map<string, PresenceEntry>();

// Po akom čase bez heartbeatu sa session považuje za offline.
export const PRESENCE_TTL_MS = 35_000;

export function touchPresence(session: string, device: string, ip: string, role: string): void {
  if (!session) return;
  presence.set(session, { session, device: device || "Zariadenie", ip: ip || "?", role, lastSeen: Date.now() });
}

export function getActivePresence(): PresenceEntry[] {
  const now = Date.now();
  const out: PresenceEntry[] = [];
  for (const [sid, e] of presence) {
    if (now - e.lastSeen > PRESENCE_TTL_MS) { presence.delete(sid); continue; }
    out.push(e);
  }
  // najnovšia aktivita hore
  return out.sort((a, b) => b.lastSeen - a.lastSeen);
}

export function dropPresence(session: string): void {
  if (session) presence.delete(session);
}
