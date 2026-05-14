import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Truck, LogIn, LogOut, FileText, MessageSquare, Minus, Plus, Trash2, Table2, ShoppingCart, X, Info, Check } from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";
import { PhoneInput } from "@/components/PhoneInput";
import { adminData } from "@/lib/adminData";
import { clientAuth, type LoggedClient } from "@/lib/clientAuth";
import { clientApi } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientPriceTable } from "@/components/ClientPriceTable";
import { PriceModeToggle } from "@/components/PriceModeToggle";

type Tab = "pumpa" | "mix" | "vlastnadoprava";
type PriceMode = "faktura" | "hotovost";

interface ExtraItemServices {
  pumpHour: string;
  pumpMin: string;
  waitPiecesPumpa: number;
  hoseMeters: number;
  washing: boolean;
  waitHour: string;
  waitMin: string;
}

interface ExtraItem {
  id: string;
  categoryName: string | null;
  typeLabel: string | null;
  quantity: string;
  transportMode?: "own" | "none" | "addToMain";
  svc?: ExtraItemServices;
  showSvc?: boolean;
}

const DEFAULT_VAT = 0.23;
const DEFAULT_VAT_HOTOVOST = 0.20;
const PUMP_TRUCK_CAPACITY = 7;
const MIX_TRUCK_CAPACITY = 9;
const PUMP_HOURS = ["1 h", "2 h", "3 h", "4 h", "5 h", "6 h", "7 h", "8 h"];
const PUMP_MINS = ["0 min", "15 min", "30 min", "45 min"];
const WAIT_HOURS = ["0 h", "1 h", "2 h", "3 h", "4 h", "5 h", "6 h", "7 h", "8 h"];
const WAIT_MINS = ["0 min", "15 min", "30 min", "45 min"];

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-white/80 mb-2">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-white/10 border border-white/10 border-b-2 border-b-primary text-white px-4 py-3 text-sm font-medium rounded-sm focus:ring-0 focus:ring-offset-0 h-auto">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#1e293b] border border-white/10 text-white z-[200]" side="bottom" position="popper" sideOffset={4}>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-white focus:bg-white/10 focus:text-primary cursor-pointer">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TypeSelectField({ label, value, onChange, options, discountFactor = 1, manualPrices }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; label: string; price: number }[];
  discountFactor?: number;
  manualPrices?: Record<string, number>;
}) {
  const cleanLabel = (lbl: string) => lbl.replace(/ – [\d.]+ € \/ m³/, "").replace(/ – [\d,.]+ €\/m³/, "");
  return (
    <div>
      <label className="block text-sm font-semibold text-white/80 mb-2">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-white/10 border border-white/10 border-b-2 border-b-primary text-white px-4 py-3 text-sm font-medium rounded-sm focus:ring-0 focus:ring-offset-0 h-auto">
          <SelectValue placeholder="Vyberte typ betónu" />
        </SelectTrigger>
        <SelectContent className="bg-[#1e293b] border border-white/10 text-white z-[200]" side="bottom" position="popper" sideOffset={4}>
          {options.map((o) => {
            const manual = manualPrices?.[o.id];
            const displayPrice = manual !== undefined ? manual : o.price * discountFactor;
            const showStrike = Math.abs(o.price - displayPrice) > 0.001;
            return (
              <SelectItem key={o.label} value={o.label} className="text-white focus:bg-white/10 focus:text-primary cursor-pointer">
                <span className="flex items-center gap-4">
                  <span>{cleanLabel(o.label)}</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    {showStrike && <s className="text-white/30 font-normal">{o.price.toFixed(2)}</s>}
                    <span className="text-primary">
                      {displayPrice.toFixed(2)} €/m³
                      {manual !== undefined && <span className="text-[8px] ml-0.5 opacity-60">M</span>}
                    </span>
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

function CheckboxField({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center gap-3 group", disabled ? "cursor-default opacity-70" : "cursor-pointer")}>
      <div onClick={() => !disabled && onChange(!checked)} className={cn(
        "w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0",
        checked ? "bg-primary border-primary" : "bg-white/10 border-white/30",
        !disabled && !checked && "group-hover:border-primary/50"
      )}>
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <span className="text-sm text-white/80">{label}</span>
    </label>
  );
}

function RadioGroup({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-white/80 mb-2">{label}</label>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((o) => {
          const selected = value === o;
          return (
            <button key={o} type="button" onClick={() => onChange(o)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-left transition-all rounded-sm border text-xs font-semibold tracking-wide",
                selected ? "border-primary bg-primary/15 text-white" : "border-white/10 bg-white/5 text-white/55 hover:border-white/25 hover:text-white/80"
              )}>
              <span className={cn("w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center", selected ? "border-primary" : "border-white/30")}>
                {selected && <span className="w-1.5 h-1.5 rounded-full bg-primary block" />}
              </span>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TypeRadioGroup({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { label: string; price: number }[];
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-white/80 mb-2">{label}</label>
      <div className="flex flex-col gap-1">
        {options.map((o) => {
          const selected = value === o.label;
          return (
            <button key={o.label} type="button" onClick={() => onChange(o.label)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-left transition-all rounded-sm border",
                selected ? "border-primary bg-primary/15" : "border-white/10 bg-white/5 hover:border-white/25"
              )}>
              <span className={cn("w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center", selected ? "border-primary" : "border-white/30")}>
                {selected && <span className="w-1.5 h-1.5 rounded-full bg-primary block" />}
              </span>
              <span className={cn("flex-1 text-sm font-medium", selected ? "text-white" : "text-white/60")}>
                {o.label.replace(/ – [\d.]+ € \/ m³/, "").replace(/ – [\d,.]+ €\/m³/, "")}
              </span>
              <span className={cn("text-sm font-bold flex-shrink-0", selected ? "text-primary" : "text-white/40")}>
                {o.price.toFixed(2)} €/m³
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function fmt(n: number) { return n.toFixed(2) + " €"; }
function cleanType(lbl: string) { return lbl.replace(/ – [\d.]+ € \/ m³/, "").replace(/ – [\d,.]+ €\/m³/, "").replace(/^Betón\s+/i, ""); }

function PriceRow({ label, original, discounted, hasDiscount, isFillup }: { label: React.ReactNode; original: number; discounted: number; hasDiscount: boolean; isFillup?: boolean }) {
  if (original === 0) return null;
  if (isFillup) {
    return (
      <div className="flex justify-between items-center text-sm px-3 py-2 mt-1 rounded-sm" style={{ background: "rgba(44,46,67,0.7)" }}>
        <span className="text-primary font-semibold flex-1 pr-2">{label}</span>
        <div className="flex-1 mx-3 h-px" style={{ background: "linear-gradient(90deg,#EDC531 0%,transparent 100%)" }} />
        <span className="text-right flex-shrink-0">
          {hasDiscount && <span className="line-through text-primary/35 text-xs block">{fmt(original)}</span>}
          <span className="font-bold text-primary">{fmt(discounted)}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-start text-sm py-1">
      <span className="text-white/70 flex-1 pr-2">{label}</span>
      <span className="text-right flex-shrink-0">
        {hasDiscount && <span className="line-through text-white/35 text-xs block">{fmt(original)}</span>}
        <span className="font-semibold text-white">{fmt(discounted)}</span>
      </span>
    </div>
  );
}

export function ConcreteCalculator({ clientOverride }: { clientOverride?: import("@/lib/clientAuth").LoggedClient } = {}) {
  const [tab, setTab] = useState<Tab>("pumpa");
  const [tabInfoOpen, setTabInfoOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"distance" | "address">("distance");
  const [distance, setDistance] = useState("");
  const [address, setAddress] = useState("");
  const [addressKm, setAddressKm] = useState<number | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const calcWrapRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [concreteTypeLabel, setConcreteTypeLabel] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [pumpHour, setPumpHour] = useState("1 h");
  const [pumpMin, setPumpMin] = useState("0 min");
  const [waitHour, setWaitHour] = useState("0 h");
  const [waitMin, setWaitMin] = useState("0 min");
  const [waitPiecesPumpa, setWaitPiecesPumpa] = useState(0); // čakačka pumpa: kusy (1 kus = 15 min)
  const [hoseMeters, setHoseMeters] = useState(0);
  const [washing, setWashing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceMode>("faktura");
  const [loggedClientState, setLoggedClient] = useState<LoggedClient | null>(() => clientOverride ? null : clientAuth.getLoggedClient());
  // Priama hodnota pre useState initializery nižšie (pred useMemo deklaráciou loggedClient)
  const loggedClientBase = clientOverride ?? loggedClientState;
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);
  const [showPriceTable, setShowPriceTable] = useState(false);
  const [zimneOpatrenia, setZimneOpatrenia] = useState(false); // default OFF, user zapína manuálne
  const [revision, setRevision] = useState(0);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: loggedClientBase?.name ?? "", phone: loggedClientBase?.phone ? formatPhone(loggedClientBase.phone) : "", email: "", note: "" });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [priceTableMode, setPriceTableMode] = useState<"faktura" | "hotovost">("faktura");

  // Na mobile scrollni na výsledok, na desktop scrollni calc wrapper do view s navbar offsetom
  useEffect(() => {
    if (!showResult) return;
    const NAVBAR_H = 96;
    const isMobile = window.innerWidth < 768;
    if (isMobile && resultRef.current) {
      const top = resultRef.current.getBoundingClientRect().top + window.scrollY - NAVBAR_H - 8;
      window.scrollTo({ top, behavior: "smooth" });
    } else if (!isMobile && calcWrapRef.current) {
      const top = calcWrapRef.current.getBoundingClientRect().top + window.scrollY - NAVBAR_H - 8;
      if (top < window.scrollY) window.scrollTo({ top, behavior: "smooth" });
    }
  }, [showResult]);

  const resetForm = () => {
    setQuantity("");
    setDistance("");
    setAddress("");
    setAddressKm(null);
    setDeliveryMode("distance");
    setCategoryName(null);
    setConcreteTypeLabel(null);
    setPumpHour("1 h");
    setPumpMin("0 min");
    setWaitHour("0 h");
    setWaitMin("0 min");
    setWaitPiecesPumpa(0);
    setHoseMeters(0);
    setWashing(false);
    setZimneOpatrenia(false);
    setExtraItems([]);
    setShowResult(false);
  };

  useEffect(() => {
    const handler = () => setRevision((r) => r + 1);
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);

  useEffect(() => {
    if (clientOverride) return;
    const handler = () => setLoggedClient(clientAuth.getLoggedClient());
    window.addEventListener("client-session-changed", handler);
    return () => window.removeEventListener("client-session-changed", handler);
  }, []);

  useEffect(() => {
    if ((!loggedClientBase || !loggedClientBase.canHotovost) && priceMode === "hotovost") {
      setPriceMode("faktura");
    }
    if (loggedClientBase?.canZimneOpatrenia) {
      const from = "11-15"; const to = "03-15";
      const now = new Date();
      const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const inPeriod = from > to ? (mmdd >= from || mmdd <= to) : (mmdd >= from && mmdd <= to);
      if (inPeriod) setZimneOpatrenia(true);
    }
  }, [loggedClientBase, priceMode]);

  // Google Maps Autocomplete + DistanceMatrix pre adresný režim
  useEffect(() => {
    if (deliveryMode !== "address" || !addressInputRef.current) return;
    const ORIGIN = { lat: 49.204417, lng: 18.729029 };

    const initMaps = () => {
      if (!addressInputRef.current) return;
      const ac = new google.maps.places.Autocomplete(addressInputRef.current, { types: ["geocode"] });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place?.formatted_address) return;
        setAddress(place.formatted_address);
        setAddressLoading(true);
        setShowResult(false);
        new google.maps.DistanceMatrixService().getDistanceMatrix(
          { origins: [ORIGIN], destinations: [place.formatted_address], travelMode: google.maps.TravelMode.DRIVING, unitSystem: google.maps.UnitSystem.METRIC },
          (response, status) => {
            setAddressLoading(false);
            if (status === "OK" && response) {
              const el = response.rows[0]?.elements[0];
              if (el?.status === "OK") {
                const oneWayKm = el.distance.value / 1000;
                setAddressKm(oneWayKm);
                setDistance(String(Math.round((oneWayKm * 2 + 2) * 10) / 10));
              }
            }
          }
        );
      });
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (typeof google !== "undefined" && google.maps?.places) {
      initMaps();
    } else {
      intervalId = setInterval(() => {
        if (typeof google !== "undefined" && google.maps?.places) { clearInterval(intervalId!); initMaps(); }
      }, 300);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [deliveryMode]);

  const allCategories = useMemo(() => adminData.getCategories(), [revision]);
  const allServices   = useMemo(() => adminData.getServices(), [revision]);
  const allDelivery   = useMemo(() => adminData.getDelivery(), [revision]);
  const tzones        = useMemo(() => adminData.getTransportZones(), [revision]);
  const tsettings     = useMemo(() => adminData.getTransportSettings(), [revision]);
  const allClients    = useMemo(() => adminData.getClients(), [revision]);

  // loggedClient: clientOverride je živý (z parent state) — priamo ho použij.
  // Pre session prípad (klient prihlásený cez login form) mergni čerstvé polia z allClients,
  // aby manuálne ceny a zľavy nastavené v admin paneli boli okamžite viditeľné bez re-login.
  const loggedClient = useMemo<LoggedClient | null>(() => {
    if (clientOverride) return clientOverride;
    if (!loggedClientState || loggedClientState.id === "admin") return loggedClientState;
    const fresh = allClients.find(c => c.id === loggedClientState.id);
    if (!fresh) return loggedClientState;
    return {
      ...loggedClientState,
      manualPrices:      fresh.manualPrices,
      discountBeton:     fresh.discountBeton     ?? loggedClientState.discountBeton,
      discountDoprava:   fresh.discountDoprava   ?? loggedClientState.discountDoprava,
      discountSluzby:    fresh.discountSluzby    ?? loggedClientState.discountSluzby,
      discountCelkovo:   fresh.discountCelkovo   ?? loggedClientState.discountCelkovo,
      canHotovost:       fresh.canHotovost       ?? loggedClientState.canHotovost,
      hotovostDph:       fresh.hotovostDph,
      deliveryZoneId:    fresh.deliveryZoneId,
    };
  }, [clientOverride, loggedClientState, allClients]);

  // Klientova zóna dopravy (podľa deliveryZoneId, fallback = prvá zóna)
  const clientDeliveryZone = useMemo(() => {
    if (loggedClient?.deliveryZoneId)
      return allDelivery.find(z => z.id === loggedClient.deliveryZoneId) ?? allDelivery[0];
    return allDelivery[0] ?? null;
  }, [loggedClient, allDelivery]);

  // Dynamické kapacity vozidiel podľa zóny
  const pumpCap = clientDeliveryZone?.pumpTruckCapacity ?? PUMP_TRUCK_CAPACITY;
  const mixCap  = clientDeliveryZone?.truckCapacity ?? MIX_TRUCK_CAPACITY;

  // DPH sadzby
  const VAT           = tsettings.dph ?? DEFAULT_VAT;
  const VAT_HOTOVOST  = loggedClient?.hotovostDph ?? DEFAULT_VAT_HOTOVOST;

  const selectedCategory = allCategories.find((c) => c.name === categoryName)
    ?? allCategories.find((c) => c.name.toUpperCase().includes("DMAX16") && c.name.toUpperCase().includes("DRVENÉ"))
    ?? allCategories[0];
  const typesForCategory = selectedCategory?.types ?? [];
  const selectedType = typesForCategory.find((t) => t.label === concreteTypeLabel)
    ?? typesForCategory.find((t) => t.label.includes("C16/20"))
    ?? typesForCategory[0];

  const mp = loggedClient?.manualPrices ?? {};
  const pumpSvc   = allServices.find((s) => s.name.includes("Čerpanie"));
  const chemSvc   = allServices.find((s) => s.name.toLowerCase().includes("rozbeh"));
  const washSvc   = allServices.find((s) => s.name.toLowerCase().includes("umýv"));
  const waitPumpaSvc = allServices.find((s) => s.serviceMode === "pumpa");
  const waitMixSvc   = allServices.find((s) => s.serviceMode === "mix");
  // Čerpanie: manual override > zona > service price
  const pumpServicePrice = mp[pumpSvc?.id ?? ""] !== undefined
    ? mp[pumpSvc!.id]
    : (clientDeliveryZone?.pumpHourlyRate ?? pumpSvc?.price ?? 112.50);
  const chemServicePrice = mp[chemSvc?.id ?? ""] !== undefined ? mp[chemSvc!.id] : (chemSvc?.price ?? 31.25);
  const washServicePrice = mp[washSvc?.id ?? ""] ?? washSvc?.price ?? 56.25;
  // Čakačka: manual override > zona fallback > service price
  const waitServicePricePumpa = mp[waitPumpaSvc?.id ?? ""] !== undefined
    ? mp[waitPumpaSvc!.id]
    : (clientDeliveryZone?.waitingRatePer15minPumpa
        ?? clientDeliveryZone?.waitingRatePer15min
        ?? waitPumpaSvc?.price ?? 8.00);
  const waitServicePriceMix = mp[waitMixSvc?.id ?? ""] !== undefined
    ? mp[waitMixSvc!.id]
    : (clientDeliveryZone?.waitingRatePer15min ?? waitMixSvc?.price ?? 8.00);
  const hoseService = allServices.find((s) => s.name.toLowerCase().includes("hadice"));
  const hoseServicePrice = mp[hoseService?.id ?? ""] ?? hoseService?.price ?? 10.00;
  const hoseMaxMeters = hoseService?.maxMeters ?? 10;

  const zimneService = allServices.find((s) => s.name.toLowerCase().includes("zimn"));
  const zimneServicePrice = zimneService?.price ?? 10.00;

  const isZimneActive = (() => {
    const from = zimneService?.activePeriodFrom ?? "11-15";
    const to = zimneService?.activePeriodTo ?? "03-15";
    const now = new Date();
    const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return from > to ? (mmdd >= from || mmdd <= to) : (mmdd >= from && mmdd <= to);
  })();
  const showZimneOpatrenia = isZimneActive || (loggedClient?.canZimneOpatrenia ?? false);

  const discountBeton   = loggedClient?.discountBeton   ?? 0;
  const discountDoprava = loggedClient?.discountDoprava ?? 0;
  const discountSluzby  = loggedClient?.discountSluzby  ?? 0;
  const discountCelkovo = loggedClient?.discountCelkovo ?? 0;
  // Zhodné so starou WP kalkulačkou: ak kategória-zľava = 0, použi celkovú zľavu ako fallback
  const effectiveBeton   = discountBeton   > 0 ? discountBeton   : discountCelkovo;
  const effectiveDoprava = discountDoprava > 0 ? discountDoprava : discountCelkovo;
  const effectiveSluzby  = discountSluzby  > 0 ? discountSluzby  : discountCelkovo;
  const hasDiscount = effectiveBeton > 0 || effectiveDoprava > 0 || effectiveSluzby > 0;
  const betonFactor   = 1 - effectiveBeton   / 100;
  const dopravaFactor = 1 - effectiveDoprava / 100;
  const sluzbyFactor  = 1 - effectiveSluzby  / 100;

  // Per-service effective discount factors — manual price = žiadna zľava (factor 1)
  const fPump  = (pumpSvc  && mp[pumpSvc.id]  !== undefined) ? 1 : sluzbyFactor;
  const fChem  = (chemSvc  && mp[chemSvc.id]  !== undefined) ? 1 : sluzbyFactor;
  const fWash  = (washSvc  && mp[washSvc.id]  !== undefined) ? 1 : sluzbyFactor;
  const fHose  = (hoseService && mp[hoseService.id] !== undefined) ? 1 : sluzbyFactor;
  const fWaitP = (waitPumpaSvc && mp[waitPumpaSvc.id] !== undefined) ? 1 : sluzbyFactor;
  const fWaitM = (waitMixSvc  && mp[waitMixSvc.id]   !== undefined) ? 1 : sluzbyFactor;

  const waitTotalMins = useMemo(() => (parseInt(waitHour) || 0) * 60 + (parseInt(waitMin) || 0), [waitHour, waitMin]);

  const handleCategoryChange = (name: string) => {
    setCategoryName(name);
    setConcreteTypeLabel(null);
    setShowResult(false);
  };

  function getItemType(catName: string | null, typeLabel: string | null) {
    const cat = allCategories.find((c) => c.name === catName)
      ?? allCategories.find((c) => c.name.toUpperCase().includes("DMAX16") && c.name.toUpperCase().includes("DRVENÉ"))
      ?? allCategories[0];
    const types = cat?.types ?? [];
    return types.find((t) => t.label === typeLabel)
      ?? types.find((t) => t.label.includes("C16/20"))
      ?? types[0];
  }

  function calcPumpTrucks(qty: number, pCap = pumpCap, mCap = mixCap): number {
    if (qty <= 0) return 0;
    let trucks = 1;
    let remaining = qty - pCap;
    while (remaining > 0) { remaining -= mCap; trucks++; }
    return trucks;
  }

  function calcTransport(km: number, qty: number, tabType: Tab, dZone: typeof clientDeliveryZone): { cost: number; isMin: boolean; fillupM3: number; fillupCost: number } {
    if (km === 0) return { cost: 0, isMin: false, fillupM3: 0, fillupCost: 0 };

    const pType = dZone?.pricingType ?? "standard";
    const trucks = tabType === "pumpa" ? calcPumpTrucks(qty) : Math.ceil(qty / mixCap);
    const minimumFee = tsettings.minimumFee ?? 62.50;

    if (pType === "km") {
      const mp = loggedClient?.manualPrices ?? {};
      const baseRate = dZone?.ratePerKm ?? 1.8;
      const rate = mp[`km_rate_${dZone?.id}`] ?? baseRate;
      const effectiveKm = Math.max(km, dZone?.minKm ?? 0);
      const cost = effectiveKm * rate * trucks;
      const kmMinFee = dZone?.minimumFeeKm;
      const minCost = kmMinFee ? trucks * kmMinFee : 0;
      const isMin = !!(kmMinFee && trucks > 0 && cost / trucks < kmMinFee);
      return { cost: isMin ? minCost : cost, isMin, fillupM3: 0, fillupCost: 0 };
    }

    if (pType === "auto") {
      const mpA = loggedClient?.manualPrices ?? {};
      const baseRpt = dZone?.ratePerTruck ?? 0;
      const rpt = mpA[`auto_rate_${dZone?.id}`] ?? baseRpt;
      const autoMinFee = dZone?.minimumFeeAuto;
      const cost = trucks * rpt;
      const isMin = !!(autoMinFee && trucks > 0 && rpt < autoMinFee);
      return { cost: isMin ? trucks * autoMinFee : cost, isMin, fillupM3: 0, fillupCost: 0 };
    }

    // standard – km pásma: fill-up logika zhodná s pôvodnou WP kalkulačkou
    const mpStd = loggedClient?.manualPrices ?? {};
    const zone = tzones.find((z) => km >= z.fromKm && km < z.toKm) ?? tzones[tzones.length - 1];
    const baseRatePerM3 = zone?.ratePerM3 ?? 0;
    const ratePerM3 = mpStd[zone?.id ?? ""] !== undefined ? mpStd[zone!.id] : baseRatePerM3;
    const effectiveMinFee = mpStd["min_fee"] !== undefined ? mpStd["min_fee"] : minimumFee;

    let fillupM3 = 0;
    if (tabType === "pumpa") {
      if (qty < 5) fillupM3 = 5 - qty;
      else if (qty > pumpCap && qty < 10) fillupM3 = 10 - qty;
    } else {
      if (qty < 5) fillupM3 = 5 - qty;
      else if (qty > mixCap && qty < 10) fillupM3 = 10 - qty;
    }

    const baseCost = qty * ratePerM3;
    const fillupCost = fillupM3 * ratePerM3;
    const totalVolumeCost = baseCost + fillupCost;
    const minCost = trucks * effectiveMinFee;
    const isMin = trucks > 0 && totalVolumeCost / trucks < effectiveMinFee;
    if (isMin) return { cost: minCost, isMin, fillupM3: 0, fillupCost: 0 };
    return { cost: baseCost, isMin, fillupM3, fillupCost };
  }

  const result = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const km = parseFloat(distance) || 0;
    if (!qty || !selectedType) return null;

    // Extra items: compute per-item concrete breakdown with manual price support
    // Každá položka dostane vlastný calcTransport (zhodné so starou PHP kalkulačkou, ktorá volala
    // get_pump_calculation_distance per item vrátane fill-up pre každú položku zvlášť)
    const mp = loggedClient?.manualPrices ?? {};
    const isOwn = tab === "vlastnadoprava";
    const zeroTC = { cost: 0, isMin: false, fillupM3: 0, fillupCost: 0 };
    type BreakdownItem = {
      label: string; qty: number;
      bezDph: number; bezDphFinal: number; bezDphFinalHotovost: number;
      transport: number; transportFillup: number;
      transportFillupM3: number; transportFillupTarget: number;
      transportIsMin: boolean; transportTrucks: number;
      // per-item services
      svcPumpHrs: number; svcPumpMs: number; svcPumpCost: number;
      svcHoseMeters: number; svcHoseCost: number;
      svcWashing: boolean; svcWashCost: number;
      svcWaitIntervals: number; svcWaitCost: number; svcWaitLabel: string;
    };
    const concreteBreakdown: BreakdownItem[] = [];
    const mainManual = mp[selectedType.id];
    const addToMainQty = extraItems.reduce((s, i) => {
      const q = parseFloat(i.quantity) || 0;
      const t = getItemType(i.categoryName, i.typeLabel);
      return (t && q > 0 && i.transportMode === "addToMain") ? s + q : s;
    }, 0);
    const mainTC = isOwn ? zeroTC : calcTransport(km, qty + addToMainQty, tab, clientDeliveryZone);
    const mainTrucks = tab === "pumpa" ? calcPumpTrucks(qty) : Math.ceil(qty / mixCap);
    concreteBreakdown.push({
      label: `Betón ${cleanType(selectedType.label)} – ${qty} m³`,
      qty,
      bezDph: qty * selectedType.price,
      bezDphFinal: mainManual !== undefined ? qty * mainManual : qty * selectedType.price * betonFactor,
      bezDphFinalHotovost: mainManual !== undefined ? qty * mainManual * (1 + VAT_HOTOVOST) : qty * selectedType.price * betonFactor * (1 + VAT_HOTOVOST),
      transport: mainTC.cost,
      transportFillup: mainTC.fillupCost,
      transportFillupM3: mainTC.fillupM3,
      transportFillupTarget: mainTC.fillupM3 > 0 ? (qty < 5 ? 5 : 10) : 0,
      transportIsMin: mainTC.isMin,
      transportTrucks: mainTrucks,
      svcPumpHrs: 0, svcPumpMs: 0, svcPumpCost: 0,
      svcHoseMeters: 0, svcHoseCost: 0,
      svcWashing: false, svcWashCost: 0,
      svcWaitIntervals: 0, svcWaitCost: 0, svcWaitLabel: "",
    });
    for (const item of extraItems) {
      const t = getItemType(item.categoryName, item.typeLabel);
      const q = parseFloat(item.quantity) || 0;
      if (t && q > 0) {
        const itemManual = mp[t.id];
        const extraTC = (isOwn || item.transportMode === "none" || item.transportMode === "addToMain") ? zeroTC : calcTransport(km, q, tab, clientDeliveryZone);
        const extraTrucks = tab === "pumpa" ? calcPumpTrucks(q) : Math.ceil(q / mixCap);
        // Per-item services
        let svcPumpHrs = 0, svcPumpMs = 0, svcPumpCost = 0;
        let svcHoseMeters = 0, svcHoseCost = 0;
        let svcWashing = false, svcWashCost = 0;
        let svcWaitIntervals = 0, svcWaitCost = 0, svcWaitLabel = "";
        if (item.svc) {
          const s = item.svc;
          if (tab === "pumpa") {
            svcPumpHrs = parseInt(s.pumpHour) || 1;
            svcPumpMs = parseInt(s.pumpMin) || 0;
            svcPumpCost = (svcPumpHrs + svcPumpMs / 60) * pumpServicePrice;
            svcHoseMeters = s.hoseMeters;
            svcHoseCost = s.hoseMeters * hoseServicePrice;
            svcWashing = s.washing;
            svcWashCost = s.washing ? washServicePrice : 0;
            svcWaitIntervals = s.waitPiecesPumpa;
            svcWaitCost = s.waitPiecesPumpa * waitServicePricePumpa;
            svcWaitLabel = `${s.waitPiecesPumpa} ks`;
          } else if (tab === "mix") {
            const wm = (parseInt(s.waitHour) || 0) * 60 + (parseInt(s.waitMin) || 0);
            svcWaitIntervals = Math.ceil(Math.max(0, wm - 30) / 15);
            svcWaitCost = svcWaitIntervals * waitServicePriceMix;
            const wh = parseInt(s.waitHour) || 0;
            const wmm = parseInt(s.waitMin) || 0;
            svcWaitLabel = [wh > 0 ? `${wh} h` : "", wmm > 0 ? `${wmm} min` : ""].filter(Boolean).join(" ");
          }
        }
        concreteBreakdown.push({
          label: `Betón ${cleanType(t.label)} – ${q} m³`,
          qty: q,
          bezDph: q * t.price,
          bezDphFinal: itemManual !== undefined ? q * itemManual : q * t.price * betonFactor,
          bezDphFinalHotovost: itemManual !== undefined ? q * itemManual * (1 + VAT_HOTOVOST) : q * t.price * betonFactor * (1 + VAT_HOTOVOST),
          transport: extraTC.cost,
          transportFillup: extraTC.fillupCost,
          transportFillupM3: extraTC.fillupM3,
          transportFillupTarget: extraTC.fillupM3 > 0 ? (q < 5 ? 5 : 10) : 0,
          transportIsMin: extraTC.isMin,
          transportTrucks: extraTrucks,
          svcPumpHrs, svcPumpMs, svcPumpCost,
          svcHoseMeters, svcHoseCost,
          svcWashing, svcWashCost,
          svcWaitIntervals, svcWaitCost, svcWaitLabel,
        });
      }
    }
    const totalConcreteBezDph = concreteBreakdown.reduce((s, i) => s + i.bezDph, 0);
    const totalConcreteFinal = concreteBreakdown.reduce((s, i) => s + i.bezDphFinal, 0);
    const totalConcreteFinalHotovost = concreteBreakdown.reduce((s, i) => s + i.bezDphFinalHotovost, 0);
    const extraQty = extraItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
    const totalQty = qty + extraQty;

    // Celková doprava = súčet per-item dopráv (zhodné s pôvodnou kalkulačkou)
    const totalTransportCost = concreteBreakdown.reduce((s, ci) => s + ci.transport, 0);
    const totalFillupCost = concreteBreakdown.reduce((s, ci) => s + ci.transportFillup, 0);
    // Počet áut = súčet per-item transportTrucks (každá položka má vlastné auto)
    const trucks = concreteBreakdown.reduce((s, ci) => s + ci.transportTrucks, 0);
    const truckCapacity = tab === "pumpa" ? pumpCap : mixCap;
    const pumpHrs = parseInt(pumpHour) || 1;
    const pumpMs = parseInt(pumpMin) || 0;
    // Správny vzorec: hodiny + minúty/60 (napr. 1h 15min = 1.25h, nie 1.5h)
    const pumpCost = tab === "pumpa" ? (pumpHrs + pumpMs / 60) * pumpServicePrice : 0;

    // Čakačky: pumpa = kusy (1 kus = 15 min), mix = hodiny + minúty
    const waitIntervalsPumpa = waitPiecesPumpa;
    const waitIntervalsMix = Math.ceil(Math.max(0, waitTotalMins - 30) / 15);
    const waitIntervals = tab === "pumpa" ? waitIntervalsPumpa : waitIntervalsMix;

    const transportCalc = { cost: totalTransportCost, isMin: concreteBreakdown[0] ? (isOwn ? false : calcTransport(km, qty, tab, clientDeliveryZone).isMin) : false, fillupM3: concreteBreakdown[0]?.transportFillupM3 ?? 0, fillupCost: totalFillupCost };

    // Manual transport: bypass dopravaFactor ak je sadzba manuálne prepisaná
    const pricingType = clientDeliveryZone?.pricingType ?? "standard";
    let fTransport = dopravaFactor;
    if (!isOwn) {
      if (pricingType === "km" && mp[`km_rate_${clientDeliveryZone?.id}`] !== undefined) fTransport = 1;
      else if (pricingType === "auto" && mp[`auto_rate_${clientDeliveryZone?.id}`] !== undefined) fTransport = 1;
      else if (pricingType === "standard") {
        const appliedZone = tzones.find((z) => km >= z.fromKm && km < z.toKm) ?? tzones[tzones.length - 1];
        if ((appliedZone && mp[appliedZone.id] !== undefined) || (mp["min_fee"] !== undefined && transportCalc.isMin)) fTransport = 1;
      }
    }
    const fFillup = fTransport;

    // Per-item service súčty (extra items s pridanými službami)
    const extraSvcPumpCost  = concreteBreakdown.slice(1).reduce((s, ci) => s + ci.svcPumpCost, 0);
    const extraSvcHoseCost  = concreteBreakdown.slice(1).reduce((s, ci) => s + ci.svcHoseCost, 0);
    const extraSvcWashCost  = concreteBreakdown.slice(1).reduce((s, ci) => s + ci.svcWashCost, 0);
    const extraSvcWaitCost  = concreteBreakdown.slice(1).reduce((s, ci) => s + ci.svcWaitCost, 0);

    const items = {
      concrete: totalConcreteBezDph,
      transport: transportCalc.cost,
      fillup: transportCalc.fillupCost,
      pump: tab === "pumpa" ? pumpCost + extraSvcPumpCost : 0,
      hoses: tab === "pumpa" ? (hoseMeters > 0 ? hoseMeters * hoseServicePrice : 0) + extraSvcHoseCost : 0,
      washing: tab === "pumpa" ? (washing ? washServicePrice : 0) + extraSvcWashCost : 0,
      chem: tab === "pumpa" ? chemServicePrice : 0,
      waiting: tab === "pumpa"
        ? waitIntervals * waitServicePricePumpa + extraSvcWaitCost
        : (tab === "mix" ? waitIntervals * waitServicePriceMix + extraSvcWaitCost : 0),
      zimne: zimneOpatrenia ? totalQty * zimneServicePrice : 0,
    };

    const totalBezDph = Object.values(items).reduce((a, b) => a + b, 0);
    const discountedItems: typeof items = {
      concrete: totalConcreteFinal,
      transport: items.transport * fTransport,
      fillup: items.fillup * fFillup,
      pump: items.pump * fPump,
      hoses: items.hoses * fHose,
      washing: items.washing * fWash,
      chem: items.chem * fChem,
      waiting: items.waiting * (tab === "pumpa" ? fWaitP : fWaitM),
      zimne: items.zimne * betonFactor,
    };
    const totalDiscBezDph = Object.values(discountedItems).reduce((a, b) => a + b, 0);
    const totalDiscSDph = totalDiscBezDph * (1 + VAT);

    // Hotovosť: DPH (VAT_HOTOVOST) sa aplikuje IBA na betón, nie na dopravu/služby
    const hotovostBaseItems: typeof items = {
      concrete: items.concrete * (1 + VAT_HOTOVOST),
      transport: items.transport,
      fillup: items.fillup,
      pump: items.pump,
      hoses: items.hoses,
      washing: items.washing,
      chem: items.chem,
      waiting: items.waiting,
      zimne: items.zimne * (1 + VAT_HOTOVOST),
    };
    const hotovostDiscItems: typeof items = {
      concrete: totalConcreteFinalHotovost,
      transport: hotovostBaseItems.transport * fTransport,
      fillup: hotovostBaseItems.fillup * fFillup,
      pump: hotovostBaseItems.pump * fPump,
      hoses: hotovostBaseItems.hoses * fHose,
      washing: hotovostBaseItems.washing * fWash,
      chem: hotovostBaseItems.chem * fChem,
      waiting: hotovostBaseItems.waiting * (tab === "pumpa" ? fWaitP : fWaitM),
      zimne: hotovostBaseItems.zimne * betonFactor,
    };
    const hotovostTotal = Object.values(hotovostDiscItems).reduce((a, b) => a + b, 0);
    const hotovostOrigTotal = totalDiscSDph;

    const waitLabel = tab === "pumpa"
      ? `${waitPiecesPumpa} ks`
      : (() => {
        const wh = parseInt(waitHour) || 0;
        const wm = parseInt(waitMin) || 0;
        return [wh > 0 ? `${wh} h` : "", wm > 0 ? `${wm} min` : ""].filter(Boolean).join(" ");
      })();

    const mixTrucksCount = tab === "pumpa" ? trucks - 1 : trucks;
    const transportZone = !isOwn && km > 0 && (clientDeliveryZone?.pricingType ?? "standard") === "standard"
      ? (tzones.find((z) => km >= z.fromKm && km < z.toKm) ?? tzones[tzones.length - 1])
      : null;

    const fillupM3 = transportCalc.fillupM3;
    const fillupTarget = fillupM3 > 0 ? (qty < 5 ? 5 : 10) : 0;

    return {
      trucks, truckCapacity, mixTrucksCount, items, totalBezDph, totalSDph: totalBezDph * (1 + VAT),
      discountedItems, totalDiscBezDph, totalDiscSDph,
      hotovostBaseItems, hotovostDiscItems, hotovostTotal, hotovostOrigTotal,
      qty, totalQty, km, waitIntervals, waitLabel, pumpHrs, pumpMs, isOwn, concreteBreakdown, transportZone,
      transportIsMin: transportCalc.isMin, fillupM3, fillupTarget,
      fTransport, fFillup,
    };
  }, [tab, quantity, distance, selectedType, pumpHour, pumpMin, waitTotalMins, waitPiecesPumpa, hoseMeters, washing, zimneOpatrenia, betonFactor, dopravaFactor, sluzbyFactor, fPump, fChem, fWash, fHose, fWaitP, fWaitM, pumpServicePrice, chemServicePrice, washServicePrice, waitServicePricePumpa, waitServicePriceMix, hoseServicePrice, zimneServicePrice, tzones, tsettings, extraItems, allCategories, clientDeliveryZone, pumpCap, mixCap, VAT, VAT_HOTOVOST, loggedClient]);

  async function handleLogin() {
    if (!loginId || !loginPwd) return;
    setLoginLoading(true);
    setLoginErr("");
    const res = await clientAuth.login(loginId, loginPwd);
    setLoginLoading(false);
    if (res.ok && res.client) {
      setLoggedClient(res.client);
      setShowLoginForm(false);
      setLoginId("");
      setLoginPwd("");
      setShowResult(false);
    } else {
      setLoginErr(res.error ?? "Nesprávne prihlasovacie údaje");
    }
  }

  function handleLogout() {
    clientAuth.logout();
    setLoggedClient(null);
    setExtraItems([]);
    setShowResult(false);
  }

  function exportPDF() {
    if (!result) return;
    const today = new Date().toLocaleDateString("sk-SK");
    const isFaktura = priceMode === "faktura";
    const baseItems = isFaktura ? result.discountedItems : result.hotovostDiscItems;
    const origItems = isFaktura ? result.items : result.hotovostBaseItems;
    const ico = "55747591";
    const icoDph = "SK2122074603";
    const companyDic = "2122074603";
    const companyAddress = "Turie 468, 013 12 Turie";

    const fmtH = (n: number) => n.toFixed(2).replace(".", ",") + "&nbsp;€";
    const fmtN = (n: number) => n.toFixed(2).replace(".", ",");

    // Table row: # | Popis | Množstvo | Jedn. cena | Spolu
    let rowNum = 0;
    const trow = (popis: string, mnozstvo: string, jednCena: string, orig: number, disc: number, sectionBg?: string) => {
      if (orig === 0 && disc === 0) return "";
      rowNum++;
      const bg = rowNum % 2 === 0 ? "background:#f9f9f9;" : "";
      const crossed = hasDiscount && Math.abs(orig - disc) > 0.001
        ? `<span style="color:#bbb;text-decoration:line-through;font-size:7.5pt;display:block">${fmtN(orig)}&nbsp;€</span>` : "";
      return `<tr style="${bg}${sectionBg ?? ""}">
        <td style="padding:4px 6px;text-align:center;color:#999;font-size:8pt;width:24px;border-right:1px solid #eee">${rowNum}</td>
        <td style="padding:4px 8px;font-size:8.5pt;color:#222">${popis}</td>
        <td style="padding:4px 8px;font-size:8.5pt;text-align:center;color:#555;white-space:nowrap">${mnozstvo}</td>
        <td style="padding:4px 8px;font-size:8.5pt;text-align:right;color:#555;white-space:nowrap">${jednCena}</td>
        <td style="padding:4px 8px;font-size:8.5pt;font-weight:bold;text-align:right;white-space:nowrap">${crossed}${fmtN(disc)}&nbsp;€</td>
      </tr>`;
    };
    const thead = () =>
      `<tr style="background:#001D3D;color:#fff;font-size:8pt;font-weight:bold">
        <th style="padding:5px 6px;width:24px;text-align:center">#</th>
        <th style="padding:5px 8px;text-align:left">Popis</th>
        <th style="padding:5px 8px;text-align:center">Množstvo</th>
        <th style="padding:5px 8px;text-align:right">Jedn.&nbsp;cena</th>
        <th style="padding:5px 8px;text-align:right">Spolu</th>
      </tr>`;
    const sectionRow = (title: string) =>
      `<tr><td colspan="5" style="background:#EDC531;color:#001D3D;font-weight:bold;font-size:8.5pt;padding:4px 8px">${title}</td></tr>`;
    const subSectionRow = (title: string) =>
      `<tr><td colspan="5" style="background:#fdf6d8;color:#7a6200;font-weight:600;font-size:7.5pt;padding:3px 8px 3px 18px;border-top:1px solid #f0e6b0">↳ ${title}</td></tr>`;

    // Build rows — main item only (extras handled separately in extraRows)
    const mainCI = result.concreteBreakdown[0];
    const mainBetonLabel = mainCI?.label.replace(/ – [\d.,]+ m³$/, "") ?? "";
    const betonRows = (() => {
      if (!mainCI) return "";
      const origVal = isFaktura ? mainCI.bezDph : mainCI.bezDph * (1 + VAT_HOTOVOST);
      const discVal = isFaktura ? mainCI.bezDphFinal : mainCI.bezDphFinalHotovost;
      const unitPriceOrig = mainCI.qty > 0 ? origVal / mainCI.qty : 0;
      const unitPrice = mainCI.qty > 0 ? discVal / mainCI.qty : 0;
      const unitStr = hasDiscount && Math.abs(unitPriceOrig - unitPrice) > 0.001
        ? `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(unitPriceOrig)}&nbsp;€/m³</span><br>${fmtN(unitPrice)}&nbsp;€/m³`
        : `${fmtN(unitPrice)}&nbsp;€/m³`;
      return trow(mainCI.label, `${mainCI.qty}&nbsp;m³`, unitStr, origVal, discVal);
    })();

    const mainTrucks = mainCI?.transportTrucks ?? 0;
    const pdfTrucks = tab === "pumpa" ? `1×Pumpa${mainTrucks > 1 ? `+${mainTrucks - 1}×Mix` : ""}` : `${mainTrucks}×Mix`;
    const pdfZone = result.transportZone ? `${result.transportZone.fromKm}–${result.transportZone.toKm}&nbsp;km` : "";
    const pdfPrefix = result.transportIsMin ? "Min. doprava" : "Doprava";
    const dopravaLabel = `${pdfPrefix}${pdfZone ? ` ${pdfZone}` : ""} · ${pdfTrucks}`;
    const mainTransportOrig = mainCI?.transport ?? 0;
    const mainTransportDisc = mainTransportOrig * result.fTransport;
    const mainPricingType = clientDeliveryZone?.pricingType ?? "standard";
    const mainMinFeePerTruck = (() => {
      if (mainPricingType === "km") return clientDeliveryZone?.minimumFeeKm ?? 0;
      if (mainPricingType === "auto") return clientDeliveryZone?.minimumFeeAuto ?? 0;
      const mpLocal = loggedClient?.manualPrices ?? {};
      return mpLocal["min_fee"] !== undefined ? mpLocal["min_fee"] : (tsettings.minimumFee ?? 62.50);
    })();
    const mainMinFeeDisc = mainMinFeePerTruck * result.fTransport;
    const transportUnitStr = result.transportIsMin && mainMinFeePerTruck > 0
      ? (hasDiscount && Math.abs(mainMinFeePerTruck - mainMinFeeDisc) > 0.001
        ? `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(mainMinFeePerTruck)}&nbsp;€/auto</span><br>${fmtN(mainMinFeeDisc)}&nbsp;€/auto`
        : `${fmtN(mainMinFeeDisc)}&nbsp;€/auto`)
      : "—";
    const transportRow = mainTransportOrig > 0
      ? trow(dopravaLabel, `${result.qty}&nbsp;m³`, transportUnitStr, mainTransportOrig, mainTransportDisc)
      : "";
    const mainFillupOrig = mainCI?.transportFillup ?? 0;
    const mainFillupDisc = mainFillupOrig * result.fFillup;
    const fillupRow = mainFillupOrig > 0
      ? trow(`Doťaženie do&nbsp;${result.fillupTarget}&nbsp;m³`, `${mainCI?.transportFillupM3}&nbsp;m³`, "—", mainFillupOrig, mainFillupDisc)
      : "";
    const zimneRow = origItems.zimne > 0
      ? trow(`Zimné opatrenia`, `${result.qty}&nbsp;m³`, `${fmtN(zimneServicePrice)}&nbsp;€/m³`, origItems.zimne, baseItems.zimne)
      : "";

    // Main item services (pumpa only, first item — per-item values, not aggregated)
    const mainPumpTime = (parseInt(pumpHour) || 1) + (parseInt(pumpMin) || 0) / 60;
    const mainSluzbyOrig = {
      pump: tab === "pumpa" ? mainPumpTime * pumpServicePrice : 0,
      hoses: hoseMeters > 0 ? hoseMeters * hoseServicePrice : 0,
      washing: washing ? washServicePrice : 0,
      chem: tab === "pumpa" ? chemServicePrice : 0,
      waiting: tab === "pumpa" ? result.waitIntervals * waitServicePricePumpa : tab === "mix" ? result.waitIntervals * waitServicePriceMix : 0,
    };
    // Helper: jednotková cena so zľavou a strikethrough pre Spolu stĺpec
    const svcRateStr = (rate: number, suffix: string, factor = sluzbyFactor) => {
      const discRate = rate * factor;
      if (hasDiscount && Math.abs(rate - discRate) > 0.001)
        return `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(rate)}&nbsp;${suffix}</span><br>${fmtN(discRate)}&nbsp;${suffix}`;
      return `${fmtN(discRate)}&nbsp;${suffix}`;
    };

    const hasMainSluzby =
      (tab === "pumpa" && (mainSluzbyOrig.pump + mainSluzbyOrig.hoses + mainSluzbyOrig.washing + mainSluzbyOrig.chem + mainSluzbyOrig.waiting) > 0) ||
      (tab === "mix" && mainSluzbyOrig.waiting > 0);
    const svcLabel = tab === "pumpa" ? "Služby – Pumpa" : "Čakačky";
    const sluzbyRows = hasMainSluzby
      ? subSectionRow(svcLabel) +
        (tab === "pumpa"
          ? trow(`Čerpanie betónu – ${result.pumpHrs}&nbsp;h${result.pumpMs > 0 ? `&nbsp;${result.pumpMs}&nbsp;min` : ""}`,
              `${result.pumpHrs}&nbsp;h${result.pumpMs > 0 ? `&nbsp;${result.pumpMs}&nbsp;min` : ""}`, svcRateStr(pumpServicePrice, "€/h", fPump), mainSluzbyOrig.pump, mainSluzbyOrig.pump * fPump) +
            (hoseMeters > 0 ? trow(`Prídavné hadice`, `${hoseMeters}&nbsp;m`, svcRateStr(hoseServicePrice, "€/m", fHose), mainSluzbyOrig.hoses, mainSluzbyOrig.hoses * fHose) : "") +
            (washing ? trow("Umývanie mimo stavby", "1&nbsp;ks", svcRateStr(washServicePrice, "€", fWash), mainSluzbyOrig.washing, mainSluzbyOrig.washing * fWash) : "") +
            (mainSluzbyOrig.chem > 0 ? trow("Rozbehová chémia", "1&nbsp;ks", svcRateStr(chemServicePrice, "€", fChem), mainSluzbyOrig.chem, mainSluzbyOrig.chem * fChem) : "") +
            (result.waitIntervals > 0 ? trow(`Čakačky – ${result.waitLabel}`, `${result.waitIntervals}&nbsp;×&nbsp;15&nbsp;min`, svcRateStr(waitServicePricePumpa, "€/int.", fWaitP), mainSluzbyOrig.waiting, mainSluzbyOrig.waiting * fWaitP) : "")
          : "") +
        (tab === "mix" && result.waitIntervals > 0
          ? trow(`Čas na stavbe – ${result.waitLabel}`, `${result.waitIntervals}&nbsp;×&nbsp;15&nbsp;min`, svcRateStr(waitServicePriceMix, "€/int.", fWaitM), mainSluzbyOrig.waiting, mainSluzbyOrig.waiting * fWaitM)
          : "")
      : "";

    // Extra items (concreteBreakdown[1...])
    const extraRows = result.concreteBreakdown.slice(1).map((ci, idx) => {
      const betonOrig = isFaktura ? ci.bezDph : ci.bezDph * (1 + VAT_HOTOVOST);
      const betonDisc = isFaktura ? ci.bezDphFinal : ci.bezDphFinalHotovost;
      const unitPriceOrig = ci.qty > 0 ? betonOrig / ci.qty : 0;
      const unitPrice = ci.qty > 0 ? betonDisc / ci.qty : 0;
      const unitStr = hasDiscount && Math.abs(unitPriceOrig - unitPrice) > 0.001
        ? `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(unitPriceOrig)}&nbsp;€/m³</span><br>${fmtN(unitPrice)}&nbsp;€/m³`
        : `${fmtN(unitPrice)}&nbsp;€/m³`;
      const transOrig = ci.transport;
      const transDisc = ci.transport * result.fTransport;
      const fillupOrig = ci.transportFillup;
      const fillupDisc = ci.transportFillup * result.fFillup;
      const pdfExtraTrucks = tab === "pumpa"
        ? `1×Pumpa${ci.transportTrucks > 1 ? `+${ci.transportTrucks - 1}×Mix` : ""}`
        : `${ci.transportTrucks}×Mix`;
      const dopravaExtraLabel = `${ci.transportIsMin ? "Min. doprava" : "Doprava"}${pdfZone ? ` ${pdfZone}` : ""} · ${pdfExtraTrucks}`;
      const extraMinFeeDisc = mainMinFeePerTruck * result.fTransport;
      const extraTransportUnitStr = ci.transportIsMin && mainMinFeePerTruck > 0
        ? (hasDiscount && Math.abs(mainMinFeePerTruck - extraMinFeeDisc) > 0.001
          ? `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(mainMinFeePerTruck)}&nbsp;€/auto</span><br>${fmtN(extraMinFeeDisc)}&nbsp;€/auto`
          : `${fmtN(extraMinFeeDisc)}&nbsp;€/auto`)
        : "—";
      const extraBetonLabel = ci.label.replace(/ – [\d.,]+ m³$/, "");
      let rows = sectionRow(`Pridaná položka ${idx + 1}${extraBetonLabel ? ` – ${extraBetonLabel}` : ""}`);
      rows += trow(ci.label, `${ci.qty}&nbsp;m³`, unitStr, betonOrig, betonDisc);
      rows += trow(dopravaExtraLabel, `${ci.qty}&nbsp;m³`, extraTransportUnitStr, transOrig, transDisc);
      rows += trow(`Doťaženie do&nbsp;${ci.transportFillupTarget}&nbsp;m³`, `${ci.transportFillupM3}&nbsp;m³`, "—", fillupOrig, fillupDisc);
      const hasExtraSvc = ci.svcPumpCost > 0 || ci.svcHoseCost > 0 || ci.svcWashCost > 0 || ci.svcWaitCost > 0;
      if (hasExtraSvc) rows += subSectionRow(svcLabel);
      if (ci.svcPumpCost > 0) {
        const pumpTimeStr = ci.svcPumpMs > 0 ? `${ci.svcPumpHrs}&nbsp;h&nbsp;${ci.svcPumpMs}&nbsp;min` : `${ci.svcPumpHrs}&nbsp;h`;
        rows += trow(`Čerpanie betónu – ${pumpTimeStr}`, pumpTimeStr, svcRateStr(pumpServicePrice, "€/h", fPump), ci.svcPumpCost, ci.svcPumpCost * fPump);
      }
      if (ci.svcHoseCost > 0) {
        rows += trow(`Prídavné hadice`, `${ci.svcHoseMeters}&nbsp;m`, svcRateStr(hoseServicePrice, "€/m", fHose), ci.svcHoseCost, ci.svcHoseCost * fHose);
      }
      if (ci.svcWashCost > 0) {
        rows += trow("Umývanie mimo stavby", "1&nbsp;ks", svcRateStr(washServicePrice, "€", fWash), ci.svcWashCost, ci.svcWashCost * fWash);
      }
      if (ci.svcWaitCost > 0) {
        const waitRate = tab === "pumpa" ? waitServicePricePumpa : waitServicePriceMix;
        const fWaitExtra = tab === "pumpa" ? fWaitP : fWaitM;
        rows += trow(`Čakačky – ${ci.svcWaitLabel}`, `${ci.svcWaitIntervals}&nbsp;×&nbsp;15&nbsp;min`, svcRateStr(waitRate, "€/int.", fWaitExtra), ci.svcWaitCost, ci.svcWaitCost * fWaitExtra);
      }
      return rows;
    }).join("");

    const discountInfo = (() => {
      if (!hasDiscount) return "";
      const dp: string[] = [];
      if (discountBeton   > 0) dp.push(`Betón ${discountBeton}%`);
      if (discountDoprava > 0) dp.push(`Doprava ${discountDoprava}%`);
      if (discountSluzby  > 0) dp.push(`Služby ${discountSluzby}%`);
      if (discountCelkovo > 0) dp.push(`Celkovo ${discountCelkovo}%`);
      return `<div style="color:#EDC531;font-size:8pt;margin-top:3px">Zľavy: ${dp.join(", ")}</div>`;
    })();

    const tabLabel = tab === "pumpa" ? "Pumpa" : tab === "mix" ? "Miešačka" : "Vlastná doprava";
    const zoneLabel = clientDeliveryZone?.name ?? "";
    const transportModeInfo = `<div style="color:#555;font-size:8pt;margin-top:2px">Doprava: ${tabLabel}${zoneLabel ? ` – ${zoneLabel}` : ""}</div>`;
    const clientBlock = loggedClient ? `
      <div style="border:1px solid #ddd;border-radius:3px;padding:6px 10px;margin-bottom:5mm;font-size:8.5pt">
        <div style="font-weight:bold;color:#001D3D">${loggedClient.name}${loggedClient.company ? ` – ${loggedClient.company}` : ""}</div>
        ${loggedClient.clientId ? `<div style="color:#777;font-size:8pt">ID klienta: ${loggedClient.clientId}</div>` : ""}
        ${loggedClient.name ? `<div style="color:#555">${loggedClient.name}</div>` : ""}
        ${transportModeInfo}
        ${discountInfo}
      </div>` : `<div style="margin-bottom:5mm">${transportModeInfo}${hasDiscount ? discountInfo : ""}</div>`;

    const ownNote = result.isOwn
      ? `<tr><td colspan="5" style="font-style:italic;color:#888;font-size:8pt;padding:5px 8px;border-bottom:1px solid #eee">Vlastná doprava – zákazník zabezpečuje dopravu vlastným vozidlom</td></tr>` : "";

    const totalBlock = isFaktura
      ? `<div style="display:flex;justify-content:flex-end;gap:0">
           <table style="border-collapse:collapse;min-width:240px">
             <tr><td style="padding:3px 8px;font-size:8.5pt;color:#555">Cena bez DPH:</td><td style="padding:3px 8px;font-size:8.5pt;font-weight:bold;text-align:right">${fmtH(result.totalDiscBezDph)}</td></tr>
             <tr><td style="padding:3px 8px;font-size:8.5pt;color:#555">DPH ${Math.round(VAT * 100)}%:</td><td style="padding:3px 8px;font-size:8.5pt;font-weight:bold;text-align:right">${fmtH(result.totalDiscBezDph * VAT)}</td></tr>
             <tr style="background:#001D3D"><td style="padding:6px 8px;font-size:11pt;font-weight:bold;color:#fff">Cena spolu s DPH:</td><td style="padding:6px 8px;font-size:11pt;font-weight:bold;color:#EDC531;text-align:right">${fmtH(result.totalDiscSDph)}</td></tr>
           </table>
         </div>`
      : `<div style="display:flex;justify-content:flex-end">
           <table style="border-collapse:collapse;min-width:240px">
             <tr style="background:#001D3D"><td style="padding:6px 8px;font-size:11pt;font-weight:bold;color:#fff">Cena spolu:</td><td style="padding:6px 8px;font-size:11pt;font-weight:bold;color:#EDC531;text-align:right">${fmtH(result.hotovostTotal)}</td></tr>
           </table>
         </div>`;

    const html = `<!DOCTYPE html><html lang="sk"><head>
<meta charset="utf-8">
<title>Cenová ponuka – MS-BETON</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #222; position:relative; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>

<!-- Header -->
<div style="background:#001D3D;color:#fff;padding:10mm 14mm 8mm;position:relative;z-index:1">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:20pt;font-weight:bold;letter-spacing:-0.5px;margin-bottom:2px">MS-BETON, spol. s r.o.</div>
      <div style="font-size:8pt;opacity:0.7;margin-bottom:1px">${companyAddress} &nbsp;|&nbsp; Slovenská republika</div>
      <div style="font-size:8pt;opacity:0.6">+421&nbsp;909&nbsp;205&nbsp;205 &nbsp;|&nbsp; info@msbeton.sk &nbsp;|&nbsp; msbeton.sk</div>
    </div>
    <div style="text-align:right;font-size:8pt;opacity:0.65;line-height:1.8">
      IČO: ${ico}<br>DIČ: ${companyDic}<br>IČ DPH: ${icoDph}
    </div>
  </div>
</div>

<!-- Body -->
<div style="padding:7mm 14mm 12mm;position:relative;z-index:1">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4mm">
    <div style="color:#EDC531;font-size:16pt;font-weight:bold;letter-spacing:1px">CENOVÁ PONUKA</div>
    <div style="font-size:8.5pt;color:#666">Dátum: ${today}</div>
  </div>

  ${clientBlock}

  <!-- Items table -->
  <table style="border:1px solid #ddd;margin-bottom:5mm">
    ${thead()}
    ${ownNote}
    ${sectionRow(mainBetonLabel ? `Produkty – ${mainBetonLabel}` : "Produkty")}
    ${betonRows}
    ${transportRow}
    ${fillupRow}
    ${zimneRow}
    ${sluzbyRows}
    ${extraRows}
  </table>

  <!-- Total -->
  ${totalBlock}

  <!-- Vypracovala spoločnosť -->
  <div style="margin-top:8mm;display:flex;align-items:flex-start;gap:6mm">
    <div style="flex:1;border:1px solid #c8c8d8;border-radius:3px;padding:4mm 6mm;text-align:center">
      <div style="font-size:8pt;color:#888;margin-bottom:3mm">Vypracovala spoločnosť</div>
      <img src="${window.location.origin}/ms-beton-watermark.png" style="width:36mm;height:auto;opacity:0.22;display:block;margin:0 auto" />
    </div>
    <div style="flex:1;border:1px solid #c8c8d8;border-radius:3px;padding:4mm 6mm;min-height:28mm">
      <div style="font-size:8pt;color:#888;margin-bottom:2mm">Podpis a pečiatka zákazníka</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding-top:4mm;border-top:1px solid #ddd;font-size:7.5pt;color:#888;line-height:1.7">
    * Cena je orientačná. Závisí od aktuálneho cenníka a dostupnosti. Kontaktujte nás pre presnú ponuku.<br>
    MS-BETON, spol. s r.o. &nbsp;|&nbsp; IČO: ${ico} &nbsp;|&nbsp; DIČ: ${companyDic} &nbsp;|&nbsp; IČ DPH: ${icoDph} &nbsp;|&nbsp;
    ${companyAddress} &nbsp;|&nbsp; +421&nbsp;909&nbsp;205&nbsp;205 &nbsp;|&nbsp; info@msbeton.sk
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    if (!win) {
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click();
    }
  }

  function exportSMS() {
    if (!result) return;
    const isFaktura = priceMode === "faktura";
    const smsItems = isFaktura ? result.discountedItems : result.hotovostDiscItems;
    const now = new Date();
    const fmtDate = `${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()}`;
    const fmtTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const div = "-------------------------------";
    const row = (label: string, val: number) => `${label.padEnd(22)}= ${val.toFixed(2)} €`;
    const rowUnit = (qty: string, unit: number, total: number) =>
      `${(qty + " x " + unit.toFixed(2) + " €").padEnd(22)}= ${total.toFixed(2)} €`;

    const lines: string[] = [];
    lines.push(div, "          MS-BETON", "       Cenová ponuka", div);
    if (address) lines.push(`${address} - ${result.km}km`);
    else if (result.km > 0) lines.push(`${result.km}km`);
    if (result.isOwn) lines.push("Vlastná doprava – odber na prevádzke");
    lines.push(div);
    lines.push(`Dátum vystavenia - ${fmtDate}`);
    lines.push(`Čas vystavenia   - ${fmtTime}`);
    lines.push(div);

    for (const ci of result.concreteBreakdown) {
      const concreteVal = isFaktura ? ci.bezDphFinal : ci.bezDphFinalHotovost;
      const unitPrice = ci.qty > 0 ? concreteVal / ci.qty : 0;
      const concreteName = ci.label.replace(/ – \d+(?:[.,]\d+)? m³$/, "");
      lines.push(concreteName);
      lines.push(rowUnit(`${ci.qty}m³`, unitPrice, concreteVal));

      if (!result.isOwn && ci.transport > 0) {
        const transportDisc = ci.transport * result.fTransport;
        if (ci.transportIsMin) {
          const carCost = ci.transportTrucks > 0 ? transportDisc / ci.transportTrucks : 0;
          lines.push("Minimálna doprava");
          lines.push(rowUnit(`${ci.transportTrucks}x auto`, carCost, transportDisc));
        } else if (result.transportZone) {
          const zone = result.transportZone;
          const effectiveRate = zone.ratePerM3 * result.fTransport;
          lines.push(`Doprava od ${zone.fromKm}km do ${zone.toKm}km`);
          lines.push(rowUnit(`${ci.qty}m³`, effectiveRate, transportDisc));
          if (ci.transportFillup > 0) {
            const fillupDisc = ci.transportFillup * result.fFillup;
            lines.push(`Doťaženie do ${ci.transportFillupTarget}m³`);
            lines.push(rowUnit(`${ci.transportFillupM3}m³`, effectiveRate, fillupDisc));
          }
        } else {
          lines.push(row("Doprava", transportDisc));
        }
      }
    }

    let svcSection = false;
    const svcDiv = () => { if (!svcSection) { lines.push(div); svcSection = true; } };

    if (tab === "pumpa") {
      if (smsItems.pump > 0) {
        svcDiv();
        const pumpTimeStr = result.pumpMs > 0 ? `${result.pumpHrs}h ${result.pumpMs}min` : `${result.pumpHrs}h`;
        lines.push("Čerpanie betónu");
        lines.push(rowUnit(pumpTimeStr, pumpServicePrice * fPump, smsItems.pump));
      }
      if (smsItems.hoses > 0) {
        svcDiv();
        lines.push("Prídavné hadice");
        lines.push(rowUnit(`${hoseMeters}m`, hoseServicePrice * fHose, smsItems.hoses));
      }
      if (smsItems.washing > 0) {
        svcDiv();
        lines.push("Umývanie mimo stavby");
        lines.push(rowUnit("1 ks", washServicePrice * fWash, smsItems.washing));
      }
      if (smsItems.chem > 0) {
        svcDiv();
        lines.push("Rozbehová chémia");
        lines.push(rowUnit("1 ks", chemServicePrice * fChem, smsItems.chem));
      }
      if (smsItems.waiting > 0) {
        svcDiv();
        lines.push(`Čakačky – ${result.waitLabel}`);
        lines.push(rowUnit(`${result.waitIntervals} × 15min`, waitServicePricePumpa * fWaitP, smsItems.waiting));
      }
    } else if (tab === "mix" && smsItems.waiting > 0) {
      svcDiv();
      lines.push(`Čas na stavbe – ${result.waitLabel}`);
      lines.push(rowUnit(`${result.waitIntervals} × 15min`, waitServicePriceMix * fWaitM, smsItems.waiting));
    }

    if (smsItems.zimne > 0) {
      svcDiv();
      lines.push("Zimné opatrenia");
      lines.push(rowUnit(`${result.totalQty}m³`, zimneServicePrice * betonFactor, smsItems.zimne));
    }

    lines.push(div);
    if (isFaktura) {
      lines.push(row("Cena bez DPH", result.totalDiscBezDph));
      lines.push(row("Cena s DPH", result.totalDiscSDph));
    } else {
      lines.push(row("Cena spolu", result.hotovostTotal));
    }
    if (hasDiscount) {
      const dp: string[] = [];
      if (discountBeton   > 0) dp.push(`betón ${discountBeton}%`);
      if (discountDoprava > 0) dp.push(`doprava ${discountDoprava}%`);
      if (discountSluzby  > 0) dp.push(`služby ${discountSluzby}%`);
      if (discountCelkovo > 0) dp.push(`celkovo ${discountCelkovo}%`);
      lines.push(`(zľavy: ${dp.join(", ")})`);
    }
    lines.push("Tel: +421 909 205 205");
    const text = lines.join("\n");
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setSmsCopied(true);
        setTimeout(() => setSmsCopied(false), 3000);
      });
    }
  }

  async function handleSubmitOrder() {
    if (!result || !orderForm.name.trim()) return;
    setOrderSubmitting(true);
    const isFakt = priceMode === "faktura";
    const fmt2 = (n: number) => parseFloat(n.toFixed(2));
    const bdSections: { h: string; rows: { l: string; v: number; o?: number }[] }[] = [];
    const pdfTrucksLabel = (ci: typeof result.concreteBreakdown[0]) =>
      tab === "pumpa" ? `1×Pumpa${ci.transportTrucks > 1 ? `+${ci.transportTrucks - 1}×Mix` : ""}` : `${ci.transportTrucks}×Mix`;
    const zoneStr = result.transportZone ? `${result.transportZone.fromKm}–${result.transportZone.toKm} km` : "";

    result.concreteBreakdown.forEach((ci, idx) => {
      const bOrig = fmt2(isFakt ? ci.bezDph : ci.bezDph * (1 + VAT_HOTOVOST));
      const bDisc = fmt2(isFakt ? ci.bezDphFinal : ci.bezDphFinalHotovost);
      const tOrig = fmt2(ci.transport);
      const tDisc = fmt2(ci.transport * dopravaFactor);
      const catLabel = ci.label.replace(/ – [\d.,]+ m³$/, "");
      const header = idx === 0 ? `Produkty – ${catLabel}` : `Pridaná položka ${idx} – ${catLabel}`;
      const rows: { l: string; v: number; o?: number }[] = [];
      rows.push({ l: ci.label, v: bDisc, ...(Math.abs(bOrig - bDisc) > 0.01 ? { o: bOrig } : {}) });
      if (ci.transport > 0) {
        const dopravaLbl = `${ci.transportIsMin ? "Min. doprava" : "Doprava"}${zoneStr ? ` ${zoneStr}` : ""} · ${pdfTrucksLabel(ci)}`;
        rows.push({ l: dopravaLbl, v: tDisc, ...(Math.abs(tOrig - tDisc) > 0.01 ? { o: tOrig } : {}) });
      }
      if (ci.transportFillup > 0) {
        const fDisc = fmt2(ci.transportFillup * dopravaFactor);
        rows.push({ l: `Doťaženie do ${ci.transportFillupTarget} m³`, v: fDisc });
      }
      const svcRows: { l: string; v: number; o?: number }[] = [];
      if (idx === 0) {
        const pumpBase = (parseInt(pumpHour) || 1) + (parseInt(pumpMin) || 0) / 60;
        if (tab === "pumpa" && pumpBase > 0 && pumpServicePrice > 0) {
          const pOrig = fmt2(pumpBase * pumpServicePrice);
          svcRows.push({ l: `Čerpanie betónu – ${result.pumpHrs} h${result.pumpMs > 0 ? ` ${result.pumpMs} min` : ""}`, v: fmt2(pOrig * sluzbyFactor), ...(sluzbyFactor < 1 ? { o: pOrig } : {}) });
        }
        if (hoseMeters > 0) { const ho = fmt2(hoseMeters * hoseServicePrice); svcRows.push({ l: `Prídavné hadice – ${hoseMeters} m`, v: fmt2(ho * sluzbyFactor), ...(sluzbyFactor < 1 ? { o: ho } : {}) }); }
        if (tab === "pumpa" && chemServicePrice > 0) { const co = fmt2(chemServicePrice); svcRows.push({ l: "Rozbehová chémia", v: fmt2(co * sluzbyFactor), ...(sluzbyFactor < 1 ? { o: co } : {}) }); }
        if (washing) { const wo = fmt2(washServicePrice); svcRows.push({ l: "Umývanie mimo stavby", v: fmt2(wo * sluzbyFactor), ...(sluzbyFactor < 1 ? { o: wo } : {}) }); }
        if (result.waitIntervals > 0) {
          const wRate = tab === "pumpa" ? waitServicePricePumpa : waitServicePriceMix;
          const wOrig = fmt2(result.waitIntervals * wRate);
          svcRows.push({ l: `Čakačky – ${result.waitLabel}`, v: fmt2(wOrig * sluzbyFactor), ...(sluzbyFactor < 1 ? { o: wOrig } : {}) });
        }
      } else {
        if (ci.svcPumpCost > 0) { svcRows.push({ l: `Čerpanie betónu – ${ci.svcPumpHrs} h${ci.svcPumpMs > 0 ? ` ${ci.svcPumpMs} min` : ""}`, v: fmt2(ci.svcPumpCost * sluzbyFactor), ...(sluzbyFactor < 1 ? { o: fmt2(ci.svcPumpCost) } : {}) }); }
        if (ci.svcHoseCost > 0) { svcRows.push({ l: `Prídavné hadice – ${ci.svcHoseMeters} m`, v: fmt2(ci.svcHoseCost * sluzbyFactor), ...(sluzbyFactor < 1 ? { o: fmt2(ci.svcHoseCost) } : {}) }); }
        if (ci.svcWashCost > 0) { svcRows.push({ l: "Umývanie mimo stavby", v: fmt2(ci.svcWashCost * sluzbyFactor), ...(sluzbyFactor < 1 ? { o: fmt2(ci.svcWashCost) } : {}) }); }
        if (ci.svcWaitCost > 0) { svcRows.push({ l: `Čakačky – ${ci.svcWaitLabel}`, v: fmt2(ci.svcWaitCost * sluzbyFactor), ...(sluzbyFactor < 1 ? { o: fmt2(ci.svcWaitCost) } : {}) }); }
      }
      bdSections.push({ h: header, rows });
      if (svcRows.length > 0) {
        bdSections.push({ h: tab === "pumpa" ? "Služby – Pumpa" : "Čakačky", rows: svcRows });
      }
    });
    const breakdown = JSON.stringify({ v: 2, s: bdSections });

    await clientApi.submitOrder({
      id: Math.random().toString(36).slice(2, 10),
      status: "nova",
      clientName: orderForm.name.trim(),
      clientId: loggedClient?.clientId,
      company: loggedClient?.company || undefined,
      phone: orderForm.phone.trim() || undefined,
      email: orderForm.email.trim() || undefined,
      note: orderForm.note.trim() || undefined,
      tab,
      concreteType: selectedType?.label ?? "",
      quantity: result.qty,
      totalQty: result.totalQty,
      address: address || undefined,
      km: result.km || undefined,
      priceMode,
      totalBezDph: result.totalDiscBezDph,
      totalSDph: isFakt ? result.totalDiscSDph : result.hotovostTotal,
      breakdown,
      fillupM3: result.fillupM3 > 0 ? result.fillupM3 : undefined,
      fillupTarget: result.fillupM3 > 0 ? result.fillupTarget : undefined,
      deliveryZoneType: clientDeliveryZone?.pricingType ?? "standard",
      deliveryZoneName: clientDeliveryZone?.name ?? undefined,
      discountBeton:   discountBeton   > 0 ? discountBeton   : undefined,
      discountDoprava: discountDoprava > 0 ? discountDoprava : undefined,
      discountSluzby:  discountSluzby  > 0 ? discountSluzby  : undefined,
      discountCelkovo: discountCelkovo > 0 ? discountCelkovo : undefined,
    });
    setOrderSubmitting(false);
    setOrderDone(true);
    setTimeout(() => { setShowOrderModal(false); setOrderDone(false); }, 3000);
  }

  const isFaktura = priceMode === "faktura";
  const displayItems = isFaktura ? result?.discountedItems : result?.hotovostDiscItems;
  const origDisplayItems = isFaktura ? result?.items : result?.hotovostBaseItems;

  return (
    <div className="max-w-5xl mx-auto" ref={calcWrapRef}>
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#2d3748" }}>

        {/* Tabs */}
        <div className="grid grid-cols-3">
          {(["pumpa", "mix", "vlastnadoprava"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setExtraItems([]); setShowResult(false); setTabInfoOpen(false); }}
              className={cn("flex flex-col items-center justify-center gap-2 py-4 transition-all cursor-pointer group",
                tab === t ? "bg-secondary border-b-4 border-primary" : "bg-white/5 border-b-4 border-transparent hover:bg-white/10"
              )}>
              {t === "pumpa" ? (
                <svg viewBox="0 0 130 48" className={cn("w-20 h-[31px] mx-auto transition-colors", tab === t ? "text-primary" : "text-white/40 group-hover:text-white/70")} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="27" width="14" height="15" rx="1" /><rect x="3" y="22" width="9" height="6" rx="1" />
                  <line x1="16" y1="33" x2="44" y2="33" /><line x1="16" y1="42" x2="44" y2="42" /><line x1="44" y1="33" x2="44" y2="42" />
                  <line x1="26" y1="33" x2="26" y2="21" strokeWidth="2.5" /><line x1="22" y1="21" x2="30" y2="21" strokeWidth="1.8" />
                  <line x1="26" y1="21" x2="16" y2="6" strokeWidth="3" /><line x1="16" y1="6" x2="122" y2="2" strokeWidth="2.5" />
                  <line x1="26" y1="21" x2="72" y2="4" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="122" y1="2" x2="127" y2="2" strokeWidth="2" /><line x1="126" y1="2" x2="126" y2="17" strokeWidth="1.8" />
                  <line x1="20" y1="42" x2="20" y2="48" /><line x1="16" y1="48" x2="24" y2="48" />
                  <line x1="40" y1="42" x2="40" y2="48" /><line x1="36" y1="48" x2="44" y2="48" />
                  <circle cx="8" cy="42" r="4" strokeWidth="2" /><circle cx="36" cy="42" r="4" strokeWidth="2" />
                </svg>
              ) : t === "mix" ? (
                <svg viewBox="0 0 80 44" className={cn("w-14 h-[31px] transition-colors", tab === t ? "text-primary" : "text-white/40 group-hover:text-white/70")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="22" width="18" height="16" rx="1" /><rect x="3" y="18" width="10" height="6" rx="1" />
                  <line x1="20" y1="30" x2="62" y2="30" /><line x1="20" y1="38" x2="62" y2="38" /><line x1="62" y1="30" x2="62" y2="38" />
                  <ellipse cx="44" cy="22" rx="18" ry="12" />
                  <path d="M30 26 Q44 18 58 26" strokeWidth="1.5" /><path d="M30 20 Q44 12 58 20" strokeWidth="1.5" />
                  <line x1="26" y1="22" x2="30" y2="30" strokeWidth="1.5" /><line x1="60" y1="22" x2="62" y2="30" strokeWidth="1.5" />
                  <circle cx="10" cy="38" r="4" strokeWidth="2" /><circle cx="52" cy="38" r="4" strokeWidth="2" />
                </svg>
              ) : (
                <svg viewBox="0 0 64 46" className={cn("w-14 h-[31px] transition-colors", tab === t ? "text-primary" : "text-white/40 group-hover:text-white/70")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Car body */}
                  <rect x="1" y="26" width="62" height="13" rx="2" />
                  {/* Car roof */}
                  <path d="M10 26 L19 14 L48 14 L56 26" />
                  {/* Rear window */}
                  <rect x="20" y="15" width="11" height="10" rx="1" />
                  {/* Front window */}
                  <rect x="33" y="15" width="12" height="10" rx="1" />
                  {/* Driver head — filled silhouette in rear window */}
                  <circle cx="25.5" cy="19.5" r="3.2" fill="currentColor" stroke="none" />
                  {/* Door line */}
                  <line x1="32" y1="26" x2="32" y2="39" strokeWidth="1.5" />
                  {/* Wheels */}
                  <circle cx="15" cy="40" r="4.5" strokeWidth="1.8" />
                  <circle cx="49" cy="40" r="4.5" strokeWidth="1.8" />
                </svg>
              )}
              <span className={cn("font-black text-xs tracking-widest transition-colors", tab === t ? "text-primary" : "text-white/50 group-hover:text-white/80")}>
                {t === "pumpa" ? "PUMPA" : t === "mix" ? "MIX" : "VL. DOPRAVA"}
              </span>
              <span className={cn("text-[10px] font-medium transition-colors text-center px-1", tab === t ? "text-white/70" : "text-white/30 group-hover:text-white/50")}>
                {t === "pumpa" ? `Pumpa ${pumpCap}m³ · 28m` : t === "mix" ? `Domiešavač ${mixCap}m³` : "Vlastná doprava"}
              </span>
            </button>
          ))}
        </div>

        {/* Two-column layout: form | result */}
        <div className="md:grid md:grid-cols-[3fr_2fr] md:divide-x md:divide-white/10">

        {/* LEFT: Form */}
        <div className="p-6 space-y-5">

          {/* Mobile-only collapsible info — nad login bar, skryté na md+ aj po vypočítaní */}
          <div className={cn("md:hidden -mt-1", showResult && "hidden")}>
            <button
              onClick={() => setTabInfoOpen(o => !o)}
              className={cn("w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                tabInfoOpen
                  ? "bg-primary/10 border border-primary/20 rounded-t-lg"
                  : "bg-primary/10 border border-primary/20 rounded-lg"
              )}
            >
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-white/80 flex-1">
                {tab === "pumpa" ? `Pumpa ${pumpCap}m³ · 28m rameno` : tab === "mix" ? `Domiešavač ${mixCap}m³` : "Vlastná doprava"}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-white/40 transition-transform duration-150", tabInfoOpen && "rotate-180")} />
            </button>
            {tabInfoOpen && (
              <div className="bg-primary/5 border border-primary/10 border-t-0 rounded-b-lg px-3 pb-2.5 pt-1.5">
                <p className="text-xs text-white/60 leading-relaxed">
                  {tab === "pumpa" && `Prvé auto ${pumpCap}m³, každé ďalšie ${mixCap}m³ (domiešavač). Čerpanie od príjazdu na stavbu.`}
                  {tab === "mix" && `Prvých 30 min čakania bez poplatku. Čakanie každých začatých 15 min. Kapacita ${mixCap}m³.`}
                  {tab === "vlastnadoprava" && "Zákazník si betón vyzdvihne vlastným vozidlom na prevádzke. Doprava sa nepočíta."}
                </p>
              </div>
            )}
          </div>

          {/* Client login bar */}
          <div className="py-2 border-b border-white/10">
            {loggedClient ? (
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="hidden sm:inline text-white/60 text-xs shrink-0">Prihlásený:</span>
                    <span className="text-white text-sm font-semibold truncate min-w-0">{loggedClient.name}</span>
                    {hasDiscount && (
                      <span className="shrink-0 px-1.5 py-0.5 bg-primary text-secondary text-xs font-black rounded-sm tracking-wide">
                        Zľava
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowPriceTable(!showPriceTable)}
                      className={cn(
                        "flex items-center gap-1 text-xs transition-colors cursor-pointer",
                        showPriceTable ? "text-primary" : "text-white/40 hover:text-primary"
                      )}
                      title="Zľavové tabuľky klienta"
                    >
                      <Table2 className="w-5 h-5" />
                      <span className="hidden sm:inline whitespace-nowrap">Moje ceny</span>
                    </button>
                    {!clientOverride && (
                      <button onClick={handleLogout} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors cursor-pointer border border-white/15 rounded px-2.5 py-1.5">
                        <LogOut className="w-5 h-5" /><span className="whitespace-nowrap hidden sm:inline">Odhlásiť</span>
                      </button>
                    )}
                    {(quantity || distance || address || categoryName || extraItems.length > 0 || showResult) && (
                      <button onClick={resetForm} title="Vymazať všetky údaje"
                        className="flex items-center text-white/20 hover:text-red-400 transition-colors cursor-pointer p-1.5 rounded hover:bg-white/5 border border-white/10 hover:border-red-400/30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {showPriceTable && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                      <PriceModeToggle
                        mode={priceTableMode}
                        onChange={setPriceTableMode}
                        showHotovost={!!(loggedClient?.canHotovost)}
                        size="sm"
                        className="mb-2"
                      />
                      <ClientPriceTable
                        discountBeton={discountBeton}
                        discountDoprava={discountDoprava}
                        discountSluzby={discountSluzby}
                        discountCelkovo={discountCelkovo}
                        manualPrices={loggedClient?.manualPrices}
                        priceMode={priceTableMode}
                        hotovostDph={VAT_HOTOVOST}
                        deliveryZoneId={loggedClient?.deliveryZoneId}
                        variant="dark"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              !clientOverride ? (
              <div className="w-full">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => setShowLoginForm(!showLoginForm)}
                    className="flex items-center gap-2 text-white/50 hover:text-primary text-xs transition-colors cursor-pointer">
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Prihlásiť sa ako klient (zľavové ceny)</span>
                  </button>
                  {(quantity || distance || address || categoryName || extraItems.length > 0 || showResult) && (
                    <button onClick={resetForm} title="Vymazať všetky údaje"
                      className="flex items-center text-white/20 hover:text-red-400 transition-colors cursor-pointer p-1.5 rounded hover:bg-white/5 border border-white/10 hover:border-red-400/30 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {showLoginForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="ID klienta"
                          className="bg-white/10 border-b-2 border-b-primary/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-b-primary placeholder:text-white/30 rounded-sm" />
                        <input type="password" value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} placeholder="Heslo"
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          className="bg-white/10 border-b-2 border-b-primary/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-b-primary placeholder:text-white/30 rounded-sm" />
                      </div>
                      {loginErr && <p className="text-red-400 text-xs">{loginErr}</p>}
                      <button onClick={handleLogin} disabled={loginLoading}
                        className="w-full py-2 bg-primary/20 border border-primary text-primary text-xs font-bold tracking-widest hover:bg-primary hover:text-white transition-all cursor-pointer disabled:opacity-50">
                        {loginLoading ? "Prihlasovanie..." : "PRIHLÁSIŤ SA"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              ) : null
            )}
          </div>

          {/* Delivery */}
          {tab !== "vlastnadoprava" && <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/80">Adresa doručenia</label>
            {deliveryMode === "distance" ? (
              <input type="number" min="0" step="0.1" value={distance}
                onChange={(e) => { setDistance(e.target.value); setShowResult(false); }}
                onWheel={(e) => e.currentTarget.blur()}
                enterKeyHint="go"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const hasQty = parseFloat(quantity) > 0 && selectedType != null;
                    const hasKm = tab === "vlastnadoprava" || parseFloat(e.currentTarget.value) > 0 || addressKm !== null;
                    if (hasQty && hasKm) setShowResult(true);
                  }
                }}
                placeholder="Zadajte vzdialenosť v km"
                className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm" />
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    ref={addressInputRef}
                    type="text"
                    defaultValue={address}
                    onChange={(e) => { setAddress(e.target.value); setAddressKm(null); setShowResult(false); }}
                    placeholder="Zadajte adresu stavby"
                    className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm" />
                  {addressLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">Vypočítavam...</span>}
                </div>
                {addressKm !== null && (
                  <p className="text-xs text-white/50 px-1">
                    Vzdialenosť: {addressKm.toFixed(2)} km × 2 + 2 km rezerva = <strong className="text-primary">{distance} km</strong> (pre výpočet dopravy)
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center gap-6 pt-1">
              {(["distance", "address"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setDeliveryMode(m)}
                    className={cn("w-4 h-4 border-2 flex items-center justify-center transition-all flex-shrink-0",
                      deliveryMode === m ? "bg-primary border-primary" : "bg-white/10 border-white/30")}>
                    {deliveryMode === m && <span className="text-white text-[9px] font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-white/70">{m === "distance" ? "Vzdialenosť" : "Adresa"}</span>
                </label>
              ))}
            </div>
          </div>}

          {/* Category */}
          <SelectField
            label="Kategória betónu"
            value={selectedCategory?.name ?? ""}
            onChange={handleCategoryChange}
            options={allCategories.map((c) => c.name)}
          />

          {/* Type */}
          <TypeSelectField
            label="Typ betónu"
            value={selectedType?.label ?? ""}
            onChange={(v) => { setConcreteTypeLabel(v); setShowResult(false); }}
            options={typesForCategory}
            discountFactor={betonFactor}
            manualPrices={loggedClient?.manualPrices}
          />

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">Množstvo betónu (m³)</label>
            <input type="number" min="0" step="0.5" value={quantity} inputMode="decimal"
              onChange={(e) => { setQuantity(e.target.value); setShowResult(false); }}
              onWheel={(e) => e.currentTarget.blur()}
              enterKeyHint="go"
              onKeyDown={(e) => {
                if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                if (e.key === "Enter") {
                  e.preventDefault();
                  const hasQty = parseFloat(quantity) > 0 && selectedType != null;
                  const hasKm = tab === "vlastnadoprava" || parseFloat(distance) > 0 || addressKm !== null;
                  if (hasQty && hasKm) setShowResult(true);
                }
              }}
              placeholder="Zadajte množstvo"
              className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm" />
          </div>

          {/* Extra Items (Pridať položku) */}
          {extraItems.map((item, idx) => {
            const itemCat = allCategories.find((c) => c.name === item.categoryName)
              ?? allCategories.find((c) => c.name.toUpperCase().includes("DMAX16") && c.name.toUpperCase().includes("DRVENÉ"))
              ?? allCategories[0];
            const itemTypes = itemCat?.types ?? [];
            const itemType = itemTypes.find((t) => t.label === item.typeLabel)
              ?? itemTypes.find((t) => t.label.includes("C16/20"))
              ?? itemTypes[0];
            return (
              <div key={item.id} className={cn("border rounded-lg p-4 space-y-3", showResult && !item.quantity ? "border-red-400/60 bg-red-500/5" : "border-primary/25 bg-primary/5")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-primary/70 uppercase tracking-widest">
                      Položka {idx + 1}
                    </span>
                    {showResult && !item.quantity && (
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">— nie je zahrnutá</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setExtraItems(extraItems.filter((i) => i.id !== item.id)); setShowResult(false); }}
                    className="text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <SelectField
                  label="Kategória betónu"
                  value={itemCat?.name ?? ""}
                  onChange={(v) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, categoryName: v, typeLabel: null } : i)); setShowResult(false); }}
                  options={allCategories.map((c) => c.name)}
                />
                <TypeSelectField
                  label="Typ betónu"
                  value={itemType?.label ?? ""}
                  onChange={(v) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, typeLabel: v } : i)); setShowResult(false); }}
                  options={itemTypes}
                  discountFactor={betonFactor}
                  manualPrices={loggedClient?.manualPrices}
                />
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Množstvo betónu (m³)</label>
                  <input
                    type="number" min="0" step="0.5" value={item.quantity} inputMode="decimal"
                    onChange={(e) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, quantity: e.target.value } : i)); setShowResult(false); }}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }}
                    placeholder="Zadajte množstvo"
                    className={cn("w-full bg-white/10 border-b-2 text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm",
                      showResult && !item.quantity ? "border-b-red-400" : "border-b-primary"
                    )}
                  />
                  {showResult && !item.quantity && (
                    <p className="text-[11px] text-red-400 mt-1">Bez množstva – položka nie je zahrnutá vo výpočte</p>
                  )}
                </div>
                {tab !== "vlastnadoprava" && (
                  <div>
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">Doprava</label>
                    <div className="flex bg-white/8 rounded-lg p-0.5 gap-0.5 border border-white/10 w-fit">
                      <button type="button"
                        onClick={() => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, transportMode: "own" } : i)); setShowResult(false); }}
                        className={cn("px-3 py-1.5 rounded-md text-xs font-black tracking-wide transition-all flex items-center gap-1",
                          (!item.transportMode || item.transportMode === "own") ? "bg-primary text-navy shadow-sm" : "text-white/40 hover:text-white/70"
                        )}>
                        <Truck className="w-3 h-3" /> Započítať
                      </button>
                      <button type="button"
                        onClick={() => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, transportMode: "addToMain" } : i)); setShowResult(false); }}
                        className={cn("px-3 py-1.5 rounded-md text-xs font-black tracking-wide transition-all flex items-center gap-1",
                          item.transportMode === "addToMain" ? "bg-blue-500/80 text-white shadow-sm" : "text-white/40 hover:text-white/70"
                        )}>
                        <Plus className="w-3 h-3" /> K hlavnej
                      </button>
                      <button type="button"
                        onClick={() => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, transportMode: "none" } : i)); setShowResult(false); }}
                        className={cn("px-3 py-1.5 rounded-md text-xs font-black tracking-wide transition-all",
                          item.transportMode === "none" ? "bg-white/20 text-white shadow-sm" : "text-white/40 hover:text-white/70"
                        )}>
                        Bez dopravy
                      </button>
                    </div>
                    {(!item.transportMode || item.transportMode === "own") && (
                      <p className="text-[10px] text-white/35 mt-1">Vlastná doprava — táto položka má vlastný výpočet km/vzdialenosti.</p>
                    )}
                    {item.transportMode === "addToMain" && item.quantity && (
                      <p className="text-[10px] text-blue-400/80 mt-1">+{item.quantity} m³ sa pripočíta k mn. hlavnej položky pri výpočte dopravy.</p>
                    )}
                    {item.transportMode === "none" && (
                      <p className="text-[10px] text-white/35 mt-1">Bez dopravy — táto položka nebude mať dopravu.</p>
                    )}
                  </div>
                )}
                {/* + Pridať Služby per extra item */}
                {!item.svc && tab !== "vlastnadoprava" && (
                  <button type="button"
                    onClick={() => {
                      const defaults: ExtraItemServices = { pumpHour: "1 h", pumpMin: "0 min", waitPiecesPumpa: 0, hoseMeters: 0, washing: false, waitHour: "0 h", waitMin: "0 min" };
                      setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: defaults, showSvc: true } : i));
                      setShowResult(false);
                    }}
                    className="w-full py-2 border border-dashed border-primary/30 text-primary/50 hover:border-primary hover:text-primary transition-all text-xs font-semibold cursor-pointer rounded-sm">
                    + Pridať Služby ({tab === "pumpa" ? "čerpanie, hadice, čakačky" : "čakačky"})
                  </button>
                )}
                {item.svc && (
                  <div className="border border-primary/20 rounded-lg p-3 space-y-3 bg-primary/3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">
                        Služby – {tab === "pumpa" ? "Pumpa" : "Mix"}
                      </span>
                      <button type="button"
                        onClick={() => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: undefined } : i)); setShowResult(false); }}
                        className="text-white/20 hover:text-red-400 transition-colors cursor-pointer text-[10px]">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {tab === "pumpa" && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <SelectField label="Čerpanie h" value={item.svc.pumpHour} onChange={(v) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: { ...i.svc!, pumpHour: v } } : i)); setShowResult(false); }} options={PUMP_HOURS} />
                          <SelectField label="Čerpanie min" value={item.svc.pumpMin} onChange={(v) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: { ...i.svc!, pumpMin: v } } : i)); setShowResult(false); }} options={PUMP_MINS} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="border border-white/10 rounded-lg p-2 bg-white/5">
                            <div className="text-[10px] font-semibold text-white/60 mb-1">Čakačky (ks)</div>
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: { ...i.svc!, waitPiecesPumpa: Math.max(0, i.svc!.waitPiecesPumpa - 1) } } : i)); setShowResult(false); }}
                                className="w-6 h-6 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer text-sm font-bold">−</button>
                              <span className={cn("flex-1 text-center text-base font-black", item.svc.waitPiecesPumpa > 0 ? "text-primary" : "text-white/30")}>{item.svc.waitPiecesPumpa}</span>
                              <button type="button" onClick={() => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: { ...i.svc!, waitPiecesPumpa: i.svc!.waitPiecesPumpa + 1 } } : i)); setShowResult(false); }}
                                className="w-6 h-6 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer text-sm font-bold">+</button>
                            </div>
                          </div>
                          <div className="border border-white/10 rounded-lg p-2 bg-white/5">
                            <div className="text-[10px] font-semibold text-white/60 mb-1">Hadice (m)</div>
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: { ...i.svc!, hoseMeters: Math.max(0, i.svc!.hoseMeters - 1) } } : i)); setShowResult(false); }}
                                className="w-6 h-6 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer flex-shrink-0"><Minus className="w-3 h-3" /></button>
                              <span className={cn("flex-1 text-center text-base font-black", item.svc.hoseMeters > 0 ? "text-primary" : "text-white/30")}>{item.svc.hoseMeters > 0 ? item.svc.hoseMeters : "—"}</span>
                              <button type="button" onClick={() => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: { ...i.svc!, hoseMeters: Math.min(hoseMaxMeters, i.svc!.hoseMeters + 1) } } : i)); setShowResult(false); }}
                                className="w-6 h-6 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer flex-shrink-0"><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={item.svc.washing}
                            onChange={(e) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: { ...i.svc!, washing: e.target.checked } } : i)); setShowResult(false); }}
                            className="w-4 h-4 accent-primary cursor-pointer" />
                          <span className={cn("text-xs transition-colors", item.svc.washing ? "text-primary font-semibold" : "text-white/50 group-hover:text-white/70")}>Umývanie mimo stavby</span>
                        </label>
                      </>
                    )}
                    {tab === "mix" && (
                      <div className="grid grid-cols-2 gap-2">
                        <SelectField label="Čakačky h" value={item.svc.waitHour} onChange={(v) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: { ...i.svc!, waitHour: v } } : i)); setShowResult(false); }} options={WAIT_HOURS} />
                        <SelectField label="Čakačky min" value={item.svc.waitMin} onChange={(v) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: { ...i.svc!, waitMin: v } } : i)); setShowResult(false); }} options={WAIT_MINS} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pridať položku button — iba pre klientov s canPridatBeton, nie pre vlastnadoprava */}
          {loggedClient?.canPridatBeton && tab !== "vlastnadoprava" && (
            <button
              type="button"
              onClick={() => {
                setExtraItems([...extraItems, { id: Date.now().toString(), categoryName: null, typeLabel: null, quantity: "" }]);
                setShowResult(false);
              }}
              className="w-full py-2.5 border border-dashed border-primary/40 text-primary/60 hover:border-primary hover:text-primary transition-all text-sm font-semibold tracking-wide cursor-pointer rounded-sm"
            >
              + Pridať položku
            </button>
          )}

          {/* Zimné opatrenia — zobraz len v aktívnom období alebo pre klientov s povolením */}
          {showZimneOpatrenia && (
            <div className={cn("border rounded-lg px-4 py-3 transition-all", zimneOpatrenia ? "border-blue-400/40 bg-blue-400/5" : "border-white/10 bg-white/5")}>
              <label className="flex items-center gap-3 cursor-pointer group" onClick={() => { setZimneOpatrenia(!zimneOpatrenia); setShowResult(false); }}>
                <div className={cn("w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0",
                  zimneOpatrenia ? "bg-blue-400 border-blue-400" : "bg-white/10 border-white/30 group-hover:border-blue-300/50")}>
                  {zimneOpatrenia && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-white">Zimné opatrenia</span>
                  <span className="ml-2 text-xs text-white/40">
                    {betonFactor < 1 && <s className="text-white/25 mr-1">{zimneServicePrice.toFixed(2)}</s>}
                    +{(zimneServicePrice * betonFactor).toFixed(2)} €/m³
                  </span>
                </div>
                {isZimneActive && (
                  <span className="text-[10px] font-bold text-blue-300 bg-blue-400/15 px-2 py-0.5 rounded tracking-wide">ZIMNÁ SEZÓNA</span>
                )}
              </label>
              {zimneOpatrenia && parseFloat(quantity) > 0 && (
                <p className="text-xs text-blue-300/70 mt-2 ml-8">
                  {parseFloat(quantity)} m³ betónu × {(zimneServicePrice * betonFactor).toFixed(2)} € = <span className="font-semibold text-blue-300">{(parseFloat(quantity) * zimneServicePrice * betonFactor).toFixed(2)} € bez DPH</span>
                </p>
              )}
            </div>
          )}

          {/* PUMPA extras */}
          {tab === "pumpa" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Čerpanie v /h" value={pumpHour} onChange={(v) => { setPumpHour(v); setShowResult(false); }} options={PUMP_HOURS} />
                <SelectField label="Čerpanie v /min" value={pumpMin} onChange={(v) => { setPumpMin(v); setShowResult(false); }} options={PUMP_MINS} />
              </div>

              {/* Čakačky + Hadice — kompaktný 2-stĺpcový grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Čakačky */}
                <div className="border border-white/10 rounded-lg p-3 bg-white/5">
                  <div className="text-xs font-semibold text-white/70 mb-0.5">Čakačky</div>
                  <div className="text-[10px] text-white/35 mb-2 min-h-[2rem] flex items-start">
                    {sluzbyFactor < 1 && <s className="text-white/20 mr-1">{waitServicePricePumpa.toFixed(2)}</s>}
                    {(waitServicePricePumpa * sluzbyFactor).toFixed(2)} €/15 min
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => { setWaitPiecesPumpa(Math.max(0, waitPiecesPumpa - 1)); setShowResult(false); }}
                      className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer text-base font-bold flex-shrink-0">
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <span className={cn("text-xl font-black", waitPiecesPumpa > 0 ? "text-primary" : "text-white/30")}>
                        {waitPiecesPumpa}
                      </span>
                      <span className="text-[10px] text-white/35 ml-0.5">ks</span>
                    </div>
                    <button type="button"
                      onClick={() => { setWaitPiecesPumpa(waitPiecesPumpa + 1); setShowResult(false); }}
                      className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer text-base font-bold flex-shrink-0">
                      +
                    </button>
                  </div>
                  {waitPiecesPumpa > 0 && (
                    <p className="text-[10px] text-primary mt-1.5 text-center font-semibold">{(waitPiecesPumpa * waitServicePricePumpa * sluzbyFactor).toFixed(2)} €</p>
                  )}
                </div>

                {/* Prídavné hadice */}
                <div className="border border-white/10 rounded-lg p-3 bg-white/5">
                  <div className="text-xs font-semibold text-white/70 mb-0.5">Prídavné hadice</div>
                  <div className="text-[10px] text-white/35 mb-2 min-h-[2rem] flex items-start">bm · max {hoseMaxMeters} m</div>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => { setHoseMeters(Math.max(0, hoseMeters - 1)); setShowResult(false); }}
                      className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer flex-shrink-0">
                      <Minus className="w-3 h-3" />
                    </button>
                    <div className="flex-1 text-center">
                      <span className={cn("text-xl font-black", hoseMeters > 0 ? "text-primary" : "text-white/30")}>
                        {hoseMeters > 0 ? hoseMeters : "—"}
                      </span>
                      {hoseMeters > 0 && <span className="text-[10px] text-white/35 ml-0.5">m</span>}
                    </div>
                    <button type="button"
                      onClick={() => { setHoseMeters(Math.min(hoseMaxMeters, hoseMeters + 1)); setShowResult(false); }}
                      className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer flex-shrink-0">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  {hoseMeters > 0 && (
                    <input type="range" min="1" max={hoseMaxMeters} value={hoseMeters}
                      onChange={(e) => { setHoseMeters(parseInt(e.target.value)); setShowResult(false); }}
                      className="w-full accent-primary cursor-pointer mt-2" />
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <CheckboxField label="Umývanie mimo stavby" checked={washing} onChange={(v) => { setWashing(v); setShowResult(false); }} />
              </div>
            </>
          )}

          {/* MIX čakačka */}
          {tab === "mix" && (
            <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/80">
                  Čakačky
                  <span className="ml-2 text-xs font-normal text-white/40">
                    {sluzbyFactor < 1 && <s className="text-white/20 mr-1">{waitServicePriceMix.toFixed(2)}</s>}
                    {(waitServicePriceMix * sluzbyFactor).toFixed(2)} € / 15 min
                  </span>
                </span>
                {(parseInt(waitHour) > 0 || parseInt(waitMin) > 0) && (
                  <span className="text-xs text-primary font-bold">
                    {[parseInt(waitHour) > 0 ? `${parseInt(waitHour)} h` : "", parseInt(waitMin) > 0 ? `${parseInt(waitMin)} min` : ""].filter(Boolean).join(" ")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Hodiny čakania" value={waitHour} onChange={(v) => { setWaitHour(v); setShowResult(false); }} options={WAIT_HOURS} />
                <SelectField label="Minúty čakania" value={waitMin} onChange={(v) => { setWaitMin(v); setShowResult(false); }} options={WAIT_MINS} />
              </div>
              {waitTotalMins > 0 && waitTotalMins <= 30 && (
                <p className="text-xs text-green-400/80 flex items-center gap-1.5 mt-0.5">
                  <span className="text-green-400 font-bold">✓</span>
                  Prvých 30 min zadarmo – táto doba sa neúčtuje
                </p>
              )}
            </div>
          )}

          {/* Calculate button */}
          {(() => {
            const hasQty = parseFloat(quantity) > 0 && selectedType != null;
            const hasKm = tab === "vlastnadoprava" || parseFloat(distance) > 0 || addressKm !== null;
            const canCalc = hasQty && hasKm;
            return (
              <div className="space-y-1 mt-2">
                <button onClick={() => { if (canCalc) setShowResult(true); }} disabled={!canCalc}
                  className={cn("w-full py-4 border-2 font-bold text-base tracking-widest transition-all duration-200",
                    canCalc
                      ? "bg-transparent border-primary text-primary hover:bg-primary hover:text-white cursor-pointer"
                      : "border-white/20 text-white/25 cursor-not-allowed"
                  )}>
                  VYPOČÍTAŤ CENU
                </button>
                {hasQty && !hasKm && (
                  <p className="text-center text-xs text-primary/60">Zadajte vzdialenosť v km alebo adresu</p>
                )}
                {!hasQty && (
                  <p className="text-center text-xs text-white/30">Zadajte množstvo betónu</p>
                )}
              </div>
            );
          })()}
        </div>

        {/* RIGHT: Result */}
        <div ref={resultRef} className={cn("p-6", !showResult && "hidden md:flex md:items-center md:justify-center")}>
          {showResult && result && displayItems && origDisplayItems ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/30 overflow-hidden md:rounded-xl">

              {/* HOTOVOSŤ / FAKTÚRA tabs */}
              {(() => {
                const showHotovost = !!(loggedClient && (loggedClient.canHotovost ?? true));
                const modes = showHotovost ? (["faktura", "hotovost"] as PriceMode[]) : (["faktura"] as PriceMode[]);
                return (
                  <>
                    <div className={cn("grid border-b border-primary/30", modes.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                      {modes.map((mode) => (
                        <button key={mode} onClick={() => setPriceMode(mode)}
                          className={cn("py-3 text-sm font-black tracking-widest transition-all cursor-pointer",
                            priceMode === mode ? "bg-primary text-secondary" : "bg-white/5 text-white/50 hover:text-white/80"
                          )}>
                          {mode === "hotovost" ? "HOTOVOSŤ" : "FAKTÚRA"}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}

              <div className="p-5 space-y-4 bg-white/5">

                {/* Vlastná doprava note */}
                {result.isOwn && (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded px-3 py-2">
                    <Truck className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-white/70">Vlastná doprava – zákazník zabezpečuje dopravu vlastným vozidlom</span>
                  </div>
                )}

                {/* Klient + zľavy */}
                {loggedClient && (
                  <div className="bg-primary/8 border border-primary/20 rounded px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-primary/70 font-black text-[10px] uppercase tracking-widest shrink-0">Vaše zľavy</span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/55 font-semibold truncate">{loggedClient.name}</span>
                      <span className="ml-auto text-[9px] text-white/25 shrink-0">ID: {loggedClient.clientId}</span>
                    </div>
                    {hasDiscount ? (
                      <div className="flex flex-wrap gap-1">
                        {discountBeton   > 0 && <span className="bg-primary/15 text-primary font-black px-1.5 py-0.5 rounded-sm text-[10px]">Betón −{discountBeton}%</span>}
                        {discountDoprava > 0 && <span className="bg-primary/15 text-primary font-black px-1.5 py-0.5 rounded-sm text-[10px]">Doprava −{discountDoprava}%</span>}
                        {discountSluzby  > 0 && <span className="bg-primary/15 text-primary font-black px-1.5 py-0.5 rounded-sm text-[10px]">Služby −{discountSluzby}%</span>}
                        {discountCelkovo > 0 && <span className="bg-primary/15 text-primary font-black px-1.5 py-0.5 rounded-sm text-[10px]">Celkovo −{discountCelkovo}%</span>}
                      </div>
                    ) : (
                      <span className="text-white/25 text-[10px]">Žiadna zľava</span>
                    )}
                    {clientDeliveryZone && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-primary/50 uppercase tracking-widest shrink-0">Typ dopravy</span>
                        <span className="text-white/20 text-[10px]">·</span>
                        <span className="text-[10px] font-semibold text-white/45">{clientDeliveryZone.name}</span>
                        {clientDeliveryZone.pricingType && clientDeliveryZone.pricingType !== "standard" && (
                          <span className="text-[9px] font-black text-primary/60 bg-primary/10 px-1 py-0.5 rounded-sm uppercase">
                            {clientDeliveryZone.pricingType === "km" ? "€/km" : "€/auto"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Produkty: betón → doprava → doťaženie → služby (per každý item) */}
                {(() => {
                  const trucksLabel = tab === "pumpa"
                    ? `1×Pumpa${result.mixTrucksCount > 0 ? `+${result.mixTrucksCount}×Mix` : ""}`
                    : `${result.trucks}×Mix`;
                  const zoneStr = result.transportZone
                    ? `${result.transportZone.fromKm}–${result.transportZone.toKm}km`
                    : "";
                  const prefix = result.transportIsMin ? "Min. doprava" : "Doprava";

                  const pType = clientDeliveryZone?.pricingType ?? "standard";
                  const minFee = tsettings.minimumFee ?? 62.50;
                  const fmtR = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
                  const addToMainQtyDisplay = extraItems.reduce((s, i) => {
                    const q = parseFloat(i.quantity) || 0;
                    return (q > 0 && i.transportMode === "addToMain") ? s + q : s;
                  }, 0);
                  const transportFormula = (ci: typeof result.concreteBreakdown[0], extraQ = 0) => {
                    if (result.isOwn) return null;
                    const trucks = ci.transportTrucks;
                    const autaLabel = trucks === 1 ? "auto" : "autá";
                    if (pType === "km") {
                      const mp2 = loggedClient?.manualPrices ?? {};
                      const baseKmRate = clientDeliveryZone?.ratePerKm ?? 1.8;
                      const rate = (mp2[`km_rate_${clientDeliveryZone?.id}`] ?? baseKmRate) * result.fTransport;
                      const distKm = parseFloat(distance) || 0;
                      const kmMinDist = clientDeliveryZone?.minKm ?? 0;
                      const effectiveKm = Math.max(distKm, kmMinDist);
                      const kmMinFee = clientDeliveryZone?.minimumFeeKm;
                      if (ci.transportIsMin && kmMinFee) return `min. poplatok ${fmtR(kmMinFee * result.fTransport)} €/auto × ${trucks} ${autaLabel}`;
                      const kmLabel = effectiveKm !== distKm ? `${distKm}→${effectiveKm} km` : `${distKm} km`;
                      return `${kmLabel} × ${fmtR(rate)} €/km × ${trucks} ${autaLabel}`;
                    }
                    if (ci.transportIsMin) {
                      const mpStd2 = loggedClient?.manualPrices ?? {};
                      const effMinFee = mpStd2["min_fee"] !== undefined ? mpStd2["min_fee"] : minFee;
                      return `min. sadzba ${fmtR(effMinFee * result.fTransport)} €/auto × ${trucks} ${autaLabel}`;
                    }
                    if (pType === "auto") {
                      const mpAuto = loggedClient?.manualPrices ?? {};
                      const baseAutoRate = clientDeliveryZone?.ratePerTruck ?? 0;
                      const autoRate = mpAuto[`auto_rate_${clientDeliveryZone?.id}`] ?? baseAutoRate;
                      const autoMinFee = clientDeliveryZone?.minimumFeeAuto;
                      if (ci.transportIsMin && autoMinFee) return `min. poplatok ${fmtR(autoMinFee * result.fTransport)} €/auto × ${trucks} ${autaLabel}`;
                      return `${trucks} ${autaLabel} × ${fmtR(autoRate * result.fTransport)} €/auto`;
                    }
                    const mpStd3 = loggedClient?.manualPrices ?? {};
                    const baseStdRate = result.transportZone?.ratePerM3 ?? 0;
                    const rate = (mpStd3[result.transportZone?.id ?? ""] !== undefined ? mpStd3[result.transportZone!.id] : baseStdRate) * result.fTransport;
                    const qtyStr = extraQ > 0 ? `${ci.qty}+${fmtR(extraQ)}` : `${ci.qty}`;
                    return `${qtyStr} m³ × ${fmtR(rate)} €/m³`;
                  };

                  const mainPumpBase = tab === "pumpa" ? (result.pumpHrs + result.pumpMs / 60) * pumpServicePrice : 0;
                  const mainHoseBase = tab === "pumpa" && hoseMeters > 0 ? hoseMeters * hoseServicePrice : 0;
                  const mainWashBase = tab === "pumpa" && washing ? washServicePrice : 0;
                  const mainChemBase = tab === "pumpa" ? chemServicePrice : 0;
                  const mainWaitBase = tab === "pumpa"
                    ? result.waitIntervals * waitServicePricePumpa
                    : (tab === "mix" ? result.waitIntervals * waitServicePriceMix : 0);
                  const mainHasServices = (mainPumpBase + mainHoseBase + mainWashBase + mainChemBase + mainWaitBase) > 0;

                  const SvcBlock = ({ label }: { label: string }) => (
                    <div className="text-[9px] font-black text-primary/50 uppercase tracking-widest mb-0.5 mt-1.5">{label}</div>
                  );

                  return (
                    <div>
                      <h4 className="text-primary font-bold text-xs uppercase tracking-widest mb-2">Produkty</h4>
                      {result.concreteBreakdown.map((ci, idx) => {
                        const origVal = isFaktura ? ci.bezDph : ci.bezDph * (1 + VAT_HOTOVOST);
                        const discVal = isFaktura ? ci.bezDphFinal : ci.bezDphFinalHotovost;
                        const isExtra = idx > 0;
                        const isAddToMain = isExtra && extraItems[idx - 1]?.transportMode === "addToMain";
                        const itemHasSvc = idx === 0
                          ? mainHasServices
                          : (ci.svcPumpCost > 0 || ci.svcHoseCost > 0 || ci.svcWashCost > 0 || ci.svcWaitCost > 0);

                        return (
                          <div key={idx} className={cn(isExtra ? "mt-3 pt-2.5 border-t border-white/10" : "")}>
                            {isExtra && (
                              <div className="text-[10px] text-primary/60 font-black uppercase tracking-wider mb-1">
                                Pridaná položka {idx}
                              </div>
                            )}
                            <PriceRow label={ci.label} original={origVal} discounted={discVal} hasDiscount={Math.abs(origVal - discVal) > 0.001} />

                            {/* Doprava pre tento item */}
                            {!result.isOwn && ci.transport > 0 && (
                              <PriceRow
                                label={
                                  <span>
                                    {ci.transportIsMin
                                      ? <span>Min. doprava – <strong>{ci.transportTrucks}x auto</strong></span>
                                      : idx === 0
                                        ? <span>{prefix}{zoneStr ? ` ${zoneStr}` : ""} · <strong>{trucksLabel}</strong>
                                            {addToMainQtyDisplay > 0
                                              ? <> · {ci.qty}+{fmtR(addToMainQtyDisplay)}&thinsp;m³</>
                                              : <> · {ci.qty}&thinsp;m³</>}
                                          </span>
                                        : <span>Doprava · {ci.qty}&thinsp;m³</span>}
                                    {transportFormula(ci, idx === 0 ? addToMainQtyDisplay : 0) && (
                                      <span className="text-[10px] text-white/35 block mt-0.5">{transportFormula(ci, idx === 0 ? addToMainQtyDisplay : 0)}</span>
                                    )}
                                  </span>
                                }
                                original={ci.transport} discounted={ci.transport * result.fTransport} hasDiscount={hasDiscount} />
                            )}
                            {isAddToMain && (
                              <div className="text-[10px] text-blue-400/70 ml-1 mt-0.5">↑ doprava zahrnutá v Položke 1 (+{ci.qty}&thinsp;m³)</div>
                            )}
                            {!result.isOwn && idx === 0 && (pType === "km" || pType === "auto") && (() => {
                              const distKm = parseFloat(distance) || 0;
                              const notes: React.ReactNode[] = [];
                              if (pType === "km") {
                                const minDist = clientDeliveryZone?.minKm ?? 0;
                                const maxDist = clientDeliveryZone?.maxKm ?? 0;
                                const kmMinFee = clientDeliveryZone?.minimumFeeKm;
                                if (minDist > 0 && distKm < minDist)
                                  notes.push(<div key="minKm" className="text-[10px] text-amber-400/80 ml-1 mt-0.5">⚠ Vzdialenosť zaokrúhlená na min. {minDist} km</div>);
                                if (kmMinFee && ci.transportIsMin)
                                  notes.push(<div key="minFee" className="text-[10px] text-amber-400/80 ml-1 mt-0.5">⚠ Aplikovaný min. poplatok {fmtR(kmMinFee * result.fTransport)} €/auto</div>);
                                if (maxDist > 0 && distKm > maxDist)
                                  notes.push(<div key="maxKm" className="text-[10px] text-red-400/80 ml-1 mt-0.5">⚠ Vzdialenosť nad max. polomer obsluhy ({maxDist} km)</div>);
                              }
                              if (pType === "auto") {
                                const minT = clientDeliveryZone?.minTrucks ?? 0;
                                const maxT = clientDeliveryZone?.maxTrucks ?? 0;
                                const autoMinFee = clientDeliveryZone?.minimumFeeAuto;
                                if (minT > 0 && result.trucks < minT)
                                  notes.push(<div key="minT" className="text-[10px] text-amber-400/80 ml-1 mt-0.5">⚠ Počet áut pod min. {minT}</div>);
                                if (autoMinFee && ci.transportIsMin)
                                  notes.push(<div key="minFeeA" className="text-[10px] text-amber-400/80 ml-1 mt-0.5">⚠ Aplikovaný min. poplatok {fmtR(autoMinFee * result.fTransport)} €/auto</div>);
                                if (maxT > 0 && result.trucks > maxT)
                                  notes.push(<div key="maxT" className="text-[10px] text-red-400/80 ml-1 mt-0.5">⚠ Počet áut nad max. kapacitu obsluhy ({maxT})</div>);
                              }
                              return notes.length > 0 ? <>{notes}</> : null;
                            })()}
                            {ci.transportFillup > 0 && (
                              <PriceRow
                                label={`Doťaženie do ${ci.transportFillupTarget}m³ – ${ci.transportFillupM3}m³`}
                                original={ci.transportFillup} discounted={ci.transportFillup * result.fFillup} hasDiscount={hasDiscount} isFillup />
                            )}

                            {/* Služby pre tento item – vždy pod dopravou */}
                            {itemHasSvc && (
                              <div className="mt-1.5 pl-3 border-l-2 border-primary/20 space-y-0">
                                <SvcBlock label={tab === "pumpa" ? "Služby – Pumpa" : "Čakačky"} />
                                {idx === 0 ? (
                                  <>
                                    {mainPumpBase > 0 && <PriceRow label={`Čerpanie betónu – ${result.pumpHrs} h${result.pumpMs > 0 ? ` ${result.pumpMs} min` : ""}`}
                                      original={mainPumpBase} discounted={mainPumpBase * fPump} hasDiscount={hasDiscount} />}
                                    {mainChemBase > 0 && <PriceRow label="Rozbehová chémia"
                                      original={mainChemBase} discounted={mainChemBase * fChem} hasDiscount={hasDiscount} />}
                                    {mainHoseBase > 0 && <PriceRow label={`Prídavné hadice – ${hoseMeters} m`}
                                      original={mainHoseBase} discounted={mainHoseBase * fHose} hasDiscount={hasDiscount} />}
                                    {mainWashBase > 0 && <PriceRow label="Umývanie mimo stavby"
                                      original={mainWashBase} discounted={mainWashBase * fWash} hasDiscount={hasDiscount} />}
                                    {mainWaitBase > 0 && <PriceRow
                                      label={tab === "pumpa"
                                        ? `Čakačky – ${result.waitLabel}`
                                        : <span>Čas na stavbe – {result.waitLabel} <span className="text-[9px] text-white/35 font-normal">(prvých 30 min zadarmo)</span></span>}
                                      original={mainWaitBase} discounted={mainWaitBase * (tab === "pumpa" ? fWaitP : fWaitM)} hasDiscount={hasDiscount} />}
                                  </>
                                ) : (
                                  <>
                                    {ci.svcPumpCost > 0 && <PriceRow
                                      label={`Čerpanie betónu – ${ci.svcPumpHrs} h${ci.svcPumpMs > 0 ? ` ${ci.svcPumpMs} min` : ""}`}
                                      original={ci.svcPumpCost} discounted={ci.svcPumpCost * fPump} hasDiscount={hasDiscount} />}
                                    {ci.svcHoseCost > 0 && <PriceRow label={`Prídavné hadice – ${ci.svcHoseMeters} m`}
                                      original={ci.svcHoseCost} discounted={ci.svcHoseCost * fHose} hasDiscount={hasDiscount} />}
                                    {ci.svcWashCost > 0 && <PriceRow label="Umývanie mimo stavby"
                                      original={ci.svcWashCost} discounted={ci.svcWashCost * fWash} hasDiscount={hasDiscount} />}
                                    {ci.svcWaitCost > 0 && <PriceRow
                                      label={tab === "pumpa"
                                        ? `Čakačky – ${ci.svcWaitLabel}`
                                        : <span>Čas na stavbe – {ci.svcWaitLabel} <span className="text-[9px] text-white/35 font-normal">(prvých 30 min zadarmo)</span></span>}
                                      original={ci.svcWaitCost} discounted={ci.svcWaitCost * (tab === "pumpa" ? fWaitP : fWaitM)} hasDiscount={hasDiscount} />}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {displayItems.zimne > 0 && (
                        <PriceRow label={`Zimné opatrenia – ${result.totalQty} m³`}
                          original={origDisplayItems.zimne} discounted={displayItems.zimne} hasDiscount={hasDiscount} />
                      )}
                    </div>
                  );
                })()}

                {/* Total */}
                <div className="border-t border-white/20 pt-3 space-y-1.5">
                  <h4 className="text-primary font-bold text-xs uppercase tracking-widest mb-2">Celková cena</h4>

                  {isFaktura ? (
                    <>
                      <div className="flex justify-between text-sm text-white/70">
                        <span>Cena spolu bez DPH</span>
                        <div className="text-right">
                          {hasDiscount && <span className="line-through text-white/35 text-xs block">{fmt(result.totalBezDph)}</span>}
                          <span className="font-semibold text-white">{fmt(result.totalDiscBezDph)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">Cena spolu s DPH ({Math.round(VAT * 100)}%)</span>
                        <div className="text-right">
                          {hasDiscount && <span className="line-through text-white/35 text-xs block">{fmt(result.totalSDph)}</span>}
                          <span className="text-2xl font-bold text-primary">{fmt(result.totalDiscSDph)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">Cena spolu</span>
                      <div className="text-right">
                        {hasDiscount && <span className="line-through text-white/35 text-xs block">{fmt(result.hotovostOrigTotal)}</span>}
                        <span className="text-2xl font-bold text-primary">{fmt(result.hotovostTotal)}</span>
                      </div>
                    </div>
                  )}

                  {!result.isOwn && (
                    <div className="flex items-center gap-2 text-white/50 text-xs pt-1">
                      <Truck className="w-3.5 h-3.5" />
                      {tab === "pumpa" ? (
                        <span><strong>1× Pumpa</strong> ({pumpCap}m³){result.mixTrucksCount > 0 ? <> + <strong>{result.mixTrucksCount}× Mix</strong> ({mixCap}m³)</> : ""} = <strong>{result.trucks} vozidl{result.trucks === 1 ? "o" : "á"}</strong></span>
                      ) : (
                        <span><strong>{result.trucks}× Mix</strong> ({mixCap}m³/vozidlo)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Export buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={exportPDF}
                    className="flex items-center justify-center gap-2 py-3 border border-white/20 text-white/70 hover:border-primary hover:text-primary transition-all text-sm font-semibold cursor-pointer rounded-sm focus:outline-none">
                    <FileText className="w-4 h-4" /> EXPORT PDF
                  </button>
                  <button onClick={exportSMS}
                    className={cn("flex items-center justify-center gap-2 py-3 border transition-all text-sm font-semibold cursor-pointer rounded-sm focus:outline-none",
                      smsCopied ? "border-primary text-primary" : "border-white/20 text-white/70 hover:border-primary hover:text-primary"
                    )}>
                    {smsCopied ? <Check className="w-4 h-4 shrink-0" /> : <MessageSquare className="w-4 h-4 shrink-0" />}
                    {smsCopied ? "OK" : "EXPORT SMS"}
                  </button>
                </div>

                <button onClick={() => { setOrderForm(f => ({ ...f, name: loggedClient?.name ?? f.name, phone: loggedClient?.phone ? formatPhone(loggedClient.phone) : f.phone })); setShowOrderModal(true); }}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-all cursor-pointer">
                  <ShoppingCart className="w-4 h-4" /> Záväzne objednať →
                </button>
                <p className="text-[11px] text-white/30 text-center">* Cena je orientačná. Závisí od aktuálneho cenníka a dostupnosti.</p>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[420px] gap-4 text-center px-2">
              {loggedClient && (
                <div className="w-full bg-primary/8 border border-primary/20 rounded-lg text-left overflow-hidden">
                  {/* Klient header */}
                  <div className="flex items-center gap-1.5 px-4 pt-3 pb-2">
                    <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest shrink-0">Vaše zľavy</span>
                    <span className="text-white/20 text-[10px]">·</span>
                    <span className="text-white/55 text-xs font-semibold truncate">{loggedClient.name}</span>
                    <span className="ml-auto text-[9px] text-white/25 shrink-0">ID: {loggedClient.clientId}</span>
                  </div>
                  {/* Zľavy */}
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    {discountBeton   > 0 && <span className="bg-primary/15 text-primary font-black px-2 py-0.5 rounded-sm text-[11px]">Betón −{discountBeton}%</span>}
                    {discountDoprava > 0 && <span className="bg-primary/15 text-primary font-black px-2 py-0.5 rounded-sm text-[11px]">Doprava −{discountDoprava}%</span>}
                    {discountSluzby  > 0 && <span className="bg-primary/15 text-primary font-black px-2 py-0.5 rounded-sm text-[11px]">Služby −{discountSluzby}%</span>}
                    {discountCelkovo > 0 && <span className="bg-primary/15 text-primary font-black px-2 py-0.5 rounded-sm text-[11px]">Celkovo −{discountCelkovo}%</span>}
                    {!hasDiscount && <span className="text-white/25 text-[11px]">Žiadna zľava</span>}
                  </div>
                  {/* Typ dopravy */}
                  {clientDeliveryZone && (
                    <div className="border-t border-primary/15 px-4 py-2 flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-primary/50 flex-shrink-0" />
                      <span className="text-[10px] text-white/30 uppercase tracking-wide shrink-0">Typ dopravy</span>
                      <span className="text-[11px] font-bold text-white/50 truncate">{clientDeliveryZone.name}</span>
                      {(() => {
                        const ptLabel = ({standard:"Štandard", km:"Kilometre", auto:"Počet áut"} as Record<string,string>)[clientDeliveryZone.pricingType ?? "standard"];
                        return ptLabel !== clientDeliveryZone.name ? (
                          <span className="ml-auto text-[10px] text-white/25 shrink-0">{ptLabel}</span>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              )}
              {tab === "vlastnadoprava" && (
                <div className="w-full rounded-lg overflow-hidden text-left border border-primary/30">
                  <div className="bg-primary px-4 py-2.5">
                    <div className="text-sm font-black text-secondary">Vlastná doprava</div>
                  </div>
                  <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
                    <p className="text-xs text-white/55 leading-relaxed">
                      Zákazník si betón vyzdvihne vlastným vozidlom<br />
                      na prevádzke. Doprava sa nepočíta.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-primary/15">
                    {[
                      { label: "Doprava", value: "Nepočíta sa" },
                      { label: "Odber", value: "Na prevádzke" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-secondary/70 px-3 py-2">
                        <div className="text-[10px] text-white/35 uppercase tracking-wide mb-0.5">{label}</div>
                        <div className="text-sm font-bold text-primary">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tab === "pumpa" && (
                <div className="w-full rounded-lg overflow-hidden text-left border border-primary/30">
                  <div className="bg-primary px-4 py-2.5">
                    <div className="text-sm font-black text-secondary">Betónová pumpa {pumpCap}m³ · 28m rameno</div>
                  </div>
                  <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
                    <p className="text-xs text-white/55 leading-relaxed">
                      Prvé auto {pumpCap}m³, každé ďalšie {mixCap}m³ (domiešavač).<br />
                      Čerpanie sa účtuje od príjazdu na stavbu.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-primary/15">
                    {(() => {
                      const sluzbyDisc = effectiveSluzby > 0 && sluzbyFactor < 1;
                      const svcCell = (orig: number, suffix: string) => sluzbyDisc ? (
                        <div>
                          <span className="line-through text-primary/40 text-xs mr-1">{orig.toFixed(2)} €{suffix}</span>
                          <span className="block">{(orig * sluzbyFactor).toFixed(2)} €{suffix}</span>
                        </div>
                      ) : `${(orig * sluzbyFactor).toFixed(2)} €${suffix}`;
                      return ([
                        { label: "Kapacita", value: `${pumpCap} m³` },
                        { label: "Výložník", value: "28 m" },
                        { label: "Čerpanie", value: svcCell(pumpServicePrice, "/hod") },
                        { label: "Rozbeh. chémia", value: svcCell(chemServicePrice, " (v cene)") },
                      ] as { label: string; value: React.ReactNode }[]).map(({ label, value }) => (
                        <div key={label} className="bg-secondary/70 px-3 py-2">
                          <div className="text-[10px] text-white/35 uppercase tracking-wide mb-0.5">{label}</div>
                          <div className="text-sm font-bold text-primary">{value}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
              {tab === "mix" && (
                <div className="w-full rounded-lg overflow-hidden text-left border border-primary/30">
                  <div className="bg-primary px-4 py-2.5">
                    <div className="text-sm font-black text-secondary">Domiešavač {mixCap}m³</div>
                  </div>
                  <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
                    <p className="text-xs text-white/55 leading-relaxed">
                      Prvých 30 min čakania bez poplatku.<br />
                      Čakanie sa účtuje každých začatých 15 min.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-primary/15">
                    {[
                      { label: "Kapacita", value: `${mixCap} m³` },
                      { label: "Čakačka / 15 min", value: `${(waitServicePriceMix * sluzbyFactor).toFixed(2)} €` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-secondary/70 px-3 py-2">
                        <div className="text-[10px] text-white/35 uppercase tracking-wide mb-0.5">{label}</div>
                        <div className="text-sm font-bold text-primary">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <svg viewBox="0 0 80 44" className="w-20 h-auto text-white/10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="22" width="18" height="16" rx="1" /><rect x="3" y="18" width="10" height="6" rx="1" />
                <line x1="20" y1="30" x2="62" y2="30" /><line x1="20" y1="38" x2="62" y2="38" /><line x1="62" y1="30" x2="62" y2="38" />
                <ellipse cx="44" cy="22" rx="18" ry="12" />
                <path d="M30 26 Q44 18 58 26" strokeWidth="1.5" /><path d="M30 20 Q44 12 58 20" strokeWidth="1.5" />
                <line x1="26" y1="22" x2="30" y2="30" strokeWidth="1.5" /><line x1="60" y1="22" x2="62" y2="30" strokeWidth="1.5" />
                <circle cx="10" cy="38" r="4" strokeWidth="2" /><circle cx="52" cy="38" r="4" strokeWidth="2" />
              </svg>
              <div className="space-y-1.5">
                <p className="text-white/20 text-xs font-black uppercase tracking-widest">Výsledok kalkulácie</p>
                <p className="text-white/15 text-xs leading-relaxed">Vyplňte formulár vľavo<br />a kliknite VYPOČÍTAŤ CENU</p>
              </div>
            </div>
          )}
        </div>

        </div>{/* /two-column grid */}
      </div>

      {/* Order modal */}
      <AnimatePresence>
        {showOrderModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={(e) => { if (e.target === e.currentTarget) setShowOrderModal(false); }}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-white text-lg tracking-wide">Záväzná objednávka</h3>
                <button onClick={() => setShowOrderModal(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {orderDone ? (
                <div className="text-center py-8 space-y-3">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 mx-auto">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-green-400 font-bold text-lg">Objednávka odoslaná!</p>
                  <p className="text-white/50 text-sm">Čoskoro vás budeme kontaktovať.</p>
                </div>
              ) : (
                <>
                  {result && (() => {
                    const now = new Date();
                    const dayNames = ["Nedeľa","Pondelok","Utorok","Streda","Štvrtok","Piatok","Sobota"];
                    const dayLabel = `${dayNames[now.getDay()]}, ${now.getDate()}. ${now.getMonth()+1}. ${now.getFullYear()}`;
                    return (
                      <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="text-white/50">{result.totalQty} m³ · {selectedType?.label.replace(/ – .*/, "")}</span>
                          <span className="text-primary font-bold">{(isFaktura ? result.totalDiscSDph : result.hotovostTotal).toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/30 text-xs">{tab === "pumpa" ? "Pumpa" : tab === "mix" ? "Mix" : "Vlastná doprava"}{address ? ` · ${address}` : ""}</span>
                          <span className="text-white/30 text-xs">{dayLabel}</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">Meno a priezvisko *</label>
                      <input value={orderForm.name} onChange={e => setOrderForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Zadajte meno"
                        className="w-full bg-white/10 border-b-2 border-b-primary/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-b-primary placeholder:text-white/30 rounded-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">Telefón</label>
                      <PhoneInput value={orderForm.phone} onChange={v => setOrderForm(f => ({ ...f, phone: v }))}
                        placeholder="0944 xxx xxx"
                        className="w-full bg-white/10 border-b-2 border-b-primary/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-b-primary placeholder:text-white/30 rounded-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">Poznámka</label>
                      <textarea value={orderForm.note} onChange={e => setOrderForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Termín, špeciálne požiadavky..."
                        rows={2}
                        className="w-full bg-white/10 border-b-2 border-b-primary/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-b-primary placeholder:text-white/30 rounded-sm resize-none" />
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitOrder}
                    disabled={orderSubmitting || !orderForm.name.trim()}
                    className="w-full py-3 bg-primary text-white font-bold text-sm tracking-widest hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50">
                    {orderSubmitting ? "Odosiela sa..." : "ODOSLAŤ OBJEDNÁVKU"}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
