import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { adminData, Client, DepositTx, Order, getKamenivoGroup, readerBlocked } from "@/lib/adminData";
import { ChevronRight, ChevronLeft, TrendingUp, Minus, Smartphone, Monitor, Laptop, ChevronDown, Users, ShoppingCart, Mountain, Waves, X, MessageSquare, Check, AlertTriangle } from "lucide-react";

type Sub = "zalohy" | "cashflow";

// Extrahuje obec z textovej adresy (rovnaká logika ako ObjednávkyTab)
const extractAddrLocality = (address: string): string => {
  const ZIP = /^\d{3}\s?\d{2}$/;
  const COUNTRY = /^(Slovensko|Slovakia|Česká republika|Česko|Czech Republic|SR|SK)$/i;
  const parts = address.split(",").map(p => p.trim()).filter(p => p && !COUNTRY.test(p) && !ZIP.test(p));
  if (!parts.length) return address;
  const candidate = parts[parts.length - 1];
  return candidate
    .replace(/^\d{3}\s?\d{2}\s+/, "")
    .replace(/\s+\d{3}\s?\d{2}$/, "")
    .trim();
};
type DateFilter = "dnes" | "vcera" | "tyzden" | "mesiac" | "vsetko";

interface Props {
  initialSub?: Sub;
  initialClientId?: string;
  initialDate?: string;
  initialDateFilter?: DateFilter;   // explicitný override pre cashDateFilter (napr. "vsetko" z navigácie)
  initialOrderId?: string;          // zvýrazni + scrolluj na konkrétnu objednávku
  onGoToClient?: (loginId: string) => void;
  onGoToOrder?:  (orderId: string) => void;
}

type DepositRow =
  | { kind: "tx";    clientId: string; clientName: string; loginId: string; sortKey: string; tx: DepositTx }
  | { kind: "order"; clientId: string; clientName: string; loginId: string; sortKey: string;
      orderId: string; amount: number; orderLabel: string; orderDevice?: string; }

// Lokálny dátum YYYY-MM-DD (SK čas, nie UTC) — vždy čerstvý pri každom volaní
function localDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const SK_MONTHS = ["januára","februára","marca","apríla","mája","júna","júla","augusta","septembra","októbra","novembra","decembra"];
const SK_DAYS   = ["Nedeľa","Pondelok","Utorok","Streda","Štvrtok","Piatok","Sobota"];
function fmtGroupDate(dateStr: string): { label: string; sub: string | null } {
  const d = new Date(dateStr + "T00:00:00");
  const day = `${d.getDate()}. ${SK_MONTHS[d.getMonth()]}`;
  const full = d.getFullYear() === new Date().getFullYear() ? day : `${day} ${d.getFullYear()}`;
  if (dateStr === localDateStr(0))  return { label: "Dnes",  sub: day };
  if (dateStr === localDateStr(-1)) return { label: "Včera", sub: day };
  return { label: SK_DAYS[d.getDay()], sub: full };
}

function toDateStr(iso: string) { return iso.slice(0, 10); }

function passesDate(dateStr: string, filter: DateFilter): boolean {
  if (filter === "vsetko") return true;
  if (filter === "dnes")   return dateStr === localDateStr(0);
  if (filter === "vcera")  return dateStr === localDateStr(-1);
  if (filter === "tyzden") return dateStr >= localDateStr(-7);
  if (filter === "mesiac") return dateStr >= localDateStr(-30);
  return true;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()}.${d.getMonth() + 1}. ${hh}:${mm}`;
}
// Rozdelí dátum na dve časti pre desktop stĺpec (date + time oddelene)
function fmtDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { date: `${d.getDate()}.${d.getMonth() + 1}.`, time: `${hh}:${mm}` };
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

// ── Rovnaké štýly ako ObjednavkyTab ─────────────────────────────────────────
const TAB_STYLES: Record<Order["tab"], { badge: string; label: string }> = {
  pumpa:          { badge: "bg-amber-100 text-amber-700 border-amber-200",  label: "Pumpa" },
  mix:            { badge: "bg-blue-100 text-blue-700 border-blue-200",     label: "Mix" },
  vlastnadoprava: { badge: "bg-green-100 text-green-700 border-green-200",  label: "Vl. doprava" },
};

function TabBadge({ tab }: { tab: Order["tab"] }) {
  const s = TAB_STYLES[tab];
  if (!s) return null;
  const icon = tab === "pumpa"
    ? <svg width="13" height="8" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="12" width="24" height="6" rx="1"/><rect x="22" y="9" width="9" height="9" rx="1"/><rect x="8" y="8" width="3" height="4" rx="0.5"/><line x1="9.5" y1="8" x2="3" y2="2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="3" y1="2" x2="22" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="6" cy="19" r="3"/><circle cx="14" cy="19" r="3"/><circle cx="27" cy="19" r="3"/></svg>
    : tab === "mix"
    ? <svg width="13" height="8" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="12" width="24" height="6" rx="1"/><rect x="22" y="9" width="9" height="9" rx="1"/><ellipse cx="12" cy="9" rx="9" ry="6"/><circle cx="6" cy="19" r="3"/><circle cx="20" cy="19" r="3"/><circle cx="27" cy="19" r="3"/></svg>
    : <svg width="13" height="8" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="10" width="30" height="8" rx="1"/><path d="M4 10 L9 4 L24 4 L28 10"/><circle cx="8" cy="19" r="3"/><circle cx="24" cy="19" r="3"/></svg>;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded-sm shrink-0 ${s.badge}`}>
      {icon}{s.label}
    </span>
  );
}

