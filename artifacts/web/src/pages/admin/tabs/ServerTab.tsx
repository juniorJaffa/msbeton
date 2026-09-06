import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, HardDrive, Database, Activity, Server, Download, CheckCircle, XCircle, Clock, Archive, Shield, Trash2, ShieldAlert, Info, List, PackageCheck, UserPlus, Mail, AlertCircle, Ban, AlertTriangle } from "lucide-react";
import { ClientBiometriaPanel } from "./ClientBiometriaPanel";
import { AdminAccessPanel } from "./AdminAccessPanel";
import { isSuper } from "@/lib/adminAuth";

interface ServerStatus {
  pm2: { status: string; uptimeMs: number; restarts: number; memoryBytes: number };
  disk: { total: string; used: string; avail: string; percent: string; percentNum: number };
  dbSize: string;
  uptime: string;
  backups: { file: string; sizeKb: number; mtime: string }[];
  lastLog: string;
  sslExpiry: string | null;
  backupCron: string;
  security: {
    hits4xx: number;
    hits5xx: number;
    wpProbes: number;
    rateLimitHits: number;
    bannedIps: number;
    wpBannedList: { ip: string; country?: string; countryCode?: string; org?: string }[];
    wpBantime: number;
    topIps: { ip: string; count: number }[];
    cfGuard?: { active: boolean; lastRun: string | null; lastUnbanned: number };
  };
}

function fmtBantime(secs: number): string {
  if (secs < 0) return "∞";
  const h = Math.floor(secs / 3600);
  const d = Math.floor(h / 24);
  if (d > 0) return `BAN ${d}d`;
  if (h > 0) return `BAN ${h}h`;
  return `BAN ${Math.floor(secs / 60)}m`;
}

function fmtUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function fmtMem(bytes: number): string {
  if (!bytes) return "?";
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("sk-SK", { day: "2-digit", month: "2-digit" }) + " " +
    d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
}

function fmtBackupName(file: string): string {
  // msbeton_20260529_111340.sql.gz → 29.05 11:13
  const m = file.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
  if (!m) return file;
  return `${m[3]}.${m[2]}.${m[1]}  ${m[4]}:${m[5]}`;
}

// ── Activity Log typovanie ────────────────────────────────────────────────────
interface AppEvent {
  ts: string;
  ev: string;
  orderId?: string;
  clientId?: string;
  clientName?: string;
  tab?: string;
  concreteType?: string;
  qty?: number;
  totalSDph?: number;
  ip?: string;
  isVerifiedClient?: boolean;
  viaSms?: boolean;
  address?: string;
  km?: number;
  reason?: string;
  kept?: number;
  preserved?: number;
  mergedFromOthers?: number;
  device?: string;
  role?: string;
  toEmail?: string;
  error?: string | null;
  [key: string]: unknown;
}

