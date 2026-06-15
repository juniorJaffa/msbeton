import { useState, useEffect, useCallback, useRef } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, RefreshCw, Smartphone, Monitor, Laptop, Users, Fingerprint, History, Plus, Pencil, Trash2, Info, Check, X, Crown, Eye } from "lucide-react";
import { adminApi, type PresenceSession, type AuditEntry } from "@/lib/adminData";
import { getAdminDeviceName, setAdminDeviceName, getAdminDeviceAuto, getAdminRole } from "@/lib/adminAuth";
import { cn, shortIp } from "@/lib/utils";

// Rola admin session → ikona + label. Vlastník=Crown, Správca=Shield, Čítateľ=Eye.
export function roleBadge(role?: string): { Icon: React.ElementType; label: string; cls: string } {
  switch (role) {
    case "admin":   return { Icon: Crown,       label: "vlastník", cls: "text-primary bg-primary/15 border-primary/30" };
    case "manager": return { Icon: ShieldCheck, label: "správca",  cls: "text-secondary bg-secondary/10 border-secondary/20" };
    case "reader":  return { Icon: Eye,         label: "čítateľ",  cls: "text-blue-600 bg-blue-50 border-blue-200" };
    default:        return { Icon: ShieldCheck, label: "admin",    cls: "text-gray-500 bg-gray-100 border-gray-200" };
  }
}

interface AdminBioEntry { ts: string; ok: boolean; event: string; device?: string; ip?: string; reason?: string }
interface AdminBioStats { devices: number; todayOk: number; todayFail: number; lastActivity: string | null }

const AUDIT_KEY_LABEL: Record<string, string> = {
  clients: "Klienti", categories: "Betóny", services: "Služby",
  delivery: "Doprava — zóny", transport_zones: "Doprava — sadzby",
};

// Ikona podľa názvu zariadenia (custom názov tiež môže obsahovať iPhone/NB…)
export function DeviceIcon({ label, className }: { label: string; className?: string }) {
  const l = label.toLowerCase();
  if (/iphone|ipad|android|mobil|telef|phone|tablet/.test(l)) return <Smartphone className={className} />;
  if (/mac|macbook|laptop|notebook|\bnb\b/.test(l)) return <Laptop className={className} />;
  return <Monitor className={className} />;
}

