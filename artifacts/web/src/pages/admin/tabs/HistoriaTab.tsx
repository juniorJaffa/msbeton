import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { adminData, Client, DepositTx, Order, getKamenivoGroup, readerBlocked } from "@/lib/adminData";
import { ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Minus, Smartphone, Monitor, Laptop, ChevronDown, Users, ShoppingCart, Mountain, Waves, X, MessageSquare, Check, AlertTriangle, MapPin, Navigation, Phone, Search, SlidersHorizontal, Landmark } from "lucide-react";

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
  return v.toLocaleString("sk-SK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + " €";
}

/** Sticky day-group header — na mobile sa pri scrollovaní zmodrí (bg-secondary) */
function DayGroupHeader({
  dateKey, gd, isToday, dayPayout,
}: {
  dateKey: string;
  gd: { label: string; sub: string | null };
  isToday: boolean;
  dayPayout: { sum: number; count: number } | undefined;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const root = document.getElementById("admin-content");
    const obs = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { root: root ?? undefined, threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  // Farby: stuck → mobile modrá (bg-secondary), desktop ostáva pôvodná (sm: override)
  const bg    = isStuck ? "bg-secondary border-secondary sm:border-gray-300 sm:bg-gray-100/80"
                        : isToday ? "bg-amber-50 border-amber-200" : "bg-gray-100/80 border-gray-300";
  const label = isStuck ? "text-white sm:text-secondary"
                        : isToday ? "text-primary" : "text-secondary";
  const line  = isStuck ? "bg-white/20 sm:bg-gray-200"
                        : isToday ? "bg-amber-200" : "bg-gray-200";
  const sub   = isStuck ? "text-white/75 sm:text-gray-400"
                        : isToday ? "text-amber-600" : "text-gray-400";

  return (
    <>
      {/* Sentinel — IntersectionObserver ho sleduje; keď vyjde z viewportu = header stuck */}
      <div ref={sentinelRef} style={{ height: 1, marginTop: -1 }} aria-hidden />
      <div className={`flex items-center gap-2 px-3 py-2 border-y sticky top-0 sm:top-[30px] z-10 shadow-sm transition-colors duration-150 ${bg}`}>
        <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 transition-colors duration-150 ${label}`}>{gd.label}</span>
        <div className={`flex-1 h-px transition-colors duration-150 ${line}`} />
        {dayPayout && dayPayout.count > 0 && (
          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 transition-all duration-150 ${
            isStuck
              ? "bg-primary/25 text-primary border border-primary/40 sm:bg-teal-100 sm:text-teal-700 sm:border-transparent"
              : "bg-teal-100 text-teal-700"
          }`}>
            💸 {fmtEur(dayPayout.sum, 0)}
            {dayPayout.count > 1 && <span className="opacity-70">·{dayPayout.count}</span>}
          </span>
        )}
        {gd.sub && <span className={`text-[9px] font-bold shrink-0 transition-colors duration-150 ${sub}`}>{gd.sub}</span>}
      </div>
    </>
  );
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
  const [depClientFilter,      setDepClientFilter]      = useState<string>(initialClientId ?? "vsetci");
  const [depDateFilter,        setDepDateFilter]        = useState<DateFilter>("tyzden");
  const [depExcelFilter,       setDepExcelFilter]       = useState<"vsetky" | "ok" | "chyba">("vsetky");
  const [depOnlyTopup,         setDepOnlyTopup]         = useState(false); // filter: len prijaté (zelené) zálohy
  const [depClientDrop,        setDepClientDrop]        = useState(false);
  const [depClientSearch,      setDepClientSearch]      = useState("");
  const [depSearch,            setDepSearch]            = useState("");
  const depClientRef = useRef<HTMLDivElement>(null);

  // CASHFLOW filtre — ak príde navigácia s clientId/dateFilter, použi "vsetko" aby sa ukázali aj staré objednávky
  // cashStatusFilter + cashDateFilter sa persistujú do localStorage (prežijú unmount pri prepnutí tabu)
  const [cashDateFilter, setCashDateFilterRaw] = useState<DateFilter>(() => {
    if (initialDateFilter) return initialDateFilter;
    if (initialClientId) return "vsetko";
    if (initialOrderId) return "vsetko"; // zobraziť všetky dátumy aby bola cieľová objednávka viditeľná
    return (localStorage.getItem("msbeton_historia_cashDate") as DateFilter | null) ?? "tyzden";
  });
  const setCashDateFilter = (v: DateFilter) => {
    setCashDateFilterRaw(v);
    localStorage.setItem("msbeton_historia_cashDate", v);
  };
  const [cashClientFilter, setCashClientFilter] = useState<string>("vsetci");
  const [cashClientDrop,   setCashClientDrop]   = useState(false);
  const [cashClientSearch, setCashClientSearch] = useState("");
  const [cashKtoFilters,   setCashKtoFilters]   = useState<string[]>([]);
  const [ktoDropOpen,      setKtoDropOpen]      = useState(false);
  const [onlyDeposit,      setOnlyDeposit]      = useState(false);
  const [onlyNedoplatok,   setOnlyNedoplatok]   = useState(false);
  const [cashExcelFilter,  setCashExcelFilter]  = useState<"vsetky" | "ok" | "chyba">("vsetky");
  const [cashStatusFilter, setCashStatusFilterRaw] = useState<"vsetky" | typeof CASH_STATUSES[number]>(() => {
    if (initialOrderId) return "vsetky"; // zobraziť všetky statusy aby bola cieľová objednávka viditeľná
    const saved = localStorage.getItem("msbeton_historia_cashStatus");
    return (saved && [...CASH_STATUSES, "vsetky"].includes(saved)) ? saved as "vsetky" | typeof CASH_STATUSES[number] : "vsetky";
  });
  const setCashStatusFilter = (v: "vsetky" | typeof CASH_STATUSES[number]) => {
    setCashStatusFilterRaw(v);
    localStorage.setItem("msbeton_historia_cashStatus", v);
  };
  const [cashSearch,       setCashSearch]       = useState("");
  const [displayLimit,     setDisplayLimit]     = useState(100);
  const [flashDeletedId,   setFlashDeletedId]   = useState<string | null>(null);
  // 2-step Excel confirm: id čakajúci na potvrdenie
  const [excelPending,     setExcelPending]     = useState<string | null>(null);
  const excelPendingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleted,      setShowDeleted]      = useState(false);
  const [colHeaderScrolled, setColHeaderScrolled] = useState(false);
  const [cashDateFrom,     setCashDateFrom]     = useState("");
  const [cashDateTo,       setCashDateTo]       = useState("");
  const cashClientRef = useRef<HTMLDivElement>(null);
  const ktoRef        = useRef<HTMLDivElement>(null);

  // Filter panel open/collapse state — vzor Objednávky
  const [cashFilterOpen,   setCashFilterOpen]   = useState(false);
  const [depFilterOpen,    setDepFilterOpen]     = useState(false);
  const [secCashStavOpen,  setSecCashStavOpen]   = useState(true);
  const [secCashDateOpen,  setSecCashDateOpen]   = useState(true);
  const [secCashExtraOpen, setSecCashExtraOpen]  = useState(false);
  const [secDepDateOpen,   setSecDepDateOpen]    = useState(true);
  const [secDepExtraOpen,  setSecDepExtraOpen]   = useState(false);

  // Photo lightbox — foto klienta z objednávky — { clientId, photoIdx } naviguje len cez fotky daného klienta
  const [clientPhotoModal, setClientPhotoModal] = useState<{ clientId: string; photoIdx: number } | null>(null);

  // ESC zatvára photo lightbox
  useEffect(() => {
    if (!clientPhotoModal) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setClientPhotoModal(null); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [clientPhotoModal]);

  // Excel confirm — uložené na objednávke v DB (viditeľné všetkým adminom)
  const toggleExcelConfirmed = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (readerBlocked()) return;
    const all = adminData.getOrders();
    const updated = all.map(o => o.id === orderId ? { ...o, excelConfirmed: !o.excelConfirmed } : o);
    adminData.saveOrders(updated);
  };

  // Excel confirm pre zálohovú transakciu (kind="tx") — uložené v client.deposit.transactions
  const toggleDepTxExcel = (e: React.MouseEvent, clientId: string, txId: string) => {
    e.stopPropagation();
    if (readerBlocked()) return;
    const clients = adminData.getClients();
    const updated = clients.map(c => {
      if ((c.loginId || c.id) !== clientId) return c;
      return {
        ...c,
        deposit: {
          ...c.deposit,
          balance: c.deposit?.balance ?? 0,
          enabled: c.deposit?.enabled ?? false,
          transactions: (c.deposit?.transactions ?? []).map(tx =>
            tx.id === txId ? { ...tx, excelConfirmed: !tx.excelConfirmed } : tx
          ),
        },
      };
    });
    adminData.saveClients(updated);
  };

  const clearExcelPending = () => {
    if (excelPendingTimer.current) clearTimeout(excelPendingTimer.current);
    excelPendingTimer.current = null;
    setExcelPending(null);
  };

  // Focus + scroll na konkrétnu objednávku (navigácia z ObjednavkyTab)
  const [focusOrderId, setFocusOrderId] = useState<string | undefined>(initialOrderId);
  const [markedOrderId, setMarkedOrderId] = useState<string | undefined>(initialOrderId); // perzistentná zlatá bodka
  const scrollToFocused = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    // scrollIntoView nefunguje na position:fixed scroll kontajneroch (browser scrolluje document, nie admin-content).
    // Manuálny container.scrollTo je správny prístup — ale musí vedieť scrollTop pred výpočtom.
    // Fix: okamžite force scrollTop=0 (synchronne v ref callback, pred AdminDashboard efektom),
    // potom 300ms timeout dá Reactu čas usadiť layout, a výpočet je deterministický.
    const container = document.getElementById("admin-content");
    if (container) container.scrollTop = 0; // garantuj 0 pred výpočtom
    setTimeout(() => {
      const cont = document.getElementById("admin-content");
      if (!cont) return;
      const cR = cont.getBoundingClientRect();
      // Všetky sticky elementy (z-10 filter row + z-20 desktop header) — vezmeme najnižší bottom
      const els = Array.from(cont.querySelectorAll<HTMLElement>(".sticky"));
      const stickyH = els.reduce((max, el) => {
        const b = el.getBoundingClientRect().bottom;
        return b > cR.top && b < cR.bottom ? Math.max(max, b) : max;
      }, cR.top) - cR.top;
      const nR = node.getBoundingClientRect();
      cont.scrollTo({ top: Math.max(0, cont.scrollTop + (nR.top - cR.top) - stickyH - 8), behavior: "smooth" });
    }, 300);
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

  const clientByLoginId = useMemo(() => {
    const map = new Map<string, Client>();
    for (const c of liveClients) { if (c.loginId) map.set(c.loginId, c); map.set(c.id, c); }
    return map;
  }, [liveClients]);

  const depositClients = useMemo(() => {
    const seen = new Set<string>(); const list: { id: string; name: string }[] = [];
    for (const r of allDepositRows) {
      if (!seen.has(r.clientId)) { seen.add(r.clientId); list.push({ id: r.clientId, name: r.clientName }); }
    }
    return list;
  }, [allDepositRows]);

  // Normalizácia pre vyhľadávanie — strip diacritiky, lowercase (zdieľané zálohy + cashflow)
  const normH = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const filteredDepRows = useMemo(() => {
    const searchTerms = depSearch.trim().split(/\s+/).filter(Boolean);
    return allDepositRows.filter(r => {
      if (depClientFilter !== "vsetci" && r.clientId !== depClientFilter) return false;
      if (!passesDate(toDateStr(r.sortKey), depDateFilter)) return false;
      // Len prijaté (zelené topup transakcie)
      if (depOnlyTopup && !(r.kind === "tx" && r.tx.type === "topup")) return false;
      if (depExcelFilter !== "vsetky") {
        // Pre "tx" riadky: tx.excelConfirmed; pre "order" riadky: order.excelConfirmed z liveOrders
        const isConfirmed = r.kind === "tx"
          ? !!r.tx.excelConfirmed
          : !!(liveOrders.find(o => o.id === r.orderId)?.excelConfirmed);
        if (depExcelFilter === "ok"    && !isConfirmed) return false;
        if (depExcelFilter === "chyba" &&  isConfirmed) return false;
      }
      if (searchTerms.length > 0) {
        const c = r.clientId ? clientByLoginId.get(r.clientId) : undefined;
        const txNote = r.kind === "tx" ? (r.tx.note ?? "") : "";
        const haystack = [
          r.clientName, r.loginId ?? "", r.clientId ?? "",
          r.kind === "order" ? (r.orderLabel ?? "") : "",
          txNote,
          c?.firstName ?? "", c?.lastName ?? "", c?.phone ?? "", c?.company ?? "", c?.loginId ?? "",
        ].join(" ");
        if (!searchTerms.every(t => normH(haystack).includes(normH(t)))) return false;
      }
      return true;
    });
  }, [allDepositRows, depClientFilter, depDateFilter, depExcelFilter, depOnlyTopup, liveOrders, depSearch, clientByLoginId]);

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
    const searchTerms = cashSearch.trim().split(/\s+/).filter(Boolean);
    const result = liveOrders
      .filter(o => {
        if (onlyDeposit && !(o.depositUsed && o.depositUsed > 0)) return false;
        if (onlyNedoplatok) {
          // nedoplatok = záloha čiastočná a doplatok nebol plne uhradený cez payments[]
          const dep = o.depositUsed ?? 0;
          if (dep <= 0) return false;
          const doplatokTotal = Math.max(0, (o.totalSDph ?? 0) - dep);
          if (doplatokTotal < 0.01) return false;
          const payTotal = (o.payments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
          if (payTotal >= doplatokTotal - 0.01) return false;
        }
        if (cashExcelFilter === "ok" && !o.excelConfirmed) return false;
        if (cashExcelFilter === "chyba" && o.excelConfirmed) return false;
        if (cashStatusFilter !== "vsetky" && o.status !== cashStatusFilter) return false;
        if (cashClientFilter !== "vsetci" && o.clientId !== cashClientFilter) return false;
        if (cashKtoFilters.length > 0 && !cashKtoFilters.includes(deviceToGroupKey.get(o.createdByDevice ?? "") ?? "")) return false;
        // Dátumový filter — custom range má prednosť pred quick tlačidlami
        const ds = toDateStr(orderLastChanged(o));
        if (cashDateFrom || cashDateTo) {
          if (cashDateFrom && ds < cashDateFrom) return false;
          if (cashDateTo   && ds > cashDateTo)   return false;
        } else {
          if (!passesDate(ds, cashDateFilter)) return false;
        }
        // Fulltext search — meno, firma, telefón, ID klienta, adresa, lokalita, typ betónu, poznámka, suma
        if (searchTerms.length > 0) {
          const c = o.clientId ? clientByLoginId.get(o.clientId) : undefined;
          const haystack = [
            o.clientName, o.company ?? "", o.phone ?? "", o.clientId ?? "",
            o.address ?? "", o.mapLocality ?? "", o.note ?? "",
            o.concreteType ?? "", o.concreteCategory ?? "",
            o.totalSDph?.toFixed(2) ?? "", Math.round(o.totalSDph ?? 0).toString(),
            c?.firstName ?? "", c?.lastName ?? "", c?.phone ?? "", c?.company ?? "", c?.loginId ?? "",
          ].join(" ");
          if (!searchTerms.every(t => normH(haystack).includes(normH(t)))) return false;
        }
        return true;
      })
      .sort((a, b) => orderLastChanged(b).localeCompare(orderLastChanged(a)));
    return result;
  }, [liveOrders, cashClientFilter, cashKtoFilters, cashDateFilter, cashDateFrom, cashDateTo, onlyDeposit, onlyNedoplatok, cashExcelFilter, cashStatusFilter, cashSearch, deviceToGroupKey, clientByLoginId]);

  // Reset displayLimit pri každej zmene filtrov
  useEffect(() => { setDisplayLimit(100); }, [cashClientFilter, cashKtoFilters, cashDateFilter, cashDateFrom, cashDateTo, onlyDeposit, onlyNedoplatok, cashExcelFilter, cashStatusFilter, cashSearch, showDeleted]);

  // Scroll listener — zmena farby column headera pri scrollovaní
  useEffect(() => {
    const el = document.getElementById("admin-content");
    if (!el) return;
    const onScroll = () => setColHeaderScrolled(el.scrollTop > 40);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);


  // Visible orders — kôš: IBA zmazané; normálny pohľad: zmazané skryté
  const visibleOrders = useMemo(() =>
    showDeleted
      ? filteredOrders.filter(o => o.status === "zmazana")
      : filteredOrders.filter(o => o.status !== "zmazana"),
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

  // Počty aktívnych filtrov — pre badge v hlavičke
  const activeCash = [
    cashStatusFilter !== "vsetky",
    cashDateFilter !== "tyzden" || !!cashDateFrom || !!cashDateTo,
    cashKtoFilters.length > 0,
    cashClientFilter !== "vsetci",
    onlyDeposit,
    onlyNedoplatok,
    cashExcelFilter !== "vsetky",
    cashSearch.trim().length > 0,
  ].filter(Boolean).length;

  const activeDep = [
    depDateFilter !== "tyzden",
    depClientFilter !== "vsetci",
    depOnlyTopup,
    depExcelFilter !== "vsetky",
    depSearch.trim().length > 0,
  ].filter(Boolean).length;

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
        <div>
          {/* Filtre — sticky collapsible panel (vzor Objednávky) */}
          <div className="sticky top-0 z-10 bg-white border border-gray-200 shadow-sm">
            <button onClick={() => setDepFilterOpen(o => !o)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter</span>
              {activeDep > 0 && (
                <span className="bg-secondary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{activeDep}</span>
              )}
              <span className="ml-auto text-xs font-bold text-secondary shrink-0">{filteredDepRows.length} záz.</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${depFilterOpen ? "rotate-180" : ""}`} />
            </button>
            {depFilterOpen && (
              <div className="border-t border-gray-200">
                {/* HĽADAJ */}
                <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 pointer-events-none" />
                  <input
                    type="text" value={depSearch} onChange={e => setDepSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") setDepSearch(""); }}
                    placeholder="Meno, firma, telefón, ID, poznámka..."
                    className="flex-1 border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-secondary rounded-sm"
                    autoComplete="off"
                  />
                  {depSearch && (
                    <button onClick={() => setDepSearch("")} className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* DÁTUM */}
                <div className="border-b border-gray-200">
                  <button type="button" onClick={() => setSecDepDateOpen(o => !o)}
                    className="w-full bg-gray-50 border-b border-gray-100 px-4 py-1.5 flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Dátum</span>
                    {depDateFilter !== "tyzden" && (
                      <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                        {DATE_BTNS.find(f => f.id === depDateFilter)?.label}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform duration-150 ${secDepDateOpen ? "rotate-180" : ""}`} />
                  </button>
                  {secDepDateOpen && (
                    <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                      {DATE_BTNS.map(f => (
                        <button key={f.id} onClick={() => setDepDateFilter(f.id)} className={`${dateBtnCls(depDateFilter === f.id)} whitespace-nowrap`}>{f.label}</button>
                      ))}
                    </div>
                  )}
                </div>
                {/* KLIENT · EXCEL · PRIJATÉ */}
                <div>
                  <button type="button" onClick={() => setSecDepExtraOpen(o => !o)}
                    className="w-full bg-gray-50 border-b border-gray-100 px-4 py-1.5 flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Klient · Excel · Typ</span>
                    {(depClientFilter !== "vsetci" || depExcelFilter !== "vsetky" || depOnlyTopup) && (
                      <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                        {[depClientFilter !== "vsetci", depExcelFilter !== "vsetky", depOnlyTopup].filter(Boolean).length}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform duration-150 ${secDepExtraOpen ? "rotate-180" : ""}`} />
                  </button>
                  {secDepExtraOpen && (
                    <div className="px-4 py-2.5 space-y-2">
                      {depositClients.length > 0 && (
                        <ClientDropdown clients={depositClients} value={depClientFilter} onChange={setDepClientFilter}
                          dropRef={depClientRef} open={depClientDrop} setOpen={setDepClientDrop}
                          search={depClientSearch} setSearch={setDepClientSearch} align="left" />
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-wide text-green-700 bg-green-50 border border-green-400 rounded px-1.5 py-0.5 shrink-0">EXCEL</span>
                        <button onClick={() => setDepExcelFilter("vsetky")} className={`px-2.5 py-1 text-xs font-bold rounded-sm border transition-all cursor-pointer ${depExcelFilter === "vsetky" ? "bg-secondary text-white border-secondary" : "bg-white text-gray-500 border-green-300 hover:border-green-400"}`}>Všetky</button>
                        <button onClick={() => setDepExcelFilter("ok")} className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-sm border transition-all cursor-pointer ${depExcelFilter === "ok" ? "bg-green-100 text-green-700 border-green-500" : "bg-white text-gray-600 border-green-300 hover:bg-green-50 hover:text-green-600 hover:border-green-400"}`}><Check className="w-2.5 h-2.5 shrink-0" />EXCEL OK</button>
                        <button onClick={() => setDepExcelFilter("chyba")} className={`px-2.5 py-1 text-xs font-bold rounded-sm border transition-all cursor-pointer ${depExcelFilter === "chyba" ? "bg-gray-100 text-gray-700 border-gray-400" : "bg-white text-gray-600 border-green-300 hover:border-green-400"}`}>EXCEL?</button>
                        <span className="text-gray-200 mx-0.5">|</span>
                        <button onClick={() => setDepOnlyTopup(v => !v)} className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-sm border transition-all cursor-pointer ${depOnlyTopup ? "bg-teal-100 text-teal-700 border-teal-500" : "bg-white text-gray-500 border-gray-200 hover:border-teal-400 hover:text-teal-600"}`}>
                          <TrendingUp className="w-3 h-3 shrink-0" />Prijaté
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Zálohy obsah */}
          <div className="space-y-3 mt-3">
          {/* Súhrn — kompaktný inline bar */}
          <div className="flex items-center gap-2 flex-wrap bg-white/90 border border-gray-100 rounded-lg px-3 py-1.5 w-fit">
            <span className="text-teal-600 font-black tabular-nums text-sm shrink-0">+{fmtEur(depSummary.topup, 0)}</span>
            <span className="text-gray-200 shrink-0">|</span>
            <span className="text-red-500 font-black tabular-nums text-sm shrink-0">−{fmtEur(depSummary.payment, 0)}</span>
            <span className="text-gray-200 shrink-0">|</span>
            <span className={`font-black tabular-nums text-sm shrink-0 ${depSummary.net >= 0 ? "text-amber-600" : "text-red-500"}`}>
              {depSummary.net >= 0 ? "+" : ""}{fmtEur(depSummary.net, 0)}
            </span>
          </div>

          {/* Tabuľka — overflow-x-auto pre mobile */}
          {filteredDepRows.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg text-center text-gray-400 py-10 text-sm">Žiadne záznamy</div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                {/* Header — skrytý na mobile */}
                <div className="hidden sm:grid grid-cols-[90px_1fr_100px_110px_1fr_1fr_72px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <span>Dátum</span><span>Klient</span><span className="text-right">Suma</span><span>Typ</span><span>Poznámka</span><span>KTO</span><span className="text-center">Excel</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredDepRows.map((r) => {
                    const rowKey = r.kind === "tx" ? `tx-${r.clientId}-${r.tx.id}` : `ord-${r.orderId}`;
                    const ts = r.kind === "tx" ? r.tx.createdAt : r.sortKey;
                    const isTopup = r.kind === "tx" && r.tx.type === "topup";
                    const isOrderUse = r.kind === "order";
                    const amountVal = r.kind === "tx" ? r.tx.amount : -r.amount;
                    const amountStr = `${amountVal >= 0 ? "+" : "−"}${fmtEur(Math.abs(amountVal))}`;
                    const amountCls = isTopup ? "text-teal-600" : "text-red-500";
                    const iconBg = isTopup ? "bg-teal-100 text-teal-600" : isOrderUse ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-500";
                    const rowIcon = isTopup ? <TrendingUp className="w-3 h-3" /> : isOrderUse ? <ShoppingCart className="w-3 h-3" /> : <Minus className="w-3 h-3" />;
                    const typLabel = isTopup ? "Záloha" : isOrderUse ? "Objednávka" : "Platba";
                    const typBg = isTopup ? "bg-teal-100 text-teal-700" : isOrderUse ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-600";
                    const note = r.kind === "tx" ? (r.tx.note ?? "—") : r.orderLabel;
                    const devLabel = r.kind === "tx" ? r.tx.createdBy : (r.orderDevice ?? "");
                    const handleClick = isOrderUse && onGoToOrder ? () => onGoToOrder(r.orderId) : undefined;
                    // EXCEL stav: pre order riadky z liveOrders, pre tx riadky z tx.excelConfirmed
                    const isExcelOk = r.kind === "order"
                      ? !!(liveOrders.find(o => o.id === r.orderId)?.excelConfirmed)
                      : !!r.tx.excelConfirmed;
                    // Disabled pre non-vyplatená order riadky; tx riadky vždy enabled
                    const depOrderStatus = liveOrders.find(o => o.id === r.orderId)?.status;
                    const isExcelEnabled = r.kind === "tx" || depOrderStatus === "vyplatena";
                    const excelPendingKey = r.kind === "order" ? r.orderId : (r.kind === "tx" ? r.tx.id : r.orderId);
                    const isDepPending = excelPending === excelPendingKey;
                    const handleExcel = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (!isExcelEnabled) return;
                      if (isDepPending) {
                        clearExcelPending();
                        if (r.kind === "order") toggleExcelConfirmed(e, r.orderId);
                        else toggleDepTxExcel(e, r.clientId, r.tx.id);
                      } else {
                        clearExcelPending();
                        setExcelPending(excelPendingKey);
                        excelPendingTimer.current = setTimeout(clearExcelPending, 3000);
                      }
                    };
                    const excelBtnCls = !isExcelEnabled
                      ? "bg-gray-50 text-gray-200 border-gray-100 cursor-not-allowed opacity-40"
                      : isDepPending
                        ? "bg-yellow-100 text-yellow-700 border-yellow-400 hover:bg-green-100 hover:text-green-700 hover:border-green-500 cursor-pointer animate-pulse"
                        : isExcelOk
                          ? "bg-green-100 text-green-700 border-green-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300 cursor-pointer"
                          : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-400 cursor-pointer";
                    return (
                      <div key={rowKey}
                        onClick={handleClick}
                        className={`px-3 py-2.5 transition-colors ${handleClick ? "cursor-pointer hover:bg-orange-50" : "hover:bg-gray-50"}`}>
                        {/* Mobile layout */}
                        <div className="sm:hidden">
                          {/* Riadok 1: dátum | klient | suma | typ-ikona */}
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
                          {/* Riadok 2: DeviceLabel + EXCEL btn (cashflow vzor — spacer + btn na pravej) */}
                          <div className="pl-[72px] mt-1 flex items-center gap-1">
                            {devLabel && <DeviceLabel label={devLabel} className="text-[10px] shrink-0 opacity-70" />}
                            <span className="flex-1" />
                            <button onClick={handleExcel}
                              className={`inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded border transition-all cursor-pointer shrink-0 ${excelBtnCls}`}>
                              <Check className="w-2.5 h-2.5 shrink-0" />{isDepPending ? "Potvrdiť?" : isExcelOk ? "EXCEL OK" : "EXCEL?"}
                            </button>
                          </div>
                        </div>
                        {/* Desktop layout */}
                        <div className="hidden sm:grid grid-cols-[90px_1fr_100px_110px_1fr_1fr_72px] gap-2 items-center">
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
                          {/* EXCEL btn — desktop */}
                          <div className="flex justify-center">
                            <button onClick={handleExcel}
                              className={`inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded border transition-all cursor-pointer ${excelBtnCls}`}>
                              <Check className="w-2.5 h-2.5 shrink-0" />{isDepPending ? "Potvrdiť?" : isExcelOk ? "EXCEL OK" : "EXCEL?"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </div>{/* /space-y-3 zálohy obsah */}
        </div>
      )}

      {/* ─── CASHFLOW ────────────────────────────────────────────────── */}
      {sub === "cashflow" && (
        <div>
          {/* Filtre — sticky collapsible panel (vzor Objednávky) */}
          <div className="sticky top-0 z-20 bg-white border border-gray-200 shadow-sm">
            <button onClick={() => setCashFilterOpen(o => !o)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter</span>
              {activeCash > 0 && (
                <span className="bg-secondary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{activeCash}</span>
              )}
              <span className="ml-auto text-xs font-bold text-secondary shrink-0">{cashSummary.count} obj.</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${cashFilterOpen ? "rotate-180" : ""}`} />
            </button>
            {cashFilterOpen && (
              <div className="border-t border-gray-200">
                {/* HĽADAJ */}
                <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 pointer-events-none" />
                  <input
                    type="text" value={cashSearch} onChange={e => setCashSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") setCashSearch(""); }}
                    placeholder="Meno, firma, telefón, ID, adresa..."
                    className="flex-1 border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-secondary rounded-sm"
                    autoComplete="off"
                  />
                  {cashSearch && (
                    <button onClick={() => setCashSearch("")} className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* STAV — collapsible */}
                <div className="border-b border-gray-200">
                  <button type="button" onClick={() => setSecCashStavOpen(o => !o)}
                    className="w-full bg-gray-50 border-b border-gray-100 px-4 py-1.5 flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Stav</span>
                    {cashStatusFilter !== "vsetky" && (
                      <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                        {STATUS_LABEL[cashStatusFilter] ?? cashStatusFilter}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform duration-150 ${secCashStavOpen ? "rotate-180" : ""}`} />
                  </button>
                  {secCashStavOpen && (
                    <div className="px-4 py-2.5 flex flex-wrap gap-1">
                      <button onClick={() => setCashStatusFilter("vsetky")}
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
                      {cashSummary.deletedCount > 0 && (
                        <button onClick={() => setShowDeleted(v => !v)}
                          title={showDeleted ? "Skryť zmazané" : "Zobraziť zmazané"}
                          className={`px-2.5 py-1.5 text-[10px] font-bold rounded border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${showDeleted ? "bg-red-100 border-red-300 text-red-600" : "bg-white border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400"}`}>
                          🗑 <span className="opacity-70">{cashSummary.deletedCount}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* DÁTUM + EXCEL — collapsible */}
                <div className="border-b border-gray-200">
                  <button type="button" onClick={() => setSecCashDateOpen(o => !o)}
                    className="w-full bg-gray-50 border-b border-gray-100 px-4 py-1.5 flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Dátum · Excel</span>
                    {(cashDateFilter !== "tyzden" || cashExcelFilter !== "vsetky") && (
                      <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                        {[cashDateFilter !== "tyzden", cashExcelFilter !== "vsetky"].filter(Boolean).length}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform duration-150 ${secCashDateOpen ? "rotate-180" : ""}`} />
                  </button>
                  {secCashDateOpen && (
                    <div className="px-4 py-2.5 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {DATE_BTNS.map(f => (
                          <button key={f.id} onClick={() => setCashDateFilter(f.id)}
                            className={`${dateBtnCls(cashDateFilter === f.id)} whitespace-nowrap`}>{f.label}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-wide text-green-700 bg-green-50 border border-green-400 rounded px-1.5 py-0.5 shrink-0">EXCEL</span>
                        <button onClick={() => setCashExcelFilter("vsetky")} className={`inline-flex items-center gap-0.5 text-[10px] font-black px-2.5 py-1 rounded border transition-all cursor-pointer whitespace-nowrap ${cashExcelFilter === "vsetky" ? "bg-secondary text-white border-secondary" : "bg-white text-gray-500 border-green-300 hover:border-green-400"}`}>Všetky</button>
                        <button onClick={() => setCashExcelFilter("ok")} className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded border transition-all cursor-pointer whitespace-nowrap ${cashExcelFilter === "ok" ? "bg-green-100 text-green-700 border-green-500" : "bg-white text-gray-600 border-green-300 hover:bg-green-50 hover:text-green-600 hover:border-green-400"}`}><Check className="w-2.5 h-2.5 shrink-0" />EXCEL OK</button>
                        <button onClick={() => setCashExcelFilter("chyba")} className={`inline-flex items-center gap-0.5 text-[10px] font-black px-2.5 py-1 rounded border transition-all cursor-pointer whitespace-nowrap ${cashExcelFilter === "chyba" ? "bg-gray-100 text-gray-700 border-gray-400" : "bg-white text-gray-600 border-green-300 hover:border-green-400"}`}>EXCEL?</button>
                      </div>
                    </div>
                  )}
                </div>
                {/* KTO + KLIENT + ZÁLOHA — collapsible */}
                <div>
                  <button type="button" onClick={() => setSecCashExtraOpen(o => !o)}
                    className="w-full bg-gray-50 border-b border-gray-100 px-4 py-1.5 flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">KTO · Klient · Záloha</span>
                    {(cashKtoFilters.length > 0 || cashClientFilter !== "vsetci" || onlyDeposit) && (
                      <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                        {[cashKtoFilters.length > 0, cashClientFilter !== "vsetci", onlyDeposit].filter(Boolean).length}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform duration-150 ${secCashExtraOpen ? "rotate-180" : ""}`} />
                  </button>
                  {secCashExtraOpen && (
                    <div className="px-4 py-2.5 space-y-2">
                      {/* KTO dropdown */}
                      {deviceGroups.length > 1 && (
                        <div ref={ktoRef} className="relative inline-flex items-center gap-1">
                          <button onClick={() => setKtoDropOpen(o => !o)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-full transition-colors cursor-pointer border ${cashKtoFilters.length > 0 ? "bg-secondary border-secondary text-white" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                            <Users className="w-3 h-3 shrink-0" />
                            KTO
                            {cashKtoFilters.length > 0 && (
                              <span className="bg-white/30 text-white text-[9px] font-black px-1 rounded-full leading-tight">{cashKtoFilters.length}</span>
                            )}
                            <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-150 ${ktoDropOpen ? "rotate-180" : ""}`} />
                          </button>
                          {cashKtoFilters.length > 0 && (
                            <button onClick={() => setCashKtoFilters([])}
                              className="w-5 h-5 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors shrink-0"
                              title="Zrušiť KTO filter">
                              <X className="w-3 h-3 text-white" />
                            </button>
                          )}
                          {ktoDropOpen && (
                            <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-[220px] max-h-[60vh] overflow-y-auto">
                              <button onClick={() => { setCashKtoFilters([]); setKtoDropOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-3 text-[11px] font-bold text-gray-500 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors text-left">
                                Všetci (zrušiť filter)
                              </button>
                              {deviceGroups.map(g => {
                                const checked = cashKtoFilters.includes(g.key);
                                return (
                                  <label key={g.key} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors min-h-[44px]">
                                    <input type="checkbox" checked={checked}
                                      onChange={() => setCashKtoFilters(prev => prev.includes(g.key) ? prev.filter(x => x !== g.key) : [...prev, g.key])}
                                      className="w-4 h-4 accent-secondary shrink-0" />
                                    <DeviceIconSmall label={g.devices[0]} className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span className="flex-1 min-w-0">
                                      {g.isPerson ? (
                                        <>
                                          <span className="text-[12px] font-bold text-gray-800">{g.label}</span>
                                          {g.subInfo && <span className="ml-1.5 text-[10px] text-gray-400">{g.subInfo}</span>}
                                          {g.devices.length > 1 && (
                                            <span className="ml-1.5 text-[9px] font-black text-secondary bg-secondary/10 px-1 py-px rounded">{g.devices.length}×</span>
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
                      <div className="flex items-center gap-2 flex-wrap">
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Cashflow obsah */}
          <div className="space-y-3 mt-3">

          {/* Nadpis sekcie + súhrn — jeden riadok s chipmi */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Identita sekcie */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="leading-tight">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-500">Cashflow</div>
                <div className="text-sm font-black text-secondary">Objednávky</div>
              </div>
            </div>
            <div className="w-px h-7 bg-gray-200 shrink-0 hidden sm:block" />
            {/* Stat chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Count */}
              <span className="inline-flex items-center gap-1 bg-secondary text-white text-[10px] font-black px-2 py-1 rounded-md tabular-nums shrink-0">
                {cashSummary.count} <span className="opacity-50 font-normal text-[9px]">obj.</span>
              </span>
              {/* Celková suma */}
              {cashSummary.total > 0 && (
                <span className="inline-flex items-center bg-white border border-gray-200 text-gray-800 text-xs font-black px-2 py-1 rounded-md tabular-nums shrink-0">
                  {fmtEur(cashSummary.total, 0)}
                </span>
              )}
              {/* Záloha */}
              {cashSummary.dep > 0 && (
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black px-2 py-1 rounded-md tabular-nums shrink-0">
                  <span className="opacity-60 font-normal">záloha</span> {fmtEur(cashSummary.dep, 0)}
                </span>
              )}
              {/* Pohľadávky */}
              {cashflowExtras.pohladavky > 0 && (
                <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-black px-2 py-1 rounded-md tabular-nums shrink-0"
                  title={`${cashflowExtras.pohladavkyCount} faktúr čaká na platbu`}>
                  <span className="opacity-60 font-normal">pohľ.</span> {fmtEur(cashflowExtras.pohladavky, 0)}
                </span>
              )}
              {/* Viazané zálohy klientov */}
              {cashflowExtras.totalDeposits > 0 && (
                <span className="inline-flex items-center gap-1 bg-white border border-gray-200 text-[10px] px-2 py-1 rounded-md tabular-nums shrink-0"
                  title="Celkový zostatok zálohy všetkých klientov (viazané peniaze)">
                  <Landmark className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="font-black text-amber-600">{fmtEur(cashflowExtras.totalDeposits, 0)}</span>
                  <span className="text-gray-400 font-normal">viaz.</span>
                </span>
              )}
              {/* Trend vs. −7d */}
              {cashflowExtras.trendPct !== null && cashflowExtras.todayPay > 0 && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-black bg-white border border-gray-200 px-2 py-1 rounded-md shrink-0 ${cashflowExtras.trendPct >= 0 ? "text-teal-600 border-teal-200" : "text-red-500 border-red-200"}`}
                  title={`Dnes vyplatené vs. rovnaký deň minulý týždeň (${fmtEur(cashflowExtras.weekAgoPay, 0)})`}>
                  {cashflowExtras.trendPct >= 0
                    ? <TrendingUp className="w-3 h-3 shrink-0" />
                    : <TrendingDown className="w-3 h-3 shrink-0" />}
                  {Math.abs(cashflowExtras.trendPct)}% vs. −7d
                </span>
              )}
            </div>
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
                    <div className={`flex items-center gap-2 font-black tabular-nums text-sm ${isToday ? "text-teal-800" : "text-blue-800"}`}>
                      {fmtEur(dp.sum, 0)}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isToday ? "bg-teal-200 text-teal-800" : "bg-blue-200 text-blue-800"}`}>
                        {dp.count} {dp.count === 1 ? "obj." : dp.count < 5 ? "obj." : "obj."}
                      </span>
                    </div>
                  </div>
                  {dp.count >= 2 && (
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full shrink-0 ${isToday ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}>
                      priemer {fmtEur(dp.sum / dp.count, 0)}/obj.
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
                      <span className="font-black tabular-nums text-sm text-teal-800">{fmtEur(todayDp.sum, 0)}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-200 text-teal-800">{todayDp.count} obj.</span>
                    </div>
                  )}
                  {yestDp && yestDp.count > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-blue-700">Včera</span>
                      <span className="font-black tabular-nums text-sm text-blue-800">{fmtEur(yestDp.sum, 0)}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-800">{yestDp.count} obj.</span>
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
              <div className="hidden sm:grid grid-cols-[90px_1fr_1fr_70px_70px_120px_110px_20px] gap-2 px-3 py-2 bg-secondary border-b border-secondary/80 text-[9px] font-black uppercase tracking-widest text-white/70">
                <span>Dátum</span><span>Klient</span><span>Betón</span><span className="text-right">Celkom</span><span className="text-right">Záloha</span><span>Stav</span><span>KTO</span><span />
              </div>
              <div className="">
                  {groupedOrders.map(({ date: dateKey, orders: dayOrders }, gIdx) => (
                    <div key={dateKey} className={gIdx > 0 ? "mt-2" : ""}>
                      {/* Date group header + payout indicator (C) */}
                      <DayGroupHeader
                        dateKey={dateKey}
                        gd={fmtGroupDate(dateKey)}
                        isToday={dateKey === localDateStr(0)}
                        dayPayout={payoutInsight.byDay.get(dateKey)}
                      />
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
                    const rawLoc = o.mapLocality || (o.address ? extractAddrLocality(o.address) : "");
                    const locality = /^\d/.test(rawLoc) ? "" : rawLoc;
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
                    const zalohaPaymentsSumH = (o.payments ?? []).filter(p => p.method === "zaloha").reduce((s, p) => s + p.amount, 0);
                    const totalZalohaUsed = (depUsed ?? 0) + zalohaPaymentsSumH;
                    const isPartialDep = depUsed !== undefined && o.paidAmount !== undefined && depUsed < o.paidAmount - 0.01;
                    // Nedoplatok v História — zostatok po zalohe + platbách
                    const hDoplatokNeeded = depUsed !== undefined ? Math.max(0, (o.totalSDph ?? 0) - depUsed) : 0;
                    const hPaid = (o.payments ?? []).reduce((s, p) => s + p.amount, 0);
                    const hRemaining = Math.max(0, hDoplatokNeeded - hPaid);
                    const hFullyPaid = hDoplatokNeeded < 0.01 || hPaid >= hDoplatokNeeded - 0.01;
                    // Platobný stack: záloha + nedoplatok — viditeľné v R2b (priamo pod celkovou sumou)
                    const showPayStack = hRemaining > 0.01 && totalZalohaUsed > 0.01;
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
                            {c?.photos?.[0] && (
                              <button type="button" onClick={e => { e.stopPropagation(); setClientPhotoModal({ clientId: c.id, photoIdx: 0 }); }}
                                className="shrink-0 mt-0.5 cursor-pointer">
                                <img src={c.photos[0]} className="w-6 h-6 rounded-full object-cover object-top ring-1 ring-primary/30" alt="" />
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
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                                  {STATUS_LABEL[o.status] ?? o.status}
                                </span>
                                {(o.status === "vyuctovana" || o.status === "vyplatena") && (() => {
                                  const hasZ = (depUsed ?? 0) > 0 || (o.payments ?? []).some(p => p.method === "zaloha");
                                  const dMethods = [...new Set((o.payments ?? []).filter(p => p.method !== "zaloha").map(p => p.method))];
                                  return (hasZ || dMethods.length > 0) ? (
                                    <div className="flex items-center gap-0.5 flex-wrap justify-end">
                                      {hasZ && <span className="text-[7px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-1 rounded whitespace-nowrap">💰 zál.</span>}
                                      {dMethods.map(m => (
                                        <span key={m} className="text-[7px] text-green-700 font-bold bg-green-50 border border-green-200 px-1 rounded whitespace-nowrap">
                                          {m === "hotovost" ? "Hot." : m === "prevod" ? "Prev." : m}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                              {onGoToOrder && !isDeleted && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                            </div>
                          </div>
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
                          {/* R2b: Typ betónu + qty — ľavý text, suma + payment stack — pravá výrazná */}
                          <div className="flex items-start gap-2">
                            <span className="text-gray-600 text-[11px] flex-1 min-w-0 pt-[2px]">
                              {o.concreteType && <span className="font-semibold">{o.concreteType}</span>}
                              {(o.totalQty ?? o.quantity) ? <span className="text-gray-400 ml-1">{o.totalQty ?? o.quantity} m³</span> : null}
                            </span>
                            {(() => {
                              const invoice = o.totalSDph ?? o.totalBezDph;
                              if (!invoice || invoice <= 0) return null;
                              return (
                                <div className="flex flex-col items-end gap-0.5 shrink-0">
                                  <span className="font-black tabular-nums text-base text-secondary">{fmtEur(invoice)}</span>
                                  {/* Klára: záloha + Nedoplatok priamo pod celkovou sumou — rovnako výrazné */}
                                  {showPayStack && (
                                    <>
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-[9px] text-teal-500 font-medium">zálohou</span>
                                        <span className="font-black tabular-nums text-sm text-teal-600">{fmtEur(totalZalohaUsed)}</span>
                                      </div>
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-[9px] text-red-400 font-medium">Nedoplatok</span>
                                        <span className="font-black tabular-nums text-sm text-red-500">{fmtEur(hRemaining)}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
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
                              {/* ľavá: záloha chip
                                  showPayStack → len label bez sumy (suma je v R2b pod celkovou sumou)
                                  inak → chip so sumou + teal ✓ keď plná úhrada zálohou */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {o.depositUsed && o.depositUsed > 0 && (
                                  <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                    {showPayStack ? "💰 záloha" : `💰 záloha ${fmtEur(o.depositUsed)}`}
                                  </span>
                                )}
                                {/* Keď plná úhrada zálohou (žiadny nedoplatok) — teal ✓ chip */}
                                {o.depositUsed && o.depositUsed > 0 && hRemaining < 0.01 && hDoplatokNeeded < 0.01 && (
                                  <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
                                    uhradená zálohou ✓
                                  </span>
                                )}
                              </div>
                              {/* pravá: NIE pre showPayStack (sumy sú v R2b) — len Prípad B (plne zaplatené) */}
                              {!showPayStack && (
                                (o.status === "vyplatena" || o.status === "vyuctovana") && o.paidAmount !== undefined && o.paidAmount > 0
                                && !(o.depositUsed && o.depositUsed > 0 && Math.abs(o.paidAmount - o.depositUsed) < 1)
                              ) && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] text-gray-400 font-medium">zaplatené</span>
                                  <span className="text-teal-600 font-black tabular-nums text-base">{fmtEur(o.paidAmount)}</span>
                                  {Math.abs(o.paidAmount - (o.totalSDph ?? 0)) > 0.01 && (
                                    <span className={`text-[9px] font-bold tabular-nums px-1 py-0.5 rounded ${o.paidAmount > (o.totalSDph ?? 0) ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-500"}`}>
                                      {o.paidAmount > (o.totalSDph ?? 0) ? "+" : ""}{fmtEur(o.paidAmount - (o.totalSDph ?? 0))}
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
                              <span>{o.note}</span>
                            </div>
                          )}
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
                                  ) : (h.type === "payment_add" || (!h.type && h.amount != null)) ? (
                                    h.method === "zaloha" ? (
                                      <span className="flex items-center gap-1 min-w-0 flex-wrap">
                                        <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>{STATUS_LABEL[h.status] ?? h.status}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                        <span className="text-amber-700 font-black tabular-nums whitespace-nowrap">💰 {h.amount != null ? fmtEur(h.amount) : "?"}</span>
                                        <span className="text-amber-500 font-medium shrink-0 text-[7px] uppercase tracking-wide">záloha</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 min-w-0 flex-wrap">
                                        <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>{STATUS_LABEL[h.status] ?? h.status}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                        <span className="text-green-700 font-black tabular-nums whitespace-nowrap">+{h.amount != null ? fmtEur(h.amount) : "?"}</span>
                                        {h.method && <span className="text-gray-400 font-medium shrink-0">({h.method === "hotovost" ? "Hot." : h.method === "prevod" ? "Prev." : h.method})</span>}
                                      </span>
                                    )
                                  ) : h.type === "payment_delete" ? (
                                    <span className="flex items-center gap-1 min-w-0">
                                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                                      <span className="text-red-600 font-black tabular-nums whitespace-nowrap">−{h.amount !== undefined ? fmtEur(h.amount) : "?"}</span>
                                      <span className="text-gray-400 font-medium">zrušené</span>
                                    </span>
                                  ) : h.type === "deposit_pay" ? (
                                    <span className="flex items-center gap-1 min-w-0">
                                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                      <span className="text-amber-700 font-black tabular-nums whitespace-nowrap">💰 −{h.amount !== undefined ? fmtEur(h.amount) : "?"}</span>
                                    </span>
                                  ) : h.type === "deposit_reversal" ? (
                                    <span className="flex items-center gap-1 min-w-0">
                                      <span className="w-2 h-2 rounded-full bg-blue-300 shrink-0" />
                                      <span className="text-blue-600 font-black whitespace-nowrap">↩ +{h.amount !== undefined ? fmtEur(h.amount) : "?"}</span>
                                    </span>
                                  ) : (
                                    <>
                                      <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>
                                        {STATUS_LABEL[h.status] ?? h.status}
                                      </span>
                                      {/* skryť paidAmount keď nedoplatok — zavádzalo by "Vyplatená 1 915€" hoci nie je plne uhradená */}
                                      {h.paidAmount !== undefined && h.paidAmount > 0 && hRemaining < 0.01 && (
                                        <span className="text-teal-600 tabular-nums font-semibold whitespace-nowrap">{fmtEur(h.paidAmount)}</span>
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
                          {/* R4: KTO (menej viditeľný) + Vytvorené dátum + Excel confirm */}
                          <div className="flex items-center gap-1 text-[9px]">
                            {kto && <DeviceLabel label={kto} className="shrink-0 opacity-50" />}
                            {kto && <span className="text-gray-200 mx-0.5">·</span>}
                            <span className="text-gray-400 shrink-0">Vytvorené</span>
                            <span className="tabular-nums text-gray-500 font-medium shrink-0 ml-0.5">{fmtDate(o.createdAt)}</span>
                            <span className="flex-1" />
                            {(() => {
                              const isEnabled = o.status === "vyplatena";
                              const isPend = excelPending === o.id;
                              const cls = !isEnabled
                                ? "bg-gray-50 text-gray-200 border-gray-100 cursor-not-allowed opacity-40"
                                : isPend
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-400 hover:bg-green-100 hover:text-green-700 hover:border-green-500 cursor-pointer animate-pulse"
                                  : o.excelConfirmed
                                    ? "bg-green-100 text-green-700 border-green-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300 cursor-pointer"
                                    : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-400 cursor-pointer";
                              const label = isPend ? "Potvrdiť?" : o.excelConfirmed ? "EXCEL OK" : "EXCEL?";
                              return (
                                <button onClick={e => {
                                  e.stopPropagation();
                                  if (!isEnabled) return;
                                  if (isPend) { clearExcelPending(); toggleExcelConfirmed(e, o.id); }
                                  else { clearExcelPending(); setExcelPending(o.id); excelPendingTimer.current = setTimeout(clearExcelPending, 3000); }
                                }} className={`inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded border transition-all ${cls}`}
                                  title={!isEnabled ? "Len pre objednávky so statusom Vyplatená" : undefined}>
                                  <Check className="w-2.5 h-2.5 shrink-0" />{label}
                                </button>
                              );
                            })()}
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
                              {c?.photos?.[0] && (
                                <button type="button" onClick={e => { e.stopPropagation(); setClientPhotoModal({ clientId: c.id, photoIdx: 0 }); }}
                                  className="shrink-0 cursor-pointer">
                                  <img src={c.photos[0]} className="w-5 h-5 rounded-full object-cover object-top ring-1 ring-primary/30" alt="" />
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
                              <span className="font-black tabular-nums text-secondary text-sm whitespace-nowrap">{fmtEur(o.totalSDph ?? o.totalBezDph ?? 0)}</span>
                              {/* Skryť "zap." keď paidAmount ≈ depositUsed (plná úhrada zálohou = duplicita)
                                   alebo keď je nedoplatok (hRemaining > 0.01) — info je v ZÁLOHA stĺpci */}
                              {(o.status === "vyplatena" || o.status === "vyuctovana") && o.paidAmount !== undefined && o.paidAmount > 0
                                && !(o.depositUsed && o.depositUsed > 0 && Math.abs(o.paidAmount - o.depositUsed) < 1)
                                && hRemaining < 0.01
                                && (
                                <div className="flex items-center gap-1 justify-end">
                                  <span className="text-[9px] text-gray-400">zap.</span>
                                  <span className="text-teal-600 font-black tabular-nums text-xs whitespace-nowrap">{fmtEur(o.paidAmount)}</span>
                                  {Math.abs(o.paidAmount - (o.totalSDph ?? 0)) > 0.01 && (
                                    <span className={`text-[9px] font-bold tabular-nums px-1 py-0.5 rounded ${o.paidAmount > (o.totalSDph ?? 0) ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-500"}`}>
                                      {o.paidAmount > (o.totalSDph ?? 0) ? "+" : ""}{fmtEur(o.paidAmount - (o.totalSDph ?? 0))}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* ZÁLOHA — 💰 badge + nedoplatok */}
                            <div className="flex flex-col items-end gap-0.5">
                              {depUsed ? (
                                <>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm border leading-tight ${isPartialDep ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
                                    title={`Záloha pri obj.: ${depUsed.toFixed(2)} €${zalohaPaymentsSumH > 0.001 ? ` + platby zo zálohy: ${zalohaPaymentsSumH.toFixed(2)} €` : ""}`}>
                                    💰 {fmtEur(totalZalohaUsed)}
                                    {zalohaPaymentsSumH > 0.001 && <span className="opacity-70"> ({zalohaPaymentsSumH > 0.001 ? `+${fmtEur(zalohaPaymentsSumH)}` : ""})</span>}
                                  </span>
                                  {isPartialDep && hDoplatokNeeded > 0.01 && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm border leading-tight ${hFullyPaid ? "bg-teal-50 text-teal-600 border-teal-200" : "bg-red-100 text-red-600 border-red-300"}`}>
                                      {hFullyPaid ? "✓ dopl." : `Nedoplatok ${fmtEur(hRemaining)}`}
                                    </span>
                                  )}
                                </>
                              ) : <span className="text-gray-300 text-[9px]">—</span>}
                            </div>
                            {/* STAV */}
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                                {STATUS_LABEL[o.status] ?? o.status}
                              </span>
                              {(o.status === "vyuctovana" || o.status === "vyplatena") && (() => {
                                const hasZ = (depUsed ?? 0) > 0 || (o.payments ?? []).some(p => p.method === "zaloha");
                                const dMethods = [...new Set((o.payments ?? []).filter(p => p.method !== "zaloha").map(p => p.method))];
                                return (hasZ || dMethods.length > 0) ? (
                                  <div className="flex items-center gap-0.5 flex-wrap justify-center">
                                    {hasZ && <span className="text-[8px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-1 rounded whitespace-nowrap">💰 zál.</span>}
                                    {dMethods.map(m => (
                                      <span key={m} className="text-[8px] text-green-700 font-bold bg-green-50 border border-green-200 px-1 rounded whitespace-nowrap">
                                        {m === "hotovost" ? "Hot." : m === "prevod" ? "Prev." : m}
                                      </span>
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                            </div>
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
                              {depUsed && isPartialDep && (() => {
                                const doplatokNeeded = Math.max(0, (o.totalSDph ?? o.totalBezDph ?? 0) - depUsed);
                                const payTotal = (o.payments ?? []).reduce((s, p) => s + p.amount, 0);
                                const isDoplatokPaid = doplatokNeeded < 0.01 || payTotal >= doplatokNeeded - 0.01;
                                return isDoplatokPaid ? (
                                  <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
                                    doplatok uhradený ✓
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                                    nedoplatok {fmtEur(Math.max(0, doplatokNeeded - payTotal), 0)}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                          {/* Poznámka — desktop */}
                          {o.note && (
                            <div className="pl-[94px] flex items-start gap-1 text-[10px] text-gray-500 italic">
                              <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 text-gray-400" />
                              <span>{o.note}</span>
                            </div>
                          )}
                          {/* Excel confirm — desktop */}
                          <div className="flex justify-end">
                            {(() => {
                              const isEnabled = o.status === "vyplatena";
                              const isPend = excelPending === o.id;
                              const cls = !isEnabled
                                ? "bg-gray-50 text-gray-200 border-gray-100 cursor-not-allowed opacity-40"
                                : isPend
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-400 hover:bg-green-100 hover:text-green-700 hover:border-green-500 cursor-pointer animate-pulse"
                                  : o.excelConfirmed
                                    ? "bg-green-100 text-green-700 border-green-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300 cursor-pointer"
                                    : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-400 cursor-pointer";
                              const label = isPend ? "Potvrdiť?" : o.excelConfirmed ? "EXCEL OK" : "EXCEL?";
                              return (
                                <button onClick={e => {
                                  e.stopPropagation();
                                  if (!isEnabled) return;
                                  if (isPend) { clearExcelPending(); toggleExcelConfirmed(e, o.id); }
                                  else { clearExcelPending(); setExcelPending(o.id); excelPendingTimer.current = setTimeout(clearExcelPending, 3000); }
                                }} className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded border transition-all ${cls}`}
                                  title={!isEnabled ? "Len pre objednávky so statusom Vyplatená" : undefined}>
                                  <Check className="w-2.5 h-2.5 shrink-0" />{label}
                                </button>
                              );
                            })()}
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
                                  ) : (h.type === "payment_add" || (!h.type && h.amount != null)) ? (
                                    h.method === "zaloha" ? (
                                      <span className="flex items-center gap-1 min-w-0 flex-wrap">
                                        <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>{STATUS_LABEL[h.status] ?? h.status}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                        <span className="text-amber-700 font-black tabular-nums whitespace-nowrap">💰 {h.amount != null ? fmtEur(h.amount) : "?"}</span>
                                        <span className="text-amber-500 font-medium shrink-0 text-[7px] uppercase tracking-wide">záloha</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 min-w-0 flex-wrap">
                                        <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>{STATUS_LABEL[h.status] ?? h.status}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                        <span className="text-green-700 font-black tabular-nums whitespace-nowrap">+{h.amount != null ? fmtEur(h.amount) : "?"}</span>
                                        {h.method && <span className="text-gray-400 font-medium shrink-0">({h.method === "hotovost" ? "Hot." : h.method === "prevod" ? "Prev." : h.method})</span>}
                                      </span>
                                    )
                                  ) : h.type === "payment_delete" ? (
                                    <span className="flex items-center gap-1 min-w-0">
                                      <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>{STATUS_LABEL[h.status] ?? h.status}</span>
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                      <span className="text-red-600 font-black tabular-nums whitespace-nowrap">−{h.amount != null ? fmtEur(h.amount) : "?"}</span>
                                      <span className="text-gray-400 font-medium">zrušené</span>
                                    </span>
                                  ) : h.type === "deposit_pay" ? (
                                    <span className="flex items-center gap-1 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                      <span className="text-amber-700 font-black tabular-nums whitespace-nowrap">💰 −{h.amount != null ? fmtEur(h.amount) : "?"}</span>
                                    </span>
                                  ) : h.type === "deposit_reversal" ? (
                                    <span className="flex items-center gap-1 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                                      <span className="text-blue-600 font-black whitespace-nowrap">↩ +{h.amount != null ? fmtEur(h.amount) : "?"}</span>
                                    </span>
                                  ) : (
                                    <>
                                      <span className={`font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLOR[h.status] ?? "bg-gray-100 text-gray-500"}`}>
                                        {STATUS_LABEL[h.status] ?? h.status}
                                      </span>
                                      {/* skryť paidAmount keď nedoplatok — zavádzalo by "Vyplatená 1 915€" hoci nie je plne uhradená */}
                                      {h.paidAmount !== undefined && h.paidAmount > 0 && hRemaining < 0.01 && (
                                        <span className="text-teal-600 tabular-nums font-semibold whitespace-nowrap">{fmtEur(h.paidAmount)}</span>
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
          </div>{/* /space-y-3 cashflow obsah */}
        </div>
      )}

      {/* ── Client photo lightbox — len fotky daného klienta + GPS + info ── */}
      {clientPhotoModal && (() => {
        const c = liveClients.find(x => x.id === clientPhotoModal.clientId);
        if (!c?.photos?.length) return null;
        const photos = c.photos;
        const photoIdx = Math.min(clientPhotoModal.photoIdx, photos.length - 1);
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || c.loginId || "Klient";
        const loc = c.locationPhoto;
        const hasGPS = loc?.lat != null && loc?.lng != null;
        const mapsUrl = hasGPS ? `https://maps.apple.com/?q=${loc!.lat},${loc!.lng}` : null;
        return createPortal(
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setClientPhotoModal(null)}>
            <div className="relative flex flex-col items-center gap-3 max-w-sm w-full"
              onClick={e => e.stopPropagation()}>
              {/* X */}
              <button onClick={() => setClientPhotoModal(null)}
                className="absolute top-0 right-0 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors cursor-pointer z-10">
                <X className="w-5 h-5 text-white" />
              </button>
              {/* Photo */}
              <img src={photos[photoIdx]} className="w-56 h-56 rounded-full object-cover object-top shadow-2xl ring-4 ring-primary/60" alt={name} />
              {/* Name + login */}
              <div className="text-center">
                <div className="font-black text-white text-lg leading-snug">{name}</div>
                {c.loginId && <div className="text-white/50 text-xs font-mono mt-0.5">#{c.loginId}</div>}
              </div>
              {/* GPS + info */}
              {(hasGPS || loc?.place) && (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <span className="flex items-center gap-1 text-green-300 text-xs font-semibold">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {loc!.place ?? `${loc!.lat?.toFixed(4)}, ${loc!.lng?.toFixed(4)}`}
                  </span>
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-500/80 hover:bg-blue-500 rounded-lg text-white text-[11px] font-bold transition-colors">
                      <Navigation className="w-3 h-3" /> Navigovať
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone.replace(/\s/g,"")}`} onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-2 py-1 bg-green-500/80 hover:bg-green-500 rounded-lg text-white text-[11px] font-bold transition-colors">
                      <Phone className="w-3 h-3" /> Zavolať
                    </a>
                  )}
                </div>
              )}
              {/* Prev / Next medzi fotkami toho istého klienta */}
              {photos.length > 1 && (
                <div className="flex items-center gap-4 mt-1">
                  <button onClick={() => setClientPhotoModal({ clientId: c.id, photoIdx: photoIdx - 1 })}
                    disabled={photoIdx === 0}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${photoIdx > 0 ? "bg-white/20 hover:bg-white/40 text-white" : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white/40 text-xs tabular-nums">{photoIdx + 1} / {photos.length}</span>
                  <button onClick={() => setClientPhotoModal({ clientId: c.id, photoIdx: photoIdx + 1 })}
                    disabled={photoIdx >= photos.length - 1}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${photoIdx < photos.length - 1 ? "bg-white/20 hover:bg-white/40 text-white" : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
