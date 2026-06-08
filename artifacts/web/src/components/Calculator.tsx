import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Truck, LogIn, LogOut, FileText, FileSpreadsheet, FileType2, MessageSquare, Minus, Plus, Trash2, Table2, ShoppingCart, X, Info, Check, ExternalLink, MapPin, Copy, Navigation, Settings2, AlertTriangle, Timer, PenLine, Mountain, Waves } from "lucide-react";
import { OpenLocationCode } from "open-location-code";
import { cn, formatPhone, isValidSvkPhone } from "@/lib/utils";

declare global { function gtag(...args: unknown[]): void; }
function gtagEvent(name: string, params?: Record<string, unknown>) {
  if (typeof gtag !== "undefined") gtag("event", name, params ?? {});
}

const _olc = new OpenLocationCode();
function encodeOLC(lat: number, lng: number): string {
  try { return _olc.encode(lat, lng, 10); } catch { return `${lat.toFixed(4)},${lng.toFixed(4)}`; }
}
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function sharedLinkIcon(url: string): { Icon: React.ElementType; cls: string } {
  const u = url.toLowerCase();
  if (u.includes("spreadsheet") || u.includes(".xlsx") || u.includes(".xls") || u.includes("excel"))
    return { Icon: FileSpreadsheet, cls: "text-green-500" };
  if (u.includes(".pdf") || u.includes("/pdf"))
    return { Icon: FileText, cls: "text-red-400" };
  if (u.includes("document") || u.includes(".docx") || u.includes(".doc") || u.includes("word"))
    return { Icon: FileType2, cls: "text-blue-400" };
  return { Icon: ExternalLink, cls: "text-primary" };
}
function nowHHMM(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
function adjustHHMM(t: string, deltaMins: number): string {
  const [h, m] = t.split(":").map(Number);
  const total = ((h * 60 + m + deltaMins) % 1440 + 1440) % 1440;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

import { PhoneInput } from "@/components/PhoneInput";
import { adminData, getKamenivoGroup } from "@/lib/adminData";
import { clientAuth, type LoggedClient } from "@/lib/clientAuth";
import * as adminAuth from "@/lib/adminAuth";
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
const PUMP_HOURS = ["0 h", "1 h", "2 h", "3 h", "4 h", "5 h", "6 h", "7 h", "8 h"];
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

function kamenivoPrefix(name: string | null | undefined): string {
  if (!name) return '';
  const kg = getKamenivoGroup(name);
  return kg === 'drvene' ? '▲ ' : kg === 'riecne' ? '≋ ' : '';
}

function KamenivoIcon({ name, size = "sm" }: { name: string; size?: "sm" | "xs" }) {
  const kg = getKamenivoGroup(name);
  const cls = size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";
  if (kg === 'drvene') return <Mountain className={`${cls} shrink-0 text-stone-400`} />;
  if (kg === 'riecne') return <Waves className={`${cls} shrink-0 text-blue-400`} />;
  return null;
}

function CategorySelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-white/80 mb-2">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-white/10 border border-white/10 border-b-2 border-b-primary text-white px-4 py-3 text-sm font-medium rounded-sm focus:ring-0 focus:ring-offset-0 h-auto">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <KamenivoIcon name={value} size="xs" />
            <span className="truncate">{value || <span className="text-white/40 font-normal">Vyberte kategóriu</span>}</span>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-[#1e293b] border border-white/10 text-white z-[200]" side="bottom" position="popper" sideOffset={4}>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-white focus:bg-white/10 focus:text-primary cursor-pointer">
              <span className="flex items-center gap-1.5">
                <KamenivoIcon name={o} size="xs" />
                {o}
              </span>
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
  const selectedOpt = options.find(o => o.label === value);
  const selManual = selectedOpt ? manualPrices?.[selectedOpt.id] : undefined;
  const selDisplayPrice = selectedOpt ? (selManual !== undefined ? selManual : selectedOpt.price * discountFactor) : 0;
  const selShowStrike = selectedOpt ? Math.abs(selectedOpt.price - selDisplayPrice) > 0.001 : false;
  const cleanedVal = value ? cleanLabel(value) : "";
  // ≤18 znakov → 1 riadok (názov + cena vedľa); dlhší → 2 riadky (wrap + cena pod)
  // Reálne krátke názvy max 17 ch ("Betón C30/37R XF4"), prvý dlhý sufix 23 ch ("podlahový")
  const isShort = cleanedVal.length <= 18;

  const priceNode = selectedOpt ? (
    <span className="flex items-center gap-1 text-xs font-bold shrink-0">
      {selShowStrike && <s className="text-white/30 font-normal">{selectedOpt.price.toFixed(2)}</s>}
      <span className={selManual !== undefined ? "text-sky-400" : "text-primary"}>
        {selDisplayPrice.toFixed(2)} €/m³
      </span>
      {selManual !== undefined && (
        <span className="inline-flex items-center gap-0.5 bg-sky-400/20 text-sky-400 border border-sky-400/30 rounded px-1 py-px text-[8px] font-bold leading-none">
          <PenLine className="w-2 h-2" />M
        </span>
      )}
    </span>
  ) : null;

  return (
    <div>
      <label className="block text-sm font-semibold text-white/80 mb-2">{label}</label>
      <Select value={value} onValueChange={onChange}>
        {/*
          POZOR: SelectTrigger (shadcn) má [&>span]:line-clamp-1 → span children sa orežú.
          Riešenie: wrapper je <div> (nie <span>) → selektor [&>span] ho nechytí.
          line-clamp-none by nastavil display:block a rozbil by flex layout.
        */}
        <SelectTrigger className="w-full bg-white/10 border border-white/10 border-b-2 border-b-primary text-white px-4 py-3 text-sm font-medium rounded-sm focus:ring-0 focus:ring-offset-0 h-auto min-h-[48px] overflow-visible">
          <div className={cn(
            "flex-1 min-w-0 text-left whitespace-normal",
            !value || isShort ? "flex items-center gap-2" : "flex flex-col gap-0.5"
          )}>
            {!value ? (
              <span className="text-white/40 font-normal">Vyberte typ betónu</span>
            ) : isShort ? (
              /* 1 riadok: názov vľavo, cena vpravo */
              <>
                <span className="text-sm font-medium">{cleanedVal}</span>
                <span className="flex-1" />
                {priceNode}
              </>
            ) : (
              /* 2 riadky: dlhý názov zalomí, cena pod ním vpravo */
              <>
                <span className="text-sm font-medium leading-snug break-words whitespace-normal">{cleanedVal}</span>
                <div className="flex justify-end">{priceNode}</div>
              </>
            )}
          </div>
        </SelectTrigger>
        {/* Mobile scroll: bez position="popper" → Radix item-aligned mode, touch scroll funguje */}
        <SelectContent className="bg-[#1e293b] border border-white/10 text-white z-[200] max-h-[65vh] overflow-y-auto w-[var(--radix-select-trigger-width)]">
          {options.map((o) => {
            const manual = manualPrices?.[o.id];
            const displayPrice = manual !== undefined ? manual : o.price * discountFactor;
            const showStrike = Math.abs(o.price - displayPrice) > 0.001;
            const itemClean = cleanLabel(o.label);
            return (
              <SelectItem key={o.label} value={o.label} className="text-white focus:bg-white/10 focus:text-primary cursor-pointer py-2 !items-start">
                <span style={{display:'grid', gridTemplateColumns:'1fr auto', alignItems:'start', gap:'6px', width:'100%', minWidth:0}}>
                  <span style={{whiteSpace:'normal', wordBreak:'break-word', lineHeight:1.35, minWidth:0}}>{itemClean}</span>
                  <span style={{whiteSpace:'nowrap', fontSize:'0.75rem', fontWeight:700, paddingTop:'1px', flexShrink:0}}>
                    {showStrike && <><s style={{color:'rgba(255,255,255,0.3)', fontWeight:400}}>{o.price.toFixed(2)}</s>{" "}</>}
                    <span style={{color: manual !== undefined ? '#38bdf8' : '#EDC531'}}>{displayPrice.toFixed(2)} €/m³</span>
                    {manual !== undefined && (
                      <span className="inline-flex items-center gap-0.5 bg-sky-400/20 text-sky-400 border border-sky-400/30 rounded px-1 py-px text-[8px] font-bold leading-none ml-0.5">
                        <PenLine className="w-2 h-2" />M
                      </span>
                    )}
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

function PriceRow({ label, original, discounted, hasDiscount, isFillup, alwaysShow }: { label: React.ReactNode; original: number; discounted: number; hasDiscount: boolean; isFillup?: boolean; alwaysShow?: boolean }) {
  if (original === 0 && !alwaysShow) return null;
  if (isFillup) {
    return (
      <div className="flex justify-between items-center text-sm px-3 py-2 mt-1 rounded-sm" style={{ background: "rgba(44,46,67,0.7)" }}>
        <span className="text-primary font-semibold flex-1 pr-2">{label}</span>
        <div className="flex-1 mx-3 h-px" style={{ background: "linear-gradient(90deg,#EDC531 0%,transparent 100%)" }} />
        <span className="text-right flex-shrink-0">
          {hasDiscount && Math.abs(original - discounted) > 0.001 && <span className="line-through text-primary/35 text-xs block">{fmt(original)}</span>}
          <span className="font-bold text-primary">{fmt(discounted)}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-start text-sm py-1">
      <span className="text-white/70 flex-1 pr-2">{label}</span>
      <span className="text-right flex-shrink-0">
        {hasDiscount && Math.abs(original - discounted) > 0.001 && <span className="line-through text-white/35 text-xs block">{fmt(original)}</span>}
        <span className="font-semibold text-white">{fmt(discounted)}</span>
      </span>
    </div>
  );
}

export function ConcreteCalculator({ clientOverride }: { clientOverride?: import("@/lib/clientAuth").LoggedClient } = {}) {
  const [tab, setTab] = useState<Tab>("pumpa");
  const [tabInfoOpen, setTabInfoOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"distance" | "address" | "map">("distance");
  const [distance, setDistance] = useState("");
  const [address, setAddress] = useState("");
  const [addressKm, setAddressKm] = useState<number | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [mapPin, setMapPin] = useState<{lat: number; lng: number} | null>(null);
  const [mapPlusCode, setMapPlusCode] = useState("");
  const [mapLocality, setMapLocality] = useState("");
  const [mapGeocodedAddress, setMapGeocodedAddress] = useState("");
  const [mapKmConfirmed, setMapKmConfirmed] = useState(false);
  const [mapCopied, setMapCopied] = useState(false);
  const [mapError, setMapError] = useState("");
  const mapLocateFnRef = useRef<(() => void) | null>(null);
  const mapGeocodeAddrFnRef = useRef<((addr: string, autoConfirm?: boolean) => void) | null>(null);
  const mapSetPinAtRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const mapMarkerRef = useRef<google.maps.Marker | null>(null);
  const keepResultOnPinRef = useRef(false);
  const pendingGeocodeAddressRef = useRef<string | null>(null);
  const pendingGeocodePlaceRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastResolvedAddressRef = useRef<{ address: string; lat: number; lng: number } | null>(null);
  const [podmienkyEnabled, setPodmienkyEnabled] = useState(false);
  const [podmienkyTrucks, setPodmienkyTrucks] = useState(1);
  const [podmienkyPumpa, setPodmienkyPumpa] = useState(1);
  const [podmienkyMixC, setPodmienkyMixC] = useState(0);
  const [podmienkyInfoOpen, setPodmienkyInfoOpen] = useState(false);
  const calcWrapRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [concreteTypeLabel, setConcreteTypeLabel] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [pumpMode, setPumpMode] = useState<"select" | "timer" | "edit">("select");
  const [pumpHour, setPumpHour] = useState("1 h");
  const [pumpMin, setPumpMin] = useState("0 min");
  const [pumpStartTime, setPumpStartTime] = useState<string | null>(null);
  const [pumpStopTime, setPumpStopTime] = useState<string | null>(null);
  const [pumpTimerActive, setPumpTimerActive] = useState(false);
  const [pumpLiveMs, setPumpLiveMs] = useState(0);
  const [pumpFinalMs, setPumpFinalMs] = useState(0);
  const [editStartTime, setEditStartTime] = useState<string | null>(null);
  const [editStopTime, setEditStopTime] = useState<string | null>(null);
  const pumpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [waitHour, setWaitHour] = useState("0 h");
  const [waitMin, setWaitMin] = useState("0 min");
  const [waitPiecesPumpa, setWaitPiecesPumpa] = useState(0); // čakačka pumpa: kusy (1 kus = 15 min)
  const [waitPiecesMix, setWaitPiecesMix] = useState(0);    // čakačka mix KM režim: kusy (1 kus = 15 min)
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
  const [smsOrderCreated, setSmsOrderCreated] = useState(false);
  const [showPriceTable, setShowPriceTable] = useState(false);
  const [zimneOpatrenia, setZimneOpatrenia] = useState(false); // default OFF, user zapína manuálne
  const [revision, setRevision] = useState(0);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: loggedClientBase?.name ?? "", phone: loggedClientBase?.phone ? formatPhone(loggedClientBase.phone) : "", email: "", note: "" });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSubmittedBanner, setOrderSubmittedBanner] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [priceTableMode, setPriceTableMode] = useState<"faktura" | "hotovost">("faktura");

  useEffect(() => {
    if (!showResult) return;
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [showResult]);

  useEffect(() => {
    if (orderSubmittedBanner) setOrderSubmittedBanner(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, categoryName, concreteTypeLabel, tab, address, mapPlusCode, extraItems]);

  const TURNSTILE_SITE_KEY = "0x4AAAAAADWD_zkdQ7J1SIxm";
  useEffect(() => {
    const el = turnstileRef.current;
    if (!el) return;
    const w = window as Window & { turnstile?: { render: (el: HTMLElement, opts: object) => string; reset: (id: string) => void; remove: (id: string) => void } };
    const render = () => {
      if (!w.turnstile || !turnstileRef.current) return;
      turnstileWidgetId.current = w.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
        size: "invisible",
        appearance: "interaction-only",
      });
    };
    if (w.turnstile) { render(); } else {
      const s = document.querySelector('script[src*="turnstile"]');
      s?.addEventListener("load", render, { once: true });
    }
    return () => {
      if (turnstileWidgetId.current && w.turnstile) w.turnstile.remove(turnstileWidgetId.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setQuantity("");
    setDistance("");
    setAddress("");
    setAddressKm(null);
    setDeliveryMode("distance");
    setMapPin(null); setMapPlusCode(""); setMapKmConfirmed(false); setMapError(""); setMapLocality(""); setMapGeocodedAddress("");
    setCategoryName(null);
    setConcreteTypeLabel(null);
    setPumpMode("select"); setPumpHour("0 h"); setPumpMin("0 min");
    setPumpStartTime(null); setPumpStopTime(null);
    setEditStartTime(null); setEditStopTime(null);
    setPumpTimerActive(false);
    setPumpLiveMs(0);
    if (pumpTimerRef.current) { clearInterval(pumpTimerRef.current); pumpTimerRef.current = null; }
    setWaitHour("0 h");
    setWaitMin("0 min");
    setWaitPiecesPumpa(0);
    setWaitPiecesMix(0);
    setHoseMeters(0);
    setWashing(false);
    setZimneOpatrenia(false);
    setExtraItems([]);
    setShowResult(false);
  };

  useEffect(() => {
    const handler = () => setRevision((r) => r + 1);
    window.addEventListener("admin-data-synced", handler);
    // Cross-tab sync: storage event fires in OTHER tabs when localStorage changes
    const storageHandler = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("msbeton_")) setRevision((r) => r + 1);
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("admin-data-synced", handler);
      window.removeEventListener("storage", storageHandler);
    };
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

  // Reset podmienky + timer pri zmene tabu
  useEffect(() => {
    setPodmienkyEnabled(false); setPodmienkyPumpa(1); setPodmienkyMixC(0); setPodmienkyTrucks(1);
    setPumpStartTime(null); setPumpStopTime(null); setPumpTimerActive(false); setPumpLiveMs(0);
    if (pumpTimerRef.current) { clearInterval(pumpTimerRef.current); pumpTimerRef.current = null; }
  }, [tab]);

  useEffect(() => { return () => { if (pumpTimerRef.current) clearInterval(pumpTimerRef.current); }; }, []);

  useEffect(() => {
    if (!showPriceTable) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowPriceTable(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showPriceTable]);

  // Google Maps Autocomplete + DistanceMatrix pre adresný režim
  useEffect(() => {
    if (deliveryMode === "distance") return;
    if (typeof google !== "undefined" && google.maps?.places) return;
    if (document.querySelector('script[src*="maps.googleapis.com"]')) return;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [deliveryMode]);

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
        // Uloží lat/lng pre okamžité umiestnenie pinu pri prepnutí na mapu
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat(), lng = place.geometry.location.lng();
          pendingGeocodePlaceRef.current = { lat, lng };
          lastResolvedAddressRef.current = { address: place.formatted_address, lat, lng };
        }
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

  // Map mode — Google Maps interactive picker
  useEffect(() => {
    if (deliveryMode !== "map" || mapKmConfirmed) return;
    const ORIGIN = { lat: 49.204417, lng: 18.729029 };
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const initMapMode = () => {
      const mapEl = document.getElementById("calculator-map");
      if (!mapEl) return;
      if (mapEl.childElementCount > 0) {
        // Mapa už inicializovaná (re-vstup) — len spusti pending geocode/place
        const pendingPlace = pendingGeocodePlaceRef.current;
        const pendingAddr = pendingGeocodeAddressRef.current;
        pendingGeocodePlaceRef.current = null;
        pendingGeocodeAddressRef.current = null;
        if (pendingPlace && mapSetPinAtRef.current) {
          mapSetPinAtRef.current(pendingPlace.lat, pendingPlace.lng, true);  // preserve address
        } else if (pendingAddr && mapGeocodeAddrFnRef.current) {
          mapGeocodeAddrFnRef.current(pendingAddr);
        }
        return;
      }

      const map = new google.maps.Map(mapEl, {
        center: ORIGIN, zoom: 11,
        mapTypeId: "hybrid",
        disableDefaultUI: true, zoomControl: true,
        gestureHandling: "cooperative",
        restriction: { latLngBounds: { north: 49.6, south: 47.7, east: 22.6, west: 16.8 }, strictBounds: false },
      });

      let marker: google.maps.Marker | null = null;

      const setPinAt = (lat: number, lng: number, preserveAddress = false, autoConfirmAfterDM = false) => {
        const pos = { lat, lng };
        if (marker) marker.setPosition(pos);
        else marker = new google.maps.Marker({ position: pos, map, animation: google.maps.Animation.DROP });
        mapMarkerRef.current = marker;
        map.setZoom(17);
        map.panTo(pos);
        setMapPin({ lat, lng });
        setMapPlusCode(encodeOLC(lat, lng));
        if (!keepResultOnPinRef.current) setShowResult(false);
        keepResultOnPinRef.current = false;
        setMapError("");
        if (!preserveAddress) {
          setAddress("");
          if (addressInputRef.current) addressInputRef.current.value = "";
          lastResolvedAddressRef.current = null;
        }
        // Distance Matrix — autoConfirmAfterDM: confirm pin only after km is known
        new google.maps.DistanceMatrixService().getDistanceMatrix(
          { origins: [ORIGIN], destinations: [pos], travelMode: google.maps.TravelMode.DRIVING, unitSystem: google.maps.UnitSystem.METRIC },
          (response, status) => {
            if (status === "OK" && response) {
              const el = response.rows[0]?.elements[0];
              if (el?.status === "OK") {
                const oneWayKm = el.distance.value / 1000;
                setAddressKm(oneWayKm);
                setDistance(String(Math.round((oneWayKm * 2 + 2) * 10) / 10));
                if (autoConfirmAfterDM) setMapKmConfirmed(true);
                return;
              }
            }
            const fallback = haversineKm(ORIGIN.lat, ORIGIN.lng, lat, lng);
            setAddressKm(fallback);
            setDistance(String(Math.round((fallback * 2 + 2) * 10) / 10));
            if (autoConfirmAfterDM) setMapKmConfirmed(true);
          }
        );
      };

      // Uloží setPinAt do refu — prístupný aj z early-return path pri re-vstupe
      mapSetPinAtRef.current = setPinAt;

      const reverseGeocode = (lat: number, lng: number) => {
        new google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, gStatus) => {
          if (gStatus !== "OK" || !results || !results[0]) {
            setMapLocality("");
            setMapGeocodedAddress("");
            return;
          }
          const country = results[0].address_components?.find(
            (c: google.maps.GeocoderAddressComponent) => c.types.includes("country")
          );
          if (country && country.short_name !== "SK") {
            setMapError("Dodávky betónu sú dostupné iba na území Slovenska.");
            if (marker) { marker.setMap(null); marker = null; mapMarkerRef.current = null; }
            setMapPin(null); setMapPlusCode(""); setMapLocality(""); setMapGeocodedAddress(""); setDistance("");
          } else {
            const comps = results[0].address_components ?? [];
            const loc = comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("locality"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("postal_town"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_3"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_4"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("sublocality_level_1"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("neighborhood"))?.long_name
              ?? "";
            const district = comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_2"))?.long_name ?? "";
            setMapLocality([loc, district].filter(Boolean).join(", "));
            const rawAddr = results[0].formatted_address.replace(/, Slovensko$/, "").replace(/, Slovakia$/, "");
            // Ak formatted_address je len PlusCode (žiadna ulica) → použi locality fallback alebo koordináty
            const localityStr = [loc, district].filter(Boolean).join(", ");
            const hasPlusCodePrefix = /^[A-Z0-9+]{6,}/i.test(rawAddr) && rawAddr.includes("+");
            const addr = hasPlusCodePrefix
              ? (localityStr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
              : rawAddr;
            setMapGeocodedAddress(addr);
            setAddress(addr);
            if (addressInputRef.current) addressInputRef.current.value = addr;
          }
        });
      };

      mapLocateFnRef.current = () => {
        navigator.geolocation?.getCurrentPosition(
          pos => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            map.setCenter({ lat, lng }); map.setZoom(15);
            setPinAt(lat, lng);
            reverseGeocode(lat, lng);
          },
          () => {}
        );
      };

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat(), lng = e.latLng.lng();
        setMapError("");
        setPinAt(lat, lng);        // okamžitý pin + okamžite vymaže adresu
        reverseGeocode(lat, lng);  // async: SK validácia + doplní adresu
      });

      // Geocode adresu a umiestni pin — volateľné aj zvonka cez ref (Enter v inpute, paste, adresa→mapa)
      // autoConfirm=true: po úspešnom geocode automaticky potvrdí polohu (bez kliknutia "Potvrdiť polohu")
      mapGeocodeAddrFnRef.current = (addr: string, autoConfirm = false) => {
        new google.maps.Geocoder().geocode({ address: addr, region: "SK" }, (results, gStatus) => {
          if (gStatus === "OK" && results && results[0]) {
            const loc = results[0].geometry.location;
            const resolvedAddr = results[0].formatted_address;
            map.setCenter({ lat: loc.lat(), lng: loc.lng() });
            map.setZoom(15);
            setPinAt(loc.lat(), loc.lng(), true, autoConfirm);  // autoConfirm fires after DM resolves
            setAddress(resolvedAddr);
            lastResolvedAddressRef.current = { address: resolvedAddr, lat: loc.lat(), lng: loc.lng() };
            if (addressInputRef.current) addressInputRef.current.value = resolvedAddr;
            setMapGeocodedAddress(resolvedAddr.replace(/, Slovensko$/, "").replace(/, Slovakia$/, ""));
            const comps = results[0].address_components ?? [];
            const village = comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("locality"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("postal_town"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_3"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_4"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("sublocality_level_1"))?.long_name
              ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("neighborhood"))?.long_name
              ?? "";
            const district = comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_2"))?.long_name ?? "";
            setMapLocality([village, district].filter(Boolean).join(", "));
          }
        });
      };

      // Pre-fill z adresného režimu — preferuj priame lat/lng z autocomplete (okamžité)
      const pendingPlace = pendingGeocodePlaceRef.current;
      const pendingAddr = pendingGeocodeAddressRef.current;
      pendingGeocodePlaceRef.current = null;
      pendingGeocodeAddressRef.current = null;
      if (pendingPlace) {
        map.setCenter(pendingPlace); map.setZoom(15);
        setPinAt(pendingPlace.lat, pendingPlace.lng, true);  // preserve address z autocomplete
      } else if (pendingAddr) {
        mapGeocodeAddrFnRef.current(pendingAddr);
      } else if (address && !mapPin) {
        mapGeocodeAddrFnRef.current(address);
      }

      // Auto-locate ak nie je adresa
      if (!address && !pendingPlace) {
        navigator.geolocation?.getCurrentPosition(
          pos => { map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); map.setZoom(13); },
          () => {}
        );
      }
    };

    const tryInit = () => {
      if (typeof google === "undefined" || !google.maps?.places) return false;
      if (!document.getElementById("calculator-map")) return false;
      initMapMode();
      return true;
    };

    if (!tryInit()) {
      intervalId = setInterval(() => { if (tryInit()) clearInterval(intervalId!); }, 200);
    }
    // Nemazať mapLocateFnRef — zostáva platný pri re-vstupe do map modu
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [deliveryMode, mapKmConfirmed]);

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
    if (!loggedClientState) return loggedClientState;
    if (loggedClientState.id === "admin") {
      const owner = allClients.find(c => c.isOwner);
      return owner?.sharedLink ? { ...loggedClientState, sharedLink: owner.sharedLink } : loggedClientState;
    }
    const fresh = allClients.find(c => c.id === loggedClientState.id);
    if (!fresh) return loggedClientState;
    return {
      ...loggedClientState,
      manualPrices:        fresh.manualPrices,
      discountBeton:       fresh.discountBeton       ?? loggedClientState.discountBeton,
      discountDoprava:     fresh.discountDoprava     ?? loggedClientState.discountDoprava,
      discountSluzby:      fresh.discountSluzby      ?? loggedClientState.discountSluzby,
      discountCelkovo:     fresh.discountCelkovo     ?? loggedClientState.discountCelkovo,
      canHotovost:         fresh.canHotovost         ?? loggedClientState.canHotovost,
      canPridatBeton:      fresh.canPridatBeton      ?? loggedClientState.canPridatBeton,
      canPridatBetonOwn:   fresh.canPridatBetonOwn   ?? loggedClientState.canPridatBetonOwn,
      canZimneOpatrenia:   fresh.canZimneOpatrenia   ?? loggedClientState.canZimneOpatrenia,
      allowExtraOverload:  fresh.allowExtraOverload  ?? loggedClientState.allowExtraOverload,
      hotovostDph:         fresh.hotovostDph,
      deliveryZoneId:      fresh.deliveryZoneId,
      sharedLink:          fresh.sharedLink          ?? loggedClientState.sharedLink,
      smsOrderDisabled:    fresh.smsOrderDisabled    ?? loggedClientState.smsOrderDisabled,
      smsShareOnly:        fresh.smsShareOnly        ?? loggedClientState.smsShareOnly,
    };
  }, [clientOverride, loggedClientState, allClients]);

  const isAdminMode = clientOverride !== undefined || adminAuth.isLoggedIn();

  // Klientova zóna dopravy (podľa deliveryZoneId, fallback = prvá zóna)
  const clientDeliveryZone = useMemo(() => {
    if (loggedClient?.deliveryZoneId)
      return allDelivery.find(z => z.id === loggedClient.deliveryZoneId) ?? allDelivery[0];
    return allDelivery[0] ?? null;
  }, [loggedClient, allDelivery]);

  // Dynamické kapacity vozidiel podľa zóny
  const pumpCap = clientDeliveryZone?.pumpTruckCapacity ?? PUMP_TRUCK_CAPACITY;
  const mixCap  = clientDeliveryZone?.truckCapacity ?? MIX_TRUCK_CAPACITY;

  // Instant recount podmienky stepperov pri zmene množstva
  useEffect(() => {
    if (!podmienkyEnabled) return;
    const q = parseFloat(quantity) || 0;
    // inline calcPumpTrucks(q, pumpCap, mixCap)
    let autoMixP = 0;
    if (q > 0) { let r = q - pumpCap; let t = 1; while (r > 0) { r -= mixCap; t++; } autoMixP = Math.max(0, t - 1); }
    const autoTrucksM = q > 0 ? Math.max(1, Math.ceil(q / mixCap)) : 1;
    setPodmienkyPumpa(1);
    setPodmienkyMixC(autoMixP);
    setPodmienkyTrucks(autoTrucksM);
  }, [quantity, pumpCap, mixCap]); // podmienkyEnabled intentionally excluded — recount iba pri zmene qty/kapacity

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
  // Čerpanie: manual override > service price (zona override zrušená, rate je v Službách)
  const pumpServicePrice = mp[pumpSvc?.id ?? ""] !== undefined
    ? mp[pumpSvc!.id]
    : (pumpSvc?.price ?? 112.50);
  const chemServicePrice = mp[chemSvc?.id ?? ""] !== undefined ? mp[chemSvc!.id] : (chemSvc?.price ?? 31.25);
  const washServicePrice = mp[washSvc?.id ?? ""] ?? washSvc?.price ?? 56.25;
  // Čakačka: manual override > service price (zónový waitingRate je legacy — ignoruj)
  const waitServicePricePumpa = mp[waitPumpaSvc?.id ?? ""] !== undefined
    ? mp[waitPumpaSvc!.id]
    : (waitPumpaSvc?.price ?? 8.00);
  const waitServicePriceMix = mp[waitMixSvc?.id ?? ""] !== undefined
    ? mp[waitMixSvc!.id]
    : (waitMixSvc?.price ?? 8.00);
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

  function calcTransport(km: number, qty: number, tabType: Tab, dZone: typeof clientDeliveryZone, overrideTrucks?: number): { cost: number; isMin: boolean; fillupM3: number; fillupCost: number } {
    if (km === 0) return { cost: 0, isMin: false, fillupM3: 0, fillupCost: 0 };

    const pType = dZone?.pricingType ?? "standard";
    const trucks = overrideTrucks ?? (tabType === "pumpa" ? calcPumpTrucks(qty) : Math.ceil(qty / mixCap));
    const minimumFee = tsettings.minimumFee ?? 62.50;

    if (pType === "km") {
      const mp = loggedClient?.manualPrices ?? {};
      const baseRate = dZone?.ratePerKm ?? 1.8;
      const rate = mp[`km_rate_${dZone?.id}`] ?? baseRate;
      const effectiveKm = Math.max(km, dZone?.minKm ?? 0);
      const cost = effectiveKm * rate * trucks;
      const isPumpaTab = tabType === "pumpa";
      const kmMinFeeBase = isPumpaTab
        ? (dZone?.minimumFeeKmPumpa ?? dZone?.minimumFeeKm)
        : (dZone?.minimumFeeKmMix ?? dZone?.minimumFeeKm);
      const kmMinFeeKey = isPumpaTab ? `km_min_pumpa_${dZone?.id}` : `km_min_mix_${dZone?.id}`;
      const kmMinFee = mp[kmMinFeeKey] !== undefined ? mp[kmMinFeeKey] : kmMinFeeBase;
      const minCost = kmMinFee != null ? trucks * kmMinFee : 0;
      const isMin = !!(kmMinFee != null && trucks > 0 && cost / trucks < kmMinFee);
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

    const fillupMin = tsettings.minimumLoadM3 ?? 5;
    let fillupM3 = 0;
    if (overrideTrucks) {
      const qtyPerTruck = qty / overrideTrucks;
      let fillupPerTruck = 0;
      if (qtyPerTruck < fillupMin) fillupPerTruck = fillupMin - qtyPerTruck;
      // overloaded trucks (qPT > cap) → no fill-up; admin chose fewer trucks intentionally
      fillupM3 = Math.round(Math.max(0, fillupPerTruck) * overrideTrucks * 10) / 10;
    } else if (tabType === "pumpa") {
      if (qty < fillupMin) fillupM3 = fillupMin - qty;
      else if (qty > pumpCap && qty < 2 * fillupMin) fillupM3 = 2 * fillupMin - qty;
    } else {
      if (qty < fillupMin) fillupM3 = fillupMin - qty;
      else if (qty > mixCap && qty < 2 * fillupMin) fillupM3 = 2 * fillupMin - qty;
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
      label: string; qty: number; categoryName: string;
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
    const totPodm = tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks;
    const effTrucksOverride = podmienkyEnabled && totPodm > 0 ? totPodm : undefined;
    const mainTC_raw = isOwn ? zeroTC : calcTransport(km, qty + addToMainQty, tab, clientDeliveryZone, effTrucksOverride);
    const mainTC = mainTC_raw;
    const mainTrucks = effTrucksOverride ?? (tab === "pumpa" ? calcPumpTrucks(qty + addToMainQty) : Math.ceil((qty + addToMainQty) / mixCap));
    concreteBreakdown.push({
      label: `Betón ${cleanType(selectedType.label)} – ${qty} m³`,
      qty, categoryName: selectedCategory?.name ?? categoryName ?? "",
      bezDph: qty * selectedType.price,
      bezDphFinal: mainManual !== undefined ? qty * mainManual : qty * selectedType.price * betonFactor,
      bezDphFinalHotovost: mainManual !== undefined ? qty * mainManual * (1 + VAT_HOTOVOST) : qty * selectedType.price * betonFactor * (1 + VAT_HOTOVOST),
      transport: mainTC.cost,
      transportFillup: mainTC.fillupCost,
      transportFillupM3: mainTC.fillupM3,
      transportFillupTarget: mainTC.fillupM3 > 0 ? Math.round((qty + mainTC.fillupM3) * 10) / 10 : 0,
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
        const extraTrucks = (item.transportMode === "addToMain" || item.transportMode === "none") ? 0 : (tab === "pumpa" ? calcPumpTrucks(q) : Math.ceil(q / mixCap));
        // Per-item services
        let svcPumpHrs = 0, svcPumpMs = 0, svcPumpCost = 0;
        let svcHoseMeters = 0, svcHoseCost = 0;
        let svcWashing = false, svcWashCost = 0;
        let svcWaitIntervals = 0, svcWaitCost = 0, svcWaitLabel = "";
        if (item.svc) {
          const s = item.svc;
          if (tab === "pumpa") {
            svcPumpHrs = parseInt(s.pumpHour) || 0;
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
            svcWaitIntervals = Math.ceil(Math.max(0, wm - (tsettings.waitFreeMinutesMix ?? 30)) / (tsettings.waitIntervalMinutes ?? 15));
            svcWaitCost = svcWaitIntervals * waitServicePriceMix;
            const wh = parseInt(s.waitHour) || 0;
            const wmm = parseInt(s.waitMin) || 0;
            svcWaitLabel = [wh > 0 ? `${wh} h` : "", wmm > 0 ? `${wmm} min` : ""].filter(Boolean).join(" ");
          }
        }
        concreteBreakdown.push({
          label: `Betón ${cleanType(t.label)} – ${q} m³`,
          qty: q, categoryName: item.categoryName ?? allCategories.find(c => c.types.some(t => t.label === item.typeLabel))?.name ?? "",
          bezDph: q * t.price,
          bezDphFinal: itemManual !== undefined ? q * itemManual : q * t.price * betonFactor,
          bezDphFinalHotovost: itemManual !== undefined ? q * itemManual * (1 + VAT_HOTOVOST) : q * t.price * betonFactor * (1 + VAT_HOTOVOST),
          transport: extraTC.cost,
          transportFillup: extraTC.fillupCost,
          transportFillupM3: extraTC.fillupM3,
          transportFillupTarget: extraTC.fillupM3 > 0 ? Math.round((q + extraTC.fillupM3) * 10) / 10 : 0,
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
    // Pump billing: select=h+min direct, timer/edit=start-stop diff → ceil to 15-min blocks
    let _pumpDurMins = 0;
    if (tab === "pumpa") {
      if (pumpMode === "select") {
        const hrs = parseInt(pumpHour) || 0;
        const ms = parseInt(pumpMin) || 0;
        _pumpDurMins = hrs * 60 + ms;
      } else if (pumpMode === "timer" && pumpStartTime && pumpStopTime) {
        const [sh, sm] = pumpStartTime.split(":").map(Number);
        const [eh, em] = pumpStopTime.split(":").map(Number);
        _pumpDurMins = (eh * 60 + em) - (sh * 60 + sm);
        if (_pumpDurMins < 0) _pumpDurMins += 24 * 60;
        // same-minute start+stop → use actual elapsed as fallback (min 1 min)
        if (_pumpDurMins === 0 && pumpFinalMs > 0) _pumpDurMins = Math.max(1, Math.ceil(pumpFinalMs / 60000));
      } else if (pumpMode === "edit" && editStartTime && editStopTime) {
        const [sh, sm] = editStartTime.split(":").map(Number);
        const [eh, em] = editStopTime.split(":").map(Number);
        _pumpDurMins = (eh * 60 + em) - (sh * 60 + sm);
        if (_pumpDurMins < 0) _pumpDurMins += 24 * 60;
      }
    }
    const _pumpBlocks = _pumpDurMins > 0 ? Math.ceil(_pumpDurMins / 15) : 0;
    const _pumpBillingMins = _pumpBlocks * 15;
    const pumpHrs = Math.floor(_pumpBillingMins / 60);
    const pumpMs = _pumpBillingMins % 60;
    const pumpDurMins = _pumpDurMins;
    const pumpBlocks = _pumpBlocks;
    const pumpCost = tab === "pumpa" ? (_pumpBillingMins / 60) * pumpServicePrice : 0;

    // Čakačky: pumpa = kusy (1 kus = 15 min), mix = hodiny+minúty alebo kusy (KM klient)
    const waitIntervalsPumpa = waitPiecesPumpa;
    const waitIntervalsMix = clientDeliveryZone?.pricingType === "km"
      ? waitPiecesMix
      : Math.ceil(Math.max(0, waitTotalMins - (tsettings.waitFreeMinutesMix ?? 30)) / (tsettings.waitIntervalMinutes ?? 15));
    const waitIntervals = tab === "pumpa" ? waitIntervalsPumpa : waitIntervalsMix;

    const transportCalc = { cost: totalTransportCost, isMin: concreteBreakdown[0] ? (isOwn ? false : calcTransport(km, qty, tab, clientDeliveryZone, effTrucksOverride).isMin) : false, fillupM3: concreteBreakdown[0]?.transportFillupM3 ?? 0, fillupCost: totalFillupCost };

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
      : clientDeliveryZone?.pricingType === "km"
        ? `${waitPiecesMix} ks`
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
    const fillupTarget = fillupM3 > 0 ? Math.round((qty + fillupM3) * 10) / 10 : 0;

    return {
      trucks, truckCapacity, mixTrucksCount, items, totalBezDph, totalSDph: totalBezDph * (1 + VAT),
      discountedItems, totalDiscBezDph, totalDiscSDph,
      hotovostBaseItems, hotovostDiscItems, hotovostTotal, hotovostOrigTotal,
      qty, totalQty, km, waitIntervals, waitLabel, pumpHrs, pumpMs, pumpDurMins, pumpBlocks, isOwn, concreteBreakdown, transportZone,
      transportIsMin: transportCalc.isMin, fillupM3, fillupTarget,
      fTransport, fFillup,
    };
  }, [tab, pumpMode, pumpHour, pumpMin, quantity, distance, categoryName, selectedType, pumpStartTime, pumpStopTime, pumpFinalMs, editStartTime, editStopTime, waitTotalMins, waitPiecesPumpa, waitPiecesMix, hoseMeters, washing, zimneOpatrenia, betonFactor, dopravaFactor, sluzbyFactor, fPump, fChem, fWash, fHose, fWaitP, fWaitM, pumpServicePrice, chemServicePrice, washServicePrice, waitServicePricePumpa, waitServicePriceMix, hoseServicePrice, zimneServicePrice, tzones, tsettings, extraItems, allCategories, clientDeliveryZone, pumpCap, mixCap, VAT, VAT_HOTOVOST, loggedClient, podmienkyEnabled, podmienkyTrucks, podmienkyPumpa, podmienkyMixC]);

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
    gtagEvent("pdf_export", { tab, quantity, type: selectedType?.label });
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
    const fmtQ = (n: number) => parseFloat(n.toFixed(2)).toString();

    // Table row: # | Popis | Množstvo | Jedn. cena | Spolu
    let rowNum = 0;
    const trow = (popis: string, mnozstvo: string, jednCena: string, orig: number, disc: number, sectionBg?: string, forceShow?: boolean) => {
      if (orig === 0 && disc === 0 && !forceShow) return "";
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

    const transRateStr = (origTotal: number, qty: number, factor: number) => {
      if (qty <= 0 || origTotal <= 0) return "—";
      const origRate = origTotal / qty;
      const discRate = origRate * factor;
      if (hasDiscount && Math.abs(origRate - discRate) > 0.001)
        return `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(origRate)}&nbsp;€/m³</span><br>${fmtN(discRate)}&nbsp;€/m³`;
      return `${fmtN(discRate)}&nbsp;€/m³`;
    };

    const svcRateStr = (rate: number, suffix: string, factor = sluzbyFactor) => {
      const discRate = rate * factor;
      if (hasDiscount && Math.abs(rate - discRate) > 0.001)
        return `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(rate)}&nbsp;${suffix}</span><br>${fmtN(discRate)}&nbsp;${suffix}`;
      return `${fmtN(discRate)}&nbsp;${suffix}`;
    };

    // Build rows — main item only (extras handled separately in extraRows)
    const mainCI = result.concreteBreakdown[0];
    const mainCatName = mainCI?.categoryName ?? "";
    const mainBetonTypeName = mainCI?.label.replace(/ – [\d.,]+ m³$/, "") ?? "";
    const mainBetonLabel = mainCatName ? kamenivoPrefix(mainCatName) + mainCatName : mainBetonTypeName;
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

    const pdfTrucks = tab === "pumpa"
      ? `1×Pumpa${result.mixTrucksCount > 0 ? `+${result.mixTrucksCount}×Mix` : ""}`
      : `${result.trucks}×Mix`;
    const pdfAddToMainQty = extraItems.reduce((s, i) => { const q = parseFloat(i.quantity || "0") || 0; return (q > 0 && i.transportMode === "addToMain") ? s + q : s; }, 0);
    const pdfZone = result.transportZone ? `${result.transportZone.fromKm}–${result.transportZone.toKm}&nbsp;km` : "";
    const pdfPrefix = result.transportIsMin ? "Min. doprava" : "Doprava";
    const hlavnaBadge = pdfAddToMainQty > 0
      ? `<span style="display:inline-block;background:#1d4ed8;color:#fff;font-weight:900;font-size:6pt;padding:1px 5px;border-radius:3px;vertical-align:middle;letter-spacing:0.04em;margin-right:5px">&#9673;&nbsp;HLAVNÁ</span>`
      : "";
    const dopravaLabel = `${hlavnaBadge}${pdfPrefix}${pdfZone ? ` ${pdfZone}` : ""} · ${pdfTrucks}${podmienkyEnabled ? " ★" : ""}`;
    const podmienkyMixCount = tab === "pumpa" ? podmienkyMixC : podmienkyTrucks;
    const podmienkyTotalTrucks = tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks;
    const podmienkyFillupM3pdf = result.concreteBreakdown[0]?.transportFillupM3 ?? 0;
    const podmienkyM3PerTruck = podmienkyEnabled && podmienkyTotalTrucks > 0 ? Math.round(((result.qty + podmienkyFillupM3pdf) / podmienkyTotalTrucks) * 10) / 10 : 0;
    const podmienkyVehicleStr = tab === "pumpa"
      ? `${podmienkyPumpa}× Pumpa${podmienkyMixC > 0 ? ` + ${podmienkyMixC}× Mix` : ""}`
      : `${podmienkyTrucks}× Mix`;
    const isRiskZonePdf = podmienkyEnabled && (
      tab === "pumpa" ? (podmienkyPumpa * pumpCap + podmienkyMixC * mixCap) < result.qty
                      : podmienkyTrucks * mixCap < result.qty
    );
    const podmienkyNoteRow = podmienkyEnabled
      ? isRiskZonePdf
        ? `<tr><td colspan="5" style="background:#fef2f2;color:#991b1b;font-size:7pt;padding:4px 8px 4px 12px;border-top:1px solid #fca5a5">⚠ RIZIKOVÉ PRETAŽENIE — vlastné riziko: ${podmienkyVehicleStr} · ∅ ${podmienkyM3PerTruck} m³/vozidlo — schválené vodicom</td></tr>`
        : `<tr><td colspan="5" style="background:#fffbeb;color:#92400e;font-size:7pt;padding:4px 8px 4px 12px;border-top:1px solid #fde68a">★ Pretaženie: ${podmienkyVehicleStr} · ∅ ${podmienkyM3PerTruck} m³/vozidlo — terén / počasie</td></tr>`
      : "";
    const mainTransportOrig = mainCI?.transport ?? 0;
    const mainTransportDisc = mainTransportOrig * result.fTransport;
    const mainPricingType = clientDeliveryZone?.pricingType ?? "standard";
    const mainMinFeePerTruck = (() => {
      if (mainPricingType === "km") {
        const mpKm = loggedClient?.manualPrices ?? {};
        const kmMinKey = tab === "pumpa" ? `km_min_pumpa_${clientDeliveryZone?.id}` : `km_min_mix_${clientDeliveryZone?.id}`;
        const kmMinBase = tab === "pumpa"
          ? (clientDeliveryZone?.minimumFeeKmPumpa ?? clientDeliveryZone?.minimumFeeKm)
          : (clientDeliveryZone?.minimumFeeKmMix ?? clientDeliveryZone?.minimumFeeKm);
        return mpKm[kmMinKey] !== undefined ? mpKm[kmMinKey] : (kmMinBase ?? 0);
      }
      if (mainPricingType === "auto") return clientDeliveryZone?.minimumFeeAuto ?? 0;
      const mpLocal = loggedClient?.manualPrices ?? {};
      return mpLocal["min_fee"] !== undefined ? mpLocal["min_fee"] : (tsettings.minimumFee ?? 62.50);
    })();
    const mainMinFeeDisc = mainMinFeePerTruck * result.fTransport;
    const mpPdf = loggedClient?.manualPrices ?? {};
    const buildTransportUnitStr = (isMin: boolean, qty: number) => {
      if (isMin && mainMinFeePerTruck > 0) {
        return hasDiscount && Math.abs(mainMinFeePerTruck - mainMinFeeDisc) > 0.001
          ? `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(mainMinFeePerTruck)}&nbsp;€/auto</span><br>${fmtN(mainMinFeeDisc)}&nbsp;€/auto`
          : `${fmtN(mainMinFeeDisc)}&nbsp;€/auto`;
      }
      if (mainPricingType === "auto") {
        const origRate = mpPdf[`auto_rate_${clientDeliveryZone?.id}`] ?? clientDeliveryZone?.ratePerTruck ?? 0;
        const discRate = origRate * result.fTransport;
        if (origRate <= 0) return "—";
        return hasDiscount && Math.abs(origRate - discRate) > 0.001
          ? `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(origRate)}&nbsp;€/auto</span><br>${fmtN(discRate)}&nbsp;€/auto`
          : `${fmtN(discRate)}&nbsp;€/auto`;
      }
      if (mainPricingType === "km") {
        const origRate = mpPdf[`km_rate_${clientDeliveryZone?.id}`] ?? clientDeliveryZone?.ratePerKm ?? 1.8;
        const discRate = origRate * result.fTransport;
        return hasDiscount && Math.abs(origRate - discRate) > 0.001
          ? `<span style="text-decoration:line-through;color:#bbb;font-size:7.5pt">${fmtN(origRate)}&nbsp;€/km</span><br>${fmtN(discRate)}&nbsp;€/km`
          : `${fmtN(discRate)}&nbsp;€/km`;
      }
      return transRateStr(mainTransportOrig, qty, result.fTransport);
    };
    const transportUnitStr = buildTransportUnitStr(result.transportIsMin, result.qty);
    const truckWord = (n: number) => n === 1 ? "auto" : "autá";
    const mainTransportMnozstvo = result.transportIsMin
      ? `${result.trucks}&nbsp;${truckWord(result.trucks)}&nbsp;(${result.qty}&nbsp;m³)`
      : pdfAddToMainQty > 0
        ? `${result.trucks}&nbsp;${truckWord(result.trucks)}&nbsp;(${result.qty}+${fmtQ(pdfAddToMainQty)}&nbsp;m³)`
        : `${result.trucks}&nbsp;${truckWord(result.trucks)}&nbsp;(${result.qty}&nbsp;m³)`;
    const transportRow = mainTransportOrig > 0
      ? trow(dopravaLabel, mainTransportMnozstvo, transportUnitStr, mainTransportOrig, mainTransportDisc)
      : "";
    const mainFillupOrig = mainCI?.transportFillup ?? 0;
    const mainFillupDisc = mainFillupOrig * result.fFillup;
    const fillupRow = mainFillupOrig > 0
      ? trow(`Doťaženie do&nbsp;${result.fillupTarget}&nbsp;m³`, `${mainCI?.transportFillupM3}&nbsp;m³`, transRateStr(mainFillupOrig, mainCI?.transportFillupM3 ?? 0, result.fFillup), mainFillupOrig, mainFillupDisc)
      : "";
    const zimneRow = origItems.zimne > 0
      ? trow(`Zimné opatrenia`, `${result.qty}&nbsp;m³`, `${fmtN(zimneServicePrice)}&nbsp;€/m³`, origItems.zimne, baseItems.zimne)
      : "";

    // Main item services (pumpa only, first item — per-item values, not aggregated)
    const mainPumpTime = result.pumpHrs + result.pumpMs / 60;
    const mainSluzbyOrig = {
      pump: tab === "pumpa" ? mainPumpTime * pumpServicePrice : 0,
      hoses: hoseMeters > 0 ? hoseMeters * hoseServicePrice : 0,
      washing: washing ? washServicePrice : 0,
      chem: tab === "pumpa" ? chemServicePrice : 0,
      waiting: tab === "pumpa" ? result.waitIntervals * waitServicePricePumpa : tab === "mix" ? result.waitIntervals * waitServicePriceMix : 0,
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
      const extraTransportUnitStr = buildTransportUnitStr(ci.transportIsMin, ci.qty);
      const extraTypeLabel = ci.label.replace(/ – [\d.,]+ m³$/, "");
      const extraSectionLabel = ci.categoryName ? kamenivoPrefix(ci.categoryName) + ci.categoryName : extraTypeLabel;
      const isAddToMainExtra = idx < extraItems.length && extraItems[idx]?.transportMode === "addToMain";
      let rows = sectionRow(`Pridaná položka ${idx + 1}${extraSectionLabel ? ` – ${extraSectionLabel}` : ""}`);
      rows += trow(ci.label, `${ci.qty}&nbsp;m³`, unitStr, betonOrig, betonDisc, undefined, true);
      rows += trow(dopravaExtraLabel, `${ci.transportTrucks}&nbsp;${truckWord(ci.transportTrucks)}&nbsp;(${ci.qty}&nbsp;m³)`, extraTransportUnitStr, transOrig, transDisc);
      if (isAddToMainExtra && transOrig === 0) {
        const mainLabel = (result.concreteBreakdown[0]?.label ?? "").split("–")[0].trim() || "Hlavný produkt";
        rows += `<tr><td colspan="5" style="padding:2px 8px 6px 16px">
          <div style="border-left:4px solid #2563eb;background:#dbeafe;padding:4px 12px;display:block;font-size:8pt;border-radius:0 4px 4px 0">
            <span style="color:#1d4ed8;font-weight:900;font-size:9pt">&#8593; +${ci.qty}&nbsp;m³</span>
            <span style="color:#1e40af"> zarátané do dopravy </span>
            <span style="display:inline-block;background:#2563eb;color:#fff;font-weight:900;font-size:7pt;padding:1px 5px;border-radius:3px;vertical-align:middle;letter-spacing:0.03em">&#9673; HLAVNÁ</span>
            <span style="color:#1e40af;font-weight:700"> – ${mainLabel}</span>
          </div>
        </td></tr>`;
      }
      rows += trow(`Doťaženie do&nbsp;${ci.transportFillupTarget}&nbsp;m³`, `${ci.transportFillupM3}&nbsp;m³`, transRateStr(fillupOrig, ci.transportFillupM3, result.fFillup), fillupOrig, fillupDisc);
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
    ${podmienkyNoteRow}
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
    gtagEvent("sms_export", { tab, quantity, type: selectedType?.label });
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
    lines.push(div, "    MS-BETON, spol. s r.o.", "      Cenová ponuka", div);
    if (mapPlusCode) lines.push(`${mapPlusCode}${mapLocality ? " · " + mapLocality : ""} – ${result.km}km`);
    else if (address) lines.push(`${address} – ${result.km}km`);
    else if (result.km > 0) lines.push(`${result.km}km`);
    if (result.isOwn) lines.push("Vlastná doprava – odber na prevádzke");
    lines.push(div);
    lines.push(`Dátum vystavenia - ${fmtDate}`);
    lines.push(`Čas vystavenia   - ${fmtTime}`);
    lines.push(div);

    const smsAddToMainQty = result.concreteBreakdown.slice(1).reduce((s, c, i) => {
      const q = parseFloat(extraItems[i]?.quantity ?? "0") || 0;
      return (q > 0 && extraItems[i]?.transportMode === "addToMain") ? s + c.qty : s;
    }, 0);

    result.concreteBreakdown.forEach((ci, ciIdx) => {
      const concreteVal = isFaktura ? ci.bezDphFinal : ci.bezDphFinalHotovost;
      const unitPrice = ci.qty > 0 ? concreteVal / ci.qty : 0;
      const concreteName = ci.label.replace(/ – \d+(?:[.,]\d+)? m³$/, "");
      if (ciIdx > 0) lines.push(div);
      if (ci.categoryName) lines.push(kamenivoPrefix(ci.categoryName) + ci.categoryName);
      lines.push(concreteName);
      lines.push(rowUnit(`${ci.qty}m³`, unitPrice, concreteVal));
      if (!result.isOwn && ci.transport === 0 && result.concreteBreakdown.indexOf(ci) > 0) {
        const smsCiIdx = result.concreteBreakdown.indexOf(ci) - 1;
        if (smsCiIdx >= 0 && extraItems[smsCiIdx]?.transportMode === "addToMain") {
          lines.push(`  +${ci.qty}m³ zarat. do dopravy hl.pol.`);
        }
      }

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
          const smsQtyStr = ciIdx === 0 && smsAddToMainQty > 0 ? `${ci.qty}+${smsAddToMainQty}m³` : `${ci.qty}m³`;
          lines.push(rowUnit(smsQtyStr, effectiveRate, transportDisc));
          if (ci.transportFillup > 0) {
            const fillupDisc = ci.transportFillup * result.fFillup;
            lines.push(`Doťaženie do ${ci.transportFillupTarget}m³`);
            lines.push(rowUnit(`${ci.transportFillupM3}m³`, effectiveRate, fillupDisc));
          }
        } else if (clientDeliveryZone?.pricingType === "km") {
          const mpSms = loggedClient?.manualPrices ?? {};
          const baseKmRate = clientDeliveryZone.ratePerKm ?? 1.8;
          const smsKm = Math.max(parseFloat(distance) || 0, clientDeliveryZone.minKm ?? 0);
          const kmRate = (mpSms[`km_rate_${clientDeliveryZone.id}`] ?? baseKmRate) * result.fTransport;
          lines.push(`Doprava ${smsKm}km × ${kmRate.toFixed(2)} €/km`);
          const perAutoDisc = ci.transportTrucks > 0 ? transportDisc / ci.transportTrucks : transportDisc;
          lines.push(rowUnit(`${ci.transportTrucks}x auto`, perAutoDisc, transportDisc));
        } else if (clientDeliveryZone?.pricingType === "auto") {
          const mpSmsA = loggedClient?.manualPrices ?? {};
          const baseAutoRate = clientDeliveryZone.ratePerTruck ?? 0;
          const autoRate = (mpSmsA[`auto_rate_${clientDeliveryZone.id}`] ?? baseAutoRate) * result.fTransport;
          lines.push("Doprava");
          lines.push(rowUnit(`${ci.transportTrucks}x auto`, autoRate, transportDisc));
        } else {
          lines.push(row("Doprava", transportDisc));
        }
      }
    });

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

    // Vytvorenie objednávky — globálne smsOrderEnabled + per-klient smsOrderDisabled override
    if (loggedClient && selectedType && tsettings.smsOrderEnabled && !loggedClient.smsOrderDisabled) {
      const isFakt = priceMode === "faktura";
      clientApi.submitOrder({
        id: Math.random().toString(36).slice(2, 10),
        status: "nova",
        clientName: loggedClient.name,
        clientId: loggedClient.clientId,
        company: loggedClient.company || undefined,
        phone: loggedClient.phone || undefined,
        tab,
        concreteType: selectedType.label,
        concreteCategory: categoryName || undefined,
        quantity: result.qty,
        totalQty: result.totalQty,
        address: address || undefined,
        km: result.km || undefined,
        mapPlusCode: mapPlusCode || undefined,
        mapLocality: mapLocality || undefined,
        priceMode,
        totalBezDph: result.totalDiscBezDph,
        totalSDph: isFakt ? result.totalDiscSDph : result.hotovostTotal,
        breakdown: buildBreakdown(),
        viaSms: true,
        turnstileToken: turnstileToken || undefined,
        ...(tab === "pumpa" && pumpMode === "timer" && pumpStartTime && pumpStopTime ? { pumpTimer: { start: pumpStartTime, stop: pumpStopTime } } : tab === "pumpa" && pumpMode === "edit" && editStartTime && editStopTime ? { pumpTimer: { start: editStartTime, stop: editStopTime } } : {}),
        ...(podmienkyEnabled ? { podmienky: { trucks: tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks, pumpa: tab === "pumpa" ? podmienkyPumpa : 0, mix: tab === "pumpa" ? podmienkyMixC : podmienkyTrucks, m3PerTruck: (tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks) > 0 ? Math.round(((result!.qty + (result!.concreteBreakdown[0]?.transportFillupM3 ?? 0)) / (tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks)) * 10) / 10 : 0, isRisk: tab === "pumpa" ? (podmienkyPumpa * pumpCap + podmienkyMixC * mixCap) < result!.qty : podmienkyTrucks * mixCap < result!.qty } } : {}),
      }).then(() => {
        setSmsOrderCreated(true);
        const w = window as Window & { turnstile?: { reset: (id: string) => void } };
        if (turnstileWidgetId.current && w.turnstile) w.turnstile.reset(turnstileWidgetId.current);
      }).catch(() => {});
    }

    const rawPhone = loggedClient?.phone ?? "";
    const normalPhone = rawPhone.startsWith("0") ? "+421" + rawPhone.slice(1) : rawPhone.replace(/^00421/, "+421");
    // smsShareOnly: zobraziť share menu namiesto auto-otvorenia SMS aplikácie
    if (!loggedClient?.smsShareOnly && normalPhone && normalPhone.length > 6) {
      window.open(`sms:${normalPhone}?body=${encodeURIComponent(text)}`, "_blank");
    } else if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setSmsCopied(true);
        setTimeout(() => setSmsCopied(false), 3000);
      });
    }
  }

  function switchDeliveryMode(newMode: "distance" | "address" | "map") {
    if (newMode === deliveryMode) return;
    const isAddrToMap = deliveryMode === "address" && newMode === "map";
    const isMapToAddr = deliveryMode === "map" && newMode === "address";

    // Opustenie mapy → reset map stavu (nie km ak Map→Adresa)
    if (deliveryMode === "map") {
      setMapPin(null); setMapPlusCode(""); setMapKmConfirmed(false); setMapError(""); setMapLocality(""); setMapGeocodedAddress("");
    }
    // Reset km + výpočtu len keď prechádza cez "distance" alebo z "distance"
    const preserveKm = isAddrToMap || isMapToAddr;
    if (!preserveKm) {
      setDistance(""); setAddressKm(null); setShowResult(false);
    }

    setDeliveryMode(newMode);

    // Adresa→Mapa: preniesť adresu cez async hranicu useEffect
    // Prednosť má uložený lat/lng z autocomplete (okamžité umiestnenie pinu bez Geocoder delay)
    if (isAddrToMap) {
      keepResultOnPinRef.current = showResult;
      const last = lastResolvedAddressRef.current;
      if (last && last.address === address) {
        pendingGeocodePlaceRef.current = { lat: last.lat, lng: last.lng };
      } else if (address) {
        pendingGeocodeAddressRef.current = address;
      }
    }
  }

  function clearDelivery() {
    setAddress(""); setAddressKm(null); setDistance(""); setShowResult(false);
    setMapPin(null); setMapPlusCode(""); setMapKmConfirmed(false); setMapError(""); setMapLocality(""); setMapGeocodedAddress("");
    lastResolvedAddressRef.current = null;
    pendingGeocodePlaceRef.current = null;
    pendingGeocodeAddressRef.current = null;
    if (addressInputRef.current) addressInputRef.current.value = "";
    if (mapMarkerRef.current) { mapMarkerRef.current.setMap(null); mapMarkerRef.current = null; }
  }


  function buildBreakdown(): string {
    if (!result) return JSON.stringify({ v: 2, s: [] });
    const fmt2 = (n: number) => parseFloat(n.toFixed(2));
    const isFakt = priceMode === "faktura";
    const totalBdTrucks = result.concreteBreakdown.reduce((s, c) => s + c.transportTrucks, 0);
    const pdfTrucksLabel = (ci: typeof result.concreteBreakdown[0], isMain: boolean) => {
      const n = isMain ? totalBdTrucks : ci.transportTrucks;
      return tab === "pumpa" ? `1×Pumpa${n > 1 ? `+${n - 1}×Mix` : ""}` : `${n}×Mix`;
    };
    const zoneStr = result.transportZone ? `${result.transportZone.fromKm}–${result.transportZone.toKm} km` : "";
    const bdSections: { h: string; rows: { l: string; v: number; o?: number; u?: number; uOrig?: number; uSuffix?: string; q?: string }[] }[] = [];

    result.concreteBreakdown.forEach((ci, idx) => {
      const bOrig = fmt2(isFakt ? ci.bezDph : ci.bezDph * (1 + VAT_HOTOVOST));
      const bDisc = fmt2(isFakt ? ci.bezDphFinal : ci.bezDphFinalHotovost);
      const tOrig = fmt2(ci.transport);
      const tDisc = fmt2(ci.transport * dopravaFactor);
      const typeLabel = ci.label.replace(/ – [\d.,]+ m³$/, "");
      const catLabel = ci.categoryName ? kamenivoPrefix(ci.categoryName) + ci.categoryName : typeLabel;
      const header = idx === 0 ? `Produkty – ${catLabel}` : `Pridaná položka ${idx} – ${catLabel}`;
      const rows: { l: string; v: number; o?: number; u?: number; uOrig?: number; uSuffix?: string; q?: string }[] = [];
      const uBeton = ci.qty > 0 ? fmt2(bDisc / ci.qty) : undefined;
      const uBetonOrig = ci.qty > 0 ? fmt2(bOrig / ci.qty) : undefined;
      rows.push({ l: ci.label, q: `${ci.qty} m³`, v: bDisc, ...(Math.abs(bOrig - bDisc) > 0.01 ? { o: bOrig } : {}), ...(uBeton !== undefined ? { u: uBeton, uSuffix: "€/m³", ...(uBetonOrig !== undefined && Math.abs(uBetonOrig - uBeton) > 0.001 ? { uOrig: uBetonOrig } : {}) } : {}) });
      if (ci.transport > 0) {
        const hasAddToMain = idx === 0 && extraItems.some(ei => ei.transportMode === "addToMain" && (parseFloat(ei.quantity) || 0) > 0);
        const addToMainQtyBd = hasAddToMain ? extraItems.reduce((s, ei) => { const q = parseFloat(ei.quantity) || 0; return (q > 0 && ei.transportMode === "addToMain") ? s + q : s; }, 0) : 0;
        const qtyStr = addToMainQtyBd > 0 ? `${ci.qty}+${addToMainQtyBd} m³` : `${ci.qty} m³`;
        const nTrucks = idx === 0 ? totalBdTrucks : ci.transportTrucks;
        const dopravaLbl = `${hasAddToMain ? "HLAVNÁ " : ""}${ci.transportIsMin ? "Min. doprava" : "Doprava"}${zoneStr ? ` ${zoneStr}` : ""} · ${pdfTrucksLabel(ci, idx === 0)}`;
        const uTrans = ci.qty > 0 ? fmt2(tDisc / ci.qty) : undefined;
        const uTransOrig = ci.qty > 0 ? fmt2(tOrig / ci.qty) : undefined;
        rows.push({ l: dopravaLbl, q: `${nTrucks} autá (${qtyStr})`, v: tDisc, ...(Math.abs(tOrig - tDisc) > 0.01 ? { o: tOrig } : {}), ...(uTrans !== undefined ? { u: uTrans, uSuffix: "€/m³", ...(uTransOrig !== undefined && Math.abs(uTransOrig - uTrans) > 0.001 ? { uOrig: uTransOrig } : {}) } : {}) });
      }
      if (ci.transportFillup > 0) {
        const fOrig = fmt2(ci.transportFillup);
        const fDisc = fmt2(ci.transportFillup * dopravaFactor);
        const uFill = ci.transportFillupM3 > 0 ? fmt2(fDisc / ci.transportFillupM3) : undefined;
        const uFillOrig = ci.transportFillupM3 > 0 ? fmt2(fOrig / ci.transportFillupM3) : undefined;
        rows.push({ l: `Doťaženie do ${ci.transportFillupTarget} m³`, q: `${ci.transportFillupM3} m³`, v: fDisc, ...(Math.abs(fOrig - fDisc) > 0.01 ? { o: fOrig } : {}), ...(uFill !== undefined ? { u: uFill, uSuffix: "€/m³", ...(uFillOrig !== undefined && Math.abs(uFillOrig - uFill) > 0.001 ? { uOrig: uFillOrig } : {}) } : {}) });
      }
      if (idx > 0 && ci.transport === 0 && idx - 1 < extraItems.length && extraItems[idx - 1]?.transportMode === "addToMain") {
        const mainLabel = (result.concreteBreakdown[0]?.label ?? "").split("–")[0].trim() || "Hlavný produkt";
        rows.push({ l: `↑ +${ci.qty}m³ zarátané do dopravy HLAVNÁ – ${mainLabel}`, v: 0 });
      }
      const svcRows: { l: string; v: number; o?: number; u?: number; uOrig?: number; uSuffix?: string; q?: string }[] = [];
      if (idx === 0) {
        const pumpBase = result.pumpHrs + result.pumpMs / 60;
        if (tab === "pumpa" && pumpBase > 0 && pumpServicePrice > 0) {
          const pOrig = fmt2(pumpBase * pumpServicePrice);
          svcRows.push({ l: `Čerpanie betónu – ${result.pumpHrs} h${result.pumpMs > 0 ? ` ${result.pumpMs} min` : ""}`, q: `${result.pumpHrs} h${result.pumpMs > 0 ? ` ${result.pumpMs} min` : ""}`, v: fmt2(pOrig * fPump), ...(fPump < 1 ? { o: pOrig } : {}), u: fmt2(pumpServicePrice * fPump), uSuffix: "€/h", ...(fPump < 1 ? { uOrig: pumpServicePrice } : {}) });
        }
        if (hoseMeters > 0) { const ho = fmt2(hoseMeters * hoseServicePrice); svcRows.push({ l: `Prídavné hadice – ${hoseMeters} m`, q: `${hoseMeters} m`, v: fmt2(ho * fHose), ...(fHose < 1 ? { o: ho } : {}), u: fmt2(hoseServicePrice * fHose), uSuffix: "€/m", ...(fHose < 1 ? { uOrig: hoseServicePrice } : {}) }); }
        if (tab === "pumpa" && chemServicePrice > 0) { const co = fmt2(chemServicePrice); svcRows.push({ l: "Rozbehová chémia", q: "1 ks", v: fmt2(co * fChem), ...(fChem < 1 ? { o: co } : {}), u: fmt2(chemServicePrice * fChem), uSuffix: "€", ...(fChem < 1 ? { uOrig: chemServicePrice } : {}) }); }
        if (washing) { const wo = fmt2(washServicePrice); svcRows.push({ l: "Umývanie mimo stavby", q: "1 ks", v: fmt2(wo * fWash), ...(fWash < 1 ? { o: wo } : {}), u: fmt2(washServicePrice * fWash), uSuffix: "€", ...(fWash < 1 ? { uOrig: washServicePrice } : {}) }); }
        if (result.waitIntervals > 0) {
          const wFactor = tab === "pumpa" ? fWaitP : fWaitM;
          const wRate = tab === "pumpa" ? waitServicePricePumpa : waitServicePriceMix;
          const wOrig = fmt2(result.waitIntervals * wRate);
          svcRows.push({ l: `Čakačky – ${result.waitLabel}`, q: `${result.waitIntervals} int.`, v: fmt2(wOrig * wFactor), ...(wFactor < 1 ? { o: wOrig } : {}), u: fmt2(wRate * wFactor), uSuffix: "€/int.", ...(wFactor < 1 ? { uOrig: wRate } : {}) });
        }
      } else {
        if (ci.svcPumpCost > 0) { svcRows.push({ l: `Čerpanie betónu – ${ci.svcPumpHrs} h${ci.svcPumpMs > 0 ? ` ${ci.svcPumpMs} min` : ""}`, q: `${ci.svcPumpHrs} h${ci.svcPumpMs > 0 ? ` ${ci.svcPumpMs} min` : ""}`, v: fmt2(ci.svcPumpCost * fPump), ...(fPump < 1 ? { o: fmt2(ci.svcPumpCost) } : {}), u: fmt2(pumpServicePrice * fPump), uSuffix: "€/h", ...(fPump < 1 ? { uOrig: pumpServicePrice } : {}) }); }
        if (ci.svcHoseCost > 0) { svcRows.push({ l: `Prídavné hadice – ${ci.svcHoseMeters} m`, q: `${ci.svcHoseMeters} m`, v: fmt2(ci.svcHoseCost * fHose), ...(fHose < 1 ? { o: fmt2(ci.svcHoseCost) } : {}), u: fmt2(hoseServicePrice * fHose), uSuffix: "€/m", ...(fHose < 1 ? { uOrig: hoseServicePrice } : {}) }); }
        if (ci.svcWashCost > 0) { svcRows.push({ l: "Umývanie mimo stavby", q: "1 ks", v: fmt2(ci.svcWashCost * fWash), ...(fWash < 1 ? { o: fmt2(ci.svcWashCost) } : {}), u: fmt2(washServicePrice * fWash), uSuffix: "€", ...(fWash < 1 ? { uOrig: washServicePrice } : {}) }); }
        if (ci.svcWaitCost > 0) { const wfExtra = tab === "pumpa" ? fWaitP : fWaitM; const wRateExtra = tab === "pumpa" ? waitServicePricePumpa : waitServicePriceMix; svcRows.push({ l: `Čakačky – ${ci.svcWaitLabel}`, v: fmt2(ci.svcWaitCost * wfExtra), ...(wfExtra < 1 ? { o: fmt2(ci.svcWaitCost) } : {}), u: fmt2(wRateExtra * wfExtra), uSuffix: "€/int.", ...(wfExtra < 1 ? { uOrig: wRateExtra } : {}) }); }
      }
      if (podmienkyEnabled && idx === 0) {
        const pTotalTrucks = tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks;
        const pVehicleStr = tab === "pumpa"
          ? `${podmienkyPumpa}× Pumpa${podmienkyMixC > 0 ? ` + ${podmienkyMixC}× Mix` : ""}`
          : `${podmienkyTrucks}× Mix`;
        const pM3 = pTotalTrucks > 0 ? Math.round(((ci.qty + (ci.transportFillupM3 ?? 0)) / pTotalTrucks) * 10) / 10 : 0;
        const pIsRisk = tab === "pumpa" ? (podmienkyPumpa * pumpCap + podmienkyMixC * mixCap) < ci.qty : podmienkyTrucks * mixCap < ci.qty;
        rows.push({ l: `${pIsRisk ? "⚠ Minusové pretaženie" : "★ Pretaženie"}: ${pVehicleStr} · ∅ ${pM3} m³/vozidlo`, v: 0, u: undefined });
      }
      bdSections.push({ h: header, rows });
      if (svcRows.length > 0) {
        bdSections.push({ h: tab === "pumpa" ? "Služby – Pumpa" : "Čakačky", rows: svcRows });
      }
    });
    return JSON.stringify({ v: 2, s: bdSections });
  }

  async function handleSubmitOrder() {
    if (!result || !orderForm.name.trim()) return;
    setOrderSubmitting(true);
    setOrderError(null);
    const breakdown = buildBreakdown();

    const isFakt = priceMode === "faktura";
    const res = await clientApi.submitOrder({
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
      concreteCategory: categoryName || undefined,
      quantity: result.qty,
      totalQty: result.totalQty,
      address: address || undefined,
      km: result.km || undefined,
      mapPlusCode: mapPlusCode || undefined,
      mapLocality: mapLocality || undefined,
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
      ...(tab === "pumpa" && pumpStartTime && pumpStopTime ? { pumpTimer: { start: pumpStartTime, stop: pumpStopTime } } : {}),
      ...(podmienkyEnabled ? { podmienky: { trucks: tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks, pumpa: tab === "pumpa" ? podmienkyPumpa : 0, mix: tab === "pumpa" ? podmienkyMixC : podmienkyTrucks, m3PerTruck: (tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks) > 0 ? Math.round(((result!.qty + (result!.concreteBreakdown[0]?.transportFillupM3 ?? 0)) / (tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks)) * 10) / 10 : 0, isRisk: tab === "pumpa" ? (podmienkyPumpa * pumpCap + podmienkyMixC * mixCap) < result!.qty : podmienkyTrucks * mixCap < result!.qty } } : {}),
      turnstileToken: turnstileToken || undefined,
      _hp: "",
    });
    const w = window as Window & { turnstile?: { reset: (id: string) => void } };
    if (turnstileWidgetId.current && w.turnstile) { w.turnstile.reset(turnstileWidgetId.current); }
    setTurnstileToken("");
    setOrderSubmitting(false);
    if (!res?.ok) {
      setOrderError(res?.error ?? "Objednávku sa nepodarilo odoslať. Skúste neskôr.");
      return;
    }
    setOrderDone(true);
    setOrderSubmittedBanner(true);
    setSmsOrderCreated(false);
    gtagEvent("order_submitted", { tab, quantity, type: selectedType?.label, priceMode });
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
            <button key={t} onClick={() => { if (tab === t) { setTabInfoOpen(o => !o); } else { setTab(t); setExtraItems([]); setShowResult(false); setTabInfoOpen(false); gtagEvent("calc_tab", { tab: t }); } }}
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
              <div className="flex items-center gap-1 justify-center flex-nowrap">
                <span className={cn("font-black text-xs tracking-widest transition-colors whitespace-nowrap", tab === t ? "text-primary" : "text-white/50 group-hover:text-white/80")}>
                  {t === "pumpa" ? "PUMPA" : t === "mix" ? "MIX" : "VL. DOPRAVA"}
                </span>
                {tab === t && (
                  <span className={cn("md:hidden text-[9px] font-black tracking-widest transition-colors px-1 py-0.5 rounded-full border leading-none", tabInfoOpen ? "border-primary/60 text-primary bg-primary/15" : "border-white/15 text-white/30")}>
                    ⓘ
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium transition-colors text-center px-1", tab === t ? "text-white/70" : "text-white/30 group-hover:text-white/50")}>
                {t === "pumpa" ? `${pumpCap}m³ · 28m` : t === "mix" ? `${mixCap}m³` : "bez dopravy"}
              </span>
            </button>
          ))}
        </div>

        {/* Mobile info panel — activates via tapping active tab */}
        <div className={cn("md:hidden overflow-hidden transition-[max-height] duration-300", tabInfoOpen ? "max-h-56" : "max-h-0")}>
          <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-start gap-4">
            <div className="shrink-0 opacity-60">
              {tab === "pumpa" ? (
                <svg viewBox="0 0 130 48" className="w-16 h-10 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="27" width="14" height="15" rx="1" /><rect x="3" y="22" width="9" height="6" rx="1" />
                  <line x1="16" y1="33" x2="44" y2="33" /><line x1="16" y1="42" x2="44" y2="42" /><line x1="44" y1="33" x2="44" y2="42" />
                  <line x1="26" y1="33" x2="26" y2="21" strokeWidth="2.5" /><line x1="22" y1="21" x2="30" y2="21" strokeWidth="1.8" />
                  <line x1="26" y1="21" x2="16" y2="6" strokeWidth="3" /><line x1="16" y1="6" x2="122" y2="2" strokeWidth="2.5" />
                  <line x1="122" y1="2" x2="127" y2="2" strokeWidth="2" /><line x1="126" y1="2" x2="126" y2="17" strokeWidth="1.8" />
                  <circle cx="8" cy="42" r="4" strokeWidth="2" /><circle cx="36" cy="42" r="4" strokeWidth="2" />
                </svg>
              ) : tab === "mix" ? (
                <svg viewBox="0 0 80 44" className="w-12 h-10 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="22" width="18" height="16" rx="1" /><rect x="3" y="18" width="10" height="6" rx="1" />
                  <line x1="20" y1="30" x2="62" y2="30" /><line x1="20" y1="38" x2="62" y2="38" /><line x1="62" y1="30" x2="62" y2="38" />
                  <ellipse cx="44" cy="22" rx="18" ry="12" />
                  <path d="M30 26 Q44 18 58 26" strokeWidth="1.5" /><path d="M30 20 Q44 12 58 20" strokeWidth="1.5" />
                  <circle cx="10" cy="38" r="4" strokeWidth="2" /><circle cx="52" cy="38" r="4" strokeWidth="2" />
                </svg>
              ) : (
                <svg viewBox="0 0 64 46" className="w-12 h-10 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="26" width="62" height="13" rx="2" />
                  <path d="M10 26 L19 14 L48 14 L56 26" />
                  <rect x="20" y="15" width="11" height="10" rx="1" /><rect x="33" y="15" width="12" height="10" rx="1" />
                  <circle cx="25.5" cy="19.5" r="3.2" fill="currentColor" stroke="none" />
                  <line x1="32" y1="26" x2="32" y2="39" strokeWidth="1.5" />
                  <circle cx="15" cy="40" r="4.5" strokeWidth="1.8" /><circle cx="49" cy="40" r="4.5" strokeWidth="1.8" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-white mb-1">
                {tab === "pumpa" ? `Betónová pumpa ${pumpCap}m³ · 28m rameno` : tab === "mix" ? `Domiešavač ${mixCap}m³` : "Vlastná doprava"}
              </div>
              <ul className="space-y-0.5">
                {tab === "pumpa" && (<>
                  <li className="text-[11px] text-white/55">· Prvé auto <span className="text-primary font-bold">{pumpCap}m³</span>, každé ďalšie <span className="text-primary font-bold">{mixCap}m³</span> (domiešavač)</li>
                  <li className="text-[11px] text-white/55">· Čerpanie sa účtuje od príjazdu na stavbu</li>
                  <li className="text-[11px] text-white/55">· Dosah ramena <span className="text-primary font-bold">28m</span></li>
                </>)}
                {tab === "mix" && (<>
                  <li className="text-[11px] text-white/55">· Kapacita <span className="text-primary font-bold">{mixCap}m³</span> na jedno auto</li>
                  <li className="text-[11px] text-white/55">· Prvých <span className="text-primary font-bold">30 min</span> čakania zadarmo</li>
                  <li className="text-[11px] text-white/55">· Každých začatých 15 min = 1 interval čakania</li>
                </>)}
                {tab === "vlastnadoprava" && (<>
                  <li className="text-[11px] text-white/55">· Zákazník zabezpečuje dopravu vlastným vozidlom</li>
                  <li className="text-[11px] text-white/55">· Výdaj na prevádzke, doprava sa nepočíta</li>
                </>)}
              </ul>
            </div>
          </div>
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
                    <span className="hidden sm:inline text-white/60 text-xs shrink-0">Prihlásený:</span>
                    <span className="text-white text-sm font-semibold truncate min-w-0">{loggedClient.name}</span>
                    {hasDiscount && (
                      <span className="shrink-0 px-1.5 py-0.5 bg-primary text-secondary text-xs font-black rounded-sm tracking-wide">
                        Zľava
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {loggedClient.sharedLink && (
                      <a href={loggedClient.sharedLink} target="_blank" rel="noopener noreferrer"
                        title="Zdielaný odkaz"
                        className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity">
                        {(() => { const { Icon, cls } = sharedLinkIcon(loggedClient.sharedLink); return <Icon className={`w-5 h-5 ${cls}`} />; })()}
                        <span className="hidden sm:inline whitespace-nowrap text-white/40">Odkaz</span>
                      </a>
                    )}
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

            {/* Mode checkboxes */}
            <div className="flex gap-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={deliveryMode === "distance"}
                  onChange={() => switchDeliveryMode(deliveryMode === "distance" ? "address" : "distance")}
                  className="accent-primary w-4 h-4 cursor-pointer" />
                <span className={cn("text-xs font-bold uppercase tracking-widest transition-colors",
                  deliveryMode === "distance" ? "text-primary" : "text-white/40 hover:text-white/60")}>
                  📏 Vzdialenosť (km)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={deliveryMode !== "distance"}
                  onChange={() => switchDeliveryMode(deliveryMode !== "distance" ? "distance" : "address")}
                  className="accent-primary w-4 h-4 cursor-pointer" />
                <span className={cn("text-xs font-bold uppercase tracking-widest transition-colors",
                  deliveryMode !== "distance" ? "text-primary" : "text-white/40 hover:text-white/60")}>
                  📍 Adresa
                </span>
              </label>
            </div>

            {/* Distance input */}
            {deliveryMode === "distance" && (
              <div className="relative">
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
                  className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 pr-10 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm" />
                {distance && (
                  <button onClick={() => { setDistance(""); setAddressKm(null); setShowResult(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors text-lg leading-none">×</button>
                )}
              </div>
            )}

            {/* Address input + map — always in DOM when not distance mode */}
            {deliveryMode !== "distance" && (
              <div className="space-y-2">
                {/* Address input row: [input] [🗺️ map toggle] [× clear] */}
                <div className="flex bg-white/10 border-b-2 border-b-primary rounded-sm overflow-hidden">
                  <input
                    ref={addressInputRef}
                    type="text"
                    defaultValue={address}
                    onChange={(e) => { setAddress(e.target.value); setAddressKm(null); setShowResult(false); }}
                    onKeyUp={(e) => {
                      if (e.key === "Enter" && deliveryMode === "map") {
                        const val = addressInputRef.current?.value.trim();
                        if (!val) return;
                        if (mapGeocodeAddrFnRef.current) { mapGeocodeAddrFnRef.current(val, true); return; }
                        if (typeof google !== "undefined" && google.maps?.Geocoder && mapSetPinAtRef.current) {
                          const setPinFn = mapSetPinAtRef.current;
                          new google.maps.Geocoder().geocode({ address: val, region: "SK" }, (results, st) => {
                            if (st === "OK" && results?.[0]) { const loc = results[0].geometry.location; setPinFn(loc.lat(), loc.lng(), true, true); }
                          });
                        }
                      }
                    }}
                    onPaste={() => {
                      if (deliveryMode === "map") {
                        setTimeout(() => {
                          const val = addressInputRef.current?.value.trim();
                          if (!val) return;
                          if (mapGeocodeAddrFnRef.current) { mapGeocodeAddrFnRef.current(val, true); return; }
                          if (typeof google !== "undefined" && google.maps?.Geocoder && mapSetPinAtRef.current) {
                            const setPinFn = mapSetPinAtRef.current;
                            new google.maps.Geocoder().geocode({ address: val, region: "SK" }, (results, st) => {
                              if (st === "OK" && results?.[0]) { const loc = results[0].geometry.location; setPinFn(loc.lat(), loc.lng(), true, true); }
                            });
                          }
                        }, 100);
                      }
                    }}
                    placeholder="Zadajte adresu stavby"
                    className="flex-1 bg-transparent px-4 py-3 text-white text-sm font-medium focus:outline-none placeholder:text-white/30 min-w-0" />
                  {/* Map icon — always visible, colored */}
                  <button
                    type="button"
                    onClick={() => deliveryMode === "map" ? switchDeliveryMode("address") : switchDeliveryMode("map")}
                    className={cn("px-3 flex items-center transition-colors border-l border-white/10",
                      deliveryMode === "map" ? "text-primary bg-primary/10" : "text-primary/50 hover:text-primary")}
                    title={deliveryMode === "map" ? "Skryť mapu" : "Zobraziť mapu"}>
                    <MapPin className="w-4 h-4" />
                  </button>
                  {/* Clear / loading */}
                  {addressLoading ? (
                    <span className="px-3 flex items-center text-white/40 text-xs border-l border-white/10">…</span>
                  ) : (address || mapPin || mapPlusCode) ? (
                    <button
                      onClick={clearDelivery}
                      className="px-3 flex items-center text-white/30 hover:text-white/70 transition-colors border-l border-white/10 text-lg leading-none">×</button>
                  ) : null}
                </div>

                {/* Map div — always in DOM (Google Maps constraint), shown/hidden via display */}
                <div id="calculator-map" className="w-full rounded overflow-hidden border border-white/20"
                  style={{ display: deliveryMode === "map" && !mapKmConfirmed ? "block" : "none", height: "220px" }} />

                {/* Map status */}
                {deliveryMode === "map" && mapKmConfirmed ? (
                  <div className="bg-white/10 px-3 py-2.5 flex items-center gap-3 rounded-sm">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      {(mapGeocodedAddress || mapLocality)
                        ? <div className="text-sm text-white/90 font-medium truncate leading-snug">{mapGeocodedAddress || mapLocality}</div>
                        : mapPin && <div className="text-xs text-white/30 font-mono truncate">{mapPin.lat.toFixed(5)}, {mapPin.lng.toFixed(5)}</div>
                      }
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {mapPlusCode && <>
                          <span className="font-mono text-primary text-[10px] font-bold tracking-wide">{mapPlusCode}{mapLocality ? `, ${mapLocality}` : ""}</span>
                          <button onClick={() => { navigator.clipboard?.writeText(`${mapPlusCode}${mapLocality ? `, ${mapLocality}` : ""}`); setMapCopied(true); setTimeout(() => setMapCopied(false), 1500); }}
                            className="text-white/40 hover:text-primary transition-colors" title="Kopírovať Plus Code">
                            {mapCopied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <span className="text-white/20 text-[10px]">·</span>
                        </>}
                        <span className="text-[10px] text-white/50">od MS-BETON: <strong className="text-primary">{distance} km</strong></span>
                      </div>
                    </div>
                    <button onClick={() => { setMapKmConfirmed(false); setMapPin(null); setMapPlusCode(""); setMapLocality(""); setMapGeocodedAddress(""); setDistance(""); setAddressKm(null); if (mapMarkerRef.current) { mapMarkerRef.current.setMap(null); mapMarkerRef.current = null; } }}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors shrink-0">Zmeniť</button>
                  </div>
                ) : deliveryMode === "map" && !mapKmConfirmed ? (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      {mapError ? (
                        <p className="text-xs text-red-400 px-1">{mapError}</p>
                      ) : mapPin ? (
                        <div className="bg-white/10 px-3 py-2.5 rounded-sm space-y-2">
                          <div className="space-y-0.5">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                {(mapGeocodedAddress || mapLocality)
                                  ? <div className="text-sm text-white/90 font-medium leading-snug truncate">{mapGeocodedAddress || mapLocality}</div>
                                  : mapPin && <div className="text-xs text-white/30 font-mono">{mapPin.lat.toFixed(5)}, {mapPin.lng.toFixed(5)}</div>
                                }
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {mapPlusCode && <>
                                    <span className="font-mono text-primary text-[10px] font-bold tracking-wide">{mapPlusCode}{mapLocality ? `, ${mapLocality}` : ""}</span>
                                    <button onClick={() => { navigator.clipboard?.writeText(`${mapPlusCode}${mapLocality ? `, ${mapLocality}` : ""}`); setMapCopied(true); setTimeout(() => setMapCopied(false), 1500); }}
                                      className="text-white/40 hover:text-primary transition-colors" title="Kopírovať">
                                      {mapCopied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                    <span className="text-white/20 text-[10px]">·</span>
                                  </>}
                                  {distance && <span className="text-[10px] text-white/60">od MS-BETON: <strong className="text-primary">{distance} km</strong></span>}
                                  {!distance && !mapLocality && !mapGeocodedAddress && <span className="text-[10px] text-white/40">Určuje sa adresa…</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => {
                            // ensure address field is never empty after confirm — nikdy PlusCode
                            if (!address && mapPin) {
                              const fallback = mapGeocodedAddress || mapLocality
                                || `${mapPin.lat.toFixed(5)}, ${mapPin.lng.toFixed(5)}`;
                              setAddress(fallback);
                              if (addressInputRef.current) addressInputRef.current.value = fallback;
                            }
                            setMapKmConfirmed(true);
                          }}
                            className="w-full bg-primary text-secondary font-black text-xs uppercase tracking-widest py-2.5 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                            <MapPin className="w-3.5 h-3.5" /> Potvrdiť polohu
                          </button>
                        </div>
                      ) : (
                        <div className="px-1 space-y-1">
                          <p className="text-xs text-white/40">Kliknite na mapu, napíšte adresu alebo vložte Plus Code</p>
                          <p className="text-xs text-white/25">Plus Code vyžaduje mesto: napr. <span className="font-mono">VW3G+78 Višňové</span></p>
                        </div>
                      )}
                    </div>
                    <button onClick={() => mapLocateFnRef.current?.()}
                      className="p-2 bg-white/10 border border-white/20 text-white/50 hover:text-primary transition-colors rounded shrink-0" title="Moja poloha">
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                ) : addressKm !== null ? (
                  <p className="text-xs text-white/50 px-1">
                    Vzdialenosť: <strong className="text-primary">{distance} km</strong> (pre výpočet dopravy)
                  </p>
                ) : null}
              </div>
            )}
          </div>}

          {/* Category */}
          <CategorySelectField
            label="Kategória betónu"
            value={selectedCategory?.name ?? ""}
            onChange={handleCategoryChange}
            options={allCategories.map((c) => c.name)}
          />

          {/* Type */}
          <TypeSelectField
            label="Typ betónu"
            value={selectedType?.label ?? ""}
            onChange={(v) => { setConcreteTypeLabel(v); setShowResult(false); gtagEvent("calc_type_select", { type: v, category: categoryName, tab }); }}
            options={typesForCategory}
            discountFactor={betonFactor}
            manualPrices={loggedClient?.manualPrices}
          />

          {/* Quantity + Podmienky (admin: same row toggle) */}
          {(() => {
            const qty = parseFloat(quantity) || 0;
            const autoMixP = Math.max(0, (calcPumpTrucks(qty) || 1) - 1);
            const autoTrucksM = Math.max(1, Math.ceil(qty / mixCap) || 1);
            const maxPumpa = isAdminMode ? Math.max(tsettings.condPumpaMax ?? 2, 5) : (tsettings.condPumpaMax ?? 2);
            const minPumpa = tsettings.condPumpaMin ?? 1;
            const adminMaxMix = isAdminMode
              ? Math.max(99, Math.ceil(qty / mixCap) * 4)
              : (tsettings.condMixMax ?? 2);
            const adminMinMix = tsettings.condMixMin ?? 0;
            const maxMixP = qty > 0 ? Math.min(adminMaxMix, Math.max(0, Math.floor(qty) - podmienkyPumpa)) : adminMaxMix;
            // allowExtraOverload: admin vždy; klient iba ak má explicitné povolenie
            const allowExtraOverload = isAdminMode || (loggedClient ? (loggedClient.allowExtraOverload ?? false) : false);
            // bez povolenia extraOverload → min Mix pre pumpa tab = štandardné minimum (autoMixP)
            const minMixPumpa = allowExtraOverload ? adminMinMix : autoMixP;
            // Risk zone: pod kapacitným minimom
            const isRiskMixP = podmienkyPumpa * pumpCap + podmienkyMixC * mixCap < qty; // pumpa tab: kapacita pod qty
            const isRiskTrucksM = podmienkyTrucks * mixCap < qty; // mix tab: kapacita pod qty
            // MIX tab — spodný limit: štandardný min (autoTrucksM) alebo 1 ak extraOverload povolený
            const minMixStd = Math.max(1, autoTrucksM);
            const minMixM = allowExtraOverload ? 1 : minMixStd;
            // maxMixM rešpektuje vozový park (condMixMax) — rovnaké vozidlá ako doplnkový mix v pumpa tab
            const maxMixM = Math.min(adminMaxMix, qty > 0 ? Math.max(minMixStd, Math.floor(qty)) : minMixStd + 8);
            const totalP = podmienkyPumpa + podmienkyMixC;
            const m3PerT = podmienkyEnabled && qty > 0
              ? tab === "pumpa"
                ? qty / Math.max(1, totalP)
                : qty / Math.max(1, podmienkyTrucks)
              : 0;
            const podmienkyFillupPrev = (() => {
              if (!podmienkyEnabled || qty <= 0 || tab === "vlastnadoprava") return 0;
              const trucks = tab === "pumpa" ? totalP : podmienkyTrucks;
              if (trucks <= 0) return 0;
              const qPT = qty / trucks;
              const fMin = tsettings?.minimumLoadM3 ?? 5;
              let fPT = 0;
              if (qPT < fMin) fPT = fMin - qPT;
              // overloaded trucks → no fill-up (same as calcTransport)
              return Math.round(Math.max(0, fPT) * trucks * 10) / 10;
            })();
            const riskBtnCls = "w-8 h-8 rounded border border-red-500/60 text-red-400 hover:border-red-400 hover:bg-red-500/15 text-lg font-bold flex items-center justify-center cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed transition-colors";
            const normalBtnCls = "w-8 h-8 rounded border border-amber-400/40 text-amber-300 hover:border-amber-400 hover:bg-amber-400/15 text-lg font-bold flex items-center justify-center cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed transition-colors";
            return (
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-2">Množstvo betónu (m³)</label>
                <div className="flex items-stretch gap-2">
                  <input type="text" inputMode="decimal" value={quantity}
                    onChange={(e) => { setQuantity(e.target.value.replace(",", ".")); setShowResult(false); }}
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
                    className="flex-1 bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm" />
                  {isAdminMode && tab !== "vlastnadoprava" && (
                    <button type="button"
                      onClick={() => {
                        if (qty === 0) return;
                        if (!podmienkyEnabled) {
                          setPodmienkyPumpa(1);
                          setPodmienkyMixC(autoMixP);
                          setPodmienkyTrucks(autoTrucksM);
                        }
                        setPodmienkyEnabled(v => !v);
                      }}
                      disabled={qty === 0 && !podmienkyEnabled}
                      className={`shrink-0 flex items-center gap-1.5 px-3 rounded-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${podmienkyEnabled ? "border-amber-400/70 bg-amber-500/20 text-amber-300" : "border-white/20 bg-white/5 text-white/40 hover:text-amber-300 hover:border-amber-400/40"}`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Podmienky</span>
                    </button>
                  )}
                </div>
                {isAdminMode && tab !== "vlastnadoprava" && podmienkyEnabled && (
                  <div className="mt-1.5 border border-amber-500/25 rounded-sm bg-amber-500/5 px-2.5 py-2 space-y-2">
                    {/* Stepper riadky — kompaktné, SVG ikona + label + − count + */}
                    {tab === "pumpa" ? (
                      <div className="flex flex-col gap-1.5">
                        {/* PUMPA stepper */}
                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-400/25 rounded px-3 py-2">
                          <svg viewBox="0 0 130 48" className="w-10 h-[15px] text-amber-300/60 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="27" width="14" height="15" rx="1"/><rect x="3" y="22" width="9" height="6" rx="1"/>
                            <line x1="16" y1="33" x2="44" y2="33"/><line x1="16" y1="42" x2="44" y2="42"/><line x1="44" y1="33" x2="44" y2="42"/>
                            <line x1="26" y1="33" x2="26" y2="21" strokeWidth="2.8"/><line x1="26" y1="21" x2="16" y2="6" strokeWidth="3"/><line x1="16" y1="6" x2="122" y2="2" strokeWidth="2.8"/>
                            <line x1="122" y1="2" x2="127" y2="2" strokeWidth="2.2"/><line x1="126" y1="2" x2="126" y2="17" strokeWidth="2"/>
                            <circle cx="8" cy="42" r="4" strokeWidth="2"/><circle cx="36" cy="42" r="4" strokeWidth="2"/>
                          </svg>
                          <span className="text-[10px] font-black text-amber-300/80 uppercase tracking-widest flex-1">Pumpa</span>
                          <button type="button" onClick={() => setPodmienkyPumpa(p => Math.max(minPumpa, p - 1))} disabled={qty === 0 || podmienkyPumpa <= minPumpa}
                            className={normalBtnCls}>−</button>
                          <span className="text-xl font-black text-amber-200 w-7 text-center">{podmienkyPumpa}</span>
                          <button type="button" onClick={() => setPodmienkyPumpa(p => Math.min(maxPumpa, p + 1))} disabled={qty === 0 || podmienkyPumpa >= maxPumpa}
                            className={normalBtnCls}>+</button>
                        </div>
                        {/* MIX stepper — červený v rizikovej zóne */}
                        <div className={`flex items-center gap-2 rounded px-3 py-2 border transition-colors ${isRiskMixP ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-400/25"}`}>
                          <svg viewBox="0 0 80 44" className={`w-9 h-[15px] shrink-0 ${isRiskMixP ? "text-red-400/60" : "text-amber-300/60"}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="22" width="18" height="16" rx="1"/>
                            <line x1="20" y1="30" x2="62" y2="30"/><line x1="20" y1="38" x2="62" y2="38"/><line x1="62" y1="30" x2="62" y2="38"/>
                            <ellipse cx="44" cy="22" rx="18" ry="12"/>
                            <circle cx="10" cy="38" r="4" strokeWidth="2"/><circle cx="52" cy="38" r="4" strokeWidth="2"/>
                          </svg>
                          <span className={`text-[10px] font-black uppercase tracking-widest flex-1 ${isRiskMixP ? "text-red-400/80" : "text-amber-300/80"}`}>Mix</span>
                          <button type="button" onClick={() => setPodmienkyMixC(m => Math.max(minMixPumpa, m - 1))} disabled={qty === 0 || podmienkyMixC <= minMixPumpa}
                            className={isRiskMixP ? riskBtnCls : normalBtnCls}>−</button>
                          <span className={`text-xl font-black w-7 text-center ${isRiskMixP ? "text-red-300" : "text-amber-200"}`}>{podmienkyMixC}</span>
                          <button type="button" onClick={() => setPodmienkyMixC(m => Math.min(maxMixP, m + 1))} disabled={qty === 0 || podmienkyMixC >= maxMixP}
                            className={normalBtnCls}>+</button>
                        </div>
                      </div>
                    ) : (
                      /* MIX tab stepper — červený v rizikovej zóne */
                      <div className={`flex items-center gap-2 rounded px-3 py-2 border transition-colors ${isRiskTrucksM ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-400/25"}`}>
                        <svg viewBox="0 0 80 44" className={`w-9 h-[15px] shrink-0 ${isRiskTrucksM ? "text-red-400/60" : "text-amber-300/60"}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="22" width="18" height="16" rx="1"/>
                          <line x1="20" y1="30" x2="62" y2="30"/><line x1="20" y1="38" x2="62" y2="38"/><line x1="62" y1="30" x2="62" y2="38"/>
                          <ellipse cx="44" cy="22" rx="18" ry="12"/>
                          <circle cx="10" cy="38" r="4" strokeWidth="2"/><circle cx="52" cy="38" r="4" strokeWidth="2"/>
                        </svg>
                        <span className={`text-[10px] font-black uppercase tracking-widest flex-1 ${isRiskTrucksM ? "text-red-400/80" : "text-amber-300/80"}`}>Mix vozidlá</span>
                        <button type="button" onClick={() => setPodmienkyTrucks(t => Math.max(minMixM, t - 1))} disabled={qty === 0 || podmienkyTrucks <= minMixM}
                          className={isRiskTrucksM ? riskBtnCls : normalBtnCls}>−</button>
                        <span className={`text-xl font-black w-7 text-center ${isRiskTrucksM ? "text-red-300" : "text-amber-200"}`}>{podmienkyTrucks}</span>
                        <button type="button" onClick={() => setPodmienkyTrucks(t => Math.min(maxMixM, t + 1))} disabled={qty === 0 || podmienkyTrucks >= maxMixM}
                          className={normalBtnCls}>+</button>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] text-amber-200/80 font-mono flex items-center gap-2 flex-wrap">
                        <span>
                          {tab === "pumpa"
                            ? `${podmienkyPumpa}× Pumpa${podmienkyMixC > 0 ? ` + ${podmienkyMixC}× Mix` : ""}`
                            : `${podmienkyTrucks}× Mix`}
                        </span>
                        {m3PerT > 0 && (
                          <span className="text-amber-300/60">· ∅ {m3PerT.toFixed(1)} m³/voz.</span>
                        )}
                        {podmienkyFillupPrev > 0 && (
                          <span className="text-orange-300/80">+{podmienkyFillupPrev}m³ doť.</span>
                        )}
                        {qty > 0 && tab === "pumpa" && (
                          <span className={`text-[9px] px-1 rounded ${(podmienkyPumpa * pumpCap + podmienkyMixC * mixCap) >= qty ? "text-green-400/70 bg-green-500/10" : "text-red-400/70 bg-red-500/10"}`}>
                            kap. {podmienkyPumpa * pumpCap + podmienkyMixC * mixCap}m³
                          </span>
                        )}
                        {qty > 0 && tab === "mix" && (
                          <span className={`text-[9px] px-1 rounded ${podmienkyTrucks * mixCap >= qty ? "text-green-400/70 bg-green-500/10" : "text-red-400/70 bg-red-500/10"}`}>
                            kap. {podmienkyTrucks * mixCap}m³
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={() => setPodmienkyInfoOpen(v => !v)}
                        className="shrink-0 w-5 h-5 rounded-full border border-amber-400/40 text-amber-300/60 hover:text-amber-300 hover:border-amber-400 transition-colors flex items-center justify-center text-[10px] font-black">
                        ⓘ
                      </button>
                    </div>
                    {/* Rizikové pretaženie — varovanie */}
                    {(tab === "pumpa" ? isRiskMixP : isRiskTrucksM) && (
                      <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded px-2.5 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <div className="text-[10px] text-red-300/90 leading-relaxed">
                          <span className="font-black uppercase tracking-wider text-red-400">Minusové pretaženie — vlastné riziko</span>
                          {tab === "pumpa"
                            ? <><br />Pumpa berie {qty > 0 ? qty.toFixed(1) : "—"} m³ bez doplnkového Mixu (štand. {pumpCap} m³). Vodič preberá zodpovednosť.</>
                            : <><br />{podmienkyTrucks}× Mix berie {qty > 0 ? (qty / podmienkyTrucks).toFixed(1) : "—"} m³/voz. (štand. kapacita {mixCap} m³). Vodič preberá zodpovednosť.</>
                          }
                        </div>
                      </div>
                    )}
                    {podmienkyInfoOpen && (
                      <div className="text-[10px] text-amber-100/60 bg-amber-500/5 border border-amber-400/15 rounded px-2.5 py-2 space-y-1.5 leading-relaxed">
                        <p className="font-black text-amber-200/80 uppercase tracking-widest text-[9px]">Ako funguje pretaženie vozidiel</p>
                        <p>Podmienky umožňujú ručne navýšiť počet vozidiel nad bežný výpočet — napr. pri sťaženom teréne alebo zlom počasí.</p>
                        <p>Keď je vozidiel viac ako štandardne, každé vezme <strong className="text-amber-200/80">menej m³</strong>. Keď je vozidiel menej ako štandardne (minusové pretaženie), každé vezme <strong className="text-amber-200/80">viac m³</strong>. Doťaženie sa účtuje podľa pravidiel aj pri podmienkovom nastavení — ak m³/voz. klesne pod 5 m³, každé vozidlo sa doťaží na min. 5 m³.</p>
                        {m3PerT > 0 && qty > 0 && (
                          <p className="font-mono text-amber-200/70 border-t border-amber-400/15 pt-1.5">
                            {qty.toFixed(1)} m³ ÷ {tab === "pumpa" ? totalP : podmienkyTrucks} voz = ∅ {m3PerT.toFixed(2)} m³/voz
                            {podmienkyFillupPrev > 0
                              ? ` → doťaženie +${podmienkyFillupPrev} m³ (min 5 m³/voz)`
                              : " → bez doťaženia"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

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
                    onClick={() => { setExtraItems(extraItems.filter((i) => i.id !== item.id)); }}
                    className="text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <CategorySelectField
                  label="Kategória betónu"
                  value={itemCat?.name ?? ""}
                  onChange={(v) => { const nd = allCategories.find(c => c.name === v)?.noDoprava; setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, categoryName: v, typeLabel: null, ...(nd ? { transportMode: "none" } : {}) } : i)); setShowResult(false); }}
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
                    type="text" inputMode="decimal" value={item.quantity}
                    onChange={(e) => { setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, quantity: e.target.value.replace(",", ".") } : i)); setShowResult(false); }}
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
                    {itemCat?.noDoprava ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-md text-xs font-black tracking-wide bg-white/20 text-white">Bez dopravy</span>
                        <span className="text-[10px] text-white/35">— kategória bez dopravy</span>
                      </div>
                    ) : (
                      <>
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
                          <p className="text-[10px] text-blue-400/80 mt-1">
                            +{item.quantity} m³ bude zarátané do dopravy
                            {selectedType ? <> <span className="font-black text-blue-300">Produktu – Betón {cleanType(selectedType.label)}</span></> : " Hlavného produktu"}.
                          </p>
                        )}
                        {item.transportMode === "none" && (
                          <p className="text-[10px] text-white/35 mt-1">Bez dopravy — táto položka nebude mať dopravu.</p>
                        )}
                      </>
                    )}
                  </div>
                )}
                {/* + Pridať Služby per extra item */}
                {!item.svc && tab !== "vlastnadoprava" && !itemCat?.noDoprava && (
                  <button type="button"
                    onClick={() => {
                      const defaults: ExtraItemServices = { pumpHour: "0 h", pumpMin: "0 min", waitPiecesPumpa: 0, hoseMeters: 0, washing: false, waitHour: "0 h", waitMin: "0 min" };
                      setExtraItems(extraItems.map((i) => i.id === item.id ? { ...i, svc: defaults, showSvc: true } : i));
                      setShowResult(false);
                    }}
                    className="w-full py-2 border border-dashed border-primary/30 text-primary/50 hover:border-primary hover:text-primary transition-all text-xs font-semibold cursor-pointer rounded-sm">
                    + Pridať Služby ({tab === "pumpa" ? "čerpanie, hadice, čakačky" : "čakačky"})
                  </button>
                )}
                {item.svc && tab !== "vlastnadoprava" && !itemCat?.noDoprava && (
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

          {/* Pridať položku — Pumpa/Mix */}
          {loggedClient?.canPridatBeton && (tab === "pumpa" || tab === "mix") && (
            <button
              type="button"
              onClick={() => {
                setExtraItems([...extraItems, { id: Date.now().toString(), categoryName: allCategories[0]?.name ?? null, typeLabel: null, quantity: "" }]);
                setShowResult(false);
              }}
              className="w-full py-2.5 border border-dashed border-primary/40 text-primary/60 hover:border-primary hover:text-primary transition-all text-sm font-semibold tracking-wide cursor-pointer rounded-sm"
            >
              + Pridať položku
            </button>
          )}
          {/* Pridať položku — Vlastná doprava (bez dopravy a služieb) */}
          {(loggedClient?.canPridatBetonOwn ?? true) && tab === "vlastnadoprava" && (
            <button
              type="button"
              onClick={() => {
                setExtraItems([...extraItems, { id: Date.now().toString(), categoryName: allCategories[0]?.name ?? null, typeLabel: null, quantity: "", transportMode: "none" }]);
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
              {/* ── Čerpanie PUMPA — 3 módy ── */}
              {(() => {
                // shared helpers
                const adjBtnCls = "flex-1 py-1.5 border border-white/10 text-white/50 hover:border-amber-500/40 hover:text-amber-300 transition-colors rounded-sm font-black text-[9px] cursor-pointer";
                const adjHrCls  = "flex-1 py-1.5 border border-blue-500/20 text-white/35 hover:border-blue-500/40 hover:text-blue-300 transition-colors rounded-sm font-black text-[9px] cursor-pointer";
                // single full-width row: −1h −15 −1 +1 +15 +1h
                const AdjRow = ({ onAdj }: { onAdj: (d: number) => void }) => (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => onAdj(-60)} className={adjHrCls}>−1h</button>
                    <button type="button" onClick={() => onAdj(-15)} className={adjBtnCls}>−15</button>
                    <button type="button" onClick={() => onAdj(-1)}  className={adjBtnCls}>−1</button>
                    <button type="button" onClick={() => onAdj(+1)}  className={adjBtnCls}>+1</button>
                    <button type="button" onClick={() => onAdj(+15)} className={adjBtnCls}>+15</button>
                    <button type="button" onClick={() => onAdj(+60)} className={adjHrCls}>+1h</button>
                  </div>
                );
                // 2-row for narrow half-column in ČAS mode
                const AdjCols = ({ onAdj }: { onAdj: (d: number) => void }) => (
                  <div className="space-y-1 mt-1.5">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => onAdj(-60)} className={adjHrCls}>−1h</button>
                      <button type="button" onClick={() => onAdj(+60)} className={adjHrCls}>+1h</button>
                    </div>
                    <div className="flex gap-1">
                      {([-15, -1, +1, +15] as const).map(d => (
                        <button key={d} type="button" onClick={() => onAdj(d)} className={adjBtnCls}>{d > 0 ? "+" : ""}{d}</button>
                      ))}
                    </div>
                  </div>
                );

                // billing summary box (shared across modes)
                const selectDurMins = (parseInt(pumpHour) || 0) * 60 + (parseInt(pumpMin) || 0);
                const timerDurMins = (() => {
                  const st = pumpMode === "timer" ? pumpStartTime : editStartTime;
                  const en = pumpMode === "timer" ? pumpStopTime : editStopTime;
                  if (!st || !en) return 0;
                  const [sh, sm] = st.split(":").map(Number);
                  const [eh, em] = en.split(":").map(Number);
                  let d = (eh * 60 + em) - (sh * 60 + sm);
                  if (d < 0) d += 24 * 60;
                  return d;
                })();
                const durMins = pumpMode === "select" ? selectDurMins : timerDurMins;
                const blocks = durMins > 0 ? Math.ceil(durMins / 15) : 0;
                const billingMins = blocks * 15;

                const estimatedCostBase = blocks > 0 ? (billingMins / 60) * pumpServicePrice * fPump : 0;
                const estimatedCost = estimatedCostBase;
                const BillingSummary = () => blocks > 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-sm overflow-hidden">
                    <div className="px-3 py-2.5 grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[9px] text-amber-400/50 uppercase tracking-wide mb-0.5">Bloky</div>
                        <div className="font-black text-amber-300 text-lg leading-tight">{blocks} × 15</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-amber-400/50 uppercase tracking-wide mb-0.5">Čas</div>
                        <div className="text-white/60 font-mono text-sm leading-tight">{Math.floor(billingMins / 60)}h{billingMins % 60 > 0 ? `${billingMins % 60}m` : ""}</div>
                        <div className="text-white/25 font-mono text-[10px]">({Math.floor(durMins / 60)}h{durMins % 60 > 0 ? `${durMins % 60}m` : ""} skut.)</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-primary text-base leading-tight">{estimatedCost.toFixed(2)} €</div>
                        {loggedClient && <div className="text-white/25 text-[9px]">bez DPH</div>}
                      </div>
                    </div>
                    <div className="px-3 py-1.5 border-t border-amber-500/15 bg-amber-500/5">
                      <p className="text-[11px] text-white/50 text-center">{(pumpServicePrice * fPump).toFixed(2)} €/h · iba čerpanie, bez betónu a dopravy</p>
                    </div>
                  </div>
                ) : null;

                // timer event handlers
                const handleStart = () => {
                  const t = nowHHMM();
                  setPumpStartTime(t); setPumpStopTime(null);
                  setPumpTimerActive(true); setPumpLiveMs(0);
                  if (pumpTimerRef.current) clearInterval(pumpTimerRef.current);
                  const startedAt = Date.now();
                  pumpTimerRef.current = setInterval(() => setPumpLiveMs(Date.now() - startedAt), 1000);
                  setShowResult(false);
                };
                const handleStop = () => {
                  setPumpStopTime(nowHHMM()); setPumpTimerActive(false);
                  setPumpFinalMs(pumpLiveMs);
                  if (pumpTimerRef.current) { clearInterval(pumpTimerRef.current); pumpTimerRef.current = null; }
                  // Nenastavuj showResult=true — operator ešte musí vyplniť betón/množstvo/adresu
                };
                const adjStart = (d: number) => {
                  setPumpStartTime(adjustHHMM(pumpStartTime || nowHHMM(), d));
                  // Nezastavuj timer — iba adjustuj štartový čas
                  setShowResult(false);
                };
                const adjStop = (d: number) => { setPumpStopTime(adjustHHMM(pumpStopTime || nowHHMM(), d)); setShowResult(false); };
                const resetTimer = () => {
                  setPumpStartTime(null); setPumpStopTime(null); setPumpTimerActive(false); setPumpLiveMs(0); setPumpFinalMs(0);
                  if (pumpTimerRef.current) { clearInterval(pumpTimerRef.current); pumpTimerRef.current = null; }
                  setShowResult(false);
                };
                const liveSecs = Math.floor(pumpLiveMs / 1000);
                const liveStr = `${Math.floor(liveSecs / 3600).toString().padStart(2, "0")}:${Math.floor((liveSecs % 3600) / 60).toString().padStart(2, "0")}:${(liveSecs % 60).toString().padStart(2, "0")}`;

                const modes: { id: "select" | "timer" | "edit"; label: string; hint: string }[] = [
                  { id: "select", label: "Výber", hint: "h + min" },
                  { id: "timer",  label: "Stopky", hint: "live" },
                  { id: "edit",   label: "Čas",    hint: "zač–kon" },
                ];

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-white/80">Čerpanie betónu</label>
                      <span className="text-[10px] text-white/35 font-mono">{pumpServicePrice > 0 ? `${(pumpServicePrice * fPump).toFixed(2)} €/h` : ""}</span>
                    </div>
                  <div className="border border-white/10 rounded-sm overflow-hidden">
                    {/* Mode switcher */}
                    <div className="grid grid-cols-3 border-b border-white/10">
                      {modes.map(m => (
                        <button key={m.id} type="button"
                          onClick={() => { setPumpMode(m.id); setShowResult(false); }}
                          className={cn("flex flex-col items-center py-3 px-1 transition-all text-center cursor-pointer",
                            pumpMode === m.id
                              ? "bg-primary/15 border-b-2 border-primary"
                              : "border-b-2 border-transparent text-white/40 hover:bg-white/5 hover:text-white/60"
                          )}>
                          <span className={cn("text-[11px] font-black uppercase tracking-widest", pumpMode === m.id ? "text-primary" : "")}>{m.label}</span>
                          <span className={cn("text-[9px] font-medium", pumpMode === m.id ? "text-white/50" : "text-white/25")}>{m.hint}</span>
                        </button>
                      ))}
                    </div>

                    {/* ── MODE: VÝBER (select) ── */}
                    {pumpMode === "select" && (
                      <div className="px-3 py-3 flex flex-col gap-2.5">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="text-[9px] text-white/35 uppercase tracking-widest">Hodiny</div>
                            {(pumpHour !== "0 h" || pumpMin !== "0 min") && (
                              <button type="button" onClick={() => { setPumpHour("0 h"); setPumpMin("0 min"); setShowResult(false); }}
                                className="text-[9px] text-white/25 hover:text-primary transition-colors cursor-pointer">× reset</button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {PUMP_HOURS.map(h => (
                              <button key={h} type="button"
                                onClick={() => { setPumpHour(h); setShowResult(false); }}
                                className={cn("px-3 py-2 rounded-sm text-xs font-black border transition-colors cursor-pointer",
                                  pumpHour === h
                                    ? "bg-primary/20 border-primary/60 text-primary"
                                    : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/70"
                                )}>
                                {h}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-white/35 uppercase tracking-widest mb-1.5">Minúty</div>
                          <div className="flex gap-1.5">
                            {PUMP_MINS.map(m => (
                              <button key={m} type="button"
                                onClick={() => { setPumpMin(m); setShowResult(false); }}
                                className={cn("flex-1 py-2 rounded-sm text-xs font-black border transition-colors cursor-pointer",
                                  pumpMin === m
                                    ? "bg-primary/20 border-primary/60 text-primary"
                                    : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/70"
                                )}>
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        <BillingSummary />
                      </div>
                    )}

                    {/* ── MODE: STOPKY (live timer) ── */}
                    {pumpMode === "timer" && (
                      <div className="px-3 py-4 overflow-hidden">
                        <AnimatePresence mode="wait" initial={false}>
                          {pumpTimerActive ? (
                            <motion.div key="running"
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                              className="flex flex-col gap-3">
                              {/* Status + live timer in one row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
                                  <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Čerpanie beží</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono text-xl font-black text-green-400 tracking-widest tabular-nums leading-none">{liveStr}</div>
                                  <div className="text-[8px] text-green-400/40 uppercase tracking-wide mt-0.5">
                                    {Math.ceil((liveSecs / 60) / 15) || 1} blok{Math.ceil((liveSecs / 60) / 15) > 1 ? "y" : ""}
                                  </div>
                                </div>
                              </div>
                              {/* Start time + single-row adj strip */}
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[8px] text-white/30 uppercase tracking-widest shrink-0">Štart</span>
                                  <input type="time" value={pumpStartTime || ""}
                                    onChange={(e) => { if (e.target.value) { setPumpStartTime(e.target.value); setShowResult(false); } }}
                                    className="font-mono text-sm font-black text-green-300 bg-transparent border-b border-green-400/20 focus:border-green-400 focus:outline-none cursor-pointer" />
                                </div>
                                <AdjRow onAdj={adjStart} />
                              </div>
                              {/* STOP button */}
                              <div className="flex justify-center pt-1">
                                <button type="button" onClick={handleStop}
                                  className="w-20 h-20 rounded-full bg-red-700 hover:bg-red-600 active:scale-95 text-white font-black transition-[transform,box-shadow] duration-150 flex flex-col items-center justify-center gap-0.5 shadow-[0_0_22px_rgba(185,28,28,0.45)] hover:shadow-[0_0_32px_rgba(220,38,38,0.65)] border-4 border-red-500/30 cursor-pointer select-none">
                                  <span className="text-base leading-none">■</span>
                                  <span className="text-[8px] font-black tracking-widest">STOP</span>
                                </button>
                              </div>
                            </motion.div>
                          ) : pumpStartTime && pumpStopTime ? (
                            <motion.div key="done"
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                              className="flex flex-col gap-3">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Čerpanie hotové</span>
                                </div>
                                <button type="button" onClick={resetTimer} className="text-[10px] text-white/25 hover:text-white/55 transition-colors cursor-pointer">× znova</button>
                              </div>
                              {/* Štart / Koniec s adj tlačidlami */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Štart</div>
                                  <input type="time" value={pumpStartTime || ""}
                                    onChange={(e) => { if (e.target.value) { setPumpStartTime(e.target.value); setShowResult(false); } }}
                                    className="font-mono text-xl font-black text-white/70 bg-transparent border-b border-white/15 focus:border-white/40 focus:outline-none cursor-pointer w-full mb-1.5" />
                                  <AdjCols onAdj={adjStart} />
                                </div>
                                <div>
                                  <div className="text-[9px] text-primary/70 uppercase tracking-widest mb-1">Koniec</div>
                                  <input type="time" value={pumpStopTime || ""}
                                    onChange={(e) => { if (e.target.value) { setPumpStopTime(e.target.value); setShowResult(false); } }}
                                    className="font-mono text-xl font-black text-primary bg-transparent border-b border-primary/25 focus:border-primary focus:outline-none cursor-pointer w-full mb-1.5" />
                                  <AdjCols onAdj={adjStop} />
                                </div>
                              </div>
                              <BillingSummary />
                              {/* Guidance — ďalší krok */}
                              <div className="border border-white/8 bg-white/3 rounded-sm px-3 py-2 text-center">
                                <p className="text-[10px] text-white/40 leading-relaxed">
                                  ↓ Zadaj <span className="text-white/60 font-semibold">betón</span>, <span className="text-white/60 font-semibold">množstvo</span> a <span className="text-white/60 font-semibold">adresu</span><br/>potom klikni <span className="text-primary font-black">VYPOČÍTAŤ CENU</span>
                                </p>
                              </div>
                            </motion.div>
                          ) : (
                            /* IDLE — round START button */
                            <motion.div key="idle"
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                              className="flex flex-col items-center gap-3 py-2">
                              {/* Mini info badge */}
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/4 border border-white/8 rounded-sm self-stretch">
                                <span className="w-1.5 h-1.5 bg-green-500/60 rounded-full flex-shrink-0" />
                                <span className="text-[9px] text-white/35 leading-snug">
                                  Iba na stavbe · live časovač · faktúra zaokrúhlí nahor na 15 min
                                </span>
                                {pumpServicePrice > 0 && <span className="ml-auto text-[9px] text-white/25 font-mono flex-shrink-0">{(pumpServicePrice * fPump).toFixed(2)} €/h</span>}
                              </div>
                              <button type="button" onClick={handleStart}
                                className="w-24 h-24 rounded-full bg-green-900 hover:bg-green-800 active:scale-[0.97] text-white font-black transition-[transform,box-shadow] duration-150 flex flex-col items-center justify-center gap-1 shadow-[0_0_28px_rgba(22,163,74,0.30)] hover:shadow-[0_0_40px_rgba(22,163,74,0.55)] border-4 border-green-600/35 cursor-pointer select-none">
                                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                <span className="text-[9px] font-black tracking-widest text-green-200">START</span>
                              </button>
                              <p className="text-[9px] text-white/25 text-center leading-relaxed">Stlač pri príjazde pumpy na stavbu</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* ── MODE: ČAS (manual start–end) ── */}
                    {pumpMode === "edit" && (
                      <div className="px-3 py-3 flex flex-col gap-2.5">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-[9px] text-white/35 uppercase tracking-widest mb-1">Začiatok</div>
                            <input type="time" value={editStartTime || ""}
                              onChange={(e) => { const v = e.target.value; if (v) { const [h,m] = v.split(":").map(Number); setEditStartTime(m > 59 ? `${h.toString().padStart(2,"0")}:59` : v); setShowResult(false); } }}
                              onClick={() => { if (!editStartTime) setEditStartTime(nowHHMM()); }}
                              className="font-mono text-2xl font-black text-white/80 bg-transparent border-b-2 border-white/20 hover:border-white/40 focus:border-primary focus:outline-none cursor-pointer w-full" />
                            <AdjCols onAdj={(d) => { setEditStartTime(adjustHHMM(editStartTime || nowHHMM(), d)); setShowResult(false); }} />
                          </div>
                          <div>
                            <div className="text-[9px] text-primary/60 uppercase tracking-widest mb-1">Koniec</div>
                            <input type="time" value={editStopTime || ""}
                              onChange={(e) => { const v = e.target.value; if (v) { const [h,m] = v.split(":").map(Number); setEditStopTime(m > 59 ? `${h.toString().padStart(2,"0")}:59` : v); setShowResult(false); } }}
                              onClick={() => { if (!editStopTime) setEditStopTime(nowHHMM()); }}
                              className="font-mono text-2xl font-black text-primary bg-transparent border-b-2 border-primary/30 hover:border-primary/60 focus:border-primary focus:outline-none cursor-pointer w-full" />
                            <AdjCols onAdj={(d) => { setEditStopTime(adjustHHMM(editStopTime || nowHHMM(), d)); setShowResult(false); }} />
                          </div>
                        </div>
                        {(editStartTime || editStopTime) && (
                          <div className="flex justify-end">
                            <button type="button" onClick={() => { setEditStartTime(null); setEditStopTime(null); setShowResult(false); }}
                              className="text-[9px] text-white/25 hover:text-primary transition-colors cursor-pointer">× reset</button>
                          </div>
                        )}
                        <BillingSummary />
                        {(!editStartTime || !editStopTime) && (
                          <p className="text-[10px] text-white/25 text-center">Zadaj čas začiatku a konca čerpania</p>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                );
              })()}


              {/* Čakačky + Hadice — kompaktný 2-stĺpcový grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Čakačky */}
                <div className="border border-white/10 rounded-lg p-3 bg-white/5">
                  <div className="text-xs font-semibold text-white/70 mb-0.5">Čakačky</div>
                  <div className="text-[10px] text-white/35 mb-2 min-h-[2rem] flex items-start">
                    {fWaitP < 1 && Math.abs(waitServicePricePumpa - waitServicePricePumpa * fWaitP) > 0.001 && <s className="text-white/20 mr-1">{waitServicePricePumpa.toFixed(2)}</s>}
                    {(waitServicePricePumpa * fWaitP).toFixed(2)} €/15 min
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
                    <p className="text-[10px] text-primary mt-1.5 text-center font-semibold">{(waitPiecesPumpa * waitServicePricePumpa * fWaitP).toFixed(2)} €</p>
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
                    {fWaitM < 1 && Math.abs(waitServicePriceMix - waitServicePriceMix * fWaitM) > 0.001 && <s className="text-white/20 mr-1">{waitServicePriceMix.toFixed(2)}</s>}
                    {(waitServicePriceMix * fWaitM).toFixed(2)} € / 15 min
                  </span>
                </span>
                {clientDeliveryZone?.pricingType === "km" ? (
                  waitPiecesMix > 0 && <span className="text-xs text-primary font-bold">{waitPiecesMix} ks</span>
                ) : (
                  (parseInt(waitHour) > 0 || parseInt(waitMin) > 0) && (
                    <span className="text-xs text-primary font-bold">
                      {[parseInt(waitHour) > 0 ? `${parseInt(waitHour)} h` : "", parseInt(waitMin) > 0 ? `${parseInt(waitMin)} min` : ""].filter(Boolean).join(" ")}
                    </span>
                  )
                )}
              </div>
              {clientDeliveryZone?.pricingType === "km" ? (
                /* KM klient — ks counter (rovnaký vzor ako PUMPA čakačky) */
                <>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => { setWaitPiecesMix(Math.max(0, waitPiecesMix - 1)); setShowResult(false); }}
                      className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer text-base font-bold flex-shrink-0">
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <span className={cn("text-xl font-black", waitPiecesMix > 0 ? "text-primary" : "text-white/30")}>
                        {waitPiecesMix}
                      </span>
                      <span className="text-[10px] text-white/35 ml-0.5">ks</span>
                    </div>
                    <button type="button"
                      onClick={() => { setWaitPiecesMix(waitPiecesMix + 1); setShowResult(false); }}
                      className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/60 hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer text-base font-bold flex-shrink-0">
                      +
                    </button>
                  </div>
                  {waitPiecesMix > 0 && (
                    <p className="text-[10px] text-primary mt-1 text-center font-semibold">{(waitPiecesMix * waitServicePriceMix * fWaitM).toFixed(2)} €</p>
                  )}
                </>
              ) : (
                /* Štandard — hodiny + minúty dropdown */
                <>
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
                </>
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
                <button onClick={() => { if (canCalc) { setShowResult(true); gtagEvent("calculator_complete", { tab, quantity, type: selectedType?.label }); requestAnimationFrame(() => { resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }); } }} disabled={!canCalc}
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
        <div ref={resultRef} className={cn("p-6 scroll-mt-24", !showResult && "hidden md:flex md:items-center md:justify-center")}>
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
                  const fmtR = (n: number) => parseFloat((Math.round(n * 100) / 100).toFixed(2)).toString();
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
                      const kmMinFeeKey = tab === "pumpa" ? `km_min_pumpa_${clientDeliveryZone?.id}` : `km_min_mix_${clientDeliveryZone?.id}`;
                      const kmMinFeeBase = tab === "pumpa"
                        ? (clientDeliveryZone?.minimumFeeKmPumpa ?? clientDeliveryZone?.minimumFeeKm)
                        : (clientDeliveryZone?.minimumFeeKmMix ?? clientDeliveryZone?.minimumFeeKm);
                      const kmMinFee = mp2[kmMinFeeKey] !== undefined ? mp2[kmMinFeeKey] : kmMinFeeBase;
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

                        const itemCatName = ci.categoryName || (idx === 0 ? categoryName : null) || null;
                        return (
                          <div key={idx} className={cn(isExtra ? "mt-3 pt-2.5 border-t border-white/10" : "")}>
                            {isExtra ? (
                              <div className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "#EDC531" }}>
                                Pridaná položka {idx}
                                {itemCatName && <span className="ml-1.5 font-normal normal-case tracking-normal" style={{ color: "rgba(255,255,255,0.45)" }}>{itemCatName}</span>}
                              </div>
                            ) : itemCatName ? (
                              <div className="text-[10px] font-black uppercase tracking-wider mb-1 leading-tight" style={{ color: "#EDC531", opacity: 0.85 }}>{itemCatName}</div>
                            ) : null}
                            <PriceRow label={ci.label} original={origVal} discounted={discVal} hasDiscount={Math.abs(origVal - discVal) > 0.001} alwaysShow={isExtra} />

                            {/* Doprava pre tento item */}
                            {!result.isOwn && ci.transport > 0 && (
                              <div className={idx === 0 && addToMainQtyDisplay > 0 ? "border-l-2 border-blue-400/40 pl-1.5 -ml-1" : ""}>
                                <PriceRow
                                  label={
                                    <span>
                                      {idx === 0 && addToMainQtyDisplay > 0 && (
                                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500/25 rounded-sm mr-1.5 align-middle shrink-0" title="Hlavná doprava – zahŕňa m³ z pridaných položiek">
                                          {/* wheel icon — koleso = hlavná doprava */}
                                          <svg width="13" height="13" viewBox="0 0 10 10" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round">
                                            <circle cx="5" cy="5" r="4"/>
                                            <circle cx="5" cy="5" r="1.5"/>
                                            <line x1="5" y1="1" x2="5" y2="3.5"/>
                                            <line x1="5" y1="6.5" x2="5" y2="9"/>
                                            <line x1="1" y1="5" x2="3.5" y2="5"/>
                                            <line x1="6.5" y1="5" x2="9" y2="5"/>
                                          </svg>
                                        </span>
                                      )}
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
                              </div>
                            )}
                            {isAddToMain && (
                              <div className="flex items-center gap-1 ml-1 mt-0.5">
                                <span className="text-blue-400/60 text-[10px] leading-tight shrink-0">↑</span>
                                <span className="text-[10px] text-blue-400/70 leading-tight flex items-center gap-1">
                                  +{ci.qty}&thinsp;m³ zarátané do dopravy
                                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 bg-blue-500/25 rounded-sm shrink-0">
                                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#60a5fa" strokeWidth="1.6" strokeLinecap="round">
                                      <circle cx="5" cy="5" r="4"/>
                                      <circle cx="5" cy="5" r="1.5"/>
                                      <line x1="5" y1="1" x2="5" y2="3.5"/>
                                      <line x1="5" y1="6.5" x2="5" y2="9"/>
                                      <line x1="1" y1="5" x2="3.5" y2="5"/>
                                      <line x1="6.5" y1="5" x2="9" y2="5"/>
                                    </svg>
                                  </span>
                                  <span className="font-black text-blue-400/90">
                                    – {result.concreteBreakdown[0]?.label.split("–")[0].trim() ?? "Hlavná položka"}
                                  </span>
                                </span>
                              </div>
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
                          {hasDiscount && Math.abs(result.totalBezDph - result.totalDiscBezDph) > 0.001 && <span className="line-through text-white/35 text-xs block">{fmt(result.totalBezDph)}</span>}
                          <span className="font-semibold text-white">{fmt(result.totalDiscBezDph)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">Cena spolu s DPH ({Math.round(VAT * 100)}%)</span>
                        <div className="text-right">
                          {hasDiscount && Math.abs(result.totalSDph - result.totalDiscSDph) > 0.001 && <span className="line-through text-white/35 text-xs block">{fmt(result.totalSDph)}</span>}
                          <span className="text-2xl font-bold text-primary">{fmt(result.totalDiscSDph)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">Cena spolu</span>
                      <div className="text-right">
                        {hasDiscount && Math.abs(result.hotovostOrigTotal - result.hotovostTotal) > 0.001 && <span className="line-through text-white/35 text-xs block">{fmt(result.hotovostOrigTotal)}</span>}
                        <span className="text-2xl font-bold text-primary">{fmt(result.hotovostTotal)}</span>
                      </div>
                    </div>
                  )}

                  {!result.isOwn && (
                    <div className="flex items-center gap-2 text-white/50 text-xs pt-1 flex-wrap">
                      <Truck className="w-3.5 h-3.5 shrink-0" />
                      {tab === "pumpa" ? (
                        <span><strong>1× Pumpa</strong> ({pumpCap}m³){result.mixTrucksCount > 0 ? <> + <strong>{result.mixTrucksCount}× Mix</strong> ({mixCap}m³)</> : ""} = <strong>{result.trucks} vozidl{result.trucks === 1 ? "o" : "á"}</strong></span>
                      ) : (
                        <span><strong>{result.trucks}× Mix</strong> ({mixCap}m³/vozidlo)</span>
                      )}
                    </div>
                  )}
                  {podmienkyEnabled && !result.isOwn && (() => {
                    const q = result.qty;
                    const isRisk = tab === "pumpa"
                      ? podmienkyPumpa * pumpCap + podmienkyMixC * mixCap < q
                      : podmienkyTrucks * mixCap < q;
                    const totT = tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks;
                    const fillupDisp = result.concreteBreakdown[0]?.transportFillupM3 ?? 0;
                    const qPT = totT > 0 ? Math.round(((q + fillupDisp) / totT) * 10) / 10 : 0;
                    const vehicleStr = tab === "pumpa"
                      ? `${podmienkyPumpa}× Pumpa${podmienkyMixC > 0 ? ` + ${podmienkyMixC}× Mix` : ""}`
                      : `${podmienkyTrucks}× Mix`;
                    return isRisk ? (
                      <div className="flex items-start gap-2.5 bg-red-500/12 border border-red-500/25 rounded-sm px-3 py-2.5 mt-1">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-0.5">Minusové pretaženie — vlastné riziko</div>
                          <div className="text-xs text-red-300/80">{vehicleStr} · ∅ {qPT} m³/voz</div>
                          {result.fillupM3 > 0 && <div className="text-[10px] text-red-300/50 mt-0.5">doťaženie +{result.fillupM3} m³</div>}
                          <div className="text-[10px] text-red-300/40 mt-0.5">Vodič preberá zodpovednosť za stav vozidla.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-sm px-3 py-2 mt-1">
                        <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">★ Pretaženie</span>
                          <span className="text-xs text-amber-200/70">{vehicleStr} · ∅ {qPT} m³/voz</span>
                          {result.fillupM3 > 0 && <span className="text-[10px] text-amber-300/50">doťaženie +{result.fillupM3} m³</span>}
                        </div>
                      </div>
                    );
                  })()}
                  {!isAdminMode && tab !== "vlastnadoprava" && (
                    <p className="text-[10px] text-white/30 pt-1">* Orientačná cena. Môže byť upravená podľa podmienok terénu a počasia.</p>
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
                {smsOrderCreated && (
                  <div className="flex items-center gap-2 bg-green-900/40 border border-green-500/30 rounded-sm px-3 py-2.5 text-xs text-green-300">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Záväzná objednávka cez SMS bola evidovaná v systéme.</span>
                  </div>
                )}

                <div ref={turnstileRef} style={{ display: "none" }} aria-hidden="true" />

                {orderSubmittedBanner ? (
                  <div className="flex items-center gap-3 bg-green-500/15 border border-green-500/30 rounded-sm px-4 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-green-500/25 border border-green-500/40 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-green-300">Objednávka odoslaná</div>
                      <div className="text-xs text-green-400/60 mt-0.5">Zmenou vstupov sa toto potvrdenie skryje.</div>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => {
                    setOrderForm(f => ({ ...f, name: loggedClient?.name ?? f.name, phone: loggedClient?.phone ? formatPhone(loggedClient.phone) : f.phone }));
                    setShowOrderModal(true);
                  }}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-all cursor-pointer">
                    <ShoppingCart className="w-4 h-4" /> Záväzne objednať →
                  </button>
                )}
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
                      const svcCell = (orig: number, suffix: string, factor: number) => {
                        const disc = orig * factor;
                        return factor < 1 && Math.abs(orig - disc) > 0.001 ? (
                          <div>
                            <span className="line-through text-primary/40 text-xs mr-1">{orig.toFixed(2)} €{suffix}</span>
                            <span className="block">{disc.toFixed(2)} €{suffix}</span>
                          </div>
                        ) : `${disc.toFixed(2)} €${suffix}`;
                      };
                      const pType = clientDeliveryZone?.pricingType ?? "standard";
                      const mpInfo = loggedClient?.manualPrices ?? {};
                      const fT = dopravaFactor;
                      let transLabel1 = "Min. doprava", transVal1: React.ReactNode = "—";
                      let transLabel2 = "Doprava od", transVal2: React.ReactNode = "—";
                      if (pType === "km") {
                        const baseKmRate = clientDeliveryZone?.ratePerKm ?? 1.8;
                        const kmRate = mpInfo[`km_rate_${clientDeliveryZone?.id}`] ?? baseKmRate;
                        const minFeeKey = tab === "pumpa" ? `km_min_pumpa_${clientDeliveryZone?.id}` : `km_min_mix_${clientDeliveryZone?.id}`;
                        const minFeeBase = tab === "pumpa"
                          ? (clientDeliveryZone?.minimumFeeKmPumpa ?? clientDeliveryZone?.minimumFeeKm)
                          : (clientDeliveryZone?.minimumFeeKmMix ?? clientDeliveryZone?.minimumFeeKm);
                        const minFee = mpInfo[minFeeKey] !== undefined ? mpInfo[minFeeKey] : minFeeBase;
                        transLabel1 = "Sadzba/km"; transVal1 = svcCell(kmRate, "/km", fT);
                        transLabel2 = "Min. doprava"; transVal2 = minFee != null ? svcCell(minFee, "/auto", fT) : "—";
                      } else if (pType === "auto") {
                        const baseAutoRate = clientDeliveryZone?.ratePerTruck ?? 0;
                        const autoRate = mpInfo[`auto_rate_${clientDeliveryZone?.id}`] ?? baseAutoRate;
                        const minFee = clientDeliveryZone?.minimumFeeAuto;
                        transLabel1 = "Paušál/auto"; transVal1 = svcCell(autoRate, "/auto", fT);
                        transLabel2 = "Min. doprava"; transVal2 = minFee != null ? svcCell(minFee, "/auto", fT) : "—";
                      } else {
                        const minFeeStd = mpInfo["min_fee"] !== undefined ? mpInfo["min_fee"] : (tsettings.minimumFee ?? 62.50);
                        transLabel1 = "Min. doprava"; transVal1 = svcCell(minFeeStd, "/auto", fT);
                        if (tzones.length > 0) {
                          const z0 = tzones[0];
                          const z0Rate = mpInfo[z0.id] !== undefined ? mpInfo[z0.id] : z0.ratePerM3;
                          transVal2 = svcCell(z0Rate, "/m³", fT);
                        }
                      }
                      return ([
                        { label: transLabel1, value: transVal1 },
                        { label: transLabel2, value: transVal2 },
                        { label: "Čerpanie", value: svcCell(pumpServicePrice, "/hod", fPump) },
                        { label: "Rozbeh. chémia", value: svcCell(chemServicePrice, " (v cene)", fChem) },
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
                    {(() => {
                      const mixDisc = waitServicePriceMix * fWaitM;
                      const mixShowStrike = fWaitM < 1 && Math.abs(waitServicePriceMix - mixDisc) > 0.001;
                      const svcCell = (orig: number, suffix: string, factor: number) => {
                        const disc = orig * factor;
                        return factor < 1 && Math.abs(orig - disc) > 0.001 ? (
                          <div>
                            <span className="line-through text-primary/40 text-xs mr-1">{orig.toFixed(2)} €{suffix}</span>
                            <span className="block">{disc.toFixed(2)} €{suffix}</span>
                          </div>
                        ) : `${disc.toFixed(2)} €${suffix}`;
                      };
                      const pType = clientDeliveryZone?.pricingType ?? "standard";
                      const mpInfo = loggedClient?.manualPrices ?? {};
                      const fT = dopravaFactor;
                      let transLabel1 = "Min. doprava", transVal1: React.ReactNode = "—";
                      let transLabel2 = "Doprava od", transVal2: React.ReactNode = "—";
                      if (pType === "km") {
                        const baseKmRate = clientDeliveryZone?.ratePerKm ?? 1.8;
                        const kmRate = mpInfo[`km_rate_${clientDeliveryZone?.id}`] ?? baseKmRate;
                        const minFeeBase = clientDeliveryZone?.minimumFeeKmMix ?? clientDeliveryZone?.minimumFeeKm;
                        const minFee = mpInfo[`km_min_mix_${clientDeliveryZone?.id}`] !== undefined ? mpInfo[`km_min_mix_${clientDeliveryZone?.id}`] : minFeeBase;
                        transLabel1 = "Sadzba/km"; transVal1 = svcCell(kmRate, "/km", fT);
                        transLabel2 = "Min. doprava"; transVal2 = minFee != null ? svcCell(minFee, "/auto", fT) : "—";
                      } else if (pType === "auto") {
                        const baseAutoRate = clientDeliveryZone?.ratePerTruck ?? 0;
                        const autoRate = mpInfo[`auto_rate_${clientDeliveryZone?.id}`] ?? baseAutoRate;
                        const minFee = clientDeliveryZone?.minimumFeeAuto;
                        transLabel1 = "Paušál/auto"; transVal1 = svcCell(autoRate, "/auto", fT);
                        transLabel2 = "Min. doprava"; transVal2 = minFee != null ? svcCell(minFee, "/auto", fT) : "—";
                      } else {
                        const minFeeStd = mpInfo["min_fee"] !== undefined ? mpInfo["min_fee"] : (tsettings.minimumFee ?? 62.50);
                        transLabel1 = "Min. doprava"; transVal1 = svcCell(minFeeStd, "/auto", fT);
                        if (tzones.length > 0) {
                          const z0 = tzones[0];
                          const z0Rate = mpInfo[z0.id] !== undefined ? mpInfo[z0.id] : z0.ratePerM3;
                          transVal2 = svcCell(z0Rate, "/m³", fT);
                        }
                      }
                      return ([
                        { label: transLabel1, value: transVal1 },
                        { label: transLabel2, value: transVal2 },
                        {
                          label: "Čakačka / 15 min",
                          value: mixShowStrike ? (
                            <div>
                              <span className="line-through text-primary/40 text-xs mr-1">{waitServicePriceMix.toFixed(2)} €</span>
                              <span className="block">{mixDisc.toFixed(2)} €</span>
                            </div>
                          ) : `${mixDisc.toFixed(2)} €`,
                        },
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
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-white/30 text-xs flex items-center gap-1.5 flex-wrap">
                            <span>{tab === "pumpa" ? "Pumpa" : tab === "mix" ? "Mix" : "Vlastná doprava"}{address ? ` · ${address}` : ""}</span>
                            <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-sm ${isFaktura ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"}`}>
                              {isFaktura ? "Faktúra" : "Hotovosť"}
                            </span>
                          </span>
                          <span className="text-white/30 text-xs shrink-0">{dayLabel}</span>
                        </div>
                      </div>
                    );
                  })()}
                  {podmienkyEnabled && result && (() => {
                    const q = result.qty;
                    const isRisk = tab === "pumpa"
                      ? podmienkyPumpa * pumpCap + podmienkyMixC * mixCap < q
                      : podmienkyTrucks * mixCap < q;
                    const totT = tab === "pumpa" ? podmienkyPumpa + podmienkyMixC : podmienkyTrucks;
                    const fillupDisp = result.concreteBreakdown[0]?.transportFillupM3 ?? 0;
                    const qPT = totT > 0 ? Math.round(((q + fillupDisp) / totT) * 10) / 10 : 0;
                    const vehicleStr = tab === "pumpa"
                      ? `${podmienkyPumpa}× Pumpa${podmienkyMixC > 0 ? ` + ${podmienkyMixC}× Mix` : ""}`
                      : `${podmienkyTrucks}× Mix`;
                    return isRisk ? (
                      <div className="flex items-start gap-2.5 bg-red-500/12 border border-red-500/30 rounded-lg px-3 py-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-0.5">Minusové pretaženie — vlastné riziko</div>
                          <div className="text-xs text-red-300/80">{vehicleStr} · ∅ {qPT} m³/voz</div>
                          <div className="text-[10px] text-red-300/50 mt-0.5">Odoslaním objednávky potvrdzujete prevzatie zodpovednosti.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
                        <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 mr-2">★ Pretaženie</span>
                          <span className="text-xs text-amber-200/70">{vehicleStr} · ∅ {qPT} m³/voz</span>
                        </div>
                      </div>
                    );
                  })()}
                  {smsOrderCreated && (
                    <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-400/25 rounded-lg px-3 py-2.5">
                      <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-0.5">Objednávka vytvorená cez SMS</div>
                        <div className="text-xs text-amber-200/65">Táto kalkulácia bola pred chvíľou automaticky zaznamenaná pri SMS exporte. Naozaj chcete vytvoriť ďalšiu záväznú objednávku?</div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">Meno a priezvisko *</label>
                      <input value={orderForm.name} onChange={e => setOrderForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Zadajte meno"
                        className="w-full bg-white/10 border-b-2 border-b-primary/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-b-primary placeholder:text-white/30 rounded-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">
                        Telefón <span className="text-red-400">*</span>
                      </label>
                      <PhoneInput value={orderForm.phone} onChange={v => setOrderForm(f => ({ ...f, phone: v }))}
                        placeholder="0944 xxx xxx"
                        className={`w-full bg-white/10 border-b-2 text-white px-3 py-2 text-sm focus:outline-none placeholder:text-white/30 rounded-sm ${orderForm.phone && !isValidSvkPhone(orderForm.phone) ? "border-b-red-400" : "border-b-primary/60 focus:border-b-primary"}`} />
                      {orderForm.phone && !isValidSvkPhone(orderForm.phone) && (
                        <p className="text-[10px] text-red-400 mt-0.5">Zadajte platné SK číslo (09XX XXX XXX)</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">Poznámka</label>
                      <textarea value={orderForm.note} onChange={e => setOrderForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Termín, špeciálne požiadavky..."
                        rows={2}
                        className="w-full bg-white/10 border-b-2 border-b-primary/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-b-primary placeholder:text-white/30 rounded-sm resize-none" />
                    </div>
                  </div>
                  {orderError && (
                    <div className="flex items-start gap-2 bg-red-500/15 border border-red-500/40 rounded-lg px-3 py-2.5 text-sm text-red-300">
                      <span className="mt-0.5 shrink-0">⚠</span>
                      <span>{orderError}</span>
                    </div>
                  )}
                  <button
                    onClick={handleSubmitOrder}
                    disabled={orderSubmitting || !orderForm.name.trim() || !orderForm.phone.trim() || !isValidSvkPhone(orderForm.phone)}
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
