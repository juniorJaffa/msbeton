import { useState } from "react";
import { Trash2, Plus, Check, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { adminData, DeliveryZone, TransportPricingZone, TransportSettings } from "@/lib/adminData";
import { EditableField } from "./_shared";

function PumpTruckIcon() {
  return (
    <svg width="38" height="22" viewBox="0 0 38 22" fill="currentColor" className="shrink-0">
      {/* Truck body */}
      <rect x="1" y="12" width="24" height="6" rx="1" />
      {/* Cab */}
      <rect x="22" y="9" width="9" height="9" rx="1" />
      {/* Windshield */}
      <rect x="23.5" y="10.5" width="6" height="4.5" rx="0.5" fill="white" fillOpacity="0.55" />
      {/* Boom base pillar */}
      <rect x="8" y="8" width="3" height="4" rx="0.5" />
      {/* Boom arm segment 1 (going up-left) */}
      <line x1="9.5" y1="8" x2="3" y2="2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Boom arm segment 2 (horizontal, going right) */}
      <line x1="3" y1="2" x2="22" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Pipe hose drop */}
      <line x1="22" y1="2" x2="22" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.5 1" />
      {/* Wheels */}
      <circle cx="6" cy="19" r="3" />
      <circle cx="6" cy="19" r="1.4" fill="white" fillOpacity="0.5" />
      <circle cx="14" cy="19" r="3" />
      <circle cx="14" cy="19" r="1.4" fill="white" fillOpacity="0.5" />
      <circle cx="27" cy="19" r="3" />
      <circle cx="27" cy="19" r="1.4" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

function MixTruckIcon() {
  return (
    <svg width="38" height="22" viewBox="0 0 38 22" fill="currentColor" className="shrink-0">
      {/* Truck body */}
      <rect x="1" y="12" width="24" height="6" rx="1" />
      {/* Cab */}
      <rect x="22" y="9" width="9" height="9" rx="1" />
      {/* Windshield */}
      <rect x="23.5" y="10.5" width="6" height="4.5" rx="0.5" fill="white" fillOpacity="0.55" />
      {/* Drum body */}
      <ellipse cx="11" cy="10" rx="7" ry="5.5" />
      {/* Drum stripes (blades) */}
      <path d="M 5.5 7.5 Q 11 10 16.5 7.5" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M 4.5 10 Q 11 12.5 17.5 10" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M 5.5 12.5 Q 11 10 16.5 12.5" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {/* Chute (výpustný žľab) */}
      <line x1="4.5" y1="14" x2="1.5" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* Wheels */}
      <circle cx="6" cy="19" r="3" />
      <circle cx="6" cy="19" r="1.4" fill="white" fillOpacity="0.5" />
      <circle cx="14" cy="19" r="3" />
      <circle cx="14" cy="19" r="1.4" fill="white" fillOpacity="0.5" />
      <circle cx="27" cy="19" r="3" />
      <circle cx="27" cy="19" r="1.4" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

const ZONE_TYPES: { key: "standard" | "km" | "auto"; label: string; desc: string; rateLabel: string; rateUnit: string }[] = [
  { key: "standard", label: "Štandard",  desc: "cena z tabuľky Zóny dopravy × objem + doťaženie", rateLabel: "Cena / m³", rateUnit: "€/m³" },
  { key: "km",       label: "Kilometre", desc: "sadzba €/km × počet áut × vzdialenosť",           rateLabel: "Sadzba",    rateUnit: "€/km" },
  { key: "auto",     label: "Počet áut", desc: "paušál za každé vozidlo",                         rateLabel: "Paušál",    rateUnit: "€/vozidlo" },
];

export default function DopravaTab({ onGoToSluzby }: { onGoToSluzby?: () => void }) {
  const [zones, setZones] = useState<DeliveryZone[]>(adminData.getDelivery());
  const [adding, setAdding] = useState(false);
  const emptyAddForm = { name: "", pricingType: "standard" as "standard" | "km" | "auto", ratePerKm: "", ratePerTruck: "" };
  const [addForm, setAddForm] = useState(emptyAddForm);

  const [pZones, setPZones] = useState<TransportPricingZone[]>(adminData.getTransportZones());
  const [ts, setTs] = useState<TransportSettings>(adminData.getTransportSettings());
  const svcs = adminData.getServices();
  const waitingRateMix   = svcs.find(s => s.serviceMode === "mix")?.price;
  const waitingRatePumpa = svcs.find(s => s.serviceMode === "pumpa")?.price;
  const pumpRate = svcs.find(s => s.name.includes("Čerpanie"))?.price;
  const [addingPZ, setAddingPZ] = useState(false);
  const [pzForm, setPzForm] = useState({ fromKm: "", toKm: "", ratePerM3: "" });
  const [stdZonesOpen, setStdZonesOpen] = useState(false);
  const [stdDotazenieOpen, setStdDotazenieOpen] = useState(false);
  const [podmienkyOpen, setPodmienkyOpen] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({ standard: true, km: true, auto: true });

  const savePZ = (data: TransportPricingZone[]) => { setPZones(data); adminData.saveTransportZones(data); };
  const saveTs = (data: TransportSettings) => { setTs(data); adminData.saveTransportSettings(data); };
  const updatePZ = (id: string, field: keyof TransportPricingZone, value: string) =>
    savePZ(pZones.map(z => z.id === id ? { ...z, [field]: parseFloat(value) } : z));
  const removePZ = (id: string) => { if (confirm("Vymazať zónu?")) savePZ(pZones.filter(z => z.id !== id)); };
  const addPZ = () => {
    if (!pzForm.fromKm || !pzForm.toKm || !pzForm.ratePerM3) return;
    const sorted = [...pZones, { id: adminData.generateId(), fromKm: parseFloat(pzForm.fromKm), toKm: parseFloat(pzForm.toKm), ratePerM3: parseFloat(pzForm.ratePerM3) }]
      .sort((a, b) => a.fromKm - b.fromKm);
    savePZ(sorted);
    setPzForm({ fromKm: "", toKm: "", ratePerM3: "" }); setAddingPZ(false);
  };

  const save = (data: DeliveryZone[]) => { setZones(data); adminData.saveDelivery(data); };
  const updateZone = (id: string, patch: Partial<DeliveryZone>) =>
    save(zones.map(z => z.id === id ? { ...z, ...patch } : z));
  const removeZone = (id: string) => { if (confirm("Vymazať dopravu?")) save(zones.filter(z => z.id !== id)); };
  const addZone = () => {
    if (!addForm.name) return;
    const type = addForm.pricingType;
    save([...zones, {
      id: adminData.generateId(),
      name: addForm.name,
      pricingType: type,
      ratePerKm: parseFloat(addForm.ratePerKm) || (type === "km" ? 1.8 : 0),
      ratePerTruck: type === "auto" ? parseFloat(addForm.ratePerTruck) || 0 : undefined,
      truckCapacity: 9,
      pumpTruckCapacity: 7,
      ...(type === "km" ? { minKm: 5, maxKm: 100 } : {}),
      ...(type === "auto" ? { minTrucks: 1, maxTrucks: 10 } : {}),
    }]);
    setAddForm(emptyAddForm); setAdding(false);
  };

  return (
    <div className="space-y-3">
      {/* ── Podmienky m³ – rozsah vozidiel ── */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setPodmienkyOpen(o => !o)}
          className="w-full px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div className="text-left">
            <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Podmienky m³ → počet vozidiel</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Iba admin vidí tlačidlo PODMIENKY pri Množstve m³ — zákazník nemá prístup
            </p>
          </div>
          <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${podmienkyOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </button>
        {podmienkyOpen && <div className="divide-y divide-gray-100">
          {/* PUMPA tab — má Pumpa + Mix doplnkový */}
          <div className="px-4 py-3 bg-blue-50/30">
            <div className="flex items-center gap-1.5 mb-3">
              <PumpTruckIcon />
              <span className="text-[10px] text-blue-700 font-black uppercase tracking-wide">Pumpa tab</span>
              <span className="text-[9px] text-blue-400 ml-1">— platí pri výbere Pumpa</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <PumpTruckIcon />
                  <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wide">Pumpa vozidiel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <div className="text-[8px] text-blue-400 font-bold uppercase mb-0.5">Min</div>
                    <div className="flex items-baseline gap-0.5 font-bold text-secondary text-sm">
                      <span className="text-secondary font-bold">1</span>
                      <span className="text-gray-400 text-xs">voz.</span>
                    </div>
                    <div className="text-[8px] text-gray-400 mt-0.5">vždy 1</div>
                  </div>
                  <span className="text-gray-300 font-black text-sm">—</span>
                  <div className="text-center">
                    <div className="text-[8px] text-blue-400 font-bold uppercase mb-0.5">Max</div>
                    <div className="flex items-baseline gap-0.5 font-bold text-secondary text-sm">
                      <EditableField value={ts.condPumpaMax ?? 2} type="number" onSave={v => saveTs({ ...ts, condPumpaMax: Math.max(1, parseInt(v) || 2) })} />
                      <span className="text-gray-400 text-xs">voz.</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-l border-blue-100 pl-4">
                <div className="flex items-center gap-1 mb-1.5">
                  <MixTruckIcon />
                  <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wide">Mix doplnkový</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <div className="text-[8px] text-blue-400 font-bold uppercase mb-0.5">Min</div>
                    <div className="flex items-baseline gap-0.5 font-bold text-secondary text-sm">
                      <EditableField value={ts.condMixMin ?? 0} type="number" onSave={v => saveTs({ ...ts, condMixMin: Math.max(0, parseInt(v) || 0) })} />
                      <span className="text-gray-400 text-xs">voz.</span>
                    </div>
                  </div>
                  <span className="text-gray-300 font-black text-sm">—</span>
                  <div className="text-center">
                    <div className="text-[8px] text-blue-400 font-bold uppercase mb-0.5">Max</div>
                    <div className="flex items-baseline gap-0.5 font-bold text-secondary text-sm">
                      <EditableField value={ts.condMixMax ?? 2} type="number" onSave={v => saveTs({ ...ts, condMixMax: Math.max(0, parseInt(v) || 2) })} />
                      <span className="text-gray-400 text-xs">voz.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* MIX tab — Mix vozidlá (rovnaký vozový park ako doplnkový mix v pumpe) */}
          <div className="px-4 py-3 bg-amber-50/30">
            <div className="flex items-center gap-1.5 mb-3">
              <MixTruckIcon />
              <span className="text-[10px] text-amber-700 font-black uppercase tracking-wide">Mix tab</span>
              <span className="text-[9px] text-amber-400 ml-1">— platí pri výbere Domiešavač</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-center">
                <div className="text-[8px] text-amber-500 font-bold uppercase mb-0.5">Min</div>
                <div className="flex items-baseline gap-0.5 font-bold text-secondary text-sm">
                  <span className="text-secondary font-bold">1</span>
                  <span className="text-gray-400 text-xs">voz.</span>
                </div>
                <div className="text-[8px] text-gray-400 mt-0.5">auto ⌈m³÷kap.⌉</div>
              </div>
              <span className="text-gray-300 font-black text-sm">—</span>
              <div className="text-center">
                <div className="text-[8px] text-amber-500 font-bold uppercase mb-0.5">Max</div>
                <div className="flex items-baseline gap-0.5 font-bold text-secondary text-sm">
                  <EditableField value={ts.condMixMax ?? 2} type="number" onSave={v => saveTs({ ...ts, condMixMax: Math.max(1, parseInt(v) || 2) })} />
                  <span className="text-gray-400 text-xs">voz.</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Rovnaký vozový park ako Mix doplnkový v Pumpa tab</p>
          </div>
          {/* Minusové pretaženie — globálny prepínač */}
          <div className="px-4 py-3 flex items-start gap-3">
            <input
              type="checkbox"
              id="allowExtraOverload"
              checked={ts.allowExtraOverload ?? true}
              onChange={e => saveTs({ ...ts, allowExtraOverload: e.target.checked })}
              className="accent-red-500 w-4 h-4 shrink-0 mt-0.5"
            />
            <label htmlFor="allowExtraOverload" className="cursor-pointer select-none">
              <div className="text-sm font-semibold text-gray-700">Minusové pretaženie</div>
              <div className="text-[11px] text-gray-400 mt-0.5 space-y-0.5">
                <p>Povolí znížiť počet vozidiel <strong>pod štandardný min. limit</strong>.</p>
                <p>· Pumpa: napr. 7,5 m³ na 1× Pumpu bez Mixu</p>
                <p>· Mix: napr. 9,5 m³ na 1× Mix (kapacita 9 m³)</p>
                <p>Varovanie ⚠ sa zobrazí v kalkulačke, PDF aj objednávke.</p>
              </div>
            </label>
          </div>
        </div>}
      </div>

      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Typy dopravy</h3>
        </div>

        {/* Karty typov dopravy */}
        <div className="py-3 space-y-3 px-4">
          {ZONE_TYPES.map((zt, idx) => {
            const typeZones = zones.filter(z => (z.pricingType ?? "standard") === zt.key);
            if (typeZones.length === 0) return null;
            const isStandard = zt.key === "standard";
            const isAuto = zt.key === "auto";
            const cardBorder = isStandard ? "border-blue-200" : isAuto ? "border-amber-200" : "border-slate-300";
            const accentBg   = isStandard ? "bg-blue-500"   : isAuto ? "bg-amber-400"   : "bg-secondary";
            const headerBg   = isStandard ? "bg-blue-50/70 border-b border-blue-200"  : isAuto ? "bg-amber-50/50 border-b border-amber-100" : "bg-slate-50 border-b border-slate-200";
            const badgeBg    = isStandard ? "bg-blue-600"   : isAuto ? "bg-amber-500"   : "bg-secondary";
            return (
              <div key={zt.key} className={`rounded-xl overflow-hidden shadow-sm border-2 ${cardBorder}`}>
                {/* Farebný accent pruh */}
                <div className={`h-1.5 ${accentBg}`} />
                {/* Type header */}
                <button type="button" onClick={() => setExpandedTypes(prev => ({ ...prev, [zt.key]: !prev[zt.key] }))}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left cursor-pointer select-none ${headerBg}`}>
                  <span className={`w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 ${badgeBg}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-secondary text-sm">{zt.label}</span>
                      <span className="text-[11px] text-gray-400">{zt.desc}</span>
                    </div>
                    {isStandard && (
                      <div className="mt-1">
                        <span className="text-[10px] text-blue-400">cena €/m³ podľa vzdialenosti · pravidlá doťaženia</span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {expandedTypes[zt.key] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {expandedTypes[zt.key] && (<>
                  {/* Standard — názov zóny hore (rovnako ako KM/Auto) */}
                  {isStandard && typeZones.map(z => (
                    <div key={z.id} className="border-t border-blue-200">
                      <div className="flex items-center gap-2 px-5 py-2 pl-14 bg-blue-50/40">
                        <div className="font-semibold text-secondary text-sm flex-1">
                          <EditableField value={z.name} onSave={v => updateZone(z.id, { name: v })} />
                        </div>
                        <button onClick={() => removeZone(z.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {isStandard && (() => {
                    const ref = zones[0];
                    const updateAll2 = (patch: Partial<DeliveryZone>) => save(zones.map(z => ({ ...z, ...patch })));
                    return (
                      <div className="grid grid-cols-3 divide-x divide-y divide-blue-100 border-t border-blue-100 mt-2 w-full">
                        {/* Min. objednávka */}
                        <div className="px-4 py-3 bg-white">
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Min. obj.</div>
                          <div className="font-bold text-secondary text-sm flex flex-wrap items-baseline gap-1">
                            <EditableField value={ts.minimumLoadM3 as number} type="number" onSave={v => saveTs({ ...ts, minimumLoadM3: parseFloat(v) || 0 })} /> <span>m³</span>
                          </div>
                        </div>
                        {/* Min. cena / auto */}
                        <div className="px-4 py-3 bg-white">
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Min. cena/auto</div>
                          <div className="font-bold text-secondary text-sm flex flex-wrap items-baseline gap-1">
                            <EditableField value={ts.minimumFee as number} type="number" onSave={v => saveTs({ ...ts, minimumFee: parseFloat(v) || 0 })} /> <span>€</span>
                          </div>
                        </div>
                        {/* Čerpanie pumpy — read-only */}
                        <div className="px-4 py-3 bg-yellow-50/60 flex flex-col gap-1">
                          <div className="text-[10px] text-yellow-600 font-bold uppercase tracking-wide">Čerpanie pumpy</div>
                          <div className="font-bold text-secondary text-sm">{pumpRate != null ? `${pumpRate.toFixed(2)} €/hod` : "—"}</div>
                          {onGoToSluzby && (
                            <button onClick={onGoToSluzby} className="flex items-center gap-0.5 text-[9px] text-yellow-600 hover:text-secondary transition-colors font-semibold mt-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> Nastaviť v Službách
                            </button>
                          )}
                        </div>
                        {/* Pumpa — kapacita + čakačka */}
                        <div className="px-4 py-3 bg-yellow-50/30">
                          <div className="text-[9px] font-black text-secondary uppercase tracking-wide mb-2">Pumpa</div>
                          <div className="grid grid-cols-2 gap-x-4">
                            <div>
                              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Kapacita</div>
                              <div className="font-bold text-secondary text-sm flex items-baseline gap-0.5">
                                <EditableField value={ref?.pumpTruckCapacity ?? 7} type="number" onSave={v => updateAll2({ pumpTruckCapacity: parseFloat(v) })} /> <span>m³</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Čakačka / 15 min</div>
                              <div className="font-bold text-secondary text-sm">{waitingRatePumpa != null ? `${waitingRatePumpa.toFixed(2)} €` : "—"}</div>
                            </div>
                          </div>
                        </div>
                        {/* Mixér — kapacita + čakačka */}
                        <div className="col-span-2 px-4 py-3 bg-yellow-50/20">
                          <div className="text-[9px] font-black text-secondary uppercase tracking-wide mb-2">Mixér</div>
                          <div className="grid grid-cols-2 gap-x-4">
                            <div>
                              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Kapacita</div>
                              <div className="font-bold text-secondary text-sm flex items-baseline gap-0.5">
                                <EditableField value={ref?.truckCapacity ?? 9} type="number" onSave={v => updateAll2({ truckCapacity: parseFloat(v) })} /> <span>m³</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Čakačka / 15 min</div>
                              <div className="font-bold text-secondary text-sm">{waitingRateMix != null ? `${waitingRateMix.toFixed(2)} €` : "—"}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                {/* Zóny tohto typu */}
                {!isStandard && typeZones.map((z, zIdx) => (
                  <div key={z.id} className={`border-t-2 ${zIdx > 0 ? "border-slate-200 mt-1" : "border-gray-100"}`}>
                    {/* Zone name row */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-l-4 border-l-secondary/30">
                      <div className="font-black text-secondary text-sm flex-1 tracking-wide">
                        <EditableField value={z.name} onSave={v => updateZone(z.id, { name: v })} />
                      </div>
                      <button onClick={() => removeZone(z.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Fields grid — nový clean layout */}
                    <div className="grid grid-cols-3 divide-x divide-y divide-gray-100 border-t border-gray-100">
                      {/* Hlavná sadzba */}
                      <div className={`px-4 py-3 ${zt.key === "km" ? "bg-slate-50/70" : "bg-blue-50/50"}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${zt.key === "km" ? "text-slate-500" : "text-blue-500"}`}>{zt.rateLabel}</div>
                        <div className="font-bold text-secondary text-sm flex flex-wrap items-baseline gap-1">
                          {zt.key === "auto"
                            ? <><EditableField value={z.ratePerTruck ?? 0} type="number" onSave={v => updateZone(z.id, { ratePerTruck: parseFloat(v) })} /> <span>€/voz.</span></>
                            : <><EditableField value={z.ratePerKm} type="number" onSave={v => updateZone(z.id, { ratePerKm: parseFloat(v) })} /> <span>{zt.rateUnit}</span></>}
                        </div>
                      </div>
                      {/* Min */}
                      <div className="px-4 py-3 bg-white">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{zt.key === "km" ? "Min. km" : "Min. áut"}</div>
                        <div className="font-bold text-secondary text-sm flex flex-wrap items-baseline gap-1">
                          {zt.key === "km"
                            ? <><EditableField value={z.minKm ?? 5} type="number" onSave={v => updateZone(z.id, { minKm: parseFloat(v) || undefined })} /> <span>km</span></>
                            : <><EditableField value={z.minTrucks ?? 1} type="number" onSave={v => updateZone(z.id, { minTrucks: parseFloat(v) || undefined })} /> <span>áut</span></>}
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{zt.key === "km" ? "zaokrúhlená fakt." : "min. počet vozidiel"}</div>
                      </div>
                      {/* Max */}
                      <div className="px-4 py-3 bg-white">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{zt.key === "km" ? "Max. km" : "Max. áut"}</div>
                        <div className="font-bold text-secondary text-sm flex flex-wrap items-baseline gap-1">
                          {zt.key === "km"
                            ? <><EditableField value={z.maxKm ?? 100} type="number" onSave={v => updateZone(z.id, { maxKm: parseFloat(v) || undefined })} /> <span>km</span></>
                            : <><EditableField value={z.maxTrucks ?? 10} type="number" onSave={v => updateZone(z.id, { maxTrucks: parseFloat(v) || undefined })} /> <span>áut</span></>}
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{zt.key === "km" ? "max. polomer obsluhy" : "max. počet vozidiel"}</div>
                      </div>
                      {/* KM: Min. poplatok Pumpa + Mixer */}
                      {zt.key === "km" && <>
                        <div className="px-4 py-3 bg-amber-50/60">
                          <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mb-1">Min. pop. Pumpa</div>
                          <div className="font-bold text-secondary text-sm flex items-center gap-1">
                            <EditableField value={z.minimumFeeKmPumpa ?? z.minimumFeeKm ?? 0} type="number" onSave={v => updateZone(z.id, { minimumFeeKmPumpa: parseFloat(v) || undefined })} /> €/auto
                          </div>
                        </div>
                        <div className="col-span-2 px-4 py-3 bg-amber-50/30">
                          <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mb-1">Min. pop. Mixer</div>
                          <div className="font-bold text-secondary text-sm flex items-center gap-1">
                            <EditableField value={z.minimumFeeKmMix ?? z.minimumFeeKm ?? 0} type="number" onSave={v => updateZone(z.id, { minimumFeeKmMix: parseFloat(v) || undefined })} /> €/auto
                          </div>
                        </div>
                      </>}
                      {/* Čerpanie pumpy — read-only, zo Služieb */}
                      <div className="col-span-3 px-4 py-2.5 bg-yellow-50/50 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] text-yellow-600 font-bold uppercase tracking-wide">Čerpanie pumpy</div>
                          <div className="text-sm font-bold text-secondary">{pumpRate != null ? `${pumpRate.toFixed(2)} €/hod` : "—"}</div>
                        </div>
                        {onGoToSluzby && (
                          <button onClick={onGoToSluzby} className="flex items-center gap-1 text-[10px] text-yellow-600 hover:text-secondary transition-colors font-semibold shrink-0">
                            <ExternalLink className="w-3 h-3" />
                            Nastaviť v Službách
                          </button>
                        )}
                      </div>
                      {/* Čakačky — read-only referencia zo Služieb */}
                      <div className="col-span-3 px-4 py-2.5 bg-orange-50/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wide">Čakačka Pumpa</div>
                            <div className="text-sm font-bold text-secondary">{waitingRatePumpa != null ? `${waitingRatePumpa.toFixed(2)} €/hod` : "—"}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wide">Čakačka Mix / 15 min</div>
                            <div className="text-sm font-bold text-secondary">{waitingRateMix != null ? `${waitingRateMix.toFixed(2)} €` : "—"}</div>
                          </div>
                        </div>
                        {onGoToSluzby && (
                          <button onClick={onGoToSluzby} className="flex items-center gap-1 text-[10px] text-orange-500 hover:text-secondary transition-colors font-semibold shrink-0">
                            <ExternalLink className="w-3 h-3" />
                            Nastaviť v Službách
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Zóny a Doťaženie — dve independent collapsible sekcie */}
                {isStandard && (() => {
                  const pumpCap = zones[0]?.pumpTruckCapacity ?? 7;
                  const mixCap  = zones[0]?.truckCapacity     ?? 9;
                  const minFeeV  = ts.minimumFee ?? 62.50;
                  return (
                    <div className="border-t-2 border-blue-100">
                      {/* Zóny dopravy — collapsible */}
                      <div className="bg-blue-50/40">
                        <button type="button" onClick={() => setStdZonesOpen(o => !o)}
                          className="w-full flex items-center gap-2 px-5 py-2 border-b border-blue-100 hover:bg-blue-50 transition-colors text-left cursor-pointer select-none">
                          <span className="font-black text-secondary text-xs uppercase tracking-widest">Zóny dopravy</span>
                          <span className="text-[10px] text-blue-500 font-semibold">cenník €/m³</span>
                          <div className="ml-auto">{stdZonesOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}</div>
                        </button>
                        {stdZonesOpen && (<>
                        {/* Pricing bands table */}
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-blue-100 bg-blue-50/30">
                              <th className="text-left px-5 py-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide">Od km</th>
                              <th className="text-left px-4 py-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide">Do km</th>
                              <th className="text-right px-4 py-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide">€/m³</th>
                              <th className="w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {pZones.map((z, i) => (
                              <tr key={z.id} className={`border-b border-gray-50 hover:bg-primary/5 ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                                <td className="px-5 py-2 text-secondary font-medium"><EditableField value={z.fromKm} type="number" onSave={v => updatePZ(z.id, "fromKm", v)} /></td>
                                <td className="px-4 py-2 text-secondary font-medium"><EditableField value={z.toKm} type="number" onSave={v => updatePZ(z.id, "toKm", v)} /></td>
                                <td className="px-4 py-2 text-right font-bold text-secondary"><EditableField value={z.ratePerM3.toFixed(2)} type="number" onSave={v => updatePZ(z.id, "ratePerM3", v)} /></td>
                                <td className="px-2 py-2 text-right"><button onClick={() => removePZ(z.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {addingPZ ? (
                          <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-3 flex flex-wrap gap-2">
                            <input placeholder="Od km" type="number" value={pzForm.fromKm} onChange={e => setPzForm({ ...pzForm, fromKm: e.target.value })}
                              className="w-24 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" autoFocus />
                            <input placeholder="Do km" type="number" value={pzForm.toKm} onChange={e => setPzForm({ ...pzForm, toKm: e.target.value })}
                              className="w-24 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                            <input placeholder="€/m³" type="number" step="0.01" value={pzForm.ratePerM3} onChange={e => setPzForm({ ...pzForm, ratePerM3: e.target.value })}
                              className="w-28 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                            <button onClick={addPZ} className="px-3 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setAddingPZ(false)} className="px-3 py-2 bg-gray-100 text-gray-500 hover:bg-gray-200"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="border-t border-gray-100">
                            <button onClick={() => setAddingPZ(true)}
                              className="flex items-center gap-2 w-full text-gray-400 hover:text-primary font-bold text-sm py-2.5 px-5 justify-start transition-colors hover:bg-gray-50">
                              <Plus className="w-4 h-4" /> Pridať zónu
                            </button>
                          </div>
                        )}
                        </>)}
                      </div>

                      {/* Doťaženie — collapsible */}
                      <div className="bg-white border-t border-gray-100">
                        <button type="button" onClick={() => setStdDotazenieOpen(o => !o)}
                          className="w-full flex items-center gap-2 px-5 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left cursor-pointer select-none">
                          <span className="text-xs font-black text-secondary uppercase tracking-widest">Pravidlá doťaženia</span>
                          <div className="ml-auto">{stdDotazenieOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}</div>
                        </button>
                        {stdDotazenieOpen && (
                          <div className="px-5 py-3">
                            <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
                              <div className="bg-gray-50 border border-gray-100 rounded p-2.5 space-y-1">
                                <div className="font-black text-secondary text-[10px] uppercase">🚛 Pumpa</div>
                                <div>množstvo &lt; 5 m³ → doťaž na 5 m³</div>
                                <div>{pumpCap} m³ &lt; mn. &lt; 10 m³ → doťaž na 10 m³</div>
                              </div>
                              <div className="bg-gray-50 border border-gray-100 rounded p-2.5 space-y-1">
                                <div className="font-black text-secondary text-[10px] uppercase">🔄 Mixér</div>
                                <div>množstvo &lt; 5 m³ → doťaž na 5 m³</div>
                                <div>{mixCap} m³ &lt; mn. &lt; 10 m³ → doťaž na 10 m³</div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 text-xs text-amber-800">
                              <span className="shrink-0">⚠️</span>
                              <span>Pri min. doprave ({minFeeV.toFixed(2)} €/auto) sa doťaženie <strong>nepočíta</strong>.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                </>)}
              </div>
            );
          })}
        </div>

        {/* Add form / button */}
        {adding ? (
          <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-4 space-y-3">
            <input placeholder="Názov dopravy *" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" autoFocus />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Typ:</span>
              {ZONE_TYPES.map(zt => (
                <button key={zt.key} type="button"
                  onClick={() => setAddForm({ ...addForm, pricingType: zt.key })}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${addForm.pricingType === zt.key ? "bg-secondary text-primary" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {zt.label}
                </button>
              ))}
            </div>
            {addForm.pricingType === "km" && (
              <input placeholder="Sadzba €/km" type="number" step="0.1" value={addForm.ratePerKm} onChange={e => setAddForm({ ...addForm, ratePerKm: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            )}
            {addForm.pricingType === "auto" && (
              <input placeholder="Paušál / vozidlo (€)" type="number" value={addForm.ratePerTruck} onChange={e => setAddForm({ ...addForm, ratePerTruck: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            )}
            {addForm.pricingType === "standard" && (
              <div className="flex items-center px-3 py-2 border border-dashed border-blue-200 bg-blue-50 text-[11px] text-blue-500">
                Cena sa nastaví v Pásmach dopravy
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={addZone} className="px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90">Pridať</button>
              <button onClick={() => { setAdding(false); setAddForm(emptyAddForm); }} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm hover:bg-gray-200">Zrušiť</button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-100">
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 w-full text-gray-400 hover:text-primary font-bold text-sm py-3 px-5 justify-start transition-colors hover:bg-gray-50">
              <Plus className="w-4 h-4" /> Pridať Typ Dopravy
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