// Relatívny čas — "práve teraz", "pred 8 s", "Dnes 9:42", "včera", dátum
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 10_000) return "práve teraz";
  if (diff < 60_000) return `pred ${Math.floor(diff / 1000)} s`;
  if (diff < 3_600_000) return `pred ${Math.floor(diff / 60_000)} min`;
  const d = new Date(t);
  const today = new Date().toDateString();
  const yest = new Date(Date.now() - 86_400_000).toDateString();
  const hm = d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today) return `Dnes ${hm}`;
  if (d.toDateString() === yest) return `Včera ${hm}`;
  return d.toLocaleString("sk-SK", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Admin & multi-admin telemetria — iba pre admina. Tri sekcie:
//  1) Online teraz (presence)  2) Admin biometria — prihlásenia  3) Záznam zmien (audit)
export function AdminAccessPanel() {
  const [open, setOpen] = useState(false);
  const [others, setOthers] = useState<PresenceSession[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [adminBio, setAdminBio] = useState<AdminBioEntry[]>([]);
  const [adminBioStats, setAdminBioStats] = useState<AdminBioStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Vlastný názov tohto zariadenia
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [deviceName, setDeviceName] = useState(getAdminDeviceName());

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pres, aud, bio] = await Promise.all([
        adminApi.getPresence(),
        adminApi.getAuditLog(),
        fetch("/api/admin/biometric-stats", { headers: { Authorization: `Bearer ${localStorage.getItem("msbeton_admin_token") ?? ""}` } }).then(r => r.json()).catch(() => null),
      ]);
      if (pres?.ok) setOthers(pres.sessions.filter(s => !s.isSelf));
      if (aud?.ok) setAudit(aud.entries);
      if (bio?.ok && bio.stats) { setAdminBio(bio.stats.adminBio ?? []); setAdminBioStats(bio.stats.adminBioStats ?? null); }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Live presence poll kým je panel otvorený (12 s)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!open) return;
    loadAll();
    timerRef.current = setInterval(loadAll, 12000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open, loadAll]);

  const saveName = () => {
    setAdminDeviceName(nameDraft);
    setDeviceName(getAdminDeviceName());
    setEditingName(false);
  };

  const myLabel = deviceName || `${getAdminDeviceAuto()} (toto zariadenie)`;
  const onlineCount = others.length + 1;

  return (
    <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
        <h3 className="font-black text-secondary text-sm uppercase tracking-widest flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Admin &amp; multi-admin
        </h3>
        <div className="flex items-center gap-2">
          {onlineCount > 1 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              {onlineCount} online
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <>
          <div className="flex items-center justify-between px-4 py-1.5 bg-secondary/[0.03] border-b border-gray-100">
            <span className="text-[10px] text-gray-400">Iba admin — prihlásenia, kto je online, kto čo menil.</span>
            <button type="button" onClick={loadAll} disabled={loading}
              className="flex items-center gap-1 text-[11px] font-bold text-secondary/60 hover:text-secondary transition-colors cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Obnoviť
            </button>
          </div>

          {/* 1) Online teraz */}
          <div className="px-4 py-2.5 border-b border-gray-100">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Users className="w-3 h-3" /> Online teraz ({onlineCount})
            </div>
            {/* Vy — toto zariadenie, s premenovaním */}
            <div className="flex items-center gap-2 py-1">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <DeviceIcon label={myLabel} className="w-3.5 h-3.5 text-secondary shrink-0" />
              {editingName ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    placeholder={getAdminDeviceAuto()} maxLength={40}
                    className="flex-1 min-w-0 border border-primary/40 px-2 py-0.5 text-xs focus:outline-none rounded-sm" />
                  <button onClick={saveName} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingName(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <>
                  <span className="text-xs font-bold text-secondary truncate">{deviceName || "Vy"} <span className="text-gray-400 font-normal">({getAdminDeviceAuto()})</span></span>
                  {(() => { const rb = roleBadge(getAdminRole() ?? undefined); return (
                    <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-black px-1 py-px rounded border shrink-0", rb.cls)}><rb.Icon className="w-2.5 h-2.5" />{rb.label}</span>
                  ); })()}
                  <button onClick={() => { setNameDraft(deviceName); setEditingName(true); }}
                    title="Pomenovať toto zariadenie (rozlíši 2 rovnaké telefóny)"
                    className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-secondary transition-colors shrink-0">
                    <Pencil className="w-3 h-3" /> {deviceName ? "premenovať" : "pomenovať"}
                  </button>
                </>
              )}
            </div>
            {/* Ostatní admini online */}
            {others.map(s => (
              <div key={s.session} className="flex items-center gap-2 py-1">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <DeviceIcon label={s.device} className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="text-xs font-semibold text-gray-700 truncate">{s.device}</span>
                {(() => { const rb = roleBadge(s.role); return (
                  <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-black px-1 py-px rounded border shrink-0", rb.cls)}><rb.Icon className="w-2.5 h-2.5" />{rb.label}</span>
                ); })()}
                <span className="ml-auto text-[10px] text-gray-400 shrink-0 flex items-center gap-1">
                  <span className="font-mono text-gray-300" title={s.ip}>{shortIp(s.ip)}</span>· {relTime(s.lastSeen)}
                </span>
              </div>
            ))}
            {others.length === 0 && <div className="text-[11px] text-gray-400 pl-4 py-0.5">Nikto iný práve nie je prihlásený.</div>}
          </div>

          {/* 2) Admin biometria — prihlásenia */}
          <div className="px-4 py-2.5 border-b border-gray-100">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Fingerprint className="w-3 h-3" /> Admin biometria — prihlásenia
            </div>
            <div className="flex flex-wrap gap-3 mb-2 text-[11px]">
              <span className="text-gray-500">Zariadenia <strong className={cn("font-black", (adminBioStats?.devices ?? 0) > 0 ? "text-secondary" : "text-gray-300")}>{adminBioStats?.devices ?? 0}</strong></span>
              <span className="text-gray-500">Dnes ✓ <strong className={cn("font-black", (adminBioStats?.todayOk ?? 0) > 0 ? "text-emerald-600" : "text-gray-300")}>{adminBioStats?.todayOk ?? 0}</strong></span>
              <span className="text-gray-500">Dnes ✗ <strong className={cn("font-black", (adminBioStats?.todayFail ?? 0) > 0 ? "text-amber-500" : "text-gray-300")}>{adminBioStats?.todayFail ?? 0}</strong></span>
            </div>
            {adminBio.length > 0 ? (
              <div className="max-h-52 overflow-y-auto divide-y divide-gray-50 -mx-1">
                {adminBio.map((e, i) => (
                  <div key={i} className={cn("px-1 py-1.5 flex items-center gap-2", !e.ok && "bg-red-50/40")}>
                    <DeviceIcon label={e.device || ""} className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs font-semibold text-gray-700 truncate">{e.device || "Zariadenie"}</span>
                    <span className={cn("text-[9px] font-black uppercase px-1 py-px rounded shrink-0", e.event === "register" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-gray-100 text-gray-500")}>
                      {e.event === "register" ? "registrácia" : "prihlásenie"}
                    </span>
                    <span className={cn("text-[9px] font-black uppercase px-1 py-px rounded shrink-0", e.ok ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200")}>
                      {e.ok ? "OK" : "zlyhanie"}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-400 font-mono shrink-0">{relTime(e.ts)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-gray-400 py-1">Zatiaľ žiadna admin bio aktivita.</div>
            )}
            <p className="text-[10px] text-gray-400 mt-1.5 flex items-start gap-1">
              <Info className="w-3 h-3 shrink-0 mt-px text-gray-300" />
              Overuje sa <strong>lokálne v zariadení</strong> (nie serverom). Log je informačný — nahlásený zariadením.
            </p>
          </div>

          {/* 3) Záznam zmien — audit */}
          <div className="px-4 py-2.5">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <History className="w-3 h-3" /> Záznam zmien — kto čo menil
            </div>
            {audit.length > 0 ? (
              <div className="max-h-[22rem] overflow-y-auto divide-y divide-gray-50 -mx-1">
                {audit.map((e, i) => (
                  <div key={i} className="px-1 py-2 flex items-start gap-2">
                    <DeviceIcon label={e.device} className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-700">{e.device}</span>
                        {e.role === "reader" && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1 rounded">čítateľ</span>}
                        <span className="text-[10px] text-gray-400">· {AUDIT_KEY_LABEL[e.key] ?? e.key}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {e.added.map((n, j) => (
                          <span key={`a${j}`} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded"><Plus className="w-2.5 h-2.5" /> {n}</span>
                        ))}
                        {e.modified.map((n, j) => (
                          <span key={`m${j}`} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"><Pencil className="w-2.5 h-2.5" /> {n}</span>
                        ))}
                        {e.removed.map((n, j) => (
                          <span key={`r${j}`} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded line-through"><Trash2 className="w-2.5 h-2.5" /> {n}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-gray-400 font-mono whitespace-nowrap">{relTime(e.ts)}</div>
                      <div className="text-[9px] text-gray-300 font-mono" title={e.ip}>{shortIp(e.ip)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-gray-400 py-1">Zatiaľ žiadne zaznamenané zmeny.</div>
            )}
            <p className="text-[10px] text-gray-400 mt-1.5 flex items-start gap-1">
              <Info className="w-3 h-3 shrink-0 mt-px text-gray-300" />
              Rozlišuje <strong>zariadenie</strong>, nie login — viacero ľudí zdieľa „msbeton". Posledných {audit.length} zmien.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
