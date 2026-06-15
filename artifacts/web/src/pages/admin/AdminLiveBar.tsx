import { useEffect, useRef, useState } from "react";
import { Loader2, Check, GitMerge, AlertTriangle, Users } from "lucide-react";
import { adminApi, type PresenceSession } from "@/lib/adminData";
import { toast } from "@/hooks/use-toast";

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
        const dur = d.state === "merged" ? 3500 : d.state === "error" ? 4500 : 1600;
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
            // toast len pre NOVO pripojené session (nie pri prvom načítaní)
            for (const s of o) {
              if (!seenOthers.current.has(s.session)) {
                toast({ title: "👥 Ďalší admin online", description: `Pripojil sa: ${s.device}. Pracujete súčasne — zmeny sa zlučujú automaticky.`, duration: 5000 });
              }
            }
          }
          seenOthers.current = ids;
        }
      } catch { /* ticho */ }
      finally { if (!cancelled) timer = setTimeout(poll, 12000); }
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
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
          {showList && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-60 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden text-left">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">Prihlásení súčasne</div>
              <div className="px-3 py-2 flex items-center gap-2 text-xs border-b border-gray-50">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="font-bold text-secondary">Vy (toto zariadenie)</span>
              </div>
              {others.map(s => (
                <div key={s.session} className="px-3 py-2 flex items-center justify-between gap-2 text-xs border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="font-semibold text-gray-700 truncate">{s.device}</span>
                    {s.role === "reader" && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1 rounded">čítateľ</span>}
                  </div>
                  <span className="font-mono text-[10px] text-gray-400 shrink-0">{s.ip}</span>
                </div>
              ))}
              <div className="px-3 py-1.5 bg-blue-50/60 text-[10px] text-blue-700 leading-snug">
                Zmeny sa <strong>zlučujú automaticky</strong> — nikto neprepíše prácu druhého.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
