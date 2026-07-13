import { useEffect, useRef, useState } from "react";
import { Loader2, Check, GitMerge, AlertTriangle, Users, X } from "lucide-react";
import { adminApi, type PresenceSession } from "@/lib/adminData";
import { Fingerprint } from "lucide-react";
import { DeviceIcon, roleBadge } from "./tabs/AdminAccessPanel";
import { shortIp, cn } from "@/lib/utils";
import { getAdminRole, hasStoredCredential } from "@/lib/adminAuth";
import { hasClientBiometric } from "@/lib/clientAuth";

type SaveState = "saving" | "saved" | "merged" | "error";
interface SaveEvt { key: string; state: SaveState }

// Multi-admin "live" lišta: ukladací indikátor (waiting / uložené / zlúčené / chyba)
// + presence (kto je online) + toast keď sa pripojí ďalší admin.
export function AdminLiveBar() {
  const [save, setSave] = useState<SaveState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Save-state z adminData.trackSave ─────────────────────────────────────────
  useEffect(() => {
    const onSave = (e: Event) => {
      const d = (e as CustomEvent<SaveEvt>).detail;
      if (!d) return;
      setSave(d.state);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (d.state !== "saving") {
        // Error ostáva 20s — admin musí vidieť že save zlyhal a skúsiť znova
        const dur = d.state === "merged" ? 3500 : d.state === "error" ? 20000 : 1600;
        hideTimer.current = setTimeout(() => setSave(null), dur);
      }
    };
    window.addEventListener("admin-save-state", onSave);
    return () => { window.removeEventListener("admin-save-state", onSave); if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  // ── Presence — kto je online ─────────────────────────────────────────────────
  const [others, setOthers] = useState<PresenceSession[]>([]);
  const seenOthers = useRef<Set<string> | null>(null); // null = ešte neprebehol prvý poll
  const [showList, setShowList] = useState(false);
  // Prominentný "pripojil sa admin" alert priamo v lište (nie ľahko prehliadnuteľný toast)
  const [joinAlert, setJoinAlert] = useState<string[] | null>(null);
  const joinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const r = await adminApi.getPresence();
        if (!cancelled && r?.ok) {
          const o = r.sessions.filter(s => !s.isSelf);
          setOthers(o);
          const ids = new Set(o.map(s => s.session));
          if (seenOthers.current !== null) {
            // NOVO pripojené session (nie pri prvom načítaní) → prominentný alert
            const fresh = o.filter(s => !seenOthers.current!.has(s.session));
            if (fresh.length > 0) {
              setJoinAlert(fresh.map(s => s.device));
              if (joinTimer.current) clearTimeout(joinTimer.current);
              joinTimer.current = setTimeout(() => setJoinAlert(null), 15000);
            }
          }
          seenOthers.current = ids;
        }
      } catch { /* ticho */ }
      finally { if (!cancelled) timer = setTimeout(poll, 12000); }
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); if (joinTimer.current) clearTimeout(joinTimer.current); };
  }, []);

  const savePill = (() => {
    if (!save) return null;
    const map: Record<SaveState, { icon: React.ReactNode; text: string; cls: string }> = {
      saving: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, text: "Ukladám…", cls: "bg-amber-100 text-amber-800 border-amber-300" },
      saved:  { icon: <Check className="w-3.5 h-3.5" />, text: "Uložené", cls: "bg-green-100 text-green-800 border-green-300" },
      merged: { icon: <GitMerge className="w-3.5 h-3.5" />, text: "Zlúčené so zmenami iného admina", cls: "bg-blue-100 text-blue-800 border-blue-300" },
      error:  { icon: <AlertTriangle className="w-3.5 h-3.5" />, text: "Nepodarilo sa uložiť — skús znova", cls: "bg-red-100 text-red-800 border-red-300" },
    };
    const s = map[save];
    return (
      <div className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold shadow-lg ${s.cls}`}>
        {s.icon}{s.text}
      </div>
    );
  })();

  return (
    <div className="fixed bottom-24 sm:bottom-6 left-0 right-0 z-[55] flex flex-col items-center gap-1.5 px-3 pointer-events-none">
      {/* Prominentný alert pri pripojení ďalšieho admina — ostáva 15 s, X na zatvorenie */}
      {joinAlert && joinAlert.length > 0 && (
        <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-emerald-900 shadow-xl max-w-[92vw] animate-in fade-in slide-in-from-bottom-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <Users className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold leading-tight">
            {joinAlert.length === 1 ? <>Pripojil sa ďalší admin: <span className="font-black">{joinAlert[0]}</span></> : <>Pripojili sa {joinAlert.length} admini: <span className="font-black">{joinAlert.join(", ")}</span></>}
            <span className="block font-normal text-emerald-700/80 text-[11px]">Pracujete súčasne — zmeny sa zlučujú automaticky.</span>
          </span>
          <button onClick={() => setJoinAlert(null)} className="shrink-0 p-1 -mr-1 rounded-full hover:bg-emerald-200/60 transition-colors" title="Zavrieť">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {savePill}
      {others.length > 0 && (
        <div className="pointer-events-auto relative">
          <button type="button" onClick={() => setShowList(o => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-secondary/20 bg-white/95 text-secondary text-[11px] font-black shadow-md hover:bg-white transition-colors">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <Users className="w-3.5 h-3.5" /> {others.length + 1} adminov online
          </button>
          {showList && (() => {
            // Rola → farebný akcent (ľavý pruh + tint) + poradie (vlastník > správca > čítateľ)
            const accent = (r?: string) => r === "admin" ? "border-l-primary bg-primary/[0.06]" : r === "manager" ? "border-l-secondary bg-secondary/[0.06]" : r === "reader" ? "border-l-blue-400 bg-blue-50/50" : "border-l-gray-200";
            const rank = (r?: string) => r === "admin" ? 3 : r === "manager" ? 2 : r === "reader" ? 1 : 0;
            const myRole = getAdminRole() ?? undefined;
            const myRb = roleBadge(myRole);
            const myBio = myRole === "admin" ? hasStoredCredential() : hasClientBiometric();
            const sortedOthers = [...others].sort((a, b) => rank(b.role) - rank(a.role));
            return (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-[19rem] max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden text-left">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">Prihlásení súčasne</div>
              {/* Vy — farebný pruh podľa roly, rola text + ikona, bio stav */}
              <div className={cn("pl-2.5 pr-3 py-2.5 flex items-center gap-2 text-xs border-b border-gray-50 border-l-[3px]", accent(myRole))}>
                <myRb.Icon className={cn("w-4 h-4 shrink-0", myRb.cls.split(" ").find(c => c.startsWith("text-")))} aria-label={myRb.label} />
                <span className="font-bold text-secondary truncate">Vy</span>
                <span className={cn("text-[9px] font-black uppercase tracking-wide shrink-0", myRb.cls.split(" ").find(c => c.startsWith("text-")))}>{myRb.label}</span>
                <span className="text-gray-400 text-[10px] flex-1 min-w-0 truncate">· toto zariadenie</span>
                <Fingerprint className={cn("w-3.5 h-3.5 shrink-0", myBio ? "text-emerald-500" : "text-gray-300")} aria-label={myBio ? "biometria aktívna" : "biometria neaktívna"} />
              </div>
              {sortedOthers.map(s => {
                const rb = roleBadge(s.role);
                const roleColor = rb.cls.split(" ").find(c => c.startsWith("text-"));
                return (
                <div key={s.session} className={cn("pl-2.5 pr-3 py-2.5 flex items-center gap-2 text-xs border-b border-gray-50 last:border-0 border-l-[3px]", accent(s.role))}>
                  <rb.Icon className={cn("w-4 h-4 shrink-0", roleColor)} aria-label={rb.label} />
                  <span className={cn("text-[9px] font-black uppercase tracking-wide shrink-0", roleColor)}>{rb.label}</span>
                  <DeviceIcon label={s.device} className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="font-semibold text-gray-700 flex-1 min-w-0 truncate" title={s.device}>{s.device}</span>
                  <span className="font-mono text-[9px] text-gray-300 shrink-0" title={s.ip}>{shortIp(s.ip)}</span>
                </div>
                );
              })}
              <div className="px-3 py-1.5 bg-blue-50/60 text-[10px] text-blue-700 leading-snug">
                Zmeny sa <strong>zlučujú automaticky</strong> — nikto neprepíše prácu druhého.
              </div>
            </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
