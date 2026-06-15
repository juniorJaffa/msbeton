import { useState, useEffect, useCallback, useRef } from "react";
import { Fingerprint, AlertTriangle, RefreshCw, Info, ChevronUp, ChevronDown, ShieldCheck, Users, ExternalLink, ClipboardList, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BioFeedEntry {
  ts: string; ok: boolean; event: string;
  clientId: string; clientName: string; loginId: string;
  device: string; ip: string; origin: string; reason: string;
}
interface BiometricStats {
  totalClients: number;
  bioClients: number;
  todaySuccess: number;
  todayFailed: number;
  alerts: Array<{ clientId: string; clientName?: string; failCount: number; lastIp: string; lastDevice?: string; lastReason?: string }>;
  lastActivity: string | null;
  recent?: BioFeedEntry[];
  adminBioStats?: { devices: number; todayOk: number; todayFail: number; lastActivity: string | null };
}

const BIO_PER_PAGE = 50;
const BIO_MAX_PAGES = 5;

// Klientska biometria — prehľad + feed. Presunuté z KlientiTab do SERVER tabu (monitoring).
// Vlastný fetch → nezávislé od pomalého server-status. onOpenClient prepne na KLIENTI + rozbalí.
export function ClientBiometriaPanel({ onOpenClient, focus }: { onOpenClient?: (loginId: string) => void; focus?: { loginId?: string; nonce: number } | null }) {
  const [bioOpen, setBioOpen] = useState(false);
  const [bioInfoOpen, setBioInfoOpen] = useState(false);
  const [bioStats, setBioStats] = useState<BiometricStats | null>(null);
  const [bioPage, setBioPage] = useState(0);
  const [bioRefreshing, setBioRefreshing] = useState(false);
  const [highlightLogin, setHighlightLogin] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!bioOpen) setBioInfoOpen(false); }, [bioOpen]);

  // Skok z KLIENTI (klik na bio badge / "Aktivita →") → otvor panel, zvýrazni klienta, scrolluj
  useEffect(() => {
    if (!focus) return;
    setBioOpen(true);
    setBioPage(0);
    setHighlightLogin(focus.loginId ?? null);
    const t1 = setTimeout(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    const t2 = setTimeout(() => setHighlightLogin(null), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  const loadBioStats = useCallback(async () => {
    const token = localStorage.getItem("msbeton_admin_token") ?? "";
    if (!token) return;
    setBioRefreshing(true);
    try {
      const r = await fetch("/api/admin/biometric-stats", { headers: { Authorization: `Bearer ${token}` } as HeadersInit });
      const d = await r.json() as { ok: boolean; stats?: BiometricStats };
      if (d.ok && d.stats) setBioStats(d.stats);
    } catch { /* ignore */ }
    setBioRefreshing(false);
  }, []);

  useEffect(() => { loadBioStats(); }, [loadBioStats]);
  useEffect(() => {
    if (bioOpen) loadBioStats();
    const iv = setInterval(loadBioStats, bioOpen ? 15000 : 30000);
    return () => clearInterval(iv);
  }, [bioOpen, loadBioStats]);

  return (
    <div ref={rootRef} className={cn("bg-white border shadow-sm overflow-hidden rounded-xl transition-colors", highlightLogin ? "border-primary ring-2 ring-primary/30" : "border-gray-200")}>
      <div className="w-full flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <button type="button" onClick={() => setBioOpen(o => !o)}
          className="flex items-center gap-2 flex-1 hover:opacity-80 transition-opacity cursor-pointer text-left">
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5" /> Biometria klientov
          </h3>
          {bioStats && bioStats.bioClients > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm">
              {bioStats.bioClients} / {bioStats.totalClients}
            </span>
          )}
          {bioStats && bioStats.alerts.length > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black bg-red-50 text-red-600 border border-red-200 rounded-sm animate-pulse">
              <AlertTriangle className="w-3 h-3" /> {bioStats.alerts.length} alert
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          {bioOpen && (
            <button type="button" onClick={loadBioStats} disabled={bioRefreshing}
              title="Obnoviť aktivitu"
              className="flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-secondary hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${bioRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
          <button type="button" onClick={() => setBioInfoOpen(o => !o)}
            title="Ako biometria funguje"
            className={cn("flex items-center justify-center w-6 h-6 rounded-full transition-colors cursor-pointer",
              bioInfoOpen ? "bg-secondary text-primary" : "text-gray-400 hover:text-secondary hover:bg-gray-200")}>
            <Info className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setBioOpen(o => !o)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1">
            {bioOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* (i) Info — ako biometria funguje (foldable) */}
      {bioInfoOpen && (
        <div className="px-4 py-3 bg-secondary/[0.03] border-b border-gray-100 text-xs text-gray-600 leading-relaxed space-y-3">
          <div className="flex items-start gap-2.5">
            <Fingerprint className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div><span className="font-black text-gray-700">1 tap, nie automaticky.</span> Na <strong>iPhone/iPad Safari</strong> sa Face ID <strong>nesmie spustiť sám</strong> pri otvorení stránky — prehliadač to blokuje z bezpečnosti. Spustí sa <strong>až po tapnutí</strong> na „Odomknúť cez Face ID". Plne automatické (zero-tap) prihlásenie vedia <strong>iba natívne appky</strong> (George, Tatra banka) — webová stránka nie. Na Androide/Chrome sa pokúsi automaticky.</div>
          </div>
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            <div><span className="font-black text-gray-700">Dve úrovne.</span> <strong>Admin</strong> = vstup do administrácie, biometria viazaná <strong>len na toto zariadenie</strong> (overuje sa lokálne, bez servera). <strong>Klient</strong> = prihlásenie do kalkulačky, biometria <strong>overená serverom</strong> (kľúč v databáze).</div>
          </div>
          <div className="flex items-start gap-2.5">
            <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div><span className="font-black text-gray-700">Viac zariadení — max. 8.</span> Každý klient môže mať biometriu na <strong>max. 8 zariadeniach</strong> súčasne (iPhone, iPad, Mac, Chrome, Safari…). Každé zariadenie má vlastný kľúč. Pri 9. vypadne najstaršie. Admin je per-zariadenie.</div>
          </div>
          <div className="flex items-start gap-2.5">
            <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div><span className="font-black text-gray-700">Doména.</span> Kľúč je viazaný na doménu — biometria z <strong>localhost</strong> nefunguje na <strong>msbeton.sk</strong> a naopak. Normálne bezpečnostné správanie (testovať na jednej doméne).</div>
          </div>
        </div>
      )}

      {bioOpen && bioStats && (
        <>
          {/* Explainer — dve úrovne prihlásenia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100 border-b border-gray-100">
            <div className="bg-secondary/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span className="font-black text-secondary text-xs uppercase tracking-wider">Admin</span>
                {(bioStats.adminBioStats?.devices ?? 0) > 0 ? (
                  <span className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Admin biometria aktívna — ${bioStats.adminBioStats?.devices} zariadenie`}>
                    <Fingerprint className="w-3.5 h-3.5" /> {bioStats.adminBioStats?.devices}
                  </span>
                ) : (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-400">neaktívna</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Vstup do <strong className="text-gray-700">administrácie</strong>. Detail v paneli <strong className="text-gray-700">Admin &amp; multi-admin</strong>.
              </p>
            </div>
            <div className="bg-primary/[0.05] px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="font-black text-amber-700 text-xs uppercase tracking-wider">Klient</span>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {bioStats.bioClients} / {bioStats.totalClients} má bio
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Prihlásenie do <strong className="text-gray-700">kalkulačky</strong>. Biometria <strong className="text-gray-700">overená serverom</strong> (kľúč v DB) — funguje na <strong className="text-gray-700">viacerých zariadeniach</strong>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-px bg-gray-100">
            <div className="bg-white px-3 py-2 flex-1 min-w-[100px]">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Klienti s biometriou</div>
              <div className={`font-black text-sm ${bioStats.bioClients > 0 ? "text-emerald-600" : "text-gray-300"}`}>{bioStats.bioClients} / {bioStats.totalClients}</div>
            </div>
            <div className="bg-white px-3 py-2 flex-1 min-w-[100px]">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Dnes úspešné</div>
              <div className={`font-black text-sm ${bioStats.todaySuccess > 0 ? "text-emerald-600" : "text-gray-300"}`}>{bioStats.todaySuccess}</div>
            </div>
            <div className="bg-white px-3 py-2 flex-1 min-w-[100px]">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Dnes zamietnuté</div>
              <div className={`font-black text-sm ${bioStats.todayFailed > 0 ? "text-amber-500" : "text-gray-300"}`}>{bioStats.todayFailed}</div>
            </div>
            <div className="bg-white px-3 py-2 flex-1 min-w-[100px]">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Posledná aktivita</div>
              <div className="font-mono text-xs text-gray-500">
                {bioStats.lastActivity ? new Date(bioStats.lastActivity).toLocaleString("sk-SK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
            </div>
          </div>
          {bioStats.alerts.length > 0 && (
            <div className="px-4 py-2 border-t border-red-100 bg-red-50 space-y-1">
              <div className="text-[10px] text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Podozrivá aktivita ({">"} 3 zlyhania / hodinu)
              </div>
              {bioStats.alerts.map(a => (
                <div key={a.clientId} className="flex items-center justify-between py-0.5 gap-2">
                  <span className="text-xs font-bold text-gray-700 truncate">{a.clientName || `Klient ${a.clientId}`}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.lastDevice && a.lastDevice !== "—" && <span className="text-[10px] text-gray-500">{a.lastDevice}</span>}
                    <span className="text-[10px] text-gray-400 font-mono">{a.lastIp}</span>
                    <span className="text-[10px] font-black text-red-500 bg-red-100 px-1.5 py-0.5 rounded">{a.failCount}× zlyhanie</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Posledná aktivita — feed */}
          {bioStats.recent && bioStats.recent.length > 0 && (() => {
            const total = bioStats.recent.length;
            const pageCount = Math.min(BIO_MAX_PAGES, Math.ceil(total / BIO_PER_PAGE));
            const safePage = Math.min(bioPage, pageCount - 1);
            const items = bioStats.recent.slice(safePage * BIO_PER_PAGE, safePage * BIO_PER_PAGE + BIO_PER_PAGE);
            return (
            <div className="border-t border-gray-100">
              <div className="px-4 py-2 bg-gray-50/70 text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Posledná aktivita ({total})
              </div>
              <div className="max-h-[28rem] overflow-y-auto divide-y divide-gray-50">
                {items.map((e, idx) => {
                  const i = safePage * BIO_PER_PAGE + idx;
                  const canOpen = !!(e.loginId && onOpenClient);
                  const isHi = !!(highlightLogin && e.loginId === highlightLogin);
                  return (
                  <div key={i}
                    onClick={canOpen ? () => onOpenClient!(e.loginId) : undefined}
                    title={canOpen ? `Otvoriť kartu klienta ${e.clientName}` : undefined}
                    className={cn("group px-4 py-2 flex items-start gap-2.5", !e.ok && "bg-red-50/40", isHi && "bg-primary/[0.12] ring-1 ring-inset ring-primary/40", canOpen && "cursor-pointer hover:bg-primary/[0.06]")}>
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${e.ok ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-700 truncate">{e.clientName}</span>
                        {e.loginId && <span className="text-[10px] text-gray-400 font-mono">#{e.loginId}</span>}
                        <span className={`text-[9px] font-black uppercase px-1 py-px rounded ${e.event === "register" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-gray-100 text-gray-500"}`}>
                          {e.event === "register" ? "registrácia" : "prihlásenie"}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-1 py-px rounded ${e.ok ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {e.ok ? "OK" : "zlyhanie"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 flex-wrap">
                        <span className="text-gray-500">{e.device}</span>
                        <span className="font-mono">{e.ip}</span>
                        {e.origin && e.origin !== "—" && e.origin !== "?" && <span className="font-mono text-gray-300 truncate max-w-[140px]">{e.origin}</span>}
                      </div>
                      {!e.ok && e.reason && (
                        <div className="text-[10px] text-red-500 mt-0.5 flex items-start gap-1">
                          <Info className="w-3 h-3 shrink-0 mt-px" /> {e.reason}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(e.ts).toLocaleString("sk-SK", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {canOpen && <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary transition-colors" />}
                    </div>
                  </div>
                  );
                })}
              </div>
              {pageCount > 1 && (
                <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-gray-100 bg-gray-50/50">
                  <button type="button" disabled={safePage === 0} onClick={() => setBioPage(p => Math.max(0, p - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <span className="text-[11px] text-gray-500 font-mono tabular-nums">{safePage + 1} / {pageCount}</span>
                  <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setBioPage(p => Math.min(pageCount - 1, p + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
