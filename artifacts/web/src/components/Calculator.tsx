import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminData } from "@/lib/adminData";

type Tab = "pumpa" | "mix";

const CATEGORIES = [
  "DRVENÉ KAMENIVO Dmax8",
  "DRVENÉ KAMENIVO Dmax16",
  "DRVENÉ KAMENIVO Dmax22",
  "DRVENÉ KAMENIVO Dmax32",
  "OKRÚHLE KAMENIVO Dmax16",
  "OKRÚHLE KAMENIVO Dmax32",
];

const CONCRETE_TYPES: Record<string, { label: string; price: number }[]> = {
  "DRVENÉ KAMENIVO Dmax8": [
    { label: "Betón C12/15 – 76.50 € / m³", price: 76.5 },
    { label: "Betón C16/20D – 80.00 € / m³", price: 80.0 },
    { label: "Betón C20/25 – 85.00 € / m³", price: 85.0 },
  ],
  "DRVENÉ KAMENIVO Dmax16": [
    { label: "Betón C12/15 – 78.00 € / m³", price: 78.0 },
    { label: "Betón C16/20D – 83.33 € / m³", price: 83.33 },
    { label: "Betón C20/25 – 88.50 € / m³", price: 88.5 },
    { label: "Betón C25/30 – 94.00 € / m³", price: 94.0 },
    { label: "Betón C30/37 – 102.00 € / m³", price: 102.0 },
  ],
  "DRVENÉ KAMENIVO Dmax22": [
    { label: "Betón C16/20D – 82.00 € / m³", price: 82.0 },
    { label: "Betón C20/25 – 87.00 € / m³", price: 87.0 },
    { label: "Betón C25/30 – 93.00 € / m³", price: 93.0 },
    { label: "Betón C30/37 – 100.50 € / m³", price: 100.5 },
  ],
  "DRVENÉ KAMENIVO Dmax32": [
    { label: "Betón C20/25 – 86.00 € / m³", price: 86.0 },
    { label: "Betón C25/30 – 91.50 € / m³", price: 91.5 },
    { label: "Betón C30/37 – 99.00 € / m³", price: 99.0 },
  ],
  "OKRÚHLE KAMENIVO Dmax16": [
    { label: "Betón C16/20D – 85.00 € / m³", price: 85.0 },
    { label: "Betón C20/25 – 90.00 € / m³", price: 90.0 },
    { label: "Betón C25/30 – 96.00 € / m³", price: 96.0 },
  ],
  "OKRÚHLE KAMENIVO Dmax32": [
    { label: "Betón C20/25 – 88.00 € / m³", price: 88.0 },
    { label: "Betón C25/30 – 94.00 € / m³", price: 94.0 },
  ],
};

const PUMP_HOURS = ["1 h", "2 h", "3 h", "4 h", "5 h", "6 h", "7 h", "8 h"];
const PUMP_MINS = ["0 min", "15 min", "30 min", "45 min"];
const WAIT_HOURS = ["0 h", "1 h", "2 h", "3 h", "4 h", "5 h", "6 h", "7 h", "8 h"];
const WAIT_MINS = ["0 min", "15 min", "30 min", "45 min"];

const TRANSPORT_RATE = 1.8;
const PUMP_HOUR_RATE = 120;
const PUMP_MIN_RATE = 30;
const EXTRA_HOSE_RATE = 15;
const WASHING_RATE = 45;
const MIX_TRUCK_CAPACITY = 7;
const PUMP_SETUP_FEE = 180;

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-white/80 mb-2">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white/10 border border-white/10 border-b-2 border-b-primary text-white px-4 py-3 pr-10 focus:outline-none focus:border-b-primary/80 transition-all text-sm font-medium cursor-pointer rounded-sm"
        >
          {options.map((o) => (
            <option key={o} value={o} className="bg-[#1e293b] text-white">{o}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-primary pointer-events-none" />
      </div>
    </div>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0",
          checked ? "bg-primary border-primary" : "bg-white/10 border-white/30 group-hover:border-primary/50"
        )}
      >
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <span className="text-sm text-white/80">{label}</span>
    </label>
  );
}