function evIcon(ev: string) {
  if (ev === "order_saved") return <PackageCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />;
  if (ev === "order_rejected") return <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />;
  if (ev === "order_error") return <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />;
  if (ev === "clients_saved") return <UserPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
  if (ev === "email_sent") return <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
  if (ev === "email_failed") return <Mail className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  if (ev === "order_large_breakdown") return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  return <Activity className="w-3.5 h-3.5 text-gray-400 shrink-0" />;
}
function evBg(ev: string) {
  if (ev === "order_saved") return "bg-green-50 border-green-100";
  if (ev.startsWith("order_rej") || ev.startsWith("order_err")) return "bg-red-50 border-red-100";
  if (ev === "order_large_breakdown") return "bg-amber-50 border-amber-100";
  if (ev === "clients_saved") return "bg-blue-50 border-blue-100";
  if (ev === "email_sent") return "bg-purple-50 border-purple-100";
  if (ev === "email_failed") return "bg-red-50 border-red-100";
  return "bg-gray-50 border-gray-100";
}
function evSummary(e: AppEvent): string {
  if (e.ev === "order_saved") {
    const tab = e.tab === "pumpa" ? "Pumpa" : e.tab === "mix" ? "Mix" : "Vlastná";
    const who = e.clientName ? e.clientName : e.clientId ? `ID ${e.clientId}` : "Anon";
    return `Objednávka — ${who} · ${e.concreteType ?? "?"} · ${e.qty ?? "?"}m³ · ${tab}${e.totalSDph != null ? ` · ${Number(e.totalSDph).toLocaleString("sk-SK", { minimumFractionDigits: 2 })}€` : ""}`;
  }
  if (e.ev === "order_rejected") {
    const why: Record<string, string> = { rate_limit: "Rate limit", captcha_missing: "Chýba CAPTCHA", captcha_fail: "CAPTCHA fail", honeypot: "Bot", missing_data: "Zlé dáta" };
    return `Odmietnutá objednávka — ${why[e.reason ?? ""] ?? e.reason ?? "?"} · IP ${e.ip ?? "?"}`;
  }
  if (e.ev === "order_error") return `Chyba ukladania objednávky · ${e.error ?? ""}`;
  if (e.ev === "clients_saved") {
    const by = e.device ? ` · ${e.device}` : "";
    const merged = e.mergedFromOthers ? ` · zlúčené: ${e.mergedFromOthers}` : "";
    return `Klienti uložení — ${e.kept ?? "?"} záznamov${merged}${by}`;
  }
  if (e.ev === "email_sent") return `Email odoslaný → ${e.toEmail ?? "?"}`;
  if (e.ev === "email_failed") return `Email zlyhal → ${e.toEmail ?? "?"} · ${e.error ?? ""}`;
  if (e.ev === "order_large_breakdown") {
    const kb = e.breakdownBytes ? Math.round((e.breakdownBytes as number) / 1024) : "?";
    const stripped = (e.breakdownTruncated as boolean) ? " — breakdown VYNECHANÉ" : "";
    const via = (e.viaSms as boolean) ? " · SMS" : " · Košík";
    return `Veľký breakdown — ${kb} KB${via}${stripped}${e.orderId ? ` · ID ${e.orderId}` : ""}`;
  }
  return e.ev;
}
function fmtEventTime(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}
function fmtEventDate(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Dnes";
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Včera";
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}`;
}

// ── MapGpsLog — Map GPS/DM debug log z localStorage ─────────────────────────
const EVENT_COLORS: Record<string, string> = {
  gps_success: "text-green-600", gps_error: "text-red-600", gps_requested: "text-blue-500",
  dm_ok: "text-green-600", dm_fallback_haversine: "text-amber-600",
  nominatim_ok: "text-green-600", nominatim_non_sk: "text-red-600",
  nominatim_http_error: "text-red-500", nominatim_exception: "text-red-700",
  nominatim_stale: "text-gray-400", nominatim_stale_post_json: "text-gray-400",
  nominatim_start: "text-gray-500",
};
function MapGpsLog() {
  const [mapLogs, setMapLogs] = useState<Array<{ ts: string; event: string; data?: unknown }>>([]);
  const [mapLogOpen, setMapLogOpen] = useState(false);
  const loadMapLogs = () => {
    try {
      const raw = localStorage.getItem("msbeton_map_log");
      setMapLogs(raw ? (JSON.parse(raw) as Array<{ ts: string; event: string; data?: unknown }>).reverse() : []);
    } catch { setMapLogs([]); }
  };
  useEffect(() => { if (mapLogOpen) loadMapLogs(); }, [mapLogOpen]);
  const clearLogs = () => { localStorage.removeItem("msbeton_map_log"); setMapLogs([]); };
  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button onClick={() => setMapLogOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-black text-secondary uppercase tracking-wide">Map GPS / DM Log</span>
          <span className="text-[10px] text-gray-400">({mapLogs.length > 0 ? `${mapLogs.length} záznamov` : "prázdny"})</span>
        </div>
        <div className="flex items-center gap-2">
          {mapLogOpen && mapLogs.length > 0 && (
            <button onClick={e => { e.stopPropagation(); clearLogs(); }} className="text-[10px] text-red-400 hover:text-red-600 border border-red-200 rounded px-1.5 py-0.5 cursor-pointer transition-colors">Vymazať</button>
          )}
          {mapLogOpen && (
            <button onClick={e => { e.stopPropagation(); loadMapLogs(); }} className="text-[10px] text-blue-400 hover:text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 cursor-pointer transition-colors">Obnoviť</button>
          )}
          <span className="text-gray-400 text-xs">{mapLogOpen ? "▲" : "▼"}</span>
        </div>
      </button>
      {mapLogOpen && (
        <div className="border-t border-gray-100 max-h-72 overflow-y-auto">
          {mapLogs.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">Žiadne záznamy. Log sa plní pri použití GPS/mapy v kalkulačke.</div>
          ) : mapLogs.map((e, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-1.5 border-b border-gray-50 text-[11px] hover:bg-gray-50">
              <span className="text-gray-300 shrink-0 font-mono text-[9px] mt-0.5 w-14">{new Date(e.ts).toLocaleTimeString("sk-SK")}</span>
              <span className={`font-black shrink-0 w-36 truncate ${EVENT_COLORS[e.event] ?? "text-gray-600"}`}>{e.event}</span>
              {e.data && <span className="text-gray-500 font-mono text-[9px] break-all">{JSON.stringify(e.data)}</span>}
            </div>
          ))}
          <div className="px-3 py-1.5 bg-gray-50/40 text-[9px] text-gray-400 text-center">localStorage · zachová sa medzi reštartmi PM2 · max 100 záznamov</div>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ServerTab({ onOpenClient, bioFocus }: { onOpenClient?: (loginId: string) => void; bioFocus?: { loginId?: string; nonce: number } | null }) {
  const [data, setData] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [wpInfoOpen, setWpInfoOpen] = useState(false);

  // Activity Log stav
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [evFilter, setEvFilter] = useState<string>("all");
  const [evLoading, setEvLoading] = useState(false);
  const evTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("msbeton_admin_token") ?? "";
    try {
      const statusRes = await fetch("/api/admin/server-status", { headers: { Authorization: `Bearer ${token}` } as HeadersInit });
      if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`);
      setData(await statusRes.json() as ServerStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba pri načítaní");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("msbeton_admin_token") ?? ""}` });

  // Activity Log — auto-refresh každých 20s
  const loadEvents = useCallback(async () => {
    setEvLoading(true);
    try {
      const r = await fetch("/api/admin/event-log?limit=150", { headers: authHeader() });
      if (r.ok) {
        const j = await r.json() as { ok: boolean; events: AppEvent[] };
        if (j.ok) setEvents(j.events);
      }
    } finally {
      setEvLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadEvents();
    const tick = () => { loadEvents(); evTimer.current = setTimeout(tick, 20000); };
    evTimer.current = setTimeout(tick, 20000);
    return () => { if (evTimer.current) clearTimeout(evTimer.current); };
  }, [loadEvents]);

  const runBackup = async () => {
    if (!confirm("Spustiť manuálnu zálohu databázy teraz?")) return;
    setBackupRunning(true);
    setBackupMsg(null);
    try {
      const r = await fetch("/api/admin/server-backup", {
        method: "POST",
        headers: authHeader(),
      });
      const j = await r.json() as { ok: boolean; output?: string; error?: string };
      setBackupMsg({ ok: j.ok, text: j.ok ? (j.output ?? "OK") : (j.error ?? "Chyba") });
      if (j.ok) await load();
    } catch (e) {
      setBackupMsg({ ok: false, text: e instanceof Error ? e.message : "Chyba" });
    } finally {
      setBackupRunning(false);
    }
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Vymazať zálohu?\n${filename}`)) return;
    setDeletingFile(filename);
    try {
      const r = await fetch(`/api/admin/server-backup/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      const j = await r.json() as { ok: boolean; error?: string };
      if (j.ok) await load();
      else setBackupMsg({ ok: false, text: j.error ?? "Chyba pri mazaní" });
    } catch (e) {
      setBackupMsg({ ok: false, text: e instanceof Error ? e.message : "Chyba" });
    } finally {
      setDeletingFile(null);
    }
  };

  const online = data?.pm2.status === "online";
  const diskPct = data?.disk.percentNum ?? 0;
  const diskColor = diskPct >= 85 ? "bg-red-500" : diskPct >= 70 ? "bg-amber-400" : "bg-green-500";

  const sslDaysLeft = data?.sslExpiry
    ? Math.ceil((new Date(data.sslExpiry).getTime() - Date.now()) / 86400000)
    : null;
  const sslColor = sslDaysLeft === null ? "text-gray-400" : sslDaysLeft < 14 ? "text-red-400" : sslDaysLeft < 30 ? "text-amber-400" : "text-green-400";

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Biometria + admin telemetria — navrch, vlastný fetch (nezávislé od pomalého server-status) */}
      <ClientBiometriaPanel onOpenClient={onOpenClient} focus={bioFocus} />
      <AdminAccessPanel />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-secondary uppercase tracking-widest">Server Status</h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-bold text-secondary/60 hover:text-secondary transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Obnoviť
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Status cards 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* PM2 */}
        <div className="bg-secondary rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" />
              API / PM2
            </div>
            <div className={`w-2 h-2 rounded-full ${online ? "bg-green-400" : "bg-red-400"}`} />
          </div>
          <div className={`text-base font-black ${online ? "text-green-400" : "text-red-400"}`}>
            {data ? (online ? "online" : data.pm2.status) : "—"}
          </div>
          <div className="text-xs text-white/40 space-y-0.5">
            {data && <>
              <div>Beh: <span className="text-white/70">{fmtUptime(data.pm2.uptimeMs)}</span></div>
              <div>Reštarty: <span className={data.pm2.restarts > 5 ? "text-amber-400" : "text-white/70"}>{data.pm2.restarts}</span></div>
              <div>RAM: <span className="text-white/70">{fmtMem(data.pm2.memoryBytes)}</span></div>
            </>}
          </div>
        </div>

        {/* DB */}
        <div className="bg-secondary rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            Databáza
          </div>
          <div className="text-base font-black text-primary">
            {data?.dbSize ?? "—"}
          </div>
          <div className="text-xs text-white/40 space-y-0.5">
            <div>PostgreSQL</div>
            <div className="text-white/70">msbeton</div>
            <div>Tabuľka: <span className="text-white/70">admin_config</span></div>
          </div>
        </div>

        {/* Disk */}
        <div className="bg-secondary rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
            <HardDrive className="w-3.5 h-3.5" />
            Disk (/)
          </div>
          <div className="text-base font-black text-white">
            {data ? `${data.disk.used} / ${data.disk.total}` : "—"}
          </div>
          {data && (
            <div className="space-y-1">
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${diskColor}`}
                  style={{ width: `${Math.min(diskPct, 100)}%` }}
                />
              </div>
              <div className="text-xs text-white/40">
                Voľné: <span className="text-white/70">{data.disk.avail}</span>
                <span className={`ml-2 font-bold ${diskPct >= 85 ? "text-red-400" : "text-white/40"}`}>{data.disk.percent}</span>
              </div>
            </div>
          )}
        </div>

        {/* SSL */}
        <div className="bg-secondary rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            SSL Certifikát
          </div>
          <div className={`text-base font-black leading-tight ${sslColor}`}>
            {sslDaysLeft !== null ? `${sslDaysLeft} dní` : "—"}
          </div>
          <div className="text-xs text-white/40 space-y-0.5">
            {data?.sslExpiry && (
              <div>Exp: <span className="text-white/70">{new Date(data.sslExpiry).toLocaleDateString("sk-SK")}</span></div>
            )}
            <div className="text-white/70">Let's Encrypt</div>
            <div>Auto-renew: <span className="text-green-400 font-bold">aktívny</span></div>
          </div>
        </div>
      </div>

      {/* VPS info */}
      <div className="bg-secondary rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
          <Server className="w-3.5 h-3.5" />
          VPS Uptime
        </div>
        <div className="text-sm font-bold text-white">{data?.uptime ?? "—"}</div>
        <div className="text-xs text-white/40">Hetzner · 178.105.242.17</div>
      </div>

      {/* Security */}
      {data?.security && (
        <div className="bg-secondary rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            <ShieldAlert className="w-3.5 h-3.5 text-white/60" />
            <span className="text-white/60 text-xs font-black uppercase tracking-widest">Bezpečnosť — dnes</span>
          </div>
          <div className="grid grid-cols-2 gap-0 divide-x divide-white/10">
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">4xx chyby</span>
                <span className={`text-sm font-black ${data.security.hits4xx > 50 ? "text-amber-400" : "text-white/70"}`}>{data.security.hits4xx}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">5xx chyby</span>
                <span className={`text-sm font-black ${data.security.hits5xx > 0 ? "text-red-400" : "text-white/70"}`}>{data.security.hits5xx}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">WP skeny</span>
                <span className={`text-sm font-black ${data.security.wpProbes > 0 ? "text-amber-400" : "text-white/70"}`}>{data.security.wpProbes}</span>
              </div>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Rate limit (429)</span>
                <span className={`text-sm font-black ${data.security.rateLimitHits > 0 ? "text-amber-400" : "text-white/70"}`}>{data.security.rateLimitHits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Fail2ban ban</span>
                <span className={`text-sm font-black ${data.security.bannedIps > 0 ? "text-red-400" : "text-green-400"}`}>{data.security.bannedIps}</span>
              </div>
              {data.security.cfGuard && (
                <div className="flex items-center justify-between pt-1 mt-1 border-t border-white/8">
                  <span className="text-xs text-white/40">CF Guard</span>
                  {data.security.cfGuard.active
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-bold">Aktívny ✓</span>
                    : <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-white/30 font-bold">Neznámy</span>
                  }
                </div>
              )}
              {data.security.cfGuard?.lastRun && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/25">posl. beh</span>
                  <span className="text-[10px] font-mono text-white/40">{new Date(data.security.cfGuard.lastRun.replace(" ", "T") + "Z").toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}
            </div>
          </div>
          {data.security.wpBannedList.length > 0 && (
            <div className="px-4 py-2 border-t border-white/10 space-y-1">
              <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Banované IP (WP skeny)
                <button
                  type="button"
                  onClick={() => setWpInfoOpen(o => !o)}
                  className="ml-1 text-white/30 hover:text-white/60 transition-colors"
                  aria-label="Info o fail2ban"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              {wpInfoOpen && (
                <div className="mb-2 px-2.5 py-2 rounded bg-white/5 border border-white/10 text-[10px] text-white/50 leading-relaxed space-y-1">
                  <div><span className="text-red-400 font-bold">∞ = trvalý zákaz</span> (bantime −1) — zámerné nastavenie, nie chyba.</div>
                  <div>Všetky IP sú <span className="text-white/70">cloudové VPS</span> (Hetzner, DigitalOcean, Oracle, Azure…) = automatické botnety skenujúce WordPress. Nie sú to ľudia.</div>
                  <div><span className="text-amber-400">Hetzner IP v zozname ≠ tvoj server</span> — tvoj server má inú IP. Hetzner prenajíma VPS aj útočníkom.</div>
                  <div className="text-white/30">Zrušiť ručne: <code className="text-white/50">fail2ban-client unban &lt;IP&gt;</code></div>
                </div>
              )}
              {data.security.wpBannedList.map(b => {
                const flag = b.countryCode ? String.fromCodePoint(...b.countryCode.split("").map(c => 0x1F1E6 - 65 + c.charCodeAt(0))) : "";
                const orgShort = b.org ? b.org.replace(/^AS\d+\s*/i, "").slice(0, 28) : "";
                return (
                  <div key={b.ip} className="flex items-start justify-between gap-2 py-0.5">
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-white/70">{b.ip}</span>
                      {(b.country || orgShort) && (
                        <div className="text-[10px] text-white/35 truncate">{flag} {b.country}{orgShort ? ` · ${orgShort}` : ""}</div>
                      )}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold shrink-0">{fmtBantime(data.security.wpBantime ?? 86400)}</span>
                  </div>
                );
              })}
            </div>
          )}
          {data.security.topIps.length > 0 && (
            <div className="px-4 py-2 border-t border-white/10 space-y-1">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Top IP (4xx/5xx/WP skeny dnes)</div>
              {data.security.topIps.map(({ ip, count }) => (
                <div key={ip} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white/60">{ip}</span>
                  <span className="text-xs font-bold text-amber-400">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Backups */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-secondary text-xs font-black uppercase tracking-widest">
            <Archive className="w-3.5 h-3.5" />
            Zálohy DB
          </div>
          <span className="text-xs text-gray-400">{data ? `${data.backups.length} kópií` : ""}</span>
        </div>

        {data?.backups.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">Žiadne zálohy nenájdené</div>
        )}

        <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
          {data?.backups.map((b, i) => {
            const isLast = i === 0;
            const isDeleting = deletingFile === b.file;
            return (
              <div key={b.file} className="flex items-center gap-3 px-4 py-2.5">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-secondary font-semibold">{fmtBackupName(b.file)}</div>
                  <div className="text-xs text-gray-400 truncate">{b.file}</div>
                </div>
                <div className="text-xs text-gray-500 font-mono shrink-0">{b.sizeKb} KB</div>
                {isLast && <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded shrink-0">LAST</span>}
                {isSuper() && (
                  <button
                    onClick={() => deleteBackup(b.file)}
                    disabled={isLast || isDeleting}
                    title={isLast ? "Posledná záloha — nedá sa vymazať" : "Vymazať zálohu"}
                    className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? "animate-spin" : ""}`} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">Automatická rotácia: max 10 kópií</span>
          <span className="text-[11px] text-gray-400">{data?.backups.length ?? 0} / 10</span>
        </div>

        {/* Last log — parsed */}
        {data?.lastLog && (() => {
          const lines = data.lastLog.trim().split("\n").filter(Boolean).reverse();
          const parsed = lines.map(line => {
            const m = line.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):\d{2} (OK|FAIL) [^\s]+ \((\d+[KMG]?)\)/);
            if (!m) return null;
            const [, date, time, status, size] = m;
            const [y, mo, d] = date.split("-");
            return { label: `${d}.${mo}.${y} ${time}`, ok: status === "OK", size };
          }).filter(Boolean);
          if (!parsed.length) return null;
          return (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 space-y-1">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cron história</div>
              {parsed.map((p, i) => p && (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-gray-600">{p.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{p.size}</span>
                    <span className={p.ok ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{p.ok ? "✓ OK" : "✗ FAIL"}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Pravidlá retenie */}
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 space-y-1">
          <div className="text-[10px] text-blue-500 uppercase tracking-wider font-bold mb-1">Pravidlá</div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">DB zálohy</span>
            <span className="text-gray-700 font-mono">max 10 kópií · denná 02:00</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Systemd journal</span>
            <span className="text-gray-700 font-mono">max 7 dní · auto vacuum</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Nginx / syslog logy</span>
            <span className="text-gray-700 font-mono">max 7 dní · logrotate daily</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">pnpm store prune</span>
            <span className="text-gray-700 font-mono">každú nedeľu 03:30</span>
          </div>
        </div>

        {/* Trigger backup */}
        <div className="px-4 py-3 border-t border-gray-200 space-y-2">
          {backupMsg && (
            <div className={`flex items-start gap-2 text-xs rounded p-2 ${backupMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {backupMsg.ok ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              <span className="font-mono">{backupMsg.text}</span>
            </div>
          )}
          {isSuper() ? (
            <button
              onClick={runBackup}
              disabled={backupRunning}
              className="w-full flex items-center justify-center gap-2 bg-secondary text-white text-sm font-bold py-2.5 rounded-lg hover:bg-secondary/90 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Download className={`w-4 h-4 ${backupRunning ? "animate-bounce" : ""}`} />
              {backupRunning ? "Zálohujem…" : "Spustiť zálohu teraz"}
            </button>
          ) : (
            <div className="text-center text-[11px] text-gray-400 py-2">Zálohy spravuje iba superadmin (msbeton).</div>
          )}
          <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            {data?.backupCron ? (() => {
              const c = data.backupCron.trim();
              const m = c.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
              if (m) return `Automatická záloha každý deň o ${m[2].padStart(2,"0")}:${m[1].padStart(2,"0")}`;
              return `Automatická záloha (${c})`;
            })() : "Automatická záloha každý deň o 02:00"}
          </p>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-secondary" />
            <span className="text-sm font-black text-secondary uppercase tracking-widest">Activity Log</span>
            <span className="text-[10px] text-gray-400 font-normal">(posledné udalosti)</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadEvents} disabled={evLoading} className="flex items-center gap-1 text-[11px] text-secondary/50 hover:text-secondary cursor-pointer transition-colors">
              <RefreshCw className={`w-3 h-3 ${evLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter chipy */}
        <div className="flex gap-1.5 px-3 py-2 border-b border-gray-50 flex-wrap">
          {[
            { k: "all", label: "Všetko" },
            { k: "order_saved", label: "Objednávky" },
            { k: "order_rejected", label: "Odmietnuté" },
            { k: "order_large_breakdown", label: "Veľký JSON" },
            { k: "clients_saved", label: "Klienti" },
            { k: "email_", label: "Email" },
          ].map(f => (
            <button key={f.k} onClick={() => setEvFilter(f.k)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer
                ${evFilter === f.k ? "bg-secondary text-white border-secondary" : "bg-gray-100 text-gray-500 border-gray-200 hover:border-secondary/40"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Zoznam udalostí */}
        <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-50">
          {(evFilter === "all" ? events : events.filter(e =>
            evFilter === "email_" ? e.ev.startsWith("email_") : e.ev === evFilter
          )).length === 0 ? (
            <div className="py-8 text-center text-[12px] text-gray-400">
              {events.length === 0 ? "Žiadne udalosti od posledného reštartu PM2" : "Žiadne udalosti tohto typu"}
            </div>
          ) : (
            (evFilter === "all" ? events : events.filter(e =>
              evFilter === "email_" ? e.ev.startsWith("email_") : e.ev === evFilter
            )).map((e, i) => (
              <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 border-l-2 ${evBg(e.ev)} ${
                e.ev === "order_saved" ? "border-l-green-400" :
                e.ev.startsWith("order_rej") || e.ev.startsWith("order_err") ? "border-l-red-400" :
                e.ev === "order_large_breakdown" ? "border-l-amber-400" :
                e.ev === "clients_saved" ? "border-l-blue-400" :
                e.ev === "email_sent" ? "border-l-purple-400" :
                e.ev === "email_failed" ? "border-l-red-300" : "border-l-gray-200"
              }`}>
                <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                  {evIcon(e.ev)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-gray-800 leading-snug font-medium">{evSummary(e)}</p>
                  {e.ev === "order_saved" && e.address && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{e.address}{e.km ? ` · ${e.km} km` : ""}{e.ip ? ` · IP ${e.ip}` : ""}</p>
                  )}
                  {e.ev === "clients_saved" && e.role && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{e.role} · {e.ip}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[10px] text-gray-400 font-mono block">{fmtEventTime(e.ts)}</span>
                  <span className="text-[9px] text-gray-300 block">{fmtEventDate(e.ts)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-3 py-1.5 bg-gray-50/40 border-t border-gray-100 text-[10px] text-gray-400 text-center">
          In-memory · maže sa pri PM2 reštarte · max 500 udalostí
        </div>
      </div>

      {/* ── Map GPS/DM Debug Log ── */}
      <MapGpsLog />

    </div>
  );
}
