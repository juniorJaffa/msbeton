import { useState, useMemo, useEffect } from "react";
import { adminData, Client, DepositTx, Order } from "@/lib/adminData";
import { ChevronRight } from "lucide-react";

type Sub = "zalohy" | "cashflow";
type DateFilter = "dnes" | "vcera" | "tyzden" | "mesiac" | "vsetko";

interface Props {
  initialSub?: Sub;
  initialClientId?: string;
  initialDate?: string;
  onGoToClient?: (loginId: string) => void;
  onGoToOrder?:  (orderId: string) => void;
}

interface DepositRow {
  clientId: string;
  clientName: string;
  loginId: string;
  tx: DepositTx;
}

const TODAY     = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

function toDateStr(iso: string) { return iso.slice(0, 10); }

function passesDate(dateStr: string, filter: DateFilter): boolean {
  if (filter === "vsetko") return true;
  if (filter === "dnes")   return dateStr === TODAY;
  if (filter === "vcera")  return dateStr === YESTERDAY;
  if (filter === "tyzden") return dateStr >= new Date(Date.now() - 7  * 86_400_000).toISOString().slice(0, 10);
  if (filter === "mesiac") return dateStr >= new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  return true;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()}.${d.getMonth() + 1}. ${hh}:${mm}`;
}

function fmtEur(v: number, decimals = 2) {
  return v.toLocaleString("sk-SK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

const DATE_BTNS: { id: DateFilter; label: string }[] = [
  { id: "dnes",   label: "Dnes"   },
  { id: "vcera",  label: "Včera"  },
  { id: "tyzden", label: "Týždeň" },
  { id: "mesiac", label: "Mesiac" },
  { id: "vsetko", label: "Všetko" },
];

const STATUS_LABEL: Record<string, string> = {
  nova: "Nová", potvrdena: "Potvrdená", odoslana: "Odoslaná",
  vyuctovana: "Vyúčtovaná", vyplatena: "Vyplatená", zrusena: "Zrušená", vybavena: "Vybavená",
};
const STATUS_COLOR: Record<string, string> = {
  nova:       "bg-blue-100 text-blue-700",
  potvrdena:  "bg-yellow-100 text-yellow-700",
  odoslana:   "bg-green-100 text-green-700",
  vyuctovana: "bg-orange-100 text-orange-700",
  vyplatena:  "bg-teal-100 text-teal-700",
  zrusena:    "bg-red-100 text-red-600",
  vybavena:   "bg-gray-100 text-gray-500",
};

function clientDisplayName(c?: Client, fallback?: string): string {
  if (!c) return fallback ?? "—";
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || c.loginId || fallback || "—";
}

export default function HistoriaTab({ initialSub, initialClientId, initialDate, onGoToClient, onGoToOrder }: Props) {
  const [sub, setSub] = useState<Sub>(initialSub ?? "zalohy");

  // ZÁLOHY filtre
  const [depClientFilter, setDepClientFilter] = useState<string>(initialClientId ?? "vsetci");
  const [depDateFilter,   setDepDateFilter]   = useState<DateFilter>("tyzden");

  // CASHFLOW filtre
  const [cashDateFilter,   setCashDateFilter]   = useState<DateFilter>("tyzden");
  const [cashClientFilter, setCashClientFilter] = useState<string>("vsetci");
  const [onlyDeposit,      setOnlyDeposit]      = useState(false);

  // Aplikuj initialDate pri prvom monte
  useEffect(() => {
    if (!initialDate) return;
    const d = initialDate.slice(0, 10);
    if (d === TODAY)     setCashDateFilter("dnes");
    else if (d === YESTERDAY) setCashDateFilter("vcera");
    else                 setCashDateFilter("tyzden");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Živé dáta — sleduje admin-data-synced
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const h = () => setRevision(r => r + 1);
    window.addEventListener("admin-data-synced", h);
    return () => window.removeEventListener("admin-data-synced", h);
  }, []);

  const liveClients = useMemo(() => adminData.getClients(), [revision]);
  const liveOrders  = useMemo(() => adminData.getOrders(),  [revision]);

  // ── ZÁLOHY ──────────────────────────────────────────────────────────────
  const allDepositRows = useMemo((): DepositRow[] => {
    const rows: DepositRow[] = [];
    for (const c of liveClients) {
      if (!c.deposit?.transactions?.length) continue;
      const name = clientDisplayName(c);
      for (const tx of c.deposit.transactions) {
        rows.push({ clientId: c.loginId || c.id, clientName: name, loginId: c.loginId, tx });
      }
    }
    return rows.sort((a, b) => b.tx.createdAt.localeCompare(a.tx.createdAt));
  }, [liveClients]);

  const depositClients = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const r of allDepositRows) {
      if (!seen.has(r.clientId)) { seen.add(r.clientId); list.push({ id: r.clientId, name: r.clientName }); }
    }
    return list;
  }, [allDepositRows]);

  const filteredDepRows = useMemo(() =>
    allDepositRows.filter(r => {
      if (depClientFilter !== "vsetci" && r.clientId !== depClientFilter) return false;
      return passesDate(toDateStr(r.tx.createdAt), depDateFilter);
    }),
  [allDepositRows, depClientFilter, depDateFilter]);

  const depSummary = useMemo(() => {
    let topup = 0, payment = 0;
    for (const r of filteredDepRows) {
      if (r.tx.type === "topup") topup += r.tx.amount;
      else payment += Math.abs(r.tx.amount);
    }
    return { topup, payment, net: topup - payment };
  }, [filteredDepRows]);

  // ── CASHFLOW ─────────────────────────────────────────────────────────────
  const clientByLoginId = useMemo(() => {
    const map = new Map<string, Client>();
    for (const c of liveClients) {
      if (c.loginId) map.set(c.loginId, c);
      map.set(c.id, c);
    }
    return map;
  }, [liveClients]);

  const filteredOrders = useMemo(() =>
    liveOrders
      .filter(o => {
        if (onlyDeposit && !(o.depositUsed && o.depositUsed > 0)) return false;
        if (cashClientFilter !== "vsetci" && o.clientId !== cashClientFilter) return false;
        return passesDate(toDateStr(o.createdAt), cashDateFilter);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [liveOrders, cashClientFilter, cashDateFilter, onlyDeposit]);

  const cashSummary = useMemo(() => {
    let dep = 0;
    for (const o of filteredOrders) { if (o.depositUsed) dep += o.depositUsed; }
    return { count: filteredOrders.length, dep };
  }, [filteredOrders]);

  const orderClients = useMemo(() => {
    const seen = new Set<string>(); const list: { id: string; name: string }[] = [];
    for (const o of liveOrders) {
      if (!o.clientId || seen.has(o.clientId)) continue;
      seen.add(o.clientId);
      const c = clientByLoginId.get(o.clientId);
      list.push({ id: o.clientId, name: clientDisplayName(c, o.clientId) });
      if (list.length >= 25) break;
    }
    return list;
  }, [liveOrders, clientByLoginId]);

  // ─────────────────────────────────────────────────────────────────────────
  const subBtnCls = (active: boolean) =>
    `px-5 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition-all ${
      active ? "text-secondary border-secondary" : "text-gray-400 border-transparent hover:text-gray-600"
    }`;
  const dateBtnCls = (active: boolean) =>
    `px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
      active ? "bg-secondary text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
    }`;
  const pillCls = (active: boolean) =>
    `px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
      active ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
    }`;

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex border-b border-gray-200">
        <button onClick={() => setSub("zalohy")}   className={subBtnCls(sub === "zalohy")}>ZÁLOHY</button>
        <button onClick={() => setSub("cashflow")} className={subBtnCls(sub === "cashflow")}>CASHFLOW</button>
      </div>

      {/* ─── ZÁLOHY ─────────────────────────────────────────────────── */}
      {sub === "zalohy" && (
        <div className="space-y-3">
          {/* Filtre */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1">
              {DATE_BTNS.map(f => (
                <button key={f.id} onClick={() => setDepDateFilter(f.id)} className={dateBtnCls(depDateFilter === f.id)}>{f.label}</button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setDepClientFilter("vsetci")} className={pillCls(depClientFilter === "vsetci")}>Všetci</button>
              {depositClients.map(c => (
                <button key={c.id} onClick={() => setDepClientFilter(depClientFilter === c.id ? "vsetci" : c.id)} className={pillCls(depClientFilter === c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Súhrn */}
          <div className="flex gap-2 flex-wrap">
            <div className="bg-teal-50 border border-teal-100 rounded px-3 py-2 min-w-[110px]">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Dobíjanie</div>
              <div className="text-teal-700 font-black tabular-nums text-sm">+{fmtEur(depSummary.topup)} €</div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded px-3 py-2 min-w-[110px]">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Odpočty</div>
              <div className="text-red-600 font-black tabular-nums text-sm">−{fmtEur(depSummary.payment)} €</div>
            </div>
            <div className={`border rounded px-3 py-2 min-w-[110px] ${depSummary.net >= 0 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Pohyb</div>
              <div className={`font-black tabular-nums text-sm ${depSummary.net >= 0 ? "text-amber-700" : "text-red-600"}`}>
                {depSummary.net >= 0 ? "+" : ""}{fmtEur(depSummary.net)} €
              </div>
            </div>
          </div>

          {/* Tabuľka */}
          {filteredDepRows.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">Žiadne záznamy pre vybraný filter</div>
          ) : (
            <div className="border border-gray-100 rounded overflow-hidden">
              <div className="hidden sm:grid grid-cols-[100px_1fr_100px_90px_1fr_1fr] gap-2 px-3 py-1.5 bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400">
                <span>Dátum</span><span>Klient</span><span className="text-right">Suma</span><span>Typ</span><span>Poznámka</span><span>KTO</span>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredDepRows.map((r, i) => (
                  <div key={`${r.clientId}-${r.tx.id}-${i}`}
                    className="grid grid-cols-[100px_1fr_100px_90px_1fr_1fr] gap-2 px-3 py-2.5 hover:bg-gray-50 text-xs items-center">
                    <span className="text-gray-400 tabular-nums text-[10px] leading-tight">{fmtDate(r.tx.createdAt)}</span>
                    <button type="button"
                      onClick={() => r.loginId && onGoToClient?.(r.loginId)}
                      className={`text-left font-semibold text-gray-700 truncate ${onGoToClient && r.loginId ? "hover:text-secondary hover:underline cursor-pointer" : "cursor-default"}`}>
                      {r.clientName}
                    </button>
                    <span className={`text-right font-black tabular-nums ${r.tx.type === "topup" ? "text-teal-600" : "text-red-500"}`}>
                      {r.tx.type === "topup" ? "+" : "−"}{fmtEur(Math.abs(r.tx.amount))} €
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-center ${r.tx.type === "topup" ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-600"}`}>
                      {r.tx.type === "topup" ? "💰 Dobíj." : "− Platba"}
                    </span>
                    <span className="text-gray-400 text-[10px] truncate">{r.tx.note ?? "—"}</span>
                    <span className="text-gray-400 text-[10px] truncate">{r.tx.createdBy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CASHFLOW ────────────────────────────────────────────────── */}
      {sub === "cashflow" && (
        <div className="space-y-3">
          {/* Filtre */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1">
              {DATE_BTNS.map(f => (
                <button key={f.id} onClick={() => setCashDateFilter(f.id)} className={dateBtnCls(cashDateFilter === f.id)}>{f.label}</button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer ml-1">
              <input type="checkbox" checked={onlyDeposit} onChange={e => setOnlyDeposit(e.target.checked)} className="w-3.5 h-3.5 accent-amber-500" />
              <span className="text-[10px] font-bold text-gray-500">Len so zálohou</span>
            </label>
            {/* Klientský filter (len ak je clientov menej) */}
            {orderClients.length <= 12 && (
              <div className="flex gap-1 flex-wrap ml-1">
                <button onClick={() => setCashClientFilter("vsetci")} className={pillCls(cashClientFilter === "vsetci")}>Všetci</button>
                {orderClients.map(c => (
                  <button key={c.id} onClick={() => setCashClientFilter(cashClientFilter === c.id ? "vsetci" : c.id)} className={pillCls(cashClientFilter === c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Súhrn */}
          <div className="flex gap-2 flex-wrap">
            <div className="bg-gray-50 border border-gray-100 rounded px-3 py-2 min-w-[90px]">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Objednávok</div>
              <div className="font-black tabular-nums text-sm text-gray-700">{cashSummary.count}</div>
            </div>
            {cashSummary.dep > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded px-3 py-2 min-w-[110px]">
                <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Záloha použitá</div>
                <div className="text-amber-700 font-black tabular-nums text-sm">{fmtEur(cashSummary.dep)} €</div>
              </div>
            )}
          </div>

          {/* Tabuľka */}
          {filteredOrders.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">Žiadne objednávky pre vybraný filter</div>
          ) : (
            <div className="border border-gray-100 rounded overflow-hidden">
              <div className="hidden sm:grid grid-cols-[100px_1fr_1fr_80px_80px_100px_20px] gap-2 px-3 py-1.5 bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400">
                <span>Dátum</span><span>Klient</span><span>Betón</span><span className="text-right">Celkom</span><span className="text-right">Záloha</span><span>Stav</span><span />
              </div>
              <div className="divide-y divide-gray-100">
                {filteredOrders.map(o => {
                  const c = o.clientId ? clientByLoginId.get(o.clientId) : undefined;
                  const name = clientDisplayName(c, o.clientName || o.clientId);
                  return (
                    <div key={o.id}
                      onClick={() => onGoToOrder?.(o.id)}
                      className={`grid grid-cols-[100px_1fr_1fr_80px_80px_100px_20px] gap-2 px-3 py-2.5 text-xs items-center transition-colors ${
                        onGoToOrder ? "cursor-pointer hover:bg-amber-50" : "hover:bg-gray-50"
                      }`}>
                      <span className="text-gray-400 tabular-nums text-[10px] leading-tight">{fmtDate(o.createdAt)}</span>
                      <span className="font-semibold text-gray-700 truncate">{name}</span>
                      <span className="text-gray-500 truncate text-[10px]">
                        {o.concreteCategory ? `${o.concreteCategory} · ` : ""}{o.concreteType} {o.totalQty ?? o.quantity} m³
                      </span>
                      <span className="text-right font-black tabular-nums text-gray-700">{fmtEur(o.totalBezDph ?? 0, 0)} €</span>
                      <span className={`text-right font-black tabular-nums ${o.depositUsed && o.depositUsed > 0 ? "text-amber-600" : "text-gray-300"}`}>
                        {o.depositUsed && o.depositUsed > 0 ? `${fmtEur(o.depositUsed, 0)} €` : "—"}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-center ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      {onGoToOrder
                        ? <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        : <span />
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
