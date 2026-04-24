import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Truck, LogIn, LogOut, FileText, MessageSquare, Minus, Plus, Trash2, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminData } from "@/lib/adminData";
import { clientAuth, type LoggedClient } from "@/lib/clientAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientPriceTable } from "@/components/ClientPriceTable";

type Tab = "pumpa" | "mix" | "vlastnadoprava";
type PriceMode = "faktura" | "hotovost";

interface ExtraItem {
  id: string;
  categoryName: string | null;
  typeLabel: string | null;
  quantity: string;
}

const VAT = 0.23;
const VAT_HOTOVOST = 0.20;
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

function TypeSelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { label: string; price: number }[];
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
          {options.map((o) => (
            <SelectItem key={o.label} value={o.label} className="text-white focus:bg-white/10 focus:text-primary cursor-pointer">
              <span className="flex items-center gap-4">
                <span>{cleanLabel(o.label)}</span>
                <span className="text-primary text-xs font-bold">{o.price.toFixed(2)} €/m³</span>
              </span>
            </SelectItem>
          ))}
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
function cleanType(lbl: string) { return lbl.replace(/ – [\d.]+ € \/ m³/, "").replace(/ – [\d,.]+ €\/m³/, ""); }

function PriceRow({ label, original, discounted, hasDiscount }: { label: string; original: number; discounted: number; hasDiscount: boolean }) {
  if (original === 0) return null;
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

export function ConcreteCalculator() {
  const [tab, setTab] = useState<Tab>("pumpa");
  const [deliveryMode, setDeliveryMode] = useState<"distance" | "address">("distance");
  const [distance, setDistance] = useState("");
  const [address, setAddress] = useState("");
  const [addressKm, setAddressKm] = useState<number | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [concreteTypeLabel, setConcreteTypeLabel] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [pumpHour, setPumpHour] = useState("1 h");
  const [pumpMin, setPumpMin] = useState("0 min");
  const [waitHour, setWaitHour] = useState("0 h");
  const [waitMin, setWaitMin] = useState("0 min");
  const [hoseMeters, setHoseMeters] = useState(0);
  const [washing, setWashing] = useState(false);
  const [rozbehovaChemia, setRozbehovaChemia] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceMode>("faktura");
  const [loggedClient, setLoggedClient] = useState<LoggedClient | null>(() => clientAuth.getLoggedClient());
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);
  const [showPriceTable, setShowPriceTable] = useState(false);
  const [zimneOpatrenia, setZimneOpatrenia] = useState(() => {
    const now = new Date(); const m = now.getMonth() + 1; const d = now.getDate();
    return (m === 11 && d >= 15) || m === 12 || m === 1 || m === 2 || (m === 3 && d <= 15);
  });
  const [revision, setRevision] = useState(0);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);

  useEffect(() => {
    const handler = () => setRevision((r) => r + 1);
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);

  useEffect(() => {
    if (loggedClient && !loggedClient.canHotovost && priceMode === "hotovost") {
      setPriceMode("faktura");
    }
  }, [loggedClient, priceMode]);

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
  const allServices = useMemo(() => adminData.getServices(), [revision]);
  const allDelivery = useMemo(() => adminData.getDelivery(), [revision]);
  const tzones = useMemo(() => adminData.getTransportZones(), [revision]);
  const tsettings = useMemo(() => adminData.getTransportSettings(), [revision]);

  // Klientova zóna dopravy (podľa deliveryZoneId, fallback = prvá zóna)
  const clientDeliveryZone = useMemo(() => {
    if (loggedClient?.deliveryZoneId)
      return allDelivery.find(z => z.id === loggedClient.deliveryZoneId) ?? allDelivery[0];
    return allDelivery[0] ?? null;
  }, [loggedClient, allDelivery]);

  const selectedCategory = allCategories.find((c) => c.name === categoryName)
    ?? allCategories.find((c) => c.name.toUpperCase().includes("DMAX16") && c.name.toUpperCase().includes("DRVENÉ"))
    ?? allCategories[0];
  const typesForCategory = selectedCategory?.types ?? [];
  const selectedType = typesForCategory.find((t) => t.label === concreteTypeLabel)
    ?? typesForCategory.find((t) => t.label.includes("C16/20"))
    ?? typesForCategory[0];

  // Čerpanie: ak má klient priradenú zónu s vlastnou sadzbou pumpy, použij ju
  const pumpServicePrice = clientDeliveryZone?.pumpHourlyRate
    ?? allServices.find((s) => s.name.includes("Čerpanie"))?.price ?? 112.50;
  const chemServicePrice = allServices.find((s) => s.name.toLowerCase().includes("rozbeh"))?.price ?? 31.25;
  const washServicePrice = allServices.find((s) => s.name.toLowerCase().includes("umýv"))?.price ?? 56.25;
  // Čakačka: per-mode sadzba z delivery zóny (pumpa vs mix)
  const waitServicePricePumpa = clientDeliveryZone?.waitingRatePer15minPumpa
    ?? clientDeliveryZone?.waitingRatePer15min
    ?? allServices.find((s) => s.name.toLowerCase().includes("čakačk") || s.name.toLowerCase().includes("čakania"))?.price ?? 8.00;
  const waitServicePriceMix = clientDeliveryZone?.waitingRatePer15min
    ?? allServices.find((s) => s.name.toLowerCase().includes("čakačk") || s.name.toLowerCase().includes("čakania"))?.price ?? 8.00;
  const hoseServicePrice = allServices.find((s) => s.name.toLowerCase().includes("hadice"))?.price ?? 10.00;
  const zimneServicePrice = allServices.find((s) => s.name.toLowerCase().includes("zimn"))?.price ?? 10.00;

  const isWinterSeason = (() => {
    const now = new Date(); const m = now.getMonth() + 1; const d = now.getDate();
    return (m === 11 && d >= 15) || m === 12 || m === 1 || m === 2 || (m === 3 && d <= 15);
  })();

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

  function calcPumpTrucks(qty: number): number {
    if (qty <= 0) return 0;
    let trucks = 1;
    let remaining = qty - PUMP_TRUCK_CAPACITY;
    while (remaining > 0) { remaining -= MIX_TRUCK_CAPACITY; trucks++; }
    return trucks;
  }

  function calcTransport(km: number, qty: number, tabType: Tab): number {
    if (km === 0) return 0;
    const zone = tzones.find((z) => km >= z.fromKm && km < z.toKm) ?? tzones[tzones.length - 1];
    const ratePerM3 = zone?.ratePerM3 ?? 0;
    const minimumFee = tsettings.minimumFee ?? 62.50;

    // Fill-up logika zhodná s pôvodnou WP kalkulačkou
    let fillupM3 = 0;
    if (tabType === "pumpa") {
      if (qty < 5) fillupM3 = 5 - qty;
      else if (qty > 7 && qty < 10) fillupM3 = 10 - qty;
    } else {
      if (qty < 5) fillupM3 = 5 - qty;
      else if (qty > 9 && qty < 10) fillupM3 = 10 - qty;
    }

    const trucks = tabType === "pumpa" ? calcPumpTrucks(qty) : Math.ceil(qty / MIX_TRUCK_CAPACITY);
    const totalVolumeCost = (qty + fillupM3) * ratePerM3;
    const minCost = trucks * minimumFee;

    // Ak priemerná cena na auto nespĺňa minimum, aplikuj minimum
    if (trucks > 0 && totalVolumeCost / trucks < minimumFee) {
      return minCost;
    }
    return totalVolumeCost;
  }

  const result = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const km = parseFloat(distance) || 0;
    if (!qty || !selectedType) return null;

    // Extra items: compute per-item concrete breakdown
    const concreteBreakdown: Array<{label: string; bezDph: number}> = [];
    concreteBreakdown.push({ label: `Betón ${cleanType(selectedType.label)} – ${qty} m³`, bezDph: qty * selectedType.price });
    for (const item of extraItems) {
      const t = getItemType(item.categoryName, item.typeLabel);
      const q = parseFloat(item.quantity) || 0;
      if (t && q > 0) {
        concreteBreakdown.push({ label: `Betón ${cleanType(t.label)} – ${q} m³`, bezDph: q * t.price });
      }
    }
    const totalConcreteBezDph = concreteBreakdown.reduce((s, i) => s + i.bezDph, 0);
    const extraQty = extraItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
    const totalQty = qty + extraQty;

    const trucks = tab === "pumpa" ? calcPumpTrucks(totalQty) : Math.ceil(totalQty / MIX_TRUCK_CAPACITY);
    const truckCapacity = tab === "pumpa" ? PUMP_TRUCK_CAPACITY : MIX_TRUCK_CAPACITY;
    const pumpHrs = parseInt(pumpHour) || 1;
    const pumpMs = parseInt(pumpMin) || 0;
    const pumpCost = tab === "pumpa" ? pumpHrs * pumpServicePrice + (pumpMs > 0 ? pumpServicePrice * 0.5 : 0) : 0;
    const waitIntervals = Math.ceil(waitTotalMins / 15);

    const isOwn = tab === "vlastnadoprava";
    const items = {
      concrete: totalConcreteBezDph,
      transport: isOwn ? 0 : calcTransport(km, totalQty, tab),
      pump: tab === "pumpa" ? pumpCost : 0,
      hoses: tab === "pumpa" && hoseMeters > 0 ? hoseMeters * hoseServicePrice : 0,
      washing: tab === "pumpa" && washing ? washServicePrice : 0,
      chem: tab === "pumpa" && rozbehovaChemia ? chemServicePrice : 0,
      waiting: tab === "pumpa" ? waitIntervals * waitServicePricePumpa : (tab === "mix" ? waitIntervals * waitServicePriceMix : 0),
      zimne: zimneOpatrenia ? totalQty * zimneServicePrice : 0,
    };

    const totalBezDph = Object.values(items).reduce((a, b) => a + b, 0);
    const discountedItems: typeof items = {
      concrete: items.concrete * betonFactor,
      transport: items.transport * dopravaFactor,
      pump: items.pump * sluzbyFactor,
      hoses: items.hoses * sluzbyFactor,
      washing: items.washing * sluzbyFactor,
      chem: items.chem * sluzbyFactor,
      waiting: items.waiting * sluzbyFactor,
      zimne: items.zimne * betonFactor,
    };
    const totalDiscBezDph = Object.values(discountedItems).reduce((a, b) => a + b, 0);
    const totalDiscSDph = totalDiscBezDph * (1 + VAT);

    // Hotovosť: DPH 20% (dph_spec) sa aplikuje IBA na betón, nie na dopravu/služby (zhodné so starou WP kalkulačkou)
    const hotovostBaseItems: typeof items = {
      concrete: items.concrete * (1 + VAT_HOTOVOST),
      transport: items.transport,
      pump: items.pump,
      hoses: items.hoses,
      washing: items.washing,
      chem: items.chem,
      waiting: items.waiting,
      zimne: items.zimne * (1 + VAT_HOTOVOST),
    };
    const hotovostDiscItems: typeof items = {
      concrete: hotovostBaseItems.concrete * betonFactor,
      transport: hotovostBaseItems.transport * dopravaFactor,
      pump: hotovostBaseItems.pump * sluzbyFactor,
      hoses: hotovostBaseItems.hoses * sluzbyFactor,
      washing: hotovostBaseItems.washing * sluzbyFactor,
      chem: hotovostBaseItems.chem * sluzbyFactor,
      waiting: hotovostBaseItems.waiting * sluzbyFactor,
      zimne: hotovostBaseItems.zimne * betonFactor,
    };
    const hotovostTotal = Object.values(hotovostDiscItems).reduce((a, b) => a + b, 0);
    // Škrtnutá cena pri hotovosti = fakturová cena s DPH 23% (zhodné so starou WP kalkulačkou)
    const hotovostOrigTotal = totalDiscSDph;

    const waitLabel = (() => {
      const wh = parseInt(waitHour) || 0;
      const wm = parseInt(waitMin) || 0;
      const parts: string[] = [];
      if (wh > 0) parts.push(`${wh} h`);
      if (wm > 0) parts.push(`${wm} min`);
      return parts.join(" ");
    })();

    const mixTrucksCount = tab === "pumpa" ? trucks - 1 : trucks;
    const transportZone = !isOwn && km > 0
      ? (tzones.find((z) => km >= z.fromKm && km < z.toKm) ?? tzones[tzones.length - 1])
      : null;

    return {
      trucks, truckCapacity, mixTrucksCount, items, totalBezDph, totalSDph: totalBezDph * (1 + VAT),
      discountedItems, totalDiscBezDph, totalDiscSDph,
      hotovostBaseItems, hotovostDiscItems, hotovostTotal, hotovostOrigTotal,
      qty, totalQty, km, waitIntervals, waitLabel, pumpHrs, pumpMs, isOwn, concreteBreakdown, transportZone,
    };
  }, [tab, quantity, distance, selectedType, pumpHour, pumpMin, waitTotalMins, hoseMeters, washing, rozbehovaChemia, zimneOpatrenia, betonFactor, dopravaFactor, sluzbyFactor, pumpServicePrice, chemServicePrice, washServicePrice, waitServicePricePumpa, waitServicePriceMix, hoseServicePrice, zimneServicePrice, tzones, tsettings, extraItems, allCategories]);

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

    const fmtH = (n: number) => n.toFixed(2).replace(".", ",") + "&nbsp;€";
    const row = (label: string, orig: number, disc: number) => {
      if (orig === 0) return "";
      const crossed = hasDiscount && Math.abs(orig - disc) > 0.001
        ? `<span style="color:#aaa;text-decoration:line-through;font-size:8pt;margin-right:6px">${fmtH(orig)}</span>` : "";
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-bottom:1px solid #eee;font-size:9pt">
        <span style="color:#222;flex:1">${label}</span>
        <span style="font-weight:bold">${crossed}${fmtH(disc)}</span></div>`;
    };
    const section = (title: string) =>
      `<div style="background:#001D3D;color:#fff;font-weight:bold;font-size:10pt;padding:4px 8px;margin-top:8px">${title}</div>`;

    const discountInfo = (() => {
      if (!hasDiscount) return "";
      const dp: string[] = [];
      if (discountBeton   > 0) dp.push(`Betón ${discountBeton}%`);
      if (discountDoprava > 0) dp.push(`Doprava ${discountDoprava}%`);
      if (discountSluzby  > 0) dp.push(`Služby ${discountSluzby}%`);
      if (discountCelkovo > 0) dp.push(`Celkovo ${discountCelkovo}%`);
      return `<div style="color:#EDC531;font-size:8.5pt;margin-top:2px">Zľavy: ${dp.join(", ")}</div>`;
    })();

    const clientInfo = loggedClient
      ? `<div style="font-size:8.5pt;color:#555;margin-top:4px">Klient: <strong>${loggedClient.name}</strong>${loggedClient.company ? ` – ${loggedClient.company}` : ""} (ID: ${loggedClient.clientId})</div>${discountInfo}`
      : discountInfo;

    const ownNote = result.isOwn
      ? `<div style="font-style:italic;color:#888;font-size:8.5pt;padding:4px 8px;margin-top:4px">Vlastná doprava – zákazník zabezpečuje dopravu vlastným vozidlom</div>` : "";

    const betonRows = result.concreteBreakdown.map((ci) => {
      const origVal = isFaktura ? ci.bezDph : ci.bezDph * (1 + VAT_HOTOVOST);
      const discVal = origVal * betonFactor;
      return row(ci.label, origVal, discVal);
    }).join("");

    const sluzbySec = tab === "pumpa" && (origItems.pump + origItems.hoses + origItems.washing + origItems.chem + origItems.waiting) > 0
      ? section("Služby") +
        row(`Čerpanie betónu – ${result.pumpHrs} h${result.pumpMs > 0 ? ` ${result.pumpMs} min` : ""}`, origItems.pump, baseItems.pump) +
        row(`Prídavné hadice – ${hoseMeters} m`, origItems.hoses, baseItems.hoses) +
        row("Umývanie mimo stavby", origItems.washing, baseItems.washing) +
        row("Rozbehová chémia", origItems.chem, baseItems.chem) +
        row(`Čakačky – ${result.waitLabel} (${result.waitIntervals}× ${(tab === "pumpa" ? waitServicePricePumpa : waitServicePriceMix).toFixed(2)} €)`, origItems.waiting, baseItems.waiting)
      : "";

    const totalRows = isFaktura
      ? `<div style="display:flex;justify-content:space-between;padding:4px 8px;font-size:9pt"><span style="color:#555">Cena spolu bez DPH:</span><span style="font-weight:bold">${fmtH(result.totalDiscBezDph)}</span></div>
         <div style="display:flex;justify-content:space-between;padding:4px 8px;font-size:9pt"><span style="color:#555">DPH 23%:</span><span style="font-weight:bold">${fmtH(result.totalDiscBezDph * VAT)}</span></div>
         <div style="display:flex;justify-content:space-between;padding:8px 8px 4px;font-size:12pt;font-weight:bold;color:#001D3D;border-top:1px solid #ddd;margin-top:4px"><span>Cena spolu s DPH:</span><span style="color:#c9a800">${fmtH(result.totalDiscSDph)}</span></div>`
      : `<div style="display:flex;justify-content:space-between;padding:8px 8px 4px;font-size:12pt;font-weight:bold;color:#001D3D"><span>Cena spolu:</span><span>${fmtH(result.hotovostTotal)}</span></div>`;

    const html = `<!DOCTYPE html><html lang="sk"><head>
<meta charset="utf-8">
<title>Cenová ponuka – MS-BETON</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #222; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div style="background:#001D3D;color:#fff;padding:12mm 14mm 10mm;">
  <div style="font-size:22pt;font-weight:bold;letter-spacing:-0.5px;margin-bottom:3px">MS-BETON s.r.o.</div>
  <div style="font-size:9pt;margin-bottom:2px;opacity:0.85">Žilina betón – doprava a čerpanie</div>
  <div style="font-size:9pt;opacity:0.7">+421 909 205 205 &nbsp;|&nbsp; info@msbeton.sk</div>
</div>
<div style="padding:8mm 14mm 14mm">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5mm">
    <div style="color:#EDC531;font-size:17pt;font-weight:bold;letter-spacing:1px">CENOVÁ PONUKA</div>
    <div style="font-size:9pt;color:#555">Dátum: ${today}</div>
  </div>
  ${clientInfo ? `<div style="margin-bottom:5mm">${clientInfo}</div>` : ""}
  ${ownNote}
  ${section("Produkty")}
  ${betonRows}
  ${origItems.transport > 0 ? (() => {
      const pdfTrucks = tab === "pumpa" ? `1×Pumpa${result.mixTrucksCount > 0 ? `+${result.mixTrucksCount}×Mix` : ""}` : `${result.trucks}×Mix`;
      const pdfZone = result.transportZone ? `${result.transportZone.fromKm}–${result.transportZone.toKm}km` : "";
      return row(`Doprava ${pdfZone} · ${pdfTrucks} · ${result.totalQty}m³`, origItems.transport, baseItems.transport);
    })() : ""}
  ${origItems.zimne > 0 ? row(`Zimné opatrenia – ${result.qty} m³ × ${zimneServicePrice.toFixed(2)} €`, origItems.zimne, baseItems.zimne) : ""}
  ${sluzbySec}
  <div style="background:#EDC531;color:#001D3D;font-weight:bold;font-size:11pt;padding:5px 8px;margin-top:10px">Celková cena</div>
  ${totalRows}
  <div style="margin-top:14mm;padding-top:4mm;border-top:1px solid #eee;font-size:7.5pt;color:#888;line-height:1.6">
    * Cena je orientačná. Závisí od aktuálneho cenníka a dostupnosti. Kontaktujte nás pre presnú ponuku.<br>
    MS-BETON s.r.o. &nbsp;|&nbsp; +421 909 205 205 &nbsp;|&nbsp; info@msbeton.sk &nbsp;|&nbsp; msbeton.sk
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
    const lines = ["MS-BETON cenová ponuka:"];
    if (result.isOwn) lines.push("Vlastná doprava – odber na prevádzke");
    for (const ci of result.concreteBreakdown) {
      const origVal = isFaktura ? ci.bezDph : ci.bezDph * (1 + VAT_HOTOVOST);
      const discVal = origVal * betonFactor;
      lines.push(`${ci.label}: ${fmt(hasDiscount && effectiveBeton > 0 ? discVal : origVal)}`);
    }
    if (smsItems.transport > 0) lines.push(`Doprava: ${fmt(smsItems.transport)}`);
    if (smsItems.zimne > 0) lines.push(`Zimné opatrenia ${result.qty}m³: ${fmt(smsItems.zimne)}`);
    if (tab === "pumpa") {
      if (smsItems.pump > 0) lines.push(`Pumpa: ${fmt(smsItems.pump)}`);
      if (smsItems.hoses > 0) lines.push(`Hadice ${hoseMeters}m: ${fmt(smsItems.hoses)}`);
      if (smsItems.washing > 0) lines.push(`Umývanie: ${fmt(smsItems.washing)}`);
    }
    if (isFaktura) {
      lines.push(`SPOLU bez DPH: ${fmt(result.totalDiscBezDph)}`);
      lines.push(`SPOLU s DPH: ${fmt(result.totalDiscSDph)}`);
    } else {
      lines.push(`SPOLU: ${fmt(result.hotovostTotal)}`);
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
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setSmsCopied(true);
      setTimeout(() => setSmsCopied(false), 3000);
    });
  }

  const isFaktura = priceMode === "faktura";
  const displayItems = isFaktura ? result?.discountedItems : result?.hotovostDiscItems;
  const origDisplayItems = isFaktura ? result?.items : result?.hotovostBaseItems;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#2d3748" }}>

        {/* Tabs */}
        <div className="grid grid-cols-3">
          {(["pumpa", "mix", "vlastnadoprava"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setExtraItems([]); setShowResult(false); }}
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
                {t === "pumpa" ? "Pumpa 7m³ · 28m" : t === "mix" ? "Domiešavač 9m³" : "Vlastná doprava"}
              </span>
            </button>
          ))}
        </div>

        {/* Two-column layout: form | result */}
        <div className="md:grid md:grid-cols-[3fr_2fr] md:divide-x md:divide-white/10">

        {/* LEFT: Form */}
        <div className="p-6 space-y-5">

          {/* Client login bar */}
          <div className="py-2 border-b border-white/10">
            {loggedClient ? (
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white/60 text-xs shrink-0">Prihlásený:</span>
                    <span className="text-white text-sm font-semibold truncate min-w-0">{loggedClient.name}</span>
                    {hasDiscount && (
                      <span className="shrink-0 px-1.5 py-0.5 bg-primary text-secondary text-xs font-black rounded-sm tracking-wide">
                        Zľava
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-5 shrink-0">
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
                    <button onClick={handleLogout} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors cursor-pointer border border-white/15 rounded px-2.5 py-1.5">
                      <LogOut className="w-5 h-5" /><span className="whitespace-nowrap hidden sm:inline">Odhlásiť</span>
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {showPriceTable && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                      <ClientPriceTable
                        discountBeton={discountBeton}
                        discountDoprava={discountDoprava}
                        discountSluzby={discountSluzby}
                        discountCelkovo={discountCelkovo}
                        variant="dark"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="w-full">
                <button onClick={() => setShowLoginForm(!showLoginForm)}
                  className="flex items-center gap-2 text-white/50 hover:text-primary text-xs transition-colors cursor-pointer">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Prihlásiť sa ako klient (zľavové ceny)</span>
                </button>
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
            )}
          </div>

          {/* Pumpa info banner */}
          {tab === "pumpa" && (
            <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
              <svg viewBox="0 0 130 48" className="w-10 h-[31px] shrink-0 mt-0.5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="27" width="14" height="15" rx="1" /><rect x="3" y="22" width="9" height="6" rx="1" />
                <line x1="16" y1="33" x2="44" y2="33" /><line x1="16" y1="42" x2="44" y2="42" /><line x1="44" y1="33" x2="44" y2="42" />
                <line x1="26" y1="33" x2="26" y2="21" strokeWidth="2.5" /><line x1="22" y1="21" x2="30" y2="21" />
                <line x1="26" y1="21" x2="16" y2="6" strokeWidth="3" /><line x1="16" y1="6" x2="122" y2="2" strokeWidth="2.5" />
                <line x1="122" y1="2" x2="127" y2="2" strokeWidth="2" /><line x1="126" y1="2" x2="126" y2="17" strokeWidth="1.8" />
                <circle cx="8" cy="42" r="4" strokeWidth="2" /><circle cx="36" cy="42" r="4" strokeWidth="2" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-white">Betónová pumpa <span className="text-primary">7m³ · 28m rameno</span></p>
                <p className="text-xs text-white/60 mt-0.5">Prvé auto 7m³, každé ďalšie 9m³ (domiešavač). Čerpanie sa účtuje od príjazdu na stavbu.</p>
              </div>
            </div>
          )}

          {/* Vlastná doprava info banner */}
          {tab === "vlastnadoprava" && (
            <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
              <Truck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">Vlastná doprava</p>
                <p className="text-xs text-white/60 mt-0.5">Zákazník si betón vyzdvihne vlastným vozidlom na prevádzke. Doprava sa nepočíta.</p>
              </div>
            </div>
          )}

          {/* Delivery */}
          {tab !== "vlastnadoprava" && <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/80">Adresa doručenia</label>
            {deliveryMode === "distance" ? (
              <input type="number" min="0" step="0.1" value={distance}
                onChange={(e) => { setDistance(e.target.value); setShowResult(false); }}
                onWheel={(e) => e.currentTarget.blur()}
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
                    Vzdialenosť: {addressKm.toFixed(1)} km × 2 + 2 km rezerva = <strong className="text-primary">{distance} km</strong> (pre výpočet dopravy)
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
          />

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">Množstvo betónu (m³)</label>
            <input type="number" min="0" step="0.5" value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setShowResult(false); }}
              onWheel={(e) => e.currentTarget.blur()}
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
              <div key={item.id} className="border border-primary/25 rounded-lg p-4 space-y-3 bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-primary/70 uppercase tracking-widest">Položka {idx + 2}</span>
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
                />
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Množstvo betónu (m³)</label>
                  <input
                    type="number" min="0" step="0.5" value={item.quantity}
                    onChange={(e) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, quantity: e.target.value } : i)); setShowResult(false); }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Zadajte množstvo"
                    className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm"
                  />
                </div>
              </div>
            );
          })}

          {/* Pridať položku button — iba pre klientov s canPridatBeton */}
          {loggedClient?.canPridatBeton && (
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

          {/* Zimné opatrenia */}
          <div className={cn("border rounded-lg px-4 py-3 transition-all", zimneOpatrenia ? "border-blue-400/40 bg-blue-400/5" : "border-white/10 bg-white/5")}>
            <label className="flex items-center gap-3 cursor-pointer group" onClick={() => { setZimneOpatrenia(!zimneOpatrenia); setShowResult(false); }}>
              <div className={cn("w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0",
                zimneOpatrenia ? "bg-blue-400 border-blue-400" : "bg-white/10 border-white/30 group-hover:border-blue-300/50")}>
                {zimneOpatrenia && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-white">Zimné opatrenia</span>
                <span className="ml-2 text-xs text-white/40">(+{zimneServicePrice.toFixed(2)} €/m³, platí 15.11.–15.3.)</span>
              </div>
              {isWinterSeason && (
                <span className="text-[10px] font-bold text-blue-300 bg-blue-400/15 px-2 py-0.5 rounded tracking-wide">ZIMNÁ SEZÓNA</span>
              )}
            </label>
            {zimneOpatrenia && parseFloat(quantity) > 0 && (
              <p className="text-xs text-blue-300/70 mt-2 ml-8">
                {parseFloat(quantity)} m³ betónu × {zimneServicePrice.toFixed(2)} € = <span className="font-semibold text-blue-300">{(parseFloat(quantity) * zimneServicePrice).toFixed(2)} € bez DPH</span>
              </p>
            )}
          </div>

          {/* PUMPA extras */}
          {tab === "pumpa" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Čerpanie v /h" value={pumpHour} onChange={(v) => { setPumpHour(v); setShowResult(false); }} options={PUMP_HOURS} />
                <SelectField label="Čerpanie v /min" value={pumpMin} onChange={(v) => { setPumpMin(v); setShowResult(false); }} options={PUMP_MINS} />
              </div>

              {/* Waiting */}
              <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/80">
                    Čakačky
                    <span className="ml-2 text-xs font-normal text-white/40">{(tab === "pumpa" ? waitServicePricePumpa : waitServicePriceMix).toFixed(2)} € / 15 min</span>
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
              </div>

              {/* Prídavné hadice — slider 1-100m */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-white/80">Prídavné hadice (bežné metre)</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setHoseMeters(Math.max(0, hoseMeters - 1)); setShowResult(false); }}
                      className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className={cn("w-10 text-center text-sm font-bold", hoseMeters > 0 ? "text-primary" : "text-white/30")}>
                      {hoseMeters > 0 ? `${hoseMeters}m` : "—"}
                    </span>
                    <button type="button" onClick={() => { setHoseMeters(Math.min(100, hoseMeters + 1)); setShowResult(false); }}
                      className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {hoseMeters > 0 && (
                  <input type="range" min="1" max="100" value={hoseMeters}
                    onChange={(e) => { setHoseMeters(parseInt(e.target.value)); setShowResult(false); }}
                    className="w-full accent-primary cursor-pointer" />
                )}
                {hoseMeters === 0 && (
                  <button type="button" onClick={() => { setHoseMeters(1); setShowResult(false); }}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer">
                    + Pridať prídavné hadice
                  </button>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <CheckboxField label={`Umývanie mimo stavby (+${washServicePrice.toFixed(2)} €)`} checked={washing} onChange={(v) => { setWashing(v); setShowResult(false); }} />
                <CheckboxField label={`Rozbehová chémia (+${chemServicePrice.toFixed(2)} €)`} checked={rozbehovaChemia} onChange={(v) => { setRozbehovaChemia(v); setShowResult(false); }} disabled={tab === "pumpa"} />
              </div>
            </>
          )}

          {/* MIX čakačka */}
          {tab === "mix" && (
            <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/80">
                  Čakačky
                  <span className="ml-2 text-xs font-normal text-white/40">{waitServicePriceMix.toFixed(2)} € / 15 min</span>
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
            </div>
          )}

          {/* Calculate button */}
          <button onClick={() => { if (parseFloat(quantity) > 0) setShowResult(true); }}
            className="w-full py-4 bg-transparent border-2 border-primary text-primary font-bold text-base tracking-widest hover:bg-primary hover:text-white transition-all duration-200 cursor-pointer mt-2">
            VYPOČÍTAŤ CENU
          </button>
        </div>

        {/* RIGHT: Result */}
        <div className={cn("p-6", !showResult && "hidden md:flex md:items-center md:justify-center")}>
          {showResult && result && displayItems && origDisplayItems ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/30 overflow-hidden md:rounded-xl">

              {/* HOTOVOSŤ / FAKTÚRA tabs */}
              {(() => {
                const showHotovost = !loggedClient || loggedClient.canHotovost;
                const modes = showHotovost ? (["faktura", "hotovost"] as PriceMode[]) : (["faktura"] as PriceMode[]);
                return (
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
                  </div>
                )}

                {/* Produkty */}
                <div>
                  <h4 className="text-primary font-bold text-xs uppercase tracking-widest mb-2">Produkty</h4>
                  {result.concreteBreakdown.map((ci, idx) => {
                    const origVal = isFaktura ? ci.bezDph : ci.bezDph * (1 + VAT_HOTOVOST);
                    const discVal = origVal * betonFactor;
                    return (
                      <PriceRow key={idx} label={ci.label}
                        original={origVal} discounted={discVal} hasDiscount={hasDiscount && effectiveBeton > 0} />
                    );
                  })}
                  {origDisplayItems.transport > 0 && (() => {
                    const trucksLabel = tab === "pumpa"
                      ? `1×Pumpa${result.mixTrucksCount > 0 ? `+${result.mixTrucksCount}×Mix` : ""}`
                      : `${result.trucks}×Mix`;
                    const zoneStr = result.transportZone
                      ? `${result.transportZone.fromKm}–${result.transportZone.toKm}km`
                      : "";
                    const dopravaLabel = `Doprava ${zoneStr} · ${trucksLabel} · ${result.totalQty}m³`;
                    return (
                      <PriceRow label={dopravaLabel}
                        original={origDisplayItems.transport} discounted={displayItems.transport} hasDiscount={hasDiscount} />
                    );
                  })()}
                  {displayItems.zimne > 0 && (
                    <PriceRow label={`Zimné opatrenia – ${result.totalQty} m³`}
                      original={origDisplayItems.zimne} discounted={displayItems.zimne} hasDiscount={hasDiscount} />
                  )}
                </div>

                {/* Služby */}
                {tab === "pumpa" && (origDisplayItems.pump > 0 || origDisplayItems.hoses > 0 || origDisplayItems.washing > 0 || origDisplayItems.chem > 0 || origDisplayItems.waiting > 0) && (
                  <div>
                    <h4 className="text-primary font-bold text-xs uppercase tracking-widest mb-2">Služby</h4>
                    <PriceRow label={`Čerpanie betónu – ${result.pumpHrs} h${result.pumpMs > 0 ? ` ${result.pumpMs} min` : ""}`}
                      original={origDisplayItems.pump} discounted={displayItems.pump} hasDiscount={hasDiscount} />
                    {hoseMeters > 0 && <PriceRow label={`Prídavné hadice – ${hoseMeters} m`}
                      original={origDisplayItems.hoses} discounted={displayItems.hoses} hasDiscount={hasDiscount} />}
                    <PriceRow label="Umývanie mimo stavby" original={origDisplayItems.washing} discounted={displayItems.washing} hasDiscount={hasDiscount} />
                    <PriceRow label="Rozbehová chémia" original={origDisplayItems.chem} discounted={displayItems.chem} hasDiscount={hasDiscount} />
                    {result.waitIntervals > 0 && <PriceRow label={`Čakačky – ${result.waitLabel} (${result.waitIntervals}×)`}
                      original={origDisplayItems.waiting} discounted={displayItems.waiting} hasDiscount={hasDiscount} />}
                  </div>
                )}

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
                        <span className="font-bold text-white">Cena spolu s DPH (23%)</span>
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
                        <span>1× Pumpa ({PUMP_TRUCK_CAPACITY}m³){result.mixTrucksCount > 0 ? ` + ${result.mixTrucksCount}× Mix (${MIX_TRUCK_CAPACITY}m³)` : ""} = {result.trucks} vozidl{result.trucks === 1 ? "o" : result.trucks < 5 ? "á" : "á"}</span>
                      ) : (
                        <span>{result.trucks}× Mix ({MIX_TRUCK_CAPACITY}m³/vozidlo)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Export buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={exportPDF}
                    className="flex items-center justify-center gap-2 py-3 border border-white/20 text-white/70 hover:border-primary hover:text-primary transition-all text-sm font-semibold cursor-pointer rounded-sm">
                    <FileText className="w-4 h-4" /> EXPORT PDF
                  </button>
                  <button onClick={exportSMS}
                    className={cn("flex items-center justify-center gap-2 py-3 border transition-all text-sm font-semibold cursor-pointer rounded-sm",
                      smsCopied ? "border-green-500 text-green-400" : "border-white/20 text-white/70 hover:border-primary hover:text-primary"
                    )}>
                    <MessageSquare className="w-4 h-4" />
                    {smsCopied ? "SKOPÍROVANÉ!" : "EXPORT SMS"}
                  </button>
                </div>

                <a href="#contact" className="block w-full text-center py-3 bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-all">
                  Záväzne objednať →
                </a>
                <p className="text-[11px] text-white/30 text-center">* Cena je orientačná. Závisí od aktuálneho cenníka a dostupnosti.</p>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[420px] gap-4 text-center px-2">
              {loggedClient && (
                <div className="w-full bg-primary/8 border border-primary/20 rounded-lg px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest shrink-0">Vaše zľavy</span>
                    <span className="text-white/20 text-[10px]">·</span>
                    <span className="text-white/55 text-xs font-semibold truncate">{loggedClient.name}</span>
                    <span className="ml-auto text-[9px] text-white/25 shrink-0">ID: {loggedClient.clientId}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {discountBeton   > 0 && <span className="bg-primary/15 text-primary font-black px-2 py-0.5 rounded-sm text-[11px]">Betón −{discountBeton}%</span>}
                    {discountDoprava > 0 && <span className="bg-primary/15 text-primary font-black px-2 py-0.5 rounded-sm text-[11px]">Doprava −{discountDoprava}%</span>}
                    {discountSluzby  > 0 && <span className="bg-primary/15 text-primary font-black px-2 py-0.5 rounded-sm text-[11px]">Služby −{discountSluzby}%</span>}
                    {discountCelkovo > 0 && <span className="bg-primary/15 text-primary font-black px-2 py-0.5 rounded-sm text-[11px]">Celkovo −{discountCelkovo}%</span>}
                    {!hasDiscount && <span className="text-white/25 text-[11px]">Žiadna zľava</span>}
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
    </div>
  );
}