export function ConcreteCalculator() {
  const [tab, setTab] = useState<Tab>("pumpa");
  const [deliveryMode, setDeliveryMode] = useState<"distance" | "address">("distance");
  const [distance, setDistance] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [concreteTypeIdx, setConcreteTypeIdx] = useState(1);
  const [quantity, setQuantity] = useState("");
  const [pumpHour, setPumpHour] = useState("1 h");
  const [pumpMin, setPumpMin] = useState("0 min");
  const [waitHour, setWaitHour] = useState("0 h");
  const [waitMin, setWaitMin] = useState("0 min");
  const [extraHoses, setExtraHoses] = useState(false);
  const [washing, setWashing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const types = CONCRETE_TYPES[category] ?? [];
  const selectedType = types[concreteTypeIdx] ?? types[0];

  const zones = adminData.getDelivery();
  const waitingRatePer15min = (zones[0]?.waitingRatePer15min) ?? 8;

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setConcreteTypeIdx(0);
    setShowResult(false);
  };

  const waitTotalMins = useMemo(() => {
    const wh = parseInt(waitHour) || 0;
    const wm = parseInt(waitMin) || 0;
    return wh * 60 + wm;
  }, [waitHour, waitMin]);

  const result = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const dist = parseFloat(distance) || 0;
    if (!qty || !selectedType) return null;

    const concreteCost = qty * selectedType.price;
    const transportCost = dist * TRANSPORT_RATE * 2;

    if (tab === "mix") {
      const trucks = Math.ceil(qty / MIX_TRUCK_CAPACITY);
      const total = concreteCost + transportCost;
      return { concreteCost, transportCost, total, trucks, pumpCost: 0, waitingCost: 0, extras: 0 };
    }

    const hours = parseInt(pumpHour) || 1;
    const mins = parseInt(pumpMin) || 0;
    const pumpCost = PUMP_SETUP_FEE + hours * PUMP_HOUR_RATE + (mins > 0 ? PUMP_MIN_RATE : 0);
    const extras = (extraHoses ? EXTRA_HOSE_RATE : 0) + (washing ? WASHING_RATE : 0);

    const waitIntervals = Math.ceil(waitTotalMins / 15);
    const waitingCost = waitIntervals * waitingRatePer15min;

    const total = concreteCost + transportCost + pumpCost + waitingCost + extras;
    const trucks = Math.ceil(qty / MIX_TRUCK_CAPACITY);
    return { concreteCost, transportCost, pumpCost, waitingCost, extras, total, trucks };
  }, [tab, quantity, distance, selectedType, pumpHour, pumpMin, waitTotalMins, waitingRatePer15min, extraHoses, washing]);

  const handleCalculate = () => {
    if (parseFloat(quantity) > 0) setShowResult(true);
  };

  const waitLabel = useMemo(() => {
    const wh = parseInt(waitHour) || 0;
    const wm = parseInt(waitMin) || 0;
    if (wh === 0 && wm === 0) return null;
    const parts = [];
    if (wh > 0) parts.push(`${wh} h`);
    if (wm > 0) parts.push(`${wm} min`);
    return parts.join(" ");
  }, [waitHour, waitMin]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#2d3748" }}>

        {/* Tabs */}
        <div className="grid grid-cols-2">
          {(["pumpa", "mix"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setShowResult(false); }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 py-5 transition-all cursor-pointer group",
                tab === t
                  ? "bg-secondary border-b-4 border-primary"
                  : "bg-white/5 border-b-4 border-transparent hover:bg-white/10"
              )}
            >
              {t === "pumpa" ? (
                <svg viewBox="0 0 130 48" className={cn("w-28 h-[43px] transition-colors", tab === t ? "text-primary" : "text-white/40 group-hover:text-white/70")} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {/* Cab */}
                  <rect x="2" y="27" width="14" height="15" rx="1" />
                  <rect x="3" y="22" width="9" height="6" rx="1" />
                  {/* Chassis */}
                  <line x1="16" y1="33" x2="44" y2="33" />
                  <line x1="16" y1="42" x2="44" y2="42" />
                  <line x1="44" y1="33" x2="44" y2="42" />
                  {/* Boom mast (vertical base) */}
                  <line x1="26" y1="33" x2="26" y2="21" strokeWidth="2.5" />
                  <line x1="22" y1="21" x2="30" y2="21" strokeWidth="1.8" />
                  {/* Boom arm — rises sharply then extends very far right (56 m reach) */}
                  <line x1="26" y1="21" x2="16" y2="6" strokeWidth="3" />
                  <line x1="16" y1="6" x2="122" y2="2" strokeWidth="2.5" />
                  {/* Support strut (dashed cable) */}
                  <line x1="26" y1="21" x2="72" y2="4" strokeWidth="1" strokeDasharray="2 2" />
                  {/* Boom tip + hanging pipe */}
                  <line x1="122" y1="2" x2="127" y2="2" strokeWidth="2" />
                  <line x1="126" y1="2" x2="126" y2="17" strokeWidth="1.8" />
                  {/* Outriggers (4 stabilizers) */}
                  <line x1="20" y1="42" x2="20" y2="48" />
                  <line x1="16" y1="48" x2="24" y2="48" />
                  <line x1="40" y1="42" x2="40" y2="48" />
                  <line x1="36" y1="48" x2="44" y2="48" />
                  {/* Wheels */}
                  <circle cx="8" cy="42" r="4" strokeWidth="2" />
                  <circle cx="36" cy="42" r="4" strokeWidth="2" />
                </svg>
              ) : (
                <svg viewBox="0 0 80 44" className={cn("w-20 h-11 transition-colors", tab === t ? "text-primary" : "text-white/40 group-hover:text-white/70")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Truck cab */}
                  <rect x="2" y="22" width="18" height="16" rx="1" />
                  <rect x="3" y="18" width="10" height="6" rx="1" />
                  {/* Chassis */}
                  <line x1="20" y1="30" x2="62" y2="30" />
                  <line x1="20" y1="38" x2="62" y2="38" />
                  <line x1="62" y1="30" x2="62" y2="38" />
                  {/* Mixer drum - ellipse body */}
                  <ellipse cx="44" cy="22" rx="18" ry="12" />
                  {/* Drum spiral lines */}
                  <path d="M30 26 Q44 18 58 26" strokeWidth="1.5" />
                  <path d="M30 20 Q44 12 58 20" strokeWidth="1.5" />
                  {/* Drum mount front */}
                  <line x1="26" y1="22" x2="30" y2="30" strokeWidth="1.5" />
                  {/* Drum mount rear */}
                  <line x1="60" y1="22" x2="62" y2="30" strokeWidth="1.5" />
                  {/* Wheels */}
                  <circle cx="10" cy="38" r="4" strokeWidth="2" />
                  <circle cx="52" cy="38" r="4" strokeWidth="2" />
                </svg>
              )}
              <span className={cn(
                "font-black text-sm tracking-widest transition-colors",
                tab === t ? "text-primary" : "text-white/50 group-hover:text-white/80"
              )}>
                {t === "pumpa" ? "PUMPA" : "MIX"}
              </span>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                tab === t ? "text-white/70" : "text-white/30 group-hover:text-white/50"
              )}>
                {t === "pumpa" ? "Betón pumpa 56m" : "Domiešavač 9m³"}
              </span>
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* Delivery */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/80">Adresa doručenia</label>
            {deliveryMode === "distance" ? (
              <input
                type="number"
                min="0"
                step="0.1"
                value={distance}
                onChange={(e) => { setDistance(e.target.value); setShowResult(false); }}
                placeholder="Zadajte vzdialenosť v km"
                className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm"
              />
            ) : (
              <input
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setShowResult(false); }}
                placeholder="Zadajte adresu stavby"
                className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm"
              />
            )}
            <div className="flex items-center gap-6 pt-1">
              {(["distance", "address"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setDeliveryMode(m)}
                    className={cn(
                      "w-4 h-4 border-2 flex items-center justify-center transition-all flex-shrink-0",
                      deliveryMode === m ? "bg-primary border-primary" : "bg-white/10 border-white/30"
                    )}
                  >
                    {deliveryMode === m && <span className="text-white text-[9px] font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-white/70">{m === "distance" ? "Vzdialenosť" : "Adresa"}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category */}
          <SelectField
            label="Kategória betónu"
            value={category}
            onChange={handleCategoryChange}
            options={CATEGORIES}
          />

          {/* Type */}
          <SelectField
            label="Typ betónu"
            value={selectedType?.label ?? ""}
            onChange={(v) => {
              const idx = types.findIndex((t) => t.label === v);
              setConcreteTypeIdx(idx >= 0 ? idx : 0);
              setShowResult(false);
            }}
            options={types.map((t) => t.label)}
          />

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">Množstvo betónu (m³)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setShowResult(false); }}
              placeholder="Zadajte množstvo"
              className="w-full bg-white/10 border-b-2 border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/30 text-sm font-medium rounded-sm"
            />
          </div>

          {/* PUMPA extras */}
          {tab === "pumpa" && (
            <>
              {/* Pump time */}
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Čerpanie v /h" value={pumpHour} onChange={(v) => { setPumpHour(v); setShowResult(false); }} options={PUMP_HOURS} />
                <SelectField label="Čerpanie v /min" value={pumpMin} onChange={(v) => { setPumpMin(v); setShowResult(false); }} options={PUMP_MINS} />
              </div>

              {/* Waiting time */}
              <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/80">
                    Čakačky
                    <span className="ml-2 text-xs font-normal text-white/40">{waitingRatePer15min} € / 15 min</span>
                  </span>
                  {waitLabel && (
                    <span className="text-xs text-primary font-bold">{waitLabel}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="Hodiny čakania"
                    value={waitHour}
                    onChange={(v) => { setWaitHour(v); setShowResult(false); }}
                    options={WAIT_HOURS}
                  />
                  <SelectField
                    label="Minúty čakania"
                    value={waitMin}
                    onChange={(v) => { setWaitMin(v); setShowResult(false); }}
                    options={WAIT_MINS}
                  />
                </div>
                {waitTotalMins > 0 && (
                  <div className="text-xs text-white/50 text-right">
                    {Math.ceil(waitTotalMins / 15)} × {waitingRatePer15min} € = <span className="text-primary font-bold">{(Math.ceil(waitTotalMins / 15) * waitingRatePer15min).toFixed(2)} €</span>
                  </div>
                )}
              </div>

              {/* Other extras */}
              <div className="space-y-3 pt-1">
                <CheckboxField label="Počet prídavných hadíc - bežné metre (+15 €)" checked={extraHoses} onChange={(v) => { setExtraHoses(v); setShowResult(false); }} />
                <CheckboxField label="Umývanie mimo stavby (+45 €)" checked={washing} onChange={(v) => { setWashing(v); setShowResult(false); }} />
              </div>
            </>
          )}

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            className="w-full py-4 bg-transparent border-2 border-primary text-primary font-bold text-base tracking-widest hover:bg-primary hover:text-white transition-all duration-200 cursor-pointer mt-2"
          >
            VYPOČÍTAŤ CENU
          </button>

          {/* Result */}
          {showResult && result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/30 bg-white/5 p-5 space-y-3"
            >
              <h4 className="text-primary font-bold text-sm uppercase tracking-widest mb-3">Orientačná cena</h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Betón ({quantity} m³ × {selectedType.price.toFixed(2)} €)</span>
                  <span className="font-semibold text-white">{result.concreteCost.toFixed(2)} €</span>
                </div>
                {parseFloat(distance) > 0 && (
                  <div className="flex justify-between text-white/70">
                    <span>Doprava ({distance} km tam + späť)</span>
                    <span className="font-semibold text-white">{result.transportCost.toFixed(2)} €</span>
                  </div>
                )}
                {tab === "pumpa" && (
                  <div className="flex justify-between text-white/70">
                    <span>Pumpa ({pumpHour} {pumpMin !== "0 min" ? `+ ${pumpMin}` : ""} + nastavenie)</span>
                    <span className="font-semibold text-white">{result.pumpCost.toFixed(2)} €</span>
                  </div>
                )}
                {tab === "pumpa" && result.waitingCost > 0 && (
                  <div className="flex justify-between text-white/70">
                    <span>Čakačky ({waitLabel} = {Math.ceil(waitTotalMins / 15)} × {waitingRatePer15min} €)</span>
                    <span className="font-semibold text-white">{result.waitingCost.toFixed(2)} €</span>
                  </div>
                )}
                {result.extras > 0 && (
                  <div className="flex justify-between text-white/70">
                    <span>Príplatky</span>
                    <span className="font-semibold text-white">{result.extras.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-white/20 pt-3 mt-1">
                  <span className="font-bold text-white">Celková cena (bez DPH)</span>
                  <span className="text-2xl font-bold text-primary">{result.total.toFixed(2)} €</span>
                </div>
                <div className="flex items-center gap-2 text-white/50 text-xs pt-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>{result.trucks} domiešavač{result.trucks > 4 ? "ov" : result.trucks > 1 ? "e" : ""} (7 m³/vozidlo)</span>
                </div>
              </div>

              <a
                href="#contact"
                className="block w-full text-center py-3 bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-all mt-2"
              >
                Záväzne objednať →
              </a>
              <p className="text-[11px] text-white/30 text-center">* Cena je orientačná. Závisí od aktuálneho cenníka a dostupnosti. Kontaktujte nás pre presnú ponuku.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
