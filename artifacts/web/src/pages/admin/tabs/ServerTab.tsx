import { useState, useEffect, useCallback } from "react";
import { RefreshCw, HardDrive, Database, Activity, Server, Download, CheckCircle, XCircle, Clock, Archive, Shield, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";

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
    wpBannedList: string[];
    wpBantime: number;
    topIps: { ip: string; count: number }[];
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

export default function ServerTab() {
  const [data, setData] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/server-status", {
        headers: { Authorization: `Bearer ${localStorage.getItem("msbeton_admin_token") ?? ""}` } as HeadersInit,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json() as ServerStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba pri načítaní");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("msbeton_admin_token") ?? ""}` });

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
            </div>
          </div>
          {data.security.wpBannedList.length > 0 && (
            <div className="px-4 py-2 border-t border-white/10 space-y-1">
              <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Banované IP (WP skeny)
              </div>
              {data.security.wpBannedList.map(ip => (
                <div key={ip} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white/60">{ip}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">{fmtBantime(data.security.wpBantime ?? 86400)}</span>
                </div>
              ))}
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

        <div className="divide-y divide-gray-100">
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
                <button
                  onClick={() => deleteBackup(b.file)}
                  disabled={isLast || isDeleting}
                  title={isLast ? "Posledná záloha — nedá sa vymazať" : "Vymazať zálohu"}
                  className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? "animate-spin" : ""}`} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">Automatická rotácia: max 14 kópií</span>
          <span className="text-[11px] text-gray-400">{data?.backups.length ?? 0} / 14</span>
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

        {/* Trigger backup */}
        <div className="px-4 py-3 border-t border-gray-200 space-y-2">
          {backupMsg && (
            <div className={`flex items-start gap-2 text-xs rounded p-2 ${backupMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {backupMsg.ok ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              <span className="font-mono">{backupMsg.text}</span>
            </div>
          )}
          <button
            onClick={runBackup}
            disabled={backupRunning}
            className="w-full flex items-center justify-center gap-2 bg-secondary text-white text-sm font-bold py-2.5 rounded-lg hover:bg-secondary/90 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Download className={`w-4 h-4 ${backupRunning ? "animate-bounce" : ""}`} />
            {backupRunning ? "Zálohujem…" : "Spustiť zálohu teraz"}
          </button>
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
    </div>
  );
}
