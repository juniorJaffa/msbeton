// Ring buffer posledných 500 udalostí — diagnostic log, vymazaný pri PM2 reštarte.
// Pre trvalý audit použiť audit_log v DB (admin.ts mergeSaveArray).

export interface AppEvent {
  ts: string;          // ISO timestamp
  ev: string;          // typ udalosti
  [key: string]: unknown;
}

const BUF_MAX = 500;
const buf: AppEvent[] = [];

export function logEvent(fields: Omit<AppEvent, "ts">): void {
  buf.push({ ts: new Date().toISOString(), ...fields } as AppEvent);
  if (buf.length > BUF_MAX) buf.splice(0, buf.length - BUF_MAX);
}

export function getEvents(limit = 100, evFilter?: string): AppEvent[] {
  const src = evFilter ? buf.filter(e => e.ev === evFilter || String(e.ev).startsWith(evFilter)) : buf;
  return src.slice(-Math.min(limit, BUF_MAX)).reverse();
}
