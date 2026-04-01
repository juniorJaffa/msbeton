import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Truck, LogIn, LogOut, FileText, MessageSquare, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminData } from "@/lib/adminData";
import { clientAuth, type LoggedClient } from "@/lib/clientAuth";
import jsPDF from "jspdf";

type Tab = "pumpa" | "mix" | "vlastnadoprava";
type PriceMode = "faktura" | "hotovost";

const VAT = 0.23;
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
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white/10 border border-white/10 border-b-2 border-b-primary text-white px-4 py-3 pr-10 focus:outline-none text-sm font-medium cursor-pointer rounded-sm">
          {options.map((o) => <option key={o} value={o} className="bg-[#1e293b] text-white">{o}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-primary pointer-events-none" />
      </div>
    </div>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div onClick={() => onChange(!checked)} className={cn(
        "w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0",
        checked ? "bg-primary border-primary" : "bg-white/10 border-white/30 group-hover:border-primary/50"
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
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [concreteTypeLabel, setConcreteTypeLabel] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [pumpHour, setPumpHour] = useState("1 h");
  const [pumpMin, setPumpMin] = useState("0 min");
  const [waitHour, setWaitHour] = useState("0 h");
  const [waitMin, setWaitMin] = useState("0 min");
  const [hoseMeters, setHoseMeters] = useState(0);
  const [washing, setWashing] = useState(false);
  const [rozbehovaChemia, setRozbehovaChemia] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceMode>("hotovost");
  const [loggedClient, setLoggedClient] = useState<LoggedClient | null>(() => clientAuth.getLoggedClient());
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);
  const [zimneOpatrenia, setZimneOpatrenia] = useState(() => {
    const now = new Date(); const m = now.getMonth() + 1; const d = now.getDate();
    return (m === 11 && d >= 15) || m === 12 || m === 1 || m === 2 || (m === 3 && d <= 15);
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const handler = () => setRevision((r) => r + 1);
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);

  const allCategories = useMemo(() => adminData.getCategories(), [revision]);
  const allServices = useMemo(() => adminData.getServices(), [revision]);
  const tzones = useMemo(() => adminData.getTransportZones(), [revision]);
  const tsettings = useMemo(() => adminData.getTransportSettings(), [revision]);

  const selectedCategory = allCategories.find((c) => c.name === categoryName) ?? allCategories[0];
  const typesForCategory = selectedCategory?.types ?? [];
  const selectedType = typesForCategory.find((t) => t.label === concreteTypeLabel) ?? typesForCategory[0];

  const pumpServicePrice = allServices.find((s) => s.name.includes("Čerpanie"))?.price ?? 112.50;
  const chemServicePrice = allServices.find((s) => s.name.toLowerCase().includes("rozbeh"))?.price ?? 31.25;
  const washServicePrice = allServices.find((s) => s.name.toLowerCase().includes("umýv"))?.price ?? 56.25;
  const waitServicePrice = allServices.find((s) => s.name.toLowerCase().includes("čakačk") || s.name.toLowerCase().includes("čakania"))?.price ?? 8.00;
  const hoseServicePrice = allServices.find((s) => s.name.toLowerCase().includes("hadice"))?.price ?? 10.00;
  const zimneServicePrice = allServices.find((s) => s.name.toLowerCase().includes("zimn"))?.price ?? 10.00;

  const isWinterSeason = (() => {
    const now = new Date(); const m = now.getMonth() + 1; const d = now.getDate();
    return (m === 11 && d >= 15) || m === 12 || m === 1 || m === 2 || (m === 3 && d <= 15);
  })();

  const discountPct = loggedClient?.discountPct ?? 0;
  const hasDiscount = discountPct > 0;
  const discountFactor = 1 - discountPct / 100;

  const waitTotalMins = useMemo(() => (parseInt(waitHour) || 0) * 60 + (parseInt(waitMin) || 0), [waitHour, waitMin]);

  const handleCategoryChange = (name: string) => {
    setCategoryName(name);
    setConcreteTypeLabel(null);
    setShowResult(false);
  };

  function calcTransport(km: number, qty: number): number {
    if (km === 0) return 0;
    const zone = tzones.find((z) => km >= z.fromKm && km < z.toKm) ?? tzones[tzones.length - 1];
    const trucks = Math.ceil(qty / MIX_TRUCK_CAPACITY);
    const rateCost = zone ? qty * zone.ratePerM3 : 0;
    const minCost = trucks * (tsettings.minimumFee ?? 62.50);
    return Math.max(rateCost, minCost);
  }

  const result = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const km = parseFloat(distance) || 0;
    if (!qty || !selectedType) return null;

    const trucks = Math.ceil(qty / MIX_TRUCK_CAPACITY);
    const pumpHrs = parseInt(pumpHour) || 1;
    const pumpMs = parseInt(pumpMin) || 0;
    const pumpCost = tab === "pumpa" ? pumpHrs * pumpServicePrice + (pumpMs > 0 ? pumpServicePrice * 0.5 : 0) : 0;
    const waitIntervals = Math.ceil(waitTotalMins / 15);

    const isOwn = tab === "vlastnadoprava";
    const items = {
      concrete: qty * selectedType.price,
      transport: isOwn ? 0 : calcTransport(km, qty),
      pump: tab === "pumpa" ? pumpCost : 0,
      hoses: tab === "pumpa" && hoseMeters > 0 ? hoseMeters * hoseServicePrice : 0,
      washing: tab === "pumpa" && washing ? washServicePrice : 0,
      chem: tab === "pumpa" && rozbehovaChemia ? chemServicePrice : 0,
      waiting: tab === "pumpa" ? waitIntervals * waitServicePrice : 0,
      zimne: zimneOpatrenia ? qty * zimneServicePrice : 0,
    };

    const totalBezDph = Object.values(items).reduce((a, b) => a + b, 0);
    const discountedItems = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v * discountFactor])) as typeof items;
    const totalDiscBezDph = totalBezDph * discountFactor;
    const totalDiscSDph = totalDiscBezDph * (1 + VAT);

    const hotovostBaseItems = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v * (1 + VAT)])) as typeof items;
    const hotovostDiscItems = Object.fromEntries(Object.entries(hotovostBaseItems).map(([k, v]) => [k, v * discountFactor])) as typeof items;
    const hotovostTotal = totalBezDph * (1 + VAT) * discountFactor;

    const waitLabel = (() => {
      const wh = parseInt(waitHour) || 0;
      const wm = parseInt(waitMin) || 0;
      const parts: string[] = [];
      if (wh > 0) parts.push(`${wh} h`);
      if (wm > 0) parts.push(`${wm} min`);
      return parts.join(" ");
    })();

    return {
      trucks, items, totalBezDph, totalSDph: totalBezDph * (1 + VAT),
      discountedItems, totalDiscBezDph, totalDiscSDph,
      hotovostBaseItems, hotovostDiscItems, hotovostTotal,
      qty, km, waitIntervals, waitLabel, pumpHrs, pumpMs, isOwn,
    };
  }, [tab, quantity, distance, selectedType, pumpHour, pumpMin, waitTotalMins, hoseMeters, washing, rozbehovaChemia, zimneOpatrenia, discountFactor, pumpServicePrice, chemServicePrice, washServicePrice, waitServicePrice, hoseServicePrice, zimneServicePrice, tzones, tsettings]);

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
    setShowResult(false);
  }

  function exportPDF() {
    if (!result) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const today = new Date().toLocaleDateString("sk-SK");

    // jsPDF Helvetica uses Windows-1252 — replace chars missing from that encoding
    const T = (s: string) => s
      .replace(/Č/g, "C").replace(/č/g, "c")
      .replace(/Ď/g, "D").replace(/ď/g, "d")
      .replace(/Ĺ/g, "L").replace(/ĺ/g, "l")
      .replace(/Ľ/g, "L").replace(/ľ/g, "l")
      .replace(/Ň/g, "N").replace(/ň/g, "n")
      .replace(/Ŕ/g, "R").replace(/ŕ/g, "r")
      .replace(/Ť/g, "T").replace(/ť/g, "t")
      .replace(/ä/g, "a").replace(/Ä/g, "A");

    doc.setFillColor(0, 29, 61);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("MS-BETON s.r.o.", 14, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(T("Žilina betón – doprava a čerpanie"), 14, 21);
    doc.text(`+421 909 205 205  |  info@msbeton.sk`, 14, 27);

    doc.setTextColor(237, 197, 49);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(T("CENOVÁ PONUKA"), 14, 44);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(T(`Dátum: ${today}`), 150, 44);
    if (loggedClient) doc.text(T(`Klient: ${loggedClient.name} (ID: ${loggedClient.clientId})`), 14, 52);
    if (hasDiscount) {
      doc.setTextColor(237, 197, 49);
      doc.text(T(`Aplikovaná zľava: ${discountPct}%`), 14, loggedClient ? 58 : 52);
    }

    let y = loggedClient ? (hasDiscount ? 66 : 60) : 54;
    const isFaktura = priceMode === "faktura";
    const baseItems = isFaktura ? result.discountedItems : result.hotovostDiscItems;
    const origItems = isFaktura ? result.items : result.hotovostBaseItems;

    const drawSection = (title: string) => {
      doc.setFillColor(0, 29, 61);
      doc.rect(14, y - 4, 182, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(T(title), 16, y + 0.5);
      y += 10;
    };

    const drawRow = (label: string, orig: number, disc: number) => {
      if (orig === 0) return;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.text(T(label), 16, y);
      if (hasDiscount && orig !== disc) {
        doc.setTextColor(160, 160, 160);
        doc.text(fmt(orig), 145, y, { align: "right" });
        doc.setDrawColor(160, 160, 160);
        doc.line(130, y - 0.5, 143, y - 0.5);
      }
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(fmt(disc), 196, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setDrawColor(220, 220, 220);
      doc.line(14, y + 2, 196, y + 2);
      y += 8;
    };

    if (result.isOwn) {
      doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(120, 120, 120);
      doc.text(T("Vlastná doprava – zákazník zabezpecuje dopravu vlastným vozidlom"), 14, y); y += 6;
    }
    drawSection("Produkty");
    drawRow(`${selectedType?.label.replace(/ – [\d.]+ € \/ m³/, "") ?? ""} – ${result.qty} m³`, origItems.concrete, baseItems.concrete);
    if (origItems.transport > 0) drawRow(`Minimálna doprava – ${result.trucks}× auto`, origItems.transport, baseItems.transport);
    if (origItems.zimne > 0) drawRow(`Zimné opatrenia – ${result.qty} m³ × ${zimneServicePrice.toFixed(2)} €`, origItems.zimne, baseItems.zimne);

    if (tab === "pumpa") {
      y += 2;
      drawSection("Služby");
      if (origItems.pump > 0) drawRow(`Cerpanie betónu – ${result.pumpHrs} h${result.pumpMs > 0 ? ` ${result.pumpMs} min` : ""}`, origItems.pump, baseItems.pump);
      if (origItems.hoses > 0) drawRow(`Prídavné hadice – ${hoseMeters} m`, origItems.hoses, baseItems.hoses);
      if (origItems.washing > 0) drawRow("Umývanie mimo stavby", origItems.washing, baseItems.washing);
      if (origItems.chem > 0) drawRow("Rozbehová chémia", origItems.chem, baseItems.chem);
      if (origItems.waiting > 0) drawRow(`Cakacky – ${result.waitLabel} (${result.waitIntervals}× ${waitServicePrice.toFixed(2)} €)`, origItems.waiting, baseItems.waiting);
    }

    y += 2;
    doc.setFillColor(237, 197, 49);
    doc.rect(14, y - 4, 182, 8, "F");
    doc.setTextColor(0, 29, 61);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Celková cena", 16, y + 0.5);
    y += 12;

    if (isFaktura) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(T("Cena spolu bez DPH:"), 16, y);
      doc.setFont("helvetica", "bold");
      doc.text(fmt(result.totalDiscBezDph), 196, y, { align: "right" });
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.text("DPH 23%:", 16, y);
      doc.setFont("helvetica", "bold");
      doc.text(fmt(result.totalDiscBezDph * VAT), 196, y, { align: "right" });
      y += 8;
      doc.setFontSize(12);
      doc.setTextColor(0, 29, 61);
      doc.text(T("Cena spolu s DPH:"), 16, y);
      doc.setTextColor(237, 197, 49);
      doc.text(fmt(result.totalDiscSDph), 196, y, { align: "right" });
    } else {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 29, 61);
      doc.text("Cena spolu:", 16, y);
      doc.text(fmt(result.hotovostTotal), 196, y, { align: "right" });
    }

    y += 14;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(140, 140, 140);
    doc.text(T("* Cena je orientacná. Závisí od aktuálneho cenníka a dostupnosti. Kontaktujte nás pre presnú ponuku."), 14, y);
    doc.text("MS-BETON s.r.o.  |  +421 909 205 205  |  info@msbeton.sk  |  msbeton.sk", 14, y + 5);

    doc.save(`cenova-ponuka-msbeton-${today.replace(/\./g, "-")}.pdf`);
  }

  function exportSMS() {
    if (!result) return;
    const isFaktura = priceMode === "faktura";
    const smsItems = isFaktura ? result.discountedItems : result.hotovostDiscItems;
    const lines = ["MS-BETON cenová ponuka:"];
    if (result.isOwn) lines.push("Vlastná doprava – odber na prevádzke");
    lines.push(`Betón ${selectedType?.label.replace(/ – [\d.]+ € \/ m³/, "") ?? ""} ${result.qty}m³`);
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
    if (hasDiscount) lines.push(`(zľava ${discountPct}% aplikovaná)`);
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
    <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#2d3748" }}>

        {/* Tabs */}
        <div className="grid grid-cols-3">
          {(["pumpa", "mix", "vlastnadoprava"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setShowResult(false); }}
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
                {t === "pumpa" ? "Pumpa 28m" : t === "mix" ? "Domiešavač 9m³" : "Vlastná doprava"}
              </span>
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">

          {/* Client login bar */}
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            {loggedClient ? (
              <div className="flex items-center gap-3 w-full">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-white/60 text-xs">Prihlásený:</span>
                  <span className="text-white text-sm font-semibold">{loggedClient.name}</span>
                  {hasDiscount && (
                    <span className="ml-1 px-2 py-0.5 bg-primary text-secondary text-xs font-black rounded-sm tracking-wide">
                      Zľava {discountPct}%
                    </span>
                  )}
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors cursor-pointer">
                  <LogOut className="w-3.5 h-3.5" /> Odhlásiť
                </button>
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
                placeholder="Zadajte vzdialenosť v km"
                className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm" />
            ) : (
              <div className="space-y-2">
                <input type="text" value={address} onChange={(e) => { setAddress(e.target.value); setShowResult(false); }}
                  placeholder="Zadajte adresu stavby"
                  className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm" />
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step="0.1" value={distance}
                    onChange={(e) => { setDistance(e.target.value); setShowResult(false); }}
                    placeholder="Vzdialenosť od Žiliny (km)"
                    className="flex-1 bg-white/10 border-b-2 border-b-primary/60 text-white px-4 py-2.5 focus:outline-none focus:border-b-primary placeholder:text-white/30 text-sm font-medium rounded-sm" />
                  <span className="text-xs text-white/40 flex-shrink-0">km (pre výpočet dopravy)</span>
                </div>
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
          <RadioGroup
            label="Kategória betónu"
            value={selectedCategory?.name ?? ""}
            onChange={handleCategoryChange}
            options={allCategories.map((c) => c.name)}
          />

          {/* Type */}
          <TypeRadioGroup
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
              placeholder="Zadajte množstvo"
              className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm" />
          </div>

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
                    <span className="ml-2 text-xs font-normal text-white/40">{waitServicePrice.toFixed(2)} € / 15 min</span>
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
                <CheckboxField label={`Rozbehová chémia (+${chemServicePrice.toFixed(2)} €)`} checked={rozbehovaChemia} onChange={(v) => { setRozbehovaChemia(v); setShowResult(false); }} />
              </div>
            </>
          )}

          {/* Calculate button */}
          <button onClick={() => { if (parseFloat(quantity) > 0) setShowResult(true); }}
            className="w-full py-4 bg-transparent border-2 border-primary text-primary font-bold text-base tracking-widest hover:bg-primary hover:text-white transition-all duration-200 cursor-pointer mt-2">
            VYPOČÍTAŤ CENU
          </button>

          {/* Result */}
          {showResult && result && displayItems && origDisplayItems && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/30 overflow-hidden">

              {/* HOTOVOSŤ / FAKTÚRA tabs */}
              <div className="grid grid-cols-2 border-b border-primary/30">
                {(["hotovost", "faktura"] as PriceMode[]).map((mode) => (
                  <button key={mode} onClick={() => setPriceMode(mode)}
                    className={cn("py-3 text-sm font-black tracking-widest transition-all cursor-pointer",
                      priceMode === mode ? "bg-primary text-secondary" : "bg-white/5 text-white/50 hover:text-white/80"
                    )}>
                    {mode === "hotovost" ? "HOTOVOSŤ" : "FAKTÚRA"}
                  </button>
                ))}
              </div>

              <div className="p-5 space-y-4 bg-white/5">

                {/* Vlastná doprava note */}
                {result.isOwn && (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded px-3 py-2">
                    <Truck className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-white/70">Vlastná doprava – zákazník zabezpečuje dopravu vlastným vozidlom</span>
                  </div>
                )}

                {/* Produkty */}
                <div>
                  <h4 className="text-primary font-bold text-xs uppercase tracking-widest mb-2">Produkty</h4>
                  <PriceRow label={`Betón ${selectedType?.label.replace(/ – [\d.]+ € \/ m³/, "") ?? ""} – ${result.qty} m³`}
                    original={origDisplayItems.concrete} discounted={displayItems.concrete} hasDiscount={hasDiscount} />
                  <PriceRow label={`Minimálna doprava – ${result.trucks}× auto`}
                    original={origDisplayItems.transport} discounted={displayItems.transport} hasDiscount={hasDiscount} />
                  {displayItems.zimne > 0 && (
                    <PriceRow label={`Zimné opatrenia – ${result.qty} m³`}
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
                        {hasDiscount && <span className="line-through text-white/35 text-xs block">{fmt(result.totalSDph)}</span>}
                        <span className="text-2xl font-bold text-primary">{fmt(result.hotovostTotal)}</span>
                      </div>
                    </div>
                  )}

                  {!result.isOwn && (
                    <div className="flex items-center gap-2 text-white/50 text-xs pt-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span>{result.trucks} domiešavač{result.trucks > 4 ? "ov" : result.trucks > 1 ? "e" : ""} (9 m³/vozidlo)</span>
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
          )}
        </div>
      </div>
    </div>
  );
}
