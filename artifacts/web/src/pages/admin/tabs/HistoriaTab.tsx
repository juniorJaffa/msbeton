import { useState, useMemo, useEffect, useRef } from "react";
import { adminData, Client, DepositTx, Order, getKamenivoGroup } from "@/lib/adminData";
import { ChevronRight, TrendingUp, Minus, Smartphone, Monitor, Laptop, ChevronDown, Users, ShoppingCart, Mountain, Waves } from "lucide-react";

type Sub = "zalohy" | "cashflow";
type DateFilter = "dnes" | "vcera" | "tyzden" | "mesiac" | "vsetko";

interface Props {
  initialSub?: Sub;
  initialClientId?: string;
  initialDate?: string;
  onGoToClient?: (loginId: string) => void;
  onGoToOrder?:  (orderId: string) => void;
}

type DepositRow =
  | { kind: "tx";    clientId: string; clientName: string; loginId: string; sortKey: string; tx: DepositTx }
  | { kind: "order"; clientId: string; clientName: string; loginId: string; sortKey: string;
      orderId: string; amount: number; orderLabel: string; orderDevice?: string; }

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
// Pre mini timeline — HH:MM ak dnes, inak d.M. HH:MM
function fmtTimeShort(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const nowStr = new Date().toDateString();
  if (d.toDateString() === nowStr) return `${hh}:${mm}`;
  return `${d.getDate()}.${d.getMonth() + 1}. ${hh}:${mm}`;
}
function fmtEur(v: number, decimals = 2) {
  return v.toLocaleString("sk-SK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function DeviceIconSmall({ label, className }: { label: string; className?: string }) {
  const l = label.toLowerCase();
  if (/iphone|ipad|android|mobil|telefon|phone|tablet/.test(l)) return <Smartphone className={className} />;
  if (/mac|macbook|laptop|notebook|\bntb\b/.test(l)) return <Laptop className={className} />;
  return <Monitor className={className} />;
}

// Slová, ktoré patria k zariadeniu (nie k osobe)
const DEVICE_WORDS_RE = /\b(iphone|ipad|android|mac|macbook|laptop|notebook|ntb|windows|linux|chrome|firefox|safari|edge|opera|monitor|pc|imac|zariadenie|tablet|phone)\b/gi;

// Rozdelí "Klára iPhone" → { person: "Klára", deviceType: "iPhone" }
// "Peter Ntb" → { person: "Peter", deviceType: "Ntb" }
// "iPhone Safari · #a3f" → { person: "", deviceType: "iPhone Safari" }
function parseDeviceLabel(label: string): { person: string; deviceType: string } {
  const withoutHash = label.replace(/\s*·\s*#[a-f0-9]{1,8}/gi, "").trim();
  const deviceWords = (withoutHash.match(DEVICE_WORDS_RE) ?? []).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const personPart = withoutHash.replace(DEVICE_WORDS_RE, "").replace(/\s+/g, " ").trim();
  return {
    person: personPart,
    deviceType: deviceWords.join(" "),
  };
}

// Zobrazí: [icon] PersonBold DeviceDimmed
function DeviceLabel({ label, className }: { label: string; className?: string }) {
  if (!label) return <span className={className}>—</span>;
  const { person, deviceType } = parseDeviceLabel(label);
  return (
    <span className={`flex items-center gap-1 ${className ?? ""}`}>
      <DeviceIconSmall label={label} className="w-3 h-3 shrink-0 text-gray-400" />
      {person && <span className="font-semibold text-gray-700">{person}</span>}
      {deviceType && <span className="text-gray-400">{deviceType}</span>}
      {!person && !deviceType && <span className="text-gray-400">{label}</span>}
    </span>
  );
}

function clientDisplayName(c?: Client, fallback?: string): string {
  if (!c) return fallback ?? "—";
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || c.loginId || fallback || "—";
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
  vyuctovana: "Vyúčtov.", vyplatena: "Vyplatená", zrusena: "Zrušená", vybavena: "Vybavená",
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

export default function HistoriaTab({ initialSub, initialClientId, initialDate, onGoToClient, onGoToOrder }: Props) {
  const [sub, setSub] = useState<Sub>(() => {
    if (initialSub) return initialSub;
    const saved = localStorage.getItem("msbeton_historia_sub");
    return (saved === "zalohy" || saved === "cashflow") ? saved as Sub : "zalohy";
  });

  // ZÁLOHY filtre
  const [depClientFilter,  setDepClientFilter]  = useState<string>(initialClientId ?? "vsetci");
  const [depDateFilter,    setDepDateFilter]    = useState<DateFilter>("tyzden");
  const [depClientDrop,    setDepClientDrop]    = useState(false);
  const [depClientSearch,  setDepClientSearch]  = useState("");
  const depClientRef = useRef<HTMLDivElement>(null);

  // CASHFLOW filtre
  const [cashDateFilter,   setCashDateFilter]   = useState<DateFilter>("tyzden");
  const [cashClientFilter, setCashClientFilter] = useState<string>("vsetci");
  const [cashClientDrop,   setCashClientDrop]   = useState(false);
  const [cashClientSearch, setCashClientSearch] = useState("");
  const [cashKtoFilters,   setCashKtoFilters]   = useState<string[]>([]);
  const [ktoDropOpen,      setKtoDropOpen]      = useState(false);
  const [onlyDeposit,      setOnlyDeposit]      = useState(false);
  const cashClientRef = useRef<HTMLDivElement>(null);
  const ktoRef        = useRef<HTMLDivElement>(null);

  // Zatvor dropdowny pri kliknutí mimo
  useEffect(() => {
    const makeHandler = (open: boolean, ref: React.RefObject<HTMLDivElement | null>, close: () => void) => {
      if (!open) return undefined;
      const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
      document.addEventListener("mousedown", h, true);
      return h;
    };
    const h1 = makeHandler(depClientDrop,  depClientRef,  () => { setDepClientDrop(false);  setDepClientSearch("");  });
    const h2 = makeHandler(cashClientDrop, cashClientRef, () => { setCashClientDrop(false); setCashClientSearch(""); });
    const h3 = makeHandler(ktoDropOpen,    ktoRef,        () => setKtoDropOpen(false));
    return () => {
      if (h1) document.removeEventListener("mousedown", h1, true);
      if (h2) document.removeEventListener("mousedown", h2, true);
      if (h3) document.removeEventListener("mousedown", h3, true);
    };
  }, [depClientDrop, cashClientDrop, ktoDropOpen]);

  useEffect(() => {
    if (!initialDate) return;
    const d = initialDate.slice(0, 10);
    if (d === TODAY)       setCashDateFilter("dnes");
    else if (d === YESTERDAY) setCashDateFilter("vcera");
    else                   setCashDateFilter("tyzden");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Živé dáta — sleduje admin-data-synced (multi-admin)
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
    // Záloha transakcie (dobíjanie + manuálne platby)
    for (const c of liveClients) {
      if (!c.deposit?.transactions?.length) continue;
      const name = clientDisplayName(c);
      const cid = c.loginId || c.id;
      for (const tx of c.deposit.transactions) {
        rows.push({ kind: "tx", clientId: cid, clientName: name, loginId: c.loginId, sortKey: tx.createdAt, tx });
      }
    }
    // Použitia zálohy z objednávok (depositUsed > 0)
    const clientMap = new Map<string, Client>();
    for (const c of liveClients) { if (c.loginId) clientMap.set(c.loginId, c); clientMap.set(c.id, c); }
    for (const o of liveOrders) {
      if (!o.depositUsed || o.depositUsed <= 0 || !o.clientId) continue;
      const c = clientMap.get(o.clientId);
      if (!c || !c.deposit) continue; // len klienti so zálohou
      const name = clientDisplayName(c, o.clientId);
      const cid = c.loginId || c.id;
      const qtyStr = o.totalQty ?? o.quantity;
      const orderLabel = [o.concreteCategory, o.concreteType, qtyStr ? `${qtyStr} m³` : ""].filter(Boolean).join(" ");
      rows.push({
        kind: "order", clientId: cid, clientName: name, loginId: c.loginId,
        sortKey: o.createdAt, orderId: o.id,
        amount: o.depositUsed,
        orderLabel: orderLabel || (o.clientName ?? name),
        orderDevice: o.createdByDevice,
      });
    }
    return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [liveClients, liveOrders]);

  const depositClients = useMemo(() => {
    const seen = new Set<string>(); const list: { id: string; name: string }[] = [];
    for (const r of allDepositRows) {
      if (!seen.has(r.clientId)) { seen.add(r.clientId); list.push({ id: r.clientId, name: r.clientName }); }
    }
    return list;
  }, [allDepositRows]);

  const filteredDepRows = useMemo(() =>
    allDepositRows.filter(r => {
      if (depClientFilter !== "vsetci" && r.clientId !== depClientFilter) return false;
      return passesDate(toDateStr(r.sortKey), depDateFilter);
    }),
  [allDepositRows, depClientFilter, depDateFilter]);

  const depSummary = useMemo(() => {
    let topup = 0, payment = 0;
    for (const r of filteredDepRows) {
      if (r.kind === "tx") {
        if (r.tx.type === "topup") topup += r.tx.amount;
        else payment += Math.abs(r.tx.amount);
      } else {
        payment += r.amount; // order usage = odpočet zo zálohy
      }
    }
    return { topup, payment, net: topup - payment };
  }, [filteredDepRows]);

  // ── CASHFLOW ─────────────────────────────────────────────────────────────
  const clientByLoginId = useMemo(() => {
    const map = new Map<string, Client>();
    for (const c of liveClients) { if (c.loginId) map.set(c.loginId, c); map.set(c.id, c); }
    return map;
  }, [liveClients]);

  const filteredOrders = useMemo(() =>
    liveOrders
      .filter(o => {
        if (onlyDeposit && !(o.depositUsed && o.depositUsed > 0)) return false;
        if (cashClientFilter !== "vsetci" && o.clientId !== cashClientFilter) return false;
        if (cashKtoFilters.length > 0 && !cashKtoFilters.includes(deviceToGroupKey.get(o.createdByDevice ?? "") ?? "")) return false;
        return passesDate(toDateStr(o.createdAt), cashDateFilter);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [liveOrders, cashClientFilter, cashKtoFilters, cashDateFilter, onlyDeposit]);

  const cashSummary = useMemo(() => {
    let dep = 0, total = 0;
    for (const o of filteredOrders) {
      if (o.depositUsed) dep += o.depositUsed;
      // totalSDph = čo klient reálne zaplatil (hotovosť = vč. DPH na betón; faktúra = s DPH)
      // fallback na totalBezDph pre staré objednávky bez totalSDph
      const paid = o.totalSDph ?? o.totalBezDph ?? 0;
      if (paid) total += paid;
    }
    return { count: filteredOrders.length, dep, total };
  }, [filteredOrders]);

  const orderClients = useMemo(() => {
    // Pre každý clientId ulož najlepšie meno (registrovaný klient > clientName > clientId)
    const bestName = new Map<string, string>();
    for (const o of liveOrders) {
      if (!o.clientId) continue;
      const c = clientByLoginId.get(o.clientId);
      const name = c ? clientDisplayName(c, o.clientId) : (o.clientName || o.clientId);
      // Prepiš iba ak nové meno je dlhšie (viac informácií)
      if (!bestName.has(o.clientId) || (name.length > (bestName.get(o.clientId)?.length ?? 0))) {
        bestName.set(o.clientId, name);
      }
    }
    return Array.from(bestName.entries()).map(([id, name]) => ({ id, name }));
  }, [liveOrders, clientByLoginId]);

  // Zariadenia — len tie aktívne v aktuálnom dátumovom rozsahu (nechceme staré nepoužívané)
  const devicesSourceOrders = useMemo(() =>
    liveOrders.filter(o => passesDate(toDateStr(o.createdAt), cashDateFilter)),
  [liveOrders, cashDateFilter]);

  // KTO skupiny — named osoby = group, unnamed auto-labels = individual s plným labelom
  interface DeviceGroup {
    key: string;          // group key pre filter (person name alebo full label)
    label: string;        // zobrazovaný label
    devices: string[];    // všetky device strings v tejto skupine
    subInfo?: string;     // krátky popis sub-zariadení (napr. "iPhone · Mac · Ntb")
    isPerson: boolean;    // true = má reálne meno osoby
  }

  const deviceGroups = useMemo((): DeviceGroup[] => {
    const rawDevices: string[] = [];
    const seen = new Set<string>();
    for (const o of devicesSourceOrders) {
      const d = o.createdByDevice ?? "";
      if (!d || seen.has(d)) continue;
      seen.add(d); rawDevices.push(d);
    }

    const byPerson = new Map<string, { devices: string[]; types: string[] }>();
    const unnamed: { fullLabel: string }[] = [];

    for (const d of rawDevices) {
      const { person, deviceType } = parseDeviceLabel(d);
      if (person) {
        if (!byPerson.has(person)) byPerson.set(person, { devices: [], types: [] });
        byPerson.get(person)!.devices.push(d);
        if (deviceType && !byPerson.get(person)!.types.includes(deviceType))
          byPerson.get(person)!.types.push(deviceType);
      } else {
        unnamed.push({ fullLabel: d });
      }
    }

    // Unnamed zariadenia — zgrupovaé podľa display name (bez hashu)
    // "iPhone Safari · #a3f2" + "iPhone Safari · #b7c1" → jedna skupina "iPhone Safari"
    const byDisplayName = new Map<string, { fullLabels: string[] }>();
    for (const { fullLabel } of unnamed) {
      const displayKey = fullLabel.replace(/\s*·\s*#[a-f0-9]{1,8}/gi, "").trim() || fullLabel;
      if (!byDisplayName.has(displayKey)) byDisplayName.set(displayKey, { fullLabels: [] });
      byDisplayName.get(displayKey)!.fullLabels.push(fullLabel);
    }

    const groups: DeviceGroup[] = [];
    for (const [person, { devices, types }] of byPerson) {
      groups.push({
        key: person, label: person, devices, isPerson: true,
        subInfo: types.length > 0 ? types.join(" · ") : undefined,
      });
    }
    for (const [displayKey, { fullLabels }] of byDisplayName) {
      groups.push({
        key: displayKey, label: displayKey, devices: fullLabels, isPerson: false,
        subInfo: fullLabels.length > 1 ? `${fullLabels.length}× zariad.` : undefined,
      });
    }
    return groups;
  }, [devicesSourceOrders]);

  // Mapa device label → group key (pre filter)
  const deviceToGroupKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of deviceGroups) for (const d of g.devices) map.set(d, g.key);
    return map;
  }, [deviceGroups]);

  // ── CSS helpers ─────────────────────────────────────────────────────────
  const dateBtnCls  = (a: boolean) => `px-2.5 py-1.5 text-[10px] font-bold rounded-full transition-colors cursor-pointer ${a ? "bg-secondary text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`;

  // Kompaktný dropdown pre výber klienta — skaluje na 100+ klientov
  function ClientDropdown({ clients, value, onChange, dropRef, open, setOpen, search, setSearch }:
    { clients: {id: string; name: string}[]; value: string; onChange: (id: string) => void;
      dropRef: React.RefObject<HTMLDivElement | null>; open: boolean; setOpen: (v: boolean) => void;
      search: string; setSearch: (v: string) => void; }) {
    const selected = clients.find(c => c.id === value);
    // Multi-word search: každé slovo musí byť v mene alebo clientId (telefóne)
    const filtered = search ? clients.filter(c => {
      const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = `${c.name} ${c.id}`.toLowerCase();
      return words.every(w => haystack.includes(w));
    }) : clients;
    return (
      <div ref={dropRef} className="relative inline-block shrink-0">
        <button onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-full border cursor-pointer transition-colors ${
            value !== "vsetci" ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
          }`}>
          <Users className="w-3 h-3 shrink-0" />
          <span className="max-w-[100px] truncate">{selected ? selected.name : "Klient"}</span>
          <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-[220px]">
            {/* Search — vždy viditeľný */}
            <div className="px-3 py-2 border-b border-gray-100">
              <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") { setSearch(""); setOpen(false); } }}
                placeholder="Meno, telefón, ID…"
                className="w-full text-[11px] px-2 py-1 border border-gray-200 rounded-lg outline-none focus:border-secondary" />
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              <button onClick={() => { onChange("vsetci"); setOpen(false); setSearch(""); }}
                className={`w-full px-4 py-2.5 text-left text-[11px] font-bold border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${value === "vsetci" ? "text-amber-600 bg-amber-50" : "text-gray-500"}`}>
                Všetci klienti
              </button>
              {filtered.map(c => (
                <button key={c.id} onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                  className={`w-full px-4 py-2.5 text-left text-[12px] cursor-pointer transition-colors hover:bg-gray-50 min-h-[44px] flex items-center ${
                    value === c.id ? "font-bold text-amber-600 bg-amber-50" : "text-gray-700"
                  }`}>
                  {c.name}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-3 text-[11px] text-gray-400 text-center">Žiadny výsledok</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Nadpis stránky */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-black text-secondary uppercase tracking-widest">História</h2>
        <div className="h-0.5 flex-1 bg-gray-200 rounded" />
      </div>

      {/* Sub-tab bar — obdĺžnikové tabuľky s nadpisom + podnadpisom */}
      <div className="flex gap-2">
        {([
          { id: "zalohy"   as Sub, title: "ZÁLOHY",      sub: "klient"   },
          { id: "cashflow" as Sub, title: "OBJEDNÁVKY",  sub: "cashflow" },
        ]).map(s => (
          <button key={s.id} onClick={() => { setSub(s.id); localStorage.setItem("msbeton_historia_sub", s.id); }}
            className={`flex flex-col items-start px-4 py-2 rounded-lg transition-all border cursor-pointer flex-1 ${
              sub === s.id
                ? "bg-secondary border-secondary text-primary shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}>
            <span className="text-xs font-black uppercase tracking-widest leading-tight">{s.title}</span>
            <span className={`text-[9px] font-semibold leading-tight mt-0.5 ${sub === s.id ? "text-primary/70" : "text-gray-400"}`}>[{s.sub}]</span>
          </button>
        ))}
      </div>

      {/* ─── ZÁLOHY ─────────────────────────────────────────────────── */}
      {sub === "zalohy" && (
        <div className="space-y-3">
          {/* Filtre */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {DATE_BTNS.map(f => (
              <button key={f.id} onClick={() => setDepDateFilter(f.id)} className={dateBtnCls(depDateFilter === f.id)}>{f.label}</button>
            ))}
          </div>
          {depositClients.length > 0 && (
            <ClientDropdown clients={depositClients} value={depClientFilter} onChange={setDepClientFilter}
              dropRef={depClientRef} open={depClientDrop} setOpen={setDepClientDrop}
              search={depClientSearch} setSearch={setDepClientSearch} />
          )}

          {/* Súhrn — kompaktný inline bar */}
          <div className="flex items-center gap-2 flex-wrap bg-white/90 border border-gray-100 rounded-lg px-3 py-1.5 w-fit">
            <span className="text-teal-600 font-black tabular-nums text-sm shrink-0">+{fmtEur(depSummary.topup, 0)} €</span>
            <span className="text-gray-200 shrink-0">|</span>
            <span className="text-red-500 font-black tabular-nums text-sm shrink-0">−{fmtEur(depSummary.payment, 0)} €</span>
            <span className="text-gray-200 shrink-0">|</span>
            <span className={`font-black tabular-nums text-sm shrink-0 ${depSummary.net >= 0 ? "text-amber-600" : "text-red-500"}`}>
              {depSummary.net >= 0 ? "+" : ""}{fmtEur(depSummary.net, 0)} €
            </span>
          </div>

          {/* Tabuľka — overflow-x-auto pre mobile */}
          {filteredDepRows.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg text-center text-gray-400 py-10 text-sm">Žiadne záznamy</div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                {/* Header — skrytý na mobile */}
                <div className="hidden sm:grid grid-cols-[90px_1fr_100px_110px_1fr_1fr] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <span>Dátum</span><span>Klient</span><span className="text-right">Suma</span><span>Typ</span><span>Poznámka</span><span>KTO</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredDepRows.map((r) => {
                    const rowKey = r.kind === "tx" ? `tx-${r.clientId}-${r.tx.id}` : `ord-${r.orderId}`;
                    const ts = r.kind === "tx" ? r.tx.createdAt : r.sortKey;
                    const isTopup = r.kind === "tx" && r.tx.type === "topup";
                    const isOrderUse = r.kind === "order";
                    const amountVal = r.kind === "tx" ? r.tx.amount : -r.amount;
                    const amountStr = `${amountVal >= 0 ? "+" : "−"}${fmtEur(Math.abs(amountVal))} €`;
                    const amountCls = isTopup ? "text-teal-600" : "text-red-500";
                    const iconBg = isTopup ? "bg-teal-100 text-teal-600" : isOrderUse ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-500";
                    const rowIcon = isTopup ? <TrendingUp className="w-3 h-3" /> : isOrderUse ? <ShoppingCart className="w-3 h-3" /> : <Minus className="w-3 h-3" />;
                    const typLabel = isTopup ? "Dobíjanie" : isOrderUse ? "Objednávka" : "Platba";
                    const typBg = isTopup ? "bg-teal-100 text-teal-700" : isOrderUse ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-600";
                    const note = r.kind === "tx" ? (r.tx.note ?? "—") : r.orderLabel;
                    const devLabel = r.kind === "tx" ? r.tx.createdBy : (r.orderDevice ?? "");
                    const handleClick = isOrderUse && onGoToOrder ? () => onGoToOrder(r.orderId) : undefined;
                    return (
                      <div key={rowKey}
                        onClick={handleClick}
                        className={`px-3 py-2.5 transition-colors ${handleClick ? "cursor-pointer hover:bg-orange-50" : "hover:bg-gray-50"}`}>
                        {/* Mobile layout */}
                        <div className="sm:hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 tabular-nums text-[10px] shrink-0 w-16">{fmtDate(ts)}</span>
                            <button type="button" onClick={e => { e.stopPropagation(); r.loginId && onGoToClient?.(r.loginId); }}
                              className={`font-semibold text-gray-700 text-xs flex-1 text-left truncate ${onGoToClient && r.loginId ? "hover:text-secondary cursor-pointer" : "cursor-default"}`}>
                              {r.clientName}
                            </button>
                            <span className={`font-black tabular-nums text-sm shrink-0 ${amountCls}`}>{amountStr}</span>
                            <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full ${iconBg}`}>{rowIcon}</span>
                          </div>
                          {isOrderUse && <div className="pl-[72px] mt-0.5 text-[9px] text-orange-600 truncate">{r.orderLabel}</div>}
                          {devLabel && (
                            <div className="pl-[72px] mt-0.5 text-[10px] truncate">
                              <DeviceLabel label={devLabel} />
                            </div>
                          )}
                        </div>
                        {/* Desktop layout */}
                        <div className="hidden sm:grid grid-cols-[90px_1fr_100px_110px_1fr_1fr] gap-2 items-center">
                          <span className="text-gray-400 tabular-nums text-[10px]">{fmtDate(ts)}</span>
                          <button type="button" onClick={e => { e.stopPropagation(); r.loginId && onGoToClient?.(r.loginId); }}
                            className={`text-left font-semibold text-gray-700 text-xs truncate ${onGoToClient && r.loginId ? "hover:text-secondary hover:underline cursor-pointer" : "cursor-default"}`}>
                            {r.clientName}
                          </button>
                          <span className={`text-right font-black tabular-nums text-sm ${amountCls}`}>{amountStr}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${typBg}`}>
                            {rowIcon}{typLabel}
                          </span>
                          <span className="text-gray-500 text-[10px] truncate">{note}</span>
                          <DeviceLabel label={devLabel} className="text-[10px] truncate" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CASHFLOW ────────────────────────────────────────────────── */}
      {sub === "cashflow" && (
        <div className="space-y-3">
          {/* Filtre — jeden flex-wrap riadok: date + záloha + KTO dropdown (mobile-first) */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {DATE_BTNS.map(f => (
              <button key={f.id} onClick={() => setCashDateFilter(f.id)} className={dateBtnCls(cashDateFilter === f.id)}>{f.label}</button>
            ))}
            <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 rounded-full px-2.5 py-1.5">
              <input type="checkbox" checked={onlyDeposit} onChange={e => setOnlyDeposit(e.target.checked)} className="w-3.5 h-3.5 accent-amber-500" />
              <span className="text-[10px] font-bold text-gray-500">Záloha</span>
            </label>
            {/* KTO dropdown trigger — inline, šetrí priestor */}
            {deviceGroups.length > 1 && (
            <div ref={ktoRef} className="relative inline-block">
              {/* Trigger — rovnaká výška ako date pills, zmestí sa do riadku */}
              <button
                onClick={() => setKtoDropOpen(o => !o)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-full transition-colors cursor-pointer border ${
                  cashKtoFilters.length > 0
                    ? "bg-secondary border-secondary text-white"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>
                <Users className="w-3 h-3 shrink-0" />
                KTO
                {cashKtoFilters.length > 0 && (
                  <span className="bg-white/30 text-white text-[9px] font-black px-1 rounded-full leading-tight">
                    {cashKtoFilters.length}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-150 ${ktoDropOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown panel */}
              {ktoDropOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-[220px] max-h-[60vh] overflow-y-auto">
                  {/* Všetci — zrušiť filter */}
                  <button
                    onClick={() => { setCashKtoFilters([]); setKtoDropOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-[11px] font-bold text-gray-500 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors text-left">
                    Všetci (zrušiť filter)
                  </button>
                  {/* Zoznam zariadení */}
                  {deviceGroups.map(g => {
                    const checked = cashKtoFilters.includes(g.key);
                    return (
                      <label key={g.key}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setCashKtoFilters(prev =>
                            prev.includes(g.key) ? prev.filter(x => x !== g.key) : [...prev, g.key]
                          )}
                          className="w-4 h-4 accent-secondary shrink-0"
                        />
                        <DeviceIconSmall label={g.devices[0]} className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="flex-1 min-w-0">
                          {g.isPerson ? (
                            <>
                              <span className="text-[12px] font-bold text-gray-800">{g.label}</span>
                              {g.subInfo && <span className="ml-1.5 text-[10px] text-gray-400">{g.subInfo}</span>}
                              {g.devices.length > 1 && (
                                <span className="ml-1.5 text-[9px] font-black text-secondary bg-secondary/10 px-1 py-px rounded">
                                  {g.devices.length}×
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-600">{g.label}</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </div>{/* END date+filter row */}

          {/* Klient dropdown — škáluje na 100+ */}
          {orderClients.length > 0 && (
            <ClientDropdown clients={orderClients} value={cashClientFilter} onChange={setCashClientFilter}
              dropRef={cashClientRef} open={cashClientDrop} setOpen={setCashClientDrop}
              search={cashClientSearch} setSearch={setCashClientSearch} />
          )}

          {/* Nadpis sekcie + kompaktný súhrn v jednom riadku */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-secondary uppercase tracking-wide shrink-0">Objednávky</span>
            <span className="text-[9px] font-bold bg-white/90 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100 shrink-0">[cashflow]</span>
            <div className="flex-1" />
            {/* Súhrn — kompaktný inline bar, nie veľké karty */}
            <div className="flex items-center gap-2 bg-white/90 border border-gray-100 rounded-lg px-3 py-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 shrink-0">Spolu</span>
              <span className="font-black tabular-nums text-sm text-gray-800 shrink-0">{cashSummary.count}</span>
              {cashSummary.total > 0 && (
                <>
                  <span className="text-gray-200 shrink-0">|</span>
                  <span className="font-black tabular-nums text-sm text-gray-900 shrink-0">{fmtEur(cashSummary.total, 0)} €</span>
                </>
              )}
              {cashSummary.dep > 0 && (
                <>
                  <span className="text-gray-200 shrink-0">|</span>
                  <span className="text-[9px] font-black text-gray-400 shrink-0">záloha</span>
                  <span className="font-black tabular-nums text-sm text-amber-600 shrink-0">{fmtEur(cashSummary.dep, 0)} €</span>
                </>
              )}
            </div>
          </div>

          {/* Tabuľka */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg text-center text-gray-400 py-10 text-sm">Žiadne objednávky</div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <div className="hidden sm:grid grid-cols-[90px_1fr_1fr_70px_70px_90px_110px_20px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <span>Dátum</span><span>Klient</span><span>Betón</span><span className="text-right">Celkom</span><span className="text-right">Záloha</span><span>Stav</span><span>KTO</span><span />
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredOrders.map(o => {
                    const c = o.clientId ? clientByLoginId.get(o.clientId) : undefined;
                    const name = clientDisplayName(c, o.clientName || o.clientId);
                    const kto = o.createdByDevice ?? "";
                    // Hoistnuté — zdieľané pre mobile aj desktop
                    const hist = o.statusHistory ?? [];
                    const lastChange = hist.length > 0 ? hist[hist.length - 1] : undefined;
                    const prevStatus = lastChange?.prevStatus;
                    const firstStatus = hist[0]?.prevStatus ?? "nova";
                    const kg = o.concreteCategory ? getKamenivoGroup(o.concreteCategory) : null;
                    return (
                      <div key={o.id} onClick={() => onGoToOrder?.(o.id)}
                        className={`px-3 py-2.5 transition-colors ${onGoToOrder ? "cursor-pointer hover:bg-amber-50" : "hover:bg-gray-50"}`}>

                        {/* ── MOBILE ─────────────────────────────────────────── */}
                        <div className="sm:hidden space-y-1 py-0.5">
                          {/* R1: Klient + Status (s prevStatus→) + Arrow */}
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-gray-800 text-[13px] flex-1 min-w-0 leading-snug line-clamp-2">{name}</span>
                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                              <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                                {prevStatus && STATUS_LABEL[prevStatus] && (
                                  <span className="opacity-50 font-medium">{STATUS_LABEL[prevStatus]} →</span>
                                )}
                                {STATUS_LABEL[o.status] ?? o.status}
                              </span>
                              {onGoToOrder && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                            </div>
                          </div>
                          {/* Status timeline — newest first, každá zmena vlastný riadok */}
                          {hist.length > 0 && (
                            <div className="space-y-px pt-0.5">
                              {[...hist].reverse().map((h, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[8px]">
                                  <span className="text-gray-500 tabular-nums font-semibold w-[66px] shrink-0">{fmtTimeShort(h.changedAt)}</span>
                                  <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>
                                    {STATUS_LABEL[h.status] ?? h.status}
                                  </span>
                                  {h.paidAmount !== undefined && h.paidAmount > 0 && (
                                    <span className="text-teal-600 tabular-nums font-semibold whitespace-nowrap">{fmtEur(h.paidAmount, 0)} €</span>
                                  )}
                                </div>
                              ))}
                              <div className="flex items-center gap-1.5 text-[8px] opacity-35">
                                <span className="tabular-nums font-semibold w-[66px] shrink-0">{fmtTimeShort(o.createdAt)}</span>
                                <span className={`font-bold px-1.5 py-0.5 rounded ${STATUS_COLOR[firstStatus] ?? "bg-gray-100 text-gray-500"}`}>
                                  {STATUS_LABEL[firstStatus] ?? firstStatus}
                                </span>
                              </div>
                            </div>
                          )}
                          {/* R2: Kategória s ikonou */}
                          {o.concreteCategory && (
                            <div className="flex items-center gap-1 text-[10px] font-black tracking-wide text-gray-900">
                              {kg === "drvene" && <Mountain className="w-3 h-3 shrink-0 text-stone-500" />}
                              {kg === "riecne" && <Waves className="w-3 h-3 shrink-0 text-blue-400" />}
                              {o.concreteCategory}
                            </div>
                          )}
                          {/* R2b: Typ + qty + Celkom € */}
                          <div className="flex items-baseline gap-2">
                            <span className="text-gray-500 text-[10px] flex-1 truncate min-w-0">
                              {o.concreteType} {o.totalQty ?? o.quantity} m³
                            </span>
                            {(() => { const invoice = o.totalSDph ?? o.totalBezDph; return invoice != null && invoice > 0 ? (
                              <span className="font-black tabular-nums text-sm text-gray-900 shrink-0">{fmtEur(invoice, 0)} €</span>
                            ) : null; })()}
                          </div>
                          {/* R2c: Reálne zaplatené (paidAmount) — keď vyplatená */}
                          {o.status === "vyplatena" && o.paidAmount !== undefined && o.paidAmount > 0 && (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[9px] text-gray-400 font-medium">zaplatené</span>
                              <span className="text-teal-600 font-black tabular-nums text-[13px]">{fmtEur(o.paidAmount, 0)} €</span>
                              {Math.abs(o.paidAmount - (o.totalSDph ?? 0)) > 0.5 && (
                                <span className={`text-[9px] font-bold tabular-nums px-1 py-0.5 rounded ${o.paidAmount > (o.totalSDph ?? 0) ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-500"}`}>
                                  {o.paidAmount > (o.totalSDph ?? 0) ? "+" : ""}{fmtEur(o.paidAmount - (o.totalSDph ?? 0), 0)}
                                </span>
                              )}
                            </div>
                          )}
                          {/* R3: Záloha + Nedoplatok */}
                          {o.depositUsed && o.depositUsed > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                záloha {fmtEur(o.depositUsed, 0)} €
                              </span>
                              {(() => { const paid = o.totalSDph ?? o.totalBezDph ?? 0; return paid - o.depositUsed > 0.5 ? (
                                <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                                  nedoplatok {fmtEur(paid - o.depositUsed, 0)} €
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
                                  uhradená zálohou ✓
                                </span>
                              ); })()}
                            </div>
                          )}
                          {/* R4: KTO + DÁTUM */}
                          <div className="flex items-center gap-1 text-[10px]">
                            {kto
                              ? <DeviceLabel label={kto} className="shrink-0" />
                              : <span className="text-gray-400">—</span>
                            }
                            <span className="text-gray-300 mx-0.5">·</span>
                            <span className="tabular-nums text-gray-700 font-semibold shrink-0">{fmtDate(o.createdAt)}</span>
                          </div>
                        </div>

                        {/* ── DESKTOP ────────────────────────────────────────── */}
                        <div className="hidden sm:flex flex-col gap-0.5">
                          {/* Hlavný riadok */}
                          <div className="grid grid-cols-[90px_1fr_1fr_70px_70px_120px_110px_20px] gap-2 items-center">
                            {/* DÁTUM */}
                            <span className="text-gray-600 tabular-nums font-semibold text-[10px]">{fmtDate(o.createdAt)}</span>
                            {/* KLIENT */}
                            <span className="font-semibold text-gray-700 text-xs truncate">{name}</span>
                            {/* BETÓN — s kamenivo ikonou */}
                            <div className="flex items-center gap-1 min-w-0">
                              {kg === "drvene" && <Mountain className="w-3 h-3 shrink-0 text-stone-500" />}
                              {kg === "riecne" && <Waves className="w-3 h-3 shrink-0 text-blue-400" />}
                              <span className="text-gray-500 truncate text-[10px]">
                                {o.concreteCategory ? `${o.concreteCategory} · ` : ""}{o.concreteType} {o.totalQty ?? o.quantity} m³
                              </span>
                            </div>
                            {/* CELKOM */}
                            <span className="text-right font-black tabular-nums text-gray-700 text-xs">{fmtEur(o.totalSDph ?? o.totalBezDph ?? 0, 0)} €</span>
                            {/* ZÁLOHA */}
                            <span className={`text-right font-black tabular-nums text-xs ${o.depositUsed && o.depositUsed > 0 ? "text-amber-600" : "text-gray-300"}`}>
                              {o.depositUsed && o.depositUsed > 0 ? `${fmtEur(o.depositUsed, 0)} €` : "—"}
                            </span>
                            {/* STAV — s prevStatus → */}
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                              {prevStatus && STATUS_LABEL[prevStatus] && (
                                <span className="opacity-50 font-medium">{STATUS_LABEL[prevStatus]} →</span>
                              )}
                              {STATUS_LABEL[o.status] ?? o.status}
                            </span>
                            {/* KTO */}
                            <DeviceLabel label={kto} className="text-[10px] truncate" />
                            {onGoToOrder ? <ChevronRight className="w-3.5 h-3.5 text-gray-300" /> : <span />}
                          </div>
                          {/* Status timeline desktop — newest first, vertical */}
                          {hist.length > 0 && (
                            <div className="pl-[94px] space-y-px pt-0.5">
                              {[...hist].reverse().map((h, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[8px]">
                                  <span className="text-gray-500 tabular-nums font-semibold w-[70px] shrink-0">{fmtTimeShort(h.changedAt)}</span>
                                  <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>
                                    {STATUS_LABEL[h.status] ?? h.status}
                                  </span>
                                  {h.paidAmount !== undefined && h.paidAmount > 0 && (
                                    <span className="text-teal-600 tabular-nums font-semibold whitespace-nowrap">{fmtEur(h.paidAmount, 0)} €</span>
                                  )}
                                </div>
                              ))}
                              <div className="flex items-center gap-1.5 text-[8px] opacity-35">
                                <span className="tabular-nums font-semibold w-[70px] shrink-0">{fmtTimeShort(o.createdAt)}</span>
                                <span className={`font-bold px-1.5 py-0.5 rounded ${STATUS_COLOR[firstStatus] ?? "bg-gray-100 text-gray-500"}`}>
                                  {STATUS_LABEL[firstStatus] ?? firstStatus}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