function PayBadge({ priceMode }: { priceMode: Order["priceMode"] }) {
  return (
    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block border shrink-0 ${
      priceMode === "hotovost" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-blue-100 text-blue-700 border-blue-200"
    }`}>
      {priceMode === "hotovost" ? "HOT." : "FA"}
    </span>
  );
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
  zmazana: "Zmazaná",
};
const STATUS_COLOR: Record<string, string> = {
  nova:       "bg-blue-100 text-blue-700",
  potvrdena:  "bg-yellow-100 text-yellow-700",
  odoslana:   "bg-green-100 text-green-700",
  vyuctovana: "bg-purple-100 text-purple-700",
  vyplatena:  "bg-teal-100 text-teal-700",
  zrusena:    "bg-red-100 text-red-500",
  vybavena:   "bg-gray-100 text-gray-500",
  zmazana:    "bg-red-900 text-red-100",
};
const STATUS_ACTIVE: Record<string, string> = {
  nova:       "bg-blue-500 text-white border-blue-500",
  potvrdena:  "bg-yellow-400 text-white border-yellow-400",
  odoslana:   "bg-green-600 text-white border-green-600",
  vyuctovana: "bg-purple-600 text-white border-purple-600",
  vyplatena:  "bg-teal-600 text-white border-teal-600",
  zrusena:    "bg-red-500 text-white border-red-500",
  vybavena:   "bg-gray-400 text-white border-gray-400",
};
const CASH_STATUSES = ["nova","potvrdena","odoslana","vyuctovana","vyplatena","zrusena"] as const;

export default function HistoriaTab({ initialSub, initialClientId, initialDate, initialDateFilter, initialOrderId, onGoToClient, onGoToOrder }: Props) {
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

  // CASHFLOW filtre — ak príde navigácia s clientId/dateFilter, použi "vsetko" aby sa ukázali aj staré objednávky
  const [cashDateFilter,   setCashDateFilter]   = useState<DateFilter>(
    initialDateFilter ?? (initialClientId ? "vsetko" : "tyzden")
  );
  const [cashClientFilter, setCashClientFilter] = useState<string>("vsetci");
  const [cashClientDrop,   setCashClientDrop]   = useState(false);
  const [cashClientSearch, setCashClientSearch] = useState("");
  const [cashKtoFilters,   setCashKtoFilters]   = useState<string[]>([]);
  const [ktoDropOpen,      setKtoDropOpen]      = useState(false);
  const [onlyDeposit,      setOnlyDeposit]      = useState(false);
  const [onlyNedoplatok,   setOnlyNedoplatok]   = useState(false);
  const [cashExcelFilter,  setCashExcelFilter]  = useState<"vsetky" | "ok" | "chyba">("vsetky");
  const [cashStatusFilter, setCashStatusFilter] = useState<"vsetky" | typeof CASH_STATUSES[number]>("vsetky");
  const [displayLimit,     setDisplayLimit]     = useState(100);
  const [flashDeletedId,   setFlashDeletedId]   = useState<string | null>(null);
  const [showDeleted,      setShowDeleted]      = useState(false);
  const cashClientRef = useRef<HTMLDivElement>(null);
  const ktoRef        = useRef<HTMLDivElement>(null);

  // Photo lightbox — foto klienta z objednávky
  const [clientPhotoModal, setClientPhotoModal] = useState<string | null>(null); // client.id

  // Excel confirm — uložené na objednávke v DB (viditeľné všetkým adminom)
  const toggleExcelConfirmed = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (readerBlocked()) return;
    const all = adminData.getOrders();
    const updated = all.map(o => o.id === orderId ? { ...o, excelConfirmed: !o.excelConfirmed } : o);
    adminData.saveOrders(updated);
  };

  // Focus + scroll na konkrétnu objednávku (navigácia z ObjednavkyTab)
  const [focusOrderId, setFocusOrderId] = useState<string | undefined>(initialOrderId);
  const [markedOrderId, setMarkedOrderId] = useState<string | undefined>(initialOrderId); // perzistentná zlatá bodka
  const scrollToFocused = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setTimeout(() => node.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
  }, []);
  useEffect(() => {
    if (!focusOrderId) return;
    const t = setTimeout(() => setFocusOrderId(undefined), 3200);
    return () => clearTimeout(t);
  }, [focusOrderId]);

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
    if (!initialDate || initialDateFilter) return; // initialDateFilter má prednosť
    const d = initialDate.slice(0, 10);
    if (d === localDateStr(0))  setCashDateFilter("dnes");
    else if (d === localDateStr(-1)) setCashDateFilter("vcera");
    else                   setCashDateFilter("vsetko"); // staré dátumy → "vsetko" aby bola objednávka viditeľná
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Živé dáta — sleduje admin-data-synced (multi-admin)
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const h = () => setRevision(r => r + 1);
    window.addEventListener("admin-data-synced", h);
    return () => window.removeEventListener("admin-data-synced", h);
  }, []);

  const liveClients    = useMemo(() => adminData.getClients(),    [revision]);
  const liveOrders     = useMemo(() => adminData.getOrders(),     [revision]);
  const allCategories  = useMemo(() => adminData.getCategories(), [revision]);

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

  // Zariadenia — len tie aktívne v aktuálnom dátumovom rozsahu (nechceme staré nepoužívané)
  // MUSÍ byť pred filteredOrders — deviceToGroupKey je TDZ ak je deklarovaná neskôr
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
    const byDisplayName = new Map<string, { fullLabels: string[] }>();
    for (const { fullLabel } of unnamed) {
      const displayKey = fullLabel.replace(/\s*·\s*#[a-f0-9]{1,8}/gi, "").trim() || fullLabel;
      if (!byDisplayName.has(displayKey)) byDisplayName.set(displayKey, { fullLabels: [] });
      byDisplayName.get(displayKey)!.fullLabels.push(fullLabel);
    }
    const groups: DeviceGroup[] = [];
    for (const [person, { devices, types }] of byPerson) {
      groups.push({ key: person, label: person, devices, isPerson: true, subInfo: types.length > 0 ? types.join(" · ") : undefined });
    }
    // Všetky nepomenované zariadenia → jeden bucket "Ostatné"
    const allUnnamed: string[] = [];
    const unnamedLabels: string[] = [];
    for (const [displayKey, { fullLabels }] of byDisplayName) {
      allUnnamed.push(...fullLabels);
      unnamedLabels.push(displayKey);
    }
    if (allUnnamed.length > 0) {
      groups.push({
        key: "ostatne",
        label: "Ostatné",
        devices: allUnnamed,
        isPerson: false,
        subInfo: unnamedLabels.slice(0, 3).join(" · ") + (unnamedLabels.length > 3 ? ` +${unnamedLabels.length - 3}` : ""),
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

  // Pomocná funkcia: posledná zmena objednávky (statusHistory alebo createdAt)
  // Toto je sort/group kľúč — ZASADNÉ PRAVIDLO: posledná zmena VŽDY TOP
  const orderLastChanged = (o: Order): string =>
    o.statusHistory?.at(-1)?.changedAt ?? o.createdAt;

  const filteredOrders = useMemo(() => {
    const result = liveOrders
      .filter(o => {
        if (onlyDeposit && !(o.depositUsed && o.depositUsed > 0)) return false;
        if (onlyNedoplatok) {
          const dep = o.depositUsed ?? 0;
          const paid = o.paidAmount ?? 0;
          if (!(dep > 0 && paid > 0 && dep < paid - 0.01)) return false;
        }
        if (cashExcelFilter === "ok" && !o.excelConfirmed) return false;
        if (cashExcelFilter === "chyba" && o.excelConfirmed) return false;
        if (cashStatusFilter !== "vsetky" && o.status !== cashStatusFilter) return false;
        if (cashClientFilter !== "vsetci" && o.clientId !== cashClientFilter) return false;
        if (cashKtoFilters.length > 0 && !cashKtoFilters.includes(deviceToGroupKey.get(o.createdByDevice ?? "") ?? "")) return false;
        // Dátumový filter — posledná zmena (nie createdAt) určuje, do ktorého dňa patrí
        return passesDate(toDateStr(orderLastChanged(o)), cashDateFilter);
      })
      .sort((a, b) => orderLastChanged(b).localeCompare(orderLastChanged(a)));
    return result;
  }, [liveOrders, cashClientFilter, cashKtoFilters, cashDateFilter, onlyDeposit, onlyNedoplatok, cashExcelFilter, cashStatusFilter, deviceToGroupKey]);

  // Reset displayLimit pri každej zmene filtrov
  useEffect(() => { setDisplayLimit(100); }, [cashClientFilter, cashKtoFilters, cashDateFilter, onlyDeposit, onlyNedoplatok, cashExcelFilter, cashStatusFilter, showDeleted]);

  // Klienti s fotkou z filtrovaných objednávok — pre photo lightbox navigáciu
  const clientsWithPhoto = useMemo(() => {
    const seen = new Set<string>();
    const result: Client[] = [];
    for (const o of filteredOrders) {
      const c = o.clientId ? clientByLoginId.get(o.clientId) : undefined;
      if (c?.photo && !seen.has(c.id)) { seen.add(c.id); result.push(c); }
    }
    return result;
  }, [filteredOrders, clientByLoginId]);

  // Visible orders — skryje zmazané keď showDeleted=false
  const visibleOrders = useMemo(() =>
    showDeleted ? filteredOrders : filteredOrders.filter(o => o.status !== "zmazana"),
  [filteredOrders, showDeleted]);

  // Pre-computed date groups — eliminuje mutable lastDate v JSX renderi (crash risk)
  // Skupinuje podľa poslednej zmeny (nie createdAt) — konzistentné so sort kľúčom
  const groupedOrders = useMemo(() => {
    const display = visibleOrders.slice(0, displayLimit);
    const groups: { date: string; orders: typeof display }[] = [];
    for (const o of display) {
      const d = orderLastChanged(o).slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.date === d) last.orders.push(o);
      else groups.push({ date: d, orders: [o] });
    }
    return groups;
  }, [visibleOrders, displayLimit]);

  const cashSummary = useMemo(() => {
    let dep = 0, total = 0, deletedCount = 0;
    for (const o of filteredOrders) {
      if (o.status === "zmazana") { deletedCount++; continue; } // zmazané nepočítaj do súhrnu
      if (o.depositUsed) dep += o.depositUsed;
      // totalSDph = čo klient reálne zaplatil (hotovosť = vč. DPH na betón; faktúra = s DPH)
      // fallback na totalBezDph pre staré objednávky bez totalSDph
      const paid = o.totalSDph ?? o.totalBezDph ?? 0;
      if (paid) total += paid;
    }
    const activeCount = filteredOrders.length - deletedCount;
    return { count: activeCount, deletedCount, dep, total };
  }, [filteredOrders]);

  // Payout insight — "dnes/včera sa prerozdeľujú peniaze"
  // Detekuje: statusHistory záznamy kde status="vyplatena", zoskupí podľa dňa zmeny (nie createdAt)
  // Date-filter aware: adaptuje sa podľa aktívneho cashDateFilter
  const payoutInsight = useMemo(() => {
    type DayPayout = { sum: number; count: number; orderIds: Set<string> };
    const byDay = new Map<string, DayPayout>();
    for (const o of filteredOrders) {
      if (o.status === "zmazana") continue;
      const hist = o.statusHistory ?? [];
      for (const h of hist) {
        if (h.status !== "vyplatena") continue;
        const day = h.changedAt.slice(0, 10);
        let dp = byDay.get(day);
        if (!dp) { dp = { sum: 0, count: 0, orderIds: new Set() }; byDay.set(day, dp); }
        if (!dp.orderIds.has(o.id)) {
          dp.sum += h.paidAmount ?? o.paidAmount ?? o.totalSDph ?? o.totalBezDph ?? 0;
          dp.count++;
          dp.orderIds.add(o.id);
        }
      }
    }
    const todayKey   = localDateStr(0);
    const yestKey    = localDateStr(-1);
    // Fokus deň: podľa aktívneho filtra
    const focusKey = cashDateFilter === "dnes" ? todayKey : cashDateFilter === "vcera" ? yestKey : null;
    // Top deň v aktuálnom zobrazení (pre týždeň/mesiac/všetko)
    const topEntry = [...byDay.entries()].sort((a, b) => b[1].sum - a[1].sum)[0];
    return { byDay, todayKey, yestKey, focusKey, topEntry };
  }, [filteredOrders, cashDateFilter]);

  // Cashflow extras — zálohy klientov, pohľadávky FA, trend dnes vs. minulý týždeň
  const cashflowExtras = useMemo(() => {
    // Celkový zostatok zálohy všetkých klientov (viazané peniaze)
    const totalDeposits = liveClients.reduce((s, c) => s + (c.deposit?.balance ?? 0), 0);

    // Pohľadávky: odoslaná + FA (faktúry čakajúce na platbu)
    const pohladavkyOrders = liveOrders.filter(o => o.status === "odoslana" && o.priceMode === "faktura");
    const pohladavky = pohladavkyOrders.reduce((s, o) => s + (o.totalSDph ?? o.totalBezDph ?? 0), 0);
    const pohladavkyCount = pohladavkyOrders.length;

    // Payout trend: dnes vs. rovnaký deň minulý týždeň (z liveOrders — nefiltrované dátumom)
    const todayKey   = localDateStr(0);
    const weekAgoKey = localDateStr(-7);
    const payByDay = new Map<string, number>();
    for (const o of liveOrders) {
      if (o.status === "zmazana") continue;
      for (const h of (o.statusHistory ?? [])) {
        if (h.status !== "vyplatena") continue;
        const day = h.changedAt.slice(0, 10);
        payByDay.set(day, (payByDay.get(day) ?? 0) + (h.paidAmount ?? o.paidAmount ?? o.totalSDph ?? o.totalBezDph ?? 0));
      }
    }
    const todayPay   = payByDay.get(todayKey)   ?? 0;
    const weekAgoPay = payByDay.get(weekAgoKey) ?? 0;
    const trendPct   = weekAgoPay > 10 ? Math.round((todayPay - weekAgoPay) / weekAgoPay * 100) : null;

    return { totalDeposits, pohladavky, pohladavkyCount, todayPay, weekAgoPay, trendPct };
  }, [liveClients, liveOrders]);

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

  // ── CSS helpers ─────────────────────────────────────────────────────────
  const dateBtnCls  = (a: boolean) => `px-2.5 py-1.5 text-[10px] font-bold rounded-full transition-colors cursor-pointer ${a ? "bg-secondary text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`;

  // Kompaktný dropdown pre výber klienta — skaluje na 100+ klientov
  function ClientDropdown({ clients, value, onChange, dropRef, open, setOpen, search, setSearch, align = "right" }:
    { clients: {id: string; name: string}[]; value: string; onChange: (id: string) => void;
      dropRef: React.RefObject<HTMLDivElement | null>; open: boolean; setOpen: (v: boolean) => void;
      search: string; setSearch: (v: string) => void; align?: "left" | "right"; }) {
    const selected = clients.find(c => c.id === value);
    // Multi-word search: každé slovo musí byť v mene alebo clientId (telefóne)
    const filtered = search ? clients.filter(c => {
      const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = `${c.name} ${c.id}`.toLowerCase();
      return words.every(w => haystack.includes(w));
    }) : clients;
    return (
      <div className="flex items-center gap-1">
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
          <div className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-[220px]`}>
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
        {/* X — zrušiť filter klienta, vždy viditeľné keď filter aktívny */}
        {value !== "vsetci" && (
          <button
            onClick={() => { onChange("vsetci"); setSearch(""); setOpen(false); }}
            title="Zrušiť filter klienta"
            className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 hover:bg-red-100 hover:text-red-500 border border-amber-300 hover:border-red-300 transition-colors cursor-pointer shrink-0">
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes historia-order-focus {
          0%   { outline-color: #EDC531; background-color: rgba(237,197,49,0.18); }
          60%  { outline-color: #EDC531; background-color: rgba(237,197,49,0.10); }
          100% { outline-color: transparent; background-color: transparent; }
        }
        .historia-focus-order {
          animation: historia-order-focus 3.2s ease-out forwards;
          outline: 2.5px solid #EDC531;
          outline-offset: -2px;
        }
      `}</style>
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
              search={depClientSearch} setSearch={setDepClientSearch} align="left" />
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
          {/* R0: Status filter — flex-wrap grid (žiadny scroll, všetky viditeľné naraz) */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setCashStatusFilter("vsetky")}
              className={`px-2.5 py-1.5 text-[10px] font-bold rounded border transition-all cursor-pointer whitespace-nowrap ${cashStatusFilter === "vsetky" ? "bg-secondary text-white border-secondary" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
              Všetky <span className="ml-0.5 opacity-60 text-[9px]">{liveOrders.length}</span>
            </button>
            {CASH_STATUSES.map(s => {
              const cnt = liveOrders.filter(o => o.status === s).length;
              const isActive = cashStatusFilter === s;
              return (
                <button key={s} onClick={() => setCashStatusFilter(isActive ? "vsetky" : s)}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded border transition-all cursor-pointer whitespace-nowrap ${
                    isActive ? STATUS_ACTIVE[s] ?? "bg-secondary text-white border-secondary"
                             : `bg-white border-gray-200 ${STATUS_COLOR[s] ?? ""} opacity-80 hover:opacity-100`
                  }`}>
                  {STATUS_LABEL[s]} <span className="ml-0.5 opacity-70 text-[9px]">{cnt}</span>
                </button>
              );
            })}
            {/* 🗑 Kôš — zmazané objednávky, v tom istom riadku ako statusy */}
            {cashSummary.deletedCount > 0 && (
              <button
                onClick={() => setShowDeleted(v => !v)}
                title={showDeleted ? "Skryť zmazané" : "Zobraziť zmazané"}
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  showDeleted
                    ? "bg-red-100 border-red-300 text-red-600"
                    : "bg-white border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400"
                }`}>
                🗑 <span className="opacity-70">{cashSummary.deletedCount}</span>
              </button>
            )}
          </div>

          {/* R1: Dátumové filtre — horizontal scroll na mobile */}
          <div style={{overflowX:'scroll',WebkitOverflowScrolling:'touch',marginLeft:'-16px',marginRight:'-16px',paddingBottom:'2px'}}>
            <div style={{display:'flex',gap:'6px',alignItems:'center',paddingLeft:'16px',paddingRight:'16px',width:'max-content',minWidth:'100%'}}>
              {DATE_BTNS.map(f => (
                <button key={f.id} onClick={() => setCashDateFilter(f.id)} className={`${dateBtnCls(cashDateFilter === f.id)} shrink-0 whitespace-nowrap`}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* R2: KTO · Klient · Záloha · Nedoplatok · EXCEL — horizontal scroll na mobile */}
          <div style={{overflowX:'scroll',WebkitOverflowScrolling:'touch',marginLeft:'-16px',marginRight:'-16px',paddingBottom:'2px'}}>
          <div style={{display:'flex',gap:'6px',alignItems:'center',paddingLeft:'16px',paddingRight:'16px',width:'max-content',minWidth:'100%'}}>
            {/* KTO dropdown */}
            {deviceGroups.length > 1 && (
              <div ref={ktoRef} className="relative inline-flex items-center gap-1 shrink-0">
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
                {cashKtoFilters.length > 0 && (
                  <button
                    onClick={() => setCashKtoFilters([])}
                    className="w-5 h-5 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors shrink-0"
                    title="Zrušiť KTO filter">
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
                {ktoDropOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-[220px] max-h-[60vh] overflow-y-auto">
                    <button
                      onClick={() => { setCashKtoFilters([]); setKtoDropOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-[11px] font-bold text-gray-500 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors text-left">
                      Všetci (zrušiť filter)
                    </button>
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
            {/* Klient dropdown */}
            {orderClients.length > 0 && (
              <ClientDropdown clients={orderClients} value={cashClientFilter} onChange={setCashClientFilter}
                dropRef={cashClientRef} open={cashClientDrop} setOpen={setCashClientDrop}
                search={cashClientSearch} setSearch={setCashClientSearch} />
            )}
            {/* Záloha checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 rounded-full px-2.5 py-1.5 shrink-0">
              <input type="checkbox" checked={onlyDeposit} onChange={e => setOnlyDeposit(e.target.checked)} className="w-3.5 h-3.5 accent-amber-500" />
              <span className="text-[10px] font-bold text-gray-500">Záloha</span>
            </label>
            {/* Nedoplatok checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 rounded-full px-2.5 py-1.5 shrink-0">
              <input type="checkbox" checked={onlyNedoplatok} onChange={e => setOnlyNedoplatok(e.target.checked)} className="w-3.5 h-3.5 accent-red-500" />
              <span className="text-[10px] font-bold text-red-500">Nedoplatok</span>
            </label>
          </div>{/* inner flex */}
          </div>{/* scroll wrapper */}

          {/* R3: EXCEL filter — vlastný riadok, 3 reálne buttony */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 shrink-0">EXCEL</span>
            <div className="flex items-center gap-1.5">
              {([["vsetky", "Všetky", "bg-white border-gray-200 text-gray-500 hover:border-gray-300"],
                 ["ok",     "✓ Prenesené", "bg-white border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600"],
                 ["chyba",  "? Chýba", "bg-white border-gray-200 text-gray-500 hover:border-gray-300"]] as const).map(([val, label, idleCls]) => (
                <button key={val} onClick={() => setCashExcelFilter(val)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                  cashExcelFilter === val
                    ? val === "ok"
                      ? "bg-green-100 border-green-500 text-green-700"
                      : val === "chyba"
                        ? "bg-gray-100 border-gray-400 text-gray-700"
                        : "bg-secondary border-secondary text-white"
                    : idleCls
                }`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Nadpis sekcie + kompaktný súhrn v jednom riadku */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-secondary uppercase tracking-wide shrink-0">Objednávky</span>
              <span className="text-[9px] font-bold bg-white/90 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100 shrink-0">[cashflow]</span>
              <div className="flex-1" />
              {/* Súhrn — kompaktný inline bar */}
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
                {/* Pohľadávky FA — odoslaná + faktura */}
                {cashflowExtras.pohladavky > 0 && (
                  <>
                    <span className="text-gray-200 shrink-0">|</span>
                    <span className="text-[9px] font-black text-gray-400 shrink-0" title={`${cashflowExtras.pohladavkyCount} faktúr čaká na platbu`}>pohľ.</span>
                    <span className="font-black tabular-nums text-sm text-orange-600 shrink-0">{fmtEur(cashflowExtras.pohladavky, 0)} €</span>
                  </>
                )}
              </div>
            </div>
            {/* Sekundárny riadok: zálohy klientov (viazané) + payout trend */}
            {(cashflowExtras.totalDeposits > 0 || cashflowExtras.trendPct !== null) && (
              <div className="flex items-center gap-2 justify-end flex-wrap">
                {cashflowExtras.totalDeposits > 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-white/90 border border-gray-200 rounded-full px-2.5 py-1 font-medium text-gray-500" title="Celkový zostatok zálohy všetkých klientov (viazané peniaze)">
                    🏦 <span className="font-black text-amber-600 tabular-nums">{fmtEur(cashflowExtras.totalDeposits, 0)} €</span>
                    <span className="text-gray-400">viazané</span>
                  </span>
                )}
                {cashflowExtras.trendPct !== null && cashflowExtras.todayPay > 0 && (
                  <span className={`inline-flex items-center gap-1 text-[9px] font-black bg-white/90 border border-gray-200 rounded-full px-2.5 py-1 ${cashflowExtras.trendPct >= 0 ? "text-teal-600" : "text-red-500"}`}
                    title={`Dnes vyplatené vs. rovnaký deň minulý týždeň (${fmtEur(cashflowExtras.weekAgoPay, 0)} €)`}>
                    {cashflowExtras.trendPct >= 0 ? "↑" : "↓"}{Math.abs(cashflowExtras.trendPct)}% vs. −7d
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── PAYOUT INSIGHT BANNER (A) ────────────────────────────────────────────
               Date-filter aware: adaptuje sa podľa aktívneho cashDateFilter.
               Zobrazí sa len keď sú reálne výplaty v zobrazenom období.
          ─────────────────────────────────────────────────────────────────────── */}
          {(() => {
            const { byDay, todayKey, yestKey, focusKey, topEntry } = payoutInsight;
            // Fokus-day variant (dnes/včera filter)
            if (focusKey) {
              const dp = byDay.get(focusKey);
              if (!dp || dp.count === 0) return null;
              const label = focusKey === todayKey ? "Dnes" : "Včera";
              const isToday = focusKey === todayKey;
              return (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${isToday ? "bg-teal-50 border-teal-200" : "bg-blue-50 border-blue-200"}`}>
                  <span className="text-lg shrink-0">💸</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isToday ? "text-teal-700" : "text-blue-700"}`}>
                      {label} sa vyplatilo
                    </span>
                    <div className={`font-black tabular-nums text-sm ${isToday ? "text-teal-800" : "text-blue-800"}`}>
                      {fmtEur(dp.sum, 0)} €
                      <span className={`ml-2 text-[10px] font-bold ${isToday ? "text-teal-500" : "text-blue-500"}`}>
                        · {dp.count} {dp.count === 1 ? "objednávka" : dp.count < 5 ? "objednávky" : "objednávok"}
                      </span>
                    </div>
                  </div>
                  {dp.count >= 2 && (
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full shrink-0 ${isToday ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}>
                      priemer {fmtEur(dp.sum / dp.count, 0)} €/obj.
                    </span>
                  )}
                </div>
              );
            }
            // Týždeň/mesiac/všetko — zobraziť dnes + včera ak sú, alebo top deň
            const todayDp = byDay.get(todayKey);
            const yestDp  = byDay.get(yestKey);
            if (!todayDp && !yestDp && !topEntry) return null;
            // Aspoň jeden deň musí mať výplaty > 0
            if (!todayDp && !yestDp) return null;
            return (
              <div className="flex flex-col gap-1.5 px-3 py-2 rounded-lg border bg-teal-50/60 border-teal-200">
                <span className="text-[9px] font-black uppercase tracking-widest text-teal-600">💸 Výplaty</span>
                <div className="flex flex-wrap gap-3">
                  {todayDp && todayDp.count > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-teal-700">Dnes</span>
                      <span className="font-black tabular-nums text-sm text-teal-800">{fmtEur(todayDp.sum, 0)} €</span>
                      <span className="text-[9px] text-teal-500">·{todayDp.count} obj.</span>
                    </div>
                  )}
                  {yestDp && yestDp.count > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-blue-600">Včera</span>
                      <span className="font-black tabular-nums text-sm text-blue-700">{fmtEur(yestDp.sum, 0)} €</span>
                      <span className="text-[9px] text-blue-400">·{yestDp.count} obj.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Tabuľka */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg text-center text-gray-400 py-10 text-sm">Žiadne objednávky</div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-lg overflow-clip">
              <div className="hidden sm:grid grid-cols-[90px_1fr_1fr_70px_70px_120px_110px_20px] gap-2 px-3 py-2 bg-secondary border-b border-secondary/80 text-[9px] font-black uppercase tracking-widest text-white/50 sticky top-0 z-20">
                <span>Dátum</span><span>Klient</span><span>Betón</span><span className="text-right">Celkom</span><span className="text-right">Záloha</span><span>Stav</span><span>KTO</span><span />
              </div>
              <div className="">
                  {groupedOrders.map(({ date: dateKey, orders: dayOrders }, gIdx) => (
                    <div key={dateKey} className={gIdx > 0 ? "mt-2" : ""}>
                      {/* Date group header + payout indicator (C) */}
                      {(() => {
                        const gd = fmtGroupDate(dateKey);
                        const isToday = dateKey === localDateStr(0);
                        const dayPayout = payoutInsight.byDay.get(dateKey);
                        return (
                          <div className={`flex items-center gap-2 px-3 py-2 border-y sticky top-0 sm:top-[30px] z-10 shadow-sm ${isToday ? "bg-amber-50 border-amber-200" : "bg-gray-100/80 border-gray-300"}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${isToday ? "text-primary" : "text-secondary"}`}>{gd.label}</span>
                            <div className={`flex-1 h-px ${isToday ? "bg-amber-200" : "bg-gray-200"}`} />
                            {/* 💸 Payout indicator — C */}
                            {dayPayout && dayPayout.count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 shrink-0">
                                💸 {fmtEur(dayPayout.sum, 0)} €
                                {dayPayout.count > 1 && <span className="opacity-70">·{dayPayout.count}</span>}
                              </span>
                            )}
                            {gd.sub && <span className={`text-[9px] font-bold shrink-0 ${isToday ? "text-amber-600" : "text-gray-400"}`}>{gd.sub}</span>}
                          </div>
                        );
                      })()}
                      {dayOrders.map(o => {
                    const c = o.clientId ? clientByLoginId.get(o.clientId) : undefined;
                    // Primárne meno (bez telefónu) — ako ObjednavkyTab
                    const primaryName = c
                      ? clientDisplayName(c)
                      : (o.clientName || "");
                    const isPhoneId = o.clientId && /^\+?[0-9 ]{7,}$/.test(o.clientId.replace(/\s/g,""));
                    // fallback ak nemá clientName
                    const name = primaryName || o.clientId || "—";
                    const kto = o.createdByDevice ?? "";
                    // Hoistnuté — zdieľané pre mobile aj desktop
                    const hist = o.statusHistory ?? [];
                    const lastChange = hist.length > 0 ? hist[hist.length - 1] : undefined;
                    const prevStatus = lastChange?.prevStatus;
                    const firstStatus = hist[0]?.prevStatus ?? "nova";
                    const resolvedCat = o.concreteCategory ?? allCategories.find(cat => cat.types.some(t => t.label === o.concreteType))?.name ?? null;
                    const kg = resolvedCat ? getKamenivoGroup(resolvedCat) : null;
                    const locality = o.mapLocality || (o.address ? extractAddrLocality(o.address) : "");
                    const isDeleted = o.status === "zmazana";
                    const isFlashing = flashDeletedId === o.id;
                    const isOrderToday = dateKey === localDateStr(0);
                    // Zľavy z klienta
                    const effDiscCelkovo = c?.discountCelkovo || 0;
                    const effDiscBeton   = !effDiscCelkovo ? (c?.discountBeton   || 0) : 0;
                    const effDiscDoprava = !effDiscCelkovo ? (c?.discountDoprava || 0) : 0;
                    const effDiscSluzby  = !effDiscCelkovo ? (c?.discountSluzby  || 0) : 0;
                    // Záloha — isPartial keď záloha nestačila a klient doplácal
                    const depUsed = o.depositUsed && o.depositUsed > 0 ? o.depositUsed : undefined;
                    const isPartialDep = depUsed !== undefined && o.paidAmount !== undefined && depUsed < o.paidAmount - 0.01;
                    return (
                      <div key={o.id}
                        ref={o.id === focusOrderId ? scrollToFocused : undefined}
                        onClick={() => {
                          if (isDeleted) { setFlashDeletedId(o.id); setTimeout(() => setFlashDeletedId(null), 600); return; }
                          if (o.id === markedOrderId) setMarkedOrderId(undefined);
                          onGoToOrder?.(o.id);
                        }}
                        title={isDeleted ? "Zmazaná objednávka — nedostupná v zozname" : undefined}
                        className={`relative px-3 py-2.5 border-b-2 last:border-b-0 transition-colors ${isOrderToday && !isDeleted ? "border-amber-100 bg-amber-50" : "border-gray-200"} ${o.id === focusOrderId ? "historia-focus-order" : ""} ${isFlashing ? "flash-deleted" : ""} ${isDeleted ? "opacity-50 bg-red-50/40 cursor-not-allowed" : onGoToOrder ? "cursor-pointer hover:bg-amber-100/70" : "hover:bg-amber-50/60"}`}>
                        {o.id === markedOrderId && (
                          <span className="absolute left-0 inset-y-0 pointer-events-none z-10 flex items-center justify-center overflow-visible" style={{width:"4px"}}>
                            <span className="relative flex" style={{height:"12px",width:"12px"}}>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" style={{animationDuration:"1.4s"}} />
                              <span className="relative inline-flex rounded-full h-full w-full bg-primary" />
                            </span>
                          </span>
                        )}

                        {/* ── MOBILE ─────────────────────────────────────────── */}
                        <div className="sm:hidden space-y-1 py-0.5">
                          {/* R1: Klient + Status (s prevStatus→) + Arrow — inšp. ObjednavkyTab */}
                          <div className="flex items-start gap-2">
                            {c?.photo && (
                              <button type="button" onClick={e => { e.stopPropagation(); setClientPhotoModal(c.id); }}
                                className="shrink-0 mt-0.5 cursor-pointer">
                                <img src={c.photo} className="w-6 h-6 rounded-full object-cover object-top ring-1 ring-primary/30" alt="" />
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-secondary text-base leading-snug break-words">{name}</span>
                              {/* Phone sub-label — keď clientId je telefón a líši sa od mena */}
                              {isPhoneId && o.clientId && o.clientId !== name && (
                                <div className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5 tabular-nums">{o.clientId}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                              <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                                {prevStatus && STATUS_LABEL[prevStatus] && (
                                  <span className="opacity-50 font-medium">{STATUS_LABEL[prevStatus]} →</span>
                                )}
                                {STATUS_LABEL[o.status] ?? o.status}
                              </span>
                              {onGoToOrder && !isDeleted && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                            </div>
                          </div>
                          {/* Status timeline — newest first, každá zmena vlastný riadok */}
                          {hist.length > 0 && (
                            <div className="space-y-px pt-0.5">
                              {[...hist].reverse().map((h, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[8px]">
                                  <span className={`tabular-nums w-[66px] shrink-0 ${i === 0 ? "text-secondary font-black text-[10px]" : "text-gray-700 font-bold"}`}>{fmtTimeShort(h.changedAt)}</span>
                                  {h.type === "note" ? (
                                    <span className="flex items-center gap-0.5 text-gray-400 font-medium min-w-0">
                                      <MessageSquare className="w-2 h-2 shrink-0" />
                                      <span className="truncate max-w-[110px] italic">{h.note || "—"}</span>
                                    </span>
                                  ) : (
                                    <>
                                      <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>
                                        {STATUS_LABEL[h.status] ?? h.status}
                                      </span>
                                      {h.paidAmount !== undefined && h.paidAmount > 0 && (
                                        <span className="text-teal-600 tabular-nums font-semibold whitespace-nowrap">{fmtEur(h.paidAmount, 0)} €</span>
                                      )}
                                    </>
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
                          {/* R2: Typ vozidla + FA/HOT + Kategória kameniva */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {o.tab && <TabBadge tab={o.tab} />}
                            {o.priceMode && <PayBadge priceMode={o.priceMode} />}
                            {resolvedCat && (
                              <span className={`inline-flex items-center gap-0.5 text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded-sm ${kg === "drvene" ? "bg-stone-100 text-stone-700" : kg === "riecne" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                                {kg === "drvene" && <Mountain className="w-3 h-3 shrink-0 text-stone-500" />}
                                {kg === "riecne" && <Waves className="w-3 h-3 shrink-0 text-blue-400" />}
                                {resolvedCat}
                              </span>
                            )}
                          </div>
                          {/* R2b: Typ betónu + qty — ľavý text, suma — pravá výrazná */}
                          <div className="flex items-baseline gap-2">
                            <span className="text-gray-600 text-[11px] flex-1 min-w-0">
                              {o.concreteType && <span className="font-semibold">{o.concreteType}</span>}
                              {(o.totalQty ?? o.quantity) ? <span className="text-gray-400 ml-1">{o.totalQty ?? o.quantity} m³</span> : null}
                            </span>
                            {(() => { const invoice = o.totalSDph ?? o.totalBezDph; return invoice != null && invoice > 0 ? (
                              <span className="font-black tabular-nums text-base text-secondary shrink-0">{fmtEur(invoice, 0)} €</span>
                            ) : null; })()}
                          </div>
                          {/* R2c: Lokalita + km */}
                          {(locality || o.km) && (
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                              {locality && <span className="font-semibold text-gray-600 truncate">{locality}</span>}
                              {locality && o.km ? <span className="text-gray-300">·</span> : null}
                              {o.km ? <span className="tabular-nums">{o.km} km</span> : null}
                            </div>
                          )}
                          {/* R2d: Reálne zaplatené + záloha (oba v jednom bloku) */}
                          {((o.status === "vyplatena" || o.status === "vyuctovana") && o.paidAmount !== undefined && o.paidAmount > 0) || (o.depositUsed && o.depositUsed > 0) ? (
                            <div className="flex items-start justify-between gap-2">
                              {/* ľavá: záloha chips */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {o.depositUsed && o.depositUsed > 0 && (
                                  <>
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
                                  </>
                                )}
                              </div>
                              {/* pravá: zaplatené */}
                              {(o.status === "vyplatena" || o.status === "vyuctovana") && o.paidAmount !== undefined && o.paidAmount > 0 && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] text-gray-400 font-medium">zaplatené</span>
                                  <span className="text-teal-600 font-black tabular-nums text-base">{fmtEur(o.paidAmount, 0)} €</span>
                                  {Math.abs(o.paidAmount - (o.totalSDph ?? 0)) > 0.5 && (
                                    <span className={`text-[9px] font-bold tabular-nums px-1 py-0.5 rounded ${o.paidAmount > (o.totalSDph ?? 0) ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-500"}`}>
                                      {o.paidAmount > (o.totalSDph ?? 0) ? "+" : ""}{fmtEur(o.paidAmount - (o.totalSDph ?? 0), 0)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : null}
                          {/* R2e: Poznámka */}
                          {o.note && (
                            <div className="flex items-start gap-1 text-[10px] text-gray-500 italic">
                              <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 text-gray-400" />
                              <span className="line-clamp-2">{o.note}</span>
                            </div>
                          )}
                          {/* R4: KTO (menej viditeľný) + Vytvorené dátum + Excel confirm */}
                          <div className="flex items-center gap-1 text-[9px]">
                            {kto && <DeviceLabel label={kto} className="shrink-0 opacity-50" />}
                            {kto && <span className="text-gray-200 mx-0.5">·</span>}
                            <span className="text-gray-400 shrink-0">Vytvorené</span>
                            <span className="tabular-nums text-gray-500 font-medium shrink-0 ml-0.5">{fmtDate(o.createdAt)}</span>
                            <span className="flex-1" />
                            <button
                              onClick={e => toggleExcelConfirmed(e, o.id)}
                              className={`inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                                o.excelConfirmed
                                  ? "bg-green-100 text-green-700 border-green-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300"
                                  : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-400"
                              }`}>
                              <Check className="w-2.5 h-2.5 shrink-0" />
                              {o.excelConfirmed ? "EXCEL OK" : "EXCEL?"}
                            </button>
                          </div>
                        </div>

                        {/* ── DESKTOP ────────────────────────────────────────── */}
                        <div className="hidden sm:flex flex-col gap-0.5">
                          {/* Hlavný riadok */}
                          <div className="grid grid-cols-[90px_1fr_1fr_70px_70px_120px_110px_20px] gap-2 items-center">
                            {/* DÁTUM — posledná zmena (zhodné s group sort), createdAt sub-label ak iný deň */}
                            {(() => {
                              const lastChanged = orderLastChanged(o);
                              const lp = fmtDateParts(lastChanged);
                              const createdDay = o.createdAt.slice(0, 10);
                              const changedDay = lastChanged.slice(0, 10);
                              const cp = fmtDateParts(o.createdAt);
                              return (
                                <div className="flex flex-col gap-0 min-w-0">
                                  <span className="text-secondary font-black tabular-nums text-[11px] leading-tight">{lp.date}</span>
                                  <span className="text-gray-500 tabular-nums text-[10px] leading-tight">{lp.time}</span>
                                  {createdDay !== changedDay && (
                                    <span className="text-gray-400 tabular-nums text-[9px] leading-tight" title={`Vytvorené: ${fmtDate(o.createdAt)}`}>
                                      vzn. {cp.date}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                            {/* KLIENT — navy bold, phone subline ak telefón */}
                            <div className="min-w-0 flex items-center gap-1.5">
                              {c?.photo && (
                                <button type="button" onClick={e => { e.stopPropagation(); setClientPhotoModal(c.id); }}
                                  className="shrink-0 cursor-pointer">
                                  <img src={c.photo} className="w-5 h-5 rounded-full object-cover object-top ring-1 ring-primary/30" alt="" />
                                </button>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-secondary text-sm truncate">{name}</div>
                                {isPhoneId && o.clientId && o.clientId !== name && (
                                  <div className="text-[9px] text-gray-400 tabular-nums truncate">{o.clientId}</div>
                                )}
                              </div>
                            </div>
                            {/* BETÓN — kamenivo + tab/pay badges + lokalita */}
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                {o.tab && <TabBadge tab={o.tab} />}
                                {o.priceMode && <PayBadge priceMode={o.priceMode} />}
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-gray-600 truncate text-xs font-semibold">
                                  {o.concreteType}{(o.totalQty ?? o.quantity) ? <span className="font-normal text-gray-400 ml-1">{o.totalQty ?? o.quantity} m³</span> : null}
                                </span>
                              </div>
                              {(locality || o.km) && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                  {locality && <span className="font-semibold text-gray-500 truncate">{locality}</span>}
                                  {locality && o.km ? <span className="text-gray-300">·</span> : null}
                                  {o.km ? <span className="tabular-nums">{o.km} km</span> : null}
                                </div>
                              )}
                              {resolvedCat && (
                                <div className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded-sm w-fit ${kg === "drvene" ? "bg-stone-100 text-stone-600" : kg === "riecne" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                                  {kg === "drvene" && <Mountain className="w-2.5 h-2.5 shrink-0 text-stone-400" />}
                                  {kg === "riecne" && <Waves className="w-2.5 h-2.5 shrink-0 text-blue-400" />}
                                  <span className="truncate">{resolvedCat}</span>
                                </div>
                              )}
                            </div>
                            {/* CELKOM + paidAmount + diff pod ním */}
                            <div className="text-right flex flex-col gap-0.5 items-end">
                              <span className="font-black tabular-nums text-secondary text-sm">{fmtEur(o.totalSDph ?? o.totalBezDph ?? 0, 0)} €</span>
                              {(o.status === "vyplatena" || o.status === "vyuctovana") && o.paidAmount !== undefined && o.paidAmount > 0 && (
                                <div className="flex items-center gap-1 justify-end">
                                  <span className="text-[9px] text-gray-400">zap.</span>
                                  <span className="text-teal-600 font-black tabular-nums text-xs whitespace-nowrap">{fmtEur(o.paidAmount, 0)} €</span>
                                  {Math.abs(o.paidAmount - (o.totalSDph ?? 0)) > 0.5 && (
                                    <span className={`text-[9px] font-bold tabular-nums px-1 py-0.5 rounded ${o.paidAmount > (o.totalSDph ?? 0) ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-500"}`}>
                                      {o.paidAmount > (o.totalSDph ?? 0) ? "+" : ""}{fmtEur(o.paidAmount - (o.totalSDph ?? 0), 0)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* ZÁLOHA — 💰 badge štýl ako Objednávky */}
                            <div className="flex justify-end">
                              {depUsed ? (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm border leading-tight ${isPartialDep ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
                                  title={isPartialDep ? `Záloha: ${depUsed.toFixed(2)} € + doplatok: ${((o.paidAmount ?? 0) - depUsed).toFixed(2)} €` : "Záloha"}>
                                  💰 {isPartialDep ? "záloha+dopl." : `${fmtEur(depUsed, 0)} €`}
                                </span>
                              ) : <span className="text-gray-300 text-[9px]">—</span>}
                            </div>
                            {/* STAV — s prevStatus → */}
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                              {prevStatus && STATUS_LABEL[prevStatus] && (
                                <span className="opacity-50 font-medium">{STATUS_LABEL[prevStatus]} →</span>
                              )}
                              {STATUS_LABEL[o.status] ?? o.status}
                            </span>
                            {/* KTO — menej viditeľný */}
                            <DeviceLabel label={kto} className="text-[10px] truncate opacity-50" />
                            {onGoToOrder && !isDeleted ? <ChevronRight className="w-3.5 h-3.5 text-gray-300" /> : <span />}
                          </div>
                          {/* Badges row — SMS/košík, zľavy, podmienky, nedoplatok */}
                          {(o.viaSms !== undefined || effDiscCelkovo > 0 || effDiscBeton > 0 || effDiscDoprava > 0 || effDiscSluzby > 0 || o.podmienky || (depUsed && isPartialDep)) && (
                            <div className="pl-[94px] flex items-center gap-1.5 flex-wrap mt-0.5">
                              {/* SMS / Košík */}
                              {o.viaSms
                                ? <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm"><MessageSquare className="w-2.5 h-2.5" /> SMS</span>
                                : o.viaSms === false && <span className="inline-flex items-center bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-sm"><ShoppingCart className="w-3 h-3" /></span>}
                              {/* Podmienky */}
                              {o.podmienky && (() => { const ir = o.podmienky.pumpa * 7 + o.podmienky.mix * 9 < (o.totalQty ?? 0); return (
                                <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-sm ${ir ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-800"}`}>
                                  {ir ? <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> : <span>★</span>}
                                  {o.podmienky.pumpa > 0 ? `1×P+${o.podmienky.mix}×M` : `${o.podmienky.trucks}×Mix`}
                                </span>
                              ); })()}
                              {/* Zľavy */}
                              {effDiscCelkovo > 0 && <span className="bg-primary text-secondary text-[9px] font-black px-1.5 py-0.5 rounded-sm">−{effDiscCelkovo}%</span>}
                              {effDiscBeton   > 0 && <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">B−{effDiscBeton}%</span>}
                              {effDiscDoprava > 0 && <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">D−{effDiscDoprava}%</span>}
                              {effDiscSluzby  > 0 && <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">S−{effDiscSluzby}%</span>}
                              {/* Nedoplatok ak čiastočná záloha */}
                              {depUsed && isPartialDep && o.paidAmount && (
                                <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                                  nedoplatok {fmtEur(o.paidAmount - depUsed, 0)} €
                                </span>
                              )}
                            </div>
                          )}
                          {/* Poznámka — desktop */}
                          {o.note && (
                            <div className="pl-[94px] flex items-start gap-1 text-[10px] text-gray-500 italic">
                              <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 text-gray-400" />
                              <span className="line-clamp-2">{o.note}</span>
                            </div>
                          )}
                          {/* Excel confirm — desktop */}
                          <div className="flex justify-end">
                            <button
                              onClick={e => toggleExcelConfirmed(e, o.id)}
                              className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                o.excelConfirmed
                                  ? "bg-green-100 text-green-700 border-green-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300"
                                  : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-400"
                              }`}>
                              <Check className="w-2.5 h-2.5 shrink-0" />
                              {o.excelConfirmed ? "EXCEL OK" : "EXCEL?"}
                            </button>
                          </div>
                          {/* Status timeline desktop — newest first, vertical */}
                          {hist.length > 0 && (
                            <div className="pl-[94px] space-y-px pt-0.5">
                              {[...hist].reverse().map((h, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[8px]">
                                  <span className={`tabular-nums w-[70px] shrink-0 ${i === 0 ? "text-secondary font-black text-[10px]" : "text-gray-700 font-bold"}`}>{fmtTimeShort(h.changedAt)}</span>
                                  {h.type === "note" ? (
                                    <span className="flex items-center gap-0.5 text-gray-400 font-medium min-w-0">
                                      <MessageSquare className="w-2 h-2 shrink-0" />
                                      <span className="truncate max-w-[140px] italic">{h.note || "—"}</span>
                                    </span>
                                  ) : (
                                    <>
                                      <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>
                                        {STATUS_LABEL[h.status] ?? h.status}
                                      </span>
                                      {h.paidAmount !== undefined && h.paidAmount > 0 && (
                                        <span className="text-teal-600 tabular-nums font-semibold whitespace-nowrap">{fmtEur(h.paidAmount, 0)} €</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}
                              <div className="flex items-center gap-1.5 text-[8px] opacity-35">
                                <span className="tabular-nums font-semibold w-[70px] shrink-0">{fmtTimeShort(o.createdAt)}</span>
                                <span className={`font-bold px-1.5 py-0.5 rounded ${STATUS_COLOR[firstStatus] ?? "bg-gray-100 text-gray-500"}`}>
                                  {STATUS_LABEL[firstStatus] ?? firstStatus}
                                </span>
                                <span className="text-gray-500 font-medium">Vytvorené</span>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                    </div>
                  ))}
                </div>
                {/* Load-more — ak je viac ako displayLimit */}
                {filteredOrders.length > displayLimit && (
                  <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-3 bg-gray-50/60">
                    <span className="text-[10px] text-gray-400 font-medium">
                      Zobrazených {displayLimit} z {filteredOrders.length} objednávok
                    </span>
                    <button
                      onClick={() => setDisplayLimit(l => l + 100)}
                      className="text-[10px] font-bold text-secondary hover:text-primary border border-gray-200 hover:border-secondary px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                    >
                      Načítať ďalších 100
                    </button>
                  </div>
                )}
              </div>
          )}
        </div>
      )}

      {/* ── Client photo lightbox ── */}
      {clientPhotoModal && (() => {
        const idx = clientsWithPhoto.findIndex(c => c.id === clientPhotoModal);
        const c = idx >= 0 ? clientsWithPhoto[idx] : null;
        if (!c) return null;
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || c.loginId || "Klient";
        const hasPrev = idx > 0;
        const hasNext = idx < clientsWithPhoto.length - 1;
        return (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setClientPhotoModal(null)}>
            <div className="relative flex flex-col items-center gap-3 max-w-sm w-full"
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setClientPhotoModal(null)}
                className="absolute top-0 right-0 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors cursor-pointer z-10">
                <X className="w-5 h-5 text-white" />
              </button>
              <img src={c.photo!} className="w-56 h-56 rounded-full object-cover object-top shadow-2xl ring-4 ring-primary/60" alt={name} />
              <div className="text-center">
                <div className="font-black text-white text-lg leading-snug">{name}</div>
                {c.loginId && <div className="text-white/50 text-xs font-mono mt-0.5">#{c.loginId}</div>}
              </div>
              {clientsWithPhoto.length > 1 && (
                <div className="flex items-center gap-4 mt-1">
                  <button onClick={() => setClientPhotoModal(clientsWithPhoto[idx - 1].id)}
                    disabled={!hasPrev}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${hasPrev ? "bg-white/20 hover:bg-white/40 text-white" : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white/40 text-xs tabular-nums">{idx + 1} / {clientsWithPhoto.length}</span>
                  <button onClick={() => setClientPhotoModal(clientsWithPhoto[idx + 1].id)}
                    disabled={!hasNext}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${hasNext ? "bg-white/20 hover:bg-white/40 text-white" : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
