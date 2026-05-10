import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { LogOut, Plus, UserPlus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Users, Truck, Wrench, Layers, Eye, EyeOff, RefreshCw, LogIn, ShieldCheck, ShieldOff, Table2, ClipboardList, FileText, Crown, Calculator } from "lucide-react";
import { ClientPriceTable } from "@/components/ClientPriceTable";
import { ConcreteCalculator } from "@/components/Calculator";
import { PriceModeToggle } from "@/components/PriceModeToggle";
import { VersionBadge } from "@/components/VersionBadge";
import { PhoneInput } from "@/components/PhoneInput";
import { cn, formatPhone } from "@/lib/utils";
import { isLoggedIn, logout } from "@/lib/adminAuth";
import { adminData, adminApi, syncFromServer, SYSTEM_OWNER_ID, ConcreteCategory, ConcreteType, DeliveryZone, Service, Client, TransportPricingZone, TransportSettings, Order } from "@/lib/adminData";

type Tab = "betony" | "sluzby" | "doprava" | "klienti" | "objednavky";

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditableField({ value, onSave, type = "text" }: { value: string | number; onSave: (v: string) => void; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  const save = () => { onSave(val); setEditing(false); };
  const startEdit = () => { setVal(String(value)); setEditing(true); };
  if (!editing) return (
    <span className="cursor-pointer hover:text-primary transition-colors group flex items-center gap-1" onClick={e => { e.stopPropagation(); startEdit(); }}>
      {value}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </span>
  );
  return (
    <span className="flex items-center gap-1">
      <input type={type} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="bg-white border border-primary px-2 py-0.5 text-secondary text-sm w-32 focus:outline-none" autoFocus onFocus={e => e.target.select()} />
      <button onClick={save} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
      <button onClick={() => setEditing(false)} className="text-red-500 hover:text-red-600"><X className="w-4 h-4" /></button>
    </span>
  );
}

// ── BETÓNY tab ────────────────────────────────────────────────────────────────
function BetonTab() {
  const [cats, setCats] = useState<ConcreteCategory[]>(adminData.getCategories());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("");

  const save = (data: ConcreteCategory[]) => { setCats(data); adminData.saveCategories(data); };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    save([...cats, { id: adminData.generateId(), name: newCatName.trim().toUpperCase(), types: [] }]);
    setNewCatName(""); setAddingCat(false);
  };
  const deleteCategory = (id: string) => { if (confirm("Vymazať kategóriu?")) save(cats.filter(c => c.id !== id)); };
  const updateCatName = (id: string, name: string) => save(cats.map(c => c.id === id ? { ...c, name: name.toUpperCase() } : c));

  const addType = (catId: string) => {
    if (!newTypeName.trim() || !newTypePrice) return;
    save(cats.map(c => c.id === catId ? { ...c, types: [...c.types, { id: adminData.generateId(), label: newTypeName.trim(), price: parseFloat(newTypePrice) }] } : c));
    setNewTypeName(""); setNewTypePrice(""); setAddingType(null);
  };
  const deleteType = (catId: string, typeId: string) => save(cats.map(c => c.id === catId ? { ...c, types: c.types.filter(t => t.id !== typeId) } : c));
  const updateType = (catId: string, typeId: string, field: keyof ConcreteType, value: string) =>
    save(cats.map(c => c.id === catId ? { ...c, types: c.types.map(t => t.id === typeId ? { ...t, [field]: field === "price" ? parseFloat(value) : value } : t) } : c));

  return (
    <div className="space-y-3">
      {cats.map(cat => (
        <div key={cat.id} className="border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}>
            <div className="flex items-center gap-3">
              {expanded === cat.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              <span className="font-semibold text-secondary"><EditableField value={cat.name} onSave={v => updateCatName(cat.id, v)} /></span>
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <span className="text-xs text-gray-400">{cat.types.length} typov</span>
              <button onClick={() => deleteCategory(cat.id)} className="p-1.5 bg-secondary text-primary hover:bg-secondary/80 transition-colors rounded-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {expanded === cat.id && (
            <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left pb-2 font-semibold">Typ betónu</th>
                    <th className="text-right pb-2 font-semibold">Cena (€/m³)</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {cat.types.map(t => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="py-2 font-medium text-secondary">
                        <EditableField value={t.label} onSave={v => updateType(cat.id, t.id, "label", v)} />
                      </td>
                      <td className="py-2 text-right">
                        <EditableField value={t.price.toFixed(2)} type="number" onSave={v => updateType(cat.id, t.id, "price", v)} />
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => deleteType(cat.id, t.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {addingType === cat.id ? (
                <div className="flex gap-2 mt-2">
                  <input placeholder="Názov betónu" value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                    className="flex-1 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <input placeholder="Cena €/m³" type="number" step="0.01" value={newTypePrice} onChange={e => setNewTypePrice(e.target.value)}
                    className="w-28 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <button onClick={() => addType(cat.id)} className="px-3 py-2 bg-primary text-secondary text-sm font-bold hover:bg-primary/90"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setAddingType(null)} className="px-3 py-2 bg-gray-100 text-gray-500 text-sm hover:bg-gray-200"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <button onClick={() => { setAddingType(cat.id); setNewTypeName(""); setNewTypePrice(""); }}
                  className="flex items-center gap-1 text-xs text-primary font-bold hover:text-secondary transition-colors mt-1">
                  <Plus className="w-3.5 h-3.5" /> Pridať typ betónu
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {addingCat ? (
        <div className="flex gap-2 mt-3">
          <input placeholder="Názov kategórie (napr. DRVENÉ KAMENIVO Dmax8)" value={newCatName} onChange={e => setNewCatName(e.target.value)}
            className="flex-1 border-2 border-primary px-4 py-3 text-sm focus:outline-none" autoFocus />
          <button onClick={addCategory} className="px-4 py-3 bg-primary text-secondary font-bold text-sm hover:bg-primary/90">Pridať</button>
          <button onClick={() => setAddingCat(false)} className="px-4 py-3 bg-gray-100 text-gray-500 text-sm hover:bg-gray-200">Zrušiť</button>
        </div>
      ) : (
        <button onClick={() => setAddingCat(true)}
          className="flex items-center gap-2 w-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary font-bold text-sm py-4 justify-center transition-colors">
          <Plus className="w-4 h-4" /> Pridať kategóriu kameniva
        </button>
      )}
    </div>
  );
}

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

// ── DOPRAVA tab ───────────────────────────────────────────────────────────────
const ZONE_TYPES: { key: "standard" | "km" | "auto"; label: string; desc: string; rateLabel: string; rateUnit: string }[] = [
  { key: "standard", label: "Štandard",  desc: "cena z tabuľky Zóny dopravy × objem + doťaženie", rateLabel: "Cena / m³", rateUnit: "€/m³" },
  { key: "km",       label: "Kilometre", desc: "sadzba €/km × počet áut × vzdialenosť",           rateLabel: "Sadzba",    rateUnit: "€/km" },
  { key: "auto",     label: "Počet áut", desc: "paušál za každé vozidlo",                         rateLabel: "Paušál",    rateUnit: "€/vozidlo" },
];

function DopravaTab() {
  const [zones, setZones] = useState<DeliveryZone[]>(adminData.getDelivery());
  const [adding, setAdding] = useState(false);
  const emptyAddForm = { name: "", pricingType: "standard" as "standard" | "km" | "auto", ratePerKm: "", ratePerTruck: "", truckCapacity: "", pumpTruckCapacity: "", pumpHourlyRate: "", waitingRatePer15min: "" };
  const [addForm, setAddForm] = useState(emptyAddForm);

  const [pZones, setPZones] = useState<TransportPricingZone[]>(adminData.getTransportZones());
  const [ts, setTs] = useState<TransportSettings>(adminData.getTransportSettings());
  const [addingPZ, setAddingPZ] = useState(false);
  const [pzForm, setPzForm] = useState({ fromKm: "", toKm: "", ratePerM3: "" });

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
      truckCapacity: parseFloat(addForm.truckCapacity) || 9,
      pumpTruckCapacity: parseFloat(addForm.pumpTruckCapacity) || 7,
      pumpHourlyRate: parseFloat(addForm.pumpHourlyRate) || 112.50,
      waitingRatePer15min: parseFloat(addForm.waitingRatePer15min) || 8,
    }]);
    setAddForm(emptyAddForm); setAdding(false);
  };

  return (
    <div className="space-y-3">
      {/* ── Typy dopravy ── */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Typy dopravy</h3>
        </div>

        {/* Číslovaný zoznam typov dopravy */}
        <div className="border-t border-gray-100">
          {ZONE_TYPES.map((zt, idx) => {
            const typeZones = zones.filter(z => (z.pricingType ?? "standard") === zt.key);
            if (typeZones.length === 0) return null;
            const isStandard = zt.key === "standard";
            return (
              <div key={zt.key} className={`border-b border-gray-100 last:border-b-0 ${isStandard ? "bg-blue-50/30" : ""}`}>
                {/* Type header */}
                <div className={`flex items-start gap-3 px-5 py-3 flex-wrap ${isStandard ? "bg-blue-50/60 border-b border-blue-100" : "bg-gray-50/40"}`}>
                  <span className={`w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${isStandard ? "bg-blue-600" : "bg-secondary"}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-secondary text-sm">{zt.label}</span>
                      <span className="text-[11px] text-gray-400">{zt.desc}</span>
                    </div>
                    {isStandard && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <a href="#zony-dopravy" onClick={e => { e.preventDefault(); document.getElementById("zony-dopravy")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                          className="text-[10px] text-blue-600 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded font-bold hover:bg-blue-200 transition-colors cursor-pointer">
                          Zóny dopravy (cenník) ↓
                        </a>
                        <span className="text-[10px] text-blue-400">cena €/m³ podľa km vzdialenosti</span>
                      </div>
                    )}
                  </div>
                  {isStandard && (() => {
                    const ref = zones[0];
                    const updateAll2 = (patch: Partial<DeliveryZone>) => save(zones.map(z => ({ ...z, ...patch })));
                    return (
                      <div className="flex flex-wrap gap-3 mt-2 w-full">
                        <div className="flex items-center gap-4 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <PumpTruckIcon />
                            <span className="text-[10px] font-black text-secondary uppercase tracking-wide">Pumpa</span>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Kapacita</div>
                            <div className="font-bold text-secondary text-sm flex items-center gap-1">
                              <EditableField value={ref?.pumpTruckCapacity ?? 7} type="number" onSave={v => updateAll2({ pumpTruckCapacity: parseFloat(v) })} /> m³
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Čakačka / 15 min</div>
                            <div className="text-[11px] text-gray-400 italic">→ zo Služieb</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <MixTruckIcon />
                            <span className="text-[10px] font-black text-secondary uppercase tracking-wide">Mixér</span>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Kapacita</div>
                            <div className="font-bold text-secondary text-sm flex items-center gap-1">
                              <EditableField value={ref?.truckCapacity ?? 9} type="number" onSave={v => updateAll2({ truckCapacity: parseFloat(v) })} /> m³
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Čakačka / 15 min</div>
                            <div className="text-[11px] text-gray-400 italic">→ zo Služieb</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Min. objednávka (m³)</div>
                            <div className="font-bold text-secondary text-sm">
                              <EditableField value={ts.minimumLoadM3 as number} type="number" onSave={v => saveTs({ ...ts, minimumLoadM3: parseFloat(v) || 0 })} /> m³
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Min. cena / auto (€)</div>
                            <div className="font-bold text-secondary text-sm">
                              <EditableField value={ts.minimumFee as number} type="number" onSave={v => saveTs({ ...ts, minimumFee: parseFloat(v) || 0 })} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {/* Zóny tohto typu */}
                {typeZones.map(z => (
                  <div key={z.id} className="flex items-center gap-3 px-5 py-2.5 pl-14 border-t border-gray-50 hover:bg-gray-50/50">
                    <div className="font-semibold text-secondary text-sm flex-1">
                      <EditableField value={z.name} onSave={v => updateZone(z.id, { name: v })} />
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{zt.rateLabel}</div>
                        <div className="font-bold text-secondary">
                          {isStandard
                            ? <span className="text-[11px] text-blue-500 italic font-normal flex items-center gap-1">z Zón dopravy ↓</span>
                            : zt.key === "auto"
                              ? <><EditableField value={z.ratePerTruck ?? 0} type="number" onSave={v => updateZone(z.id, { ratePerTruck: parseFloat(v) })} /> {zt.rateUnit}</>
                              : <><EditableField value={z.ratePerKm} type="number" onSave={v => updateZone(z.id, { ratePerKm: parseFloat(v) })} /> {zt.rateUnit}</>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Čerpanie pumpy</div>
                        <div className="font-bold text-secondary">
                          <EditableField value={z.pumpHourlyRate} type="number" onSave={v => updateZone(z.id, { pumpHourlyRate: parseFloat(v) })} /> €/hod
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeZone(z.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Add form / button */}
        {adding ? (
          <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <input placeholder="Názov dopravy *" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" autoFocus />
              <select value={addForm.pricingType} onChange={e => setAddForm({ ...addForm, pricingType: e.target.value as "standard" | "km" | "auto" })}
                className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                {ZONE_TYPES.map(zt => <option key={zt.key} value={zt.key}>{zt.label}</option>)}
              </select>
              {addForm.pricingType === "auto" ? (
                <input placeholder="Paušál / vozidlo (€)" type="number" value={addForm.ratePerTruck} onChange={e => setAddForm({ ...addForm, ratePerTruck: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              ) : addForm.pricingType === "km" ? (
                <input placeholder="Sadzba €/km" type="number" step="0.1" value={addForm.ratePerKm} onChange={e => setAddForm({ ...addForm, ratePerKm: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              ) : (
                <div className="flex items-center px-3 py-2 border border-dashed border-blue-200 bg-blue-50 text-[11px] text-blue-500">
                  Cena z Pásiem
                </div>
              )}
              <input placeholder="Čerpanie pumpy (€/hod)" type="number" value={addForm.pumpHourlyRate} onChange={e => setAddForm({ ...addForm, pumpHourlyRate: e.target.value })}
                className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2">
              <button onClick={addZone} className="px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90">Pridať</button>
              <button onClick={() => { setAdding(false); setAddForm(emptyAddForm); }} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm hover:bg-gray-200">Zrušiť</button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-100">
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 w-full text-gray-400 hover:text-primary font-bold text-sm py-3 px-5 justify-start transition-colors hover:bg-gray-50">
              <Plus className="w-4 h-4" /> Pridať dopravu
            </button>
          </div>
        )}
      </div>

      {/* ── Zóny dopravy (cenník) — prepojené so Štandard ── */}
      <div id="zony-dopravy" className="bg-white border border-blue-200 shadow-sm overflow-hidden" style={{ scrollMarginTop: "80px" }}>
        <div className="px-5 py-3 border-b border-blue-100 bg-blue-50/70">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Zóny dopravy</h3>
            <span className="text-[10px] text-blue-600 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded font-bold">cenník</span>
          </div>
          <p className="text-[11px] text-blue-500 mt-0.5">Používa sa pre typ <strong>Štandard</strong> — cena €/m³ podľa vzdialenosti (od–do km)</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-blue-100 bg-blue-50/30">
              <th className="text-left px-5 py-2.5 text-[10px] font-bold text-blue-400 uppercase tracking-wide">Od km</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-blue-400 uppercase tracking-wide">Do km</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-blue-400 uppercase tracking-wide">€/m³</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {pZones.map((z, i) => (
              <tr key={z.id} className={`border-b border-gray-50 hover:bg-primary/5 ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                <td className="px-5 py-2 text-secondary font-medium"><EditableField value={z.fromKm} type="number" onSave={v => updatePZ(z.id, "fromKm", v)} /></td>
                <td className="px-4 py-2 text-secondary font-medium"><EditableField value={z.toKm} type="number" onSave={v => updatePZ(z.id, "toKm", v)} /></td>
                <td className="px-4 py-2 text-right font-bold text-secondary"><EditableField value={z.ratePerM3.toFixed(2)} type="number" onSave={v => updatePZ(z.id, "ratePerM3", v)} /></td>
                <td className="px-2 py-2 text-right"><button onClick={() => removePZ(z.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></td>
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
              className="flex items-center gap-2 w-full text-gray-400 hover:text-primary font-bold text-sm py-3 px-5 justify-start transition-colors hover:bg-gray-50">
              <Plus className="w-4 h-4" /> Pridať zónu
            </button>
          </div>
        )}
      </div>

      {/* ── Info panel: Pravidlá doťaženia ── */}
      {(() => {
        const pumpCap = zones[0]?.pumpTruckCapacity ?? 7;
        const mixCap  = zones[0]?.truckCapacity     ?? 9;
        const minFee  = ts.minimumFee ?? 62.50;
        const rows = [
          {
            icon: "🚛",
            mode: "Pumpa",
            rules: [
              { when: `množstvo < 5 m³`, action: `doťaž na 5 m³`, example: `napr. 3 m³ → +2 m³` },
              { when: `${pumpCap} m³ < množstvo < 10 m³`, action: `doťaž na 10 m³`, example: `napr. 8 m³ → +2 m³` },
            ],
          },
          {
            icon: "🔄",
            mode: "Mixér",
            rules: [
              { when: `množstvo < 5 m³`, action: `doťaž na 5 m³`, example: `napr. 3 m³ → +2 m³` },
              { when: `${mixCap} m³ < množstvo < 10 m³`, action: `doťaž na 10 m³`, example: `napr. 9.5 m³ → +0.5 m³` },
            ],
          },
        ];
        return (
          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Pravidlá doťaženia</h3>
              <span className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">— automatický príplatok k doprave</span>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Doťaženie je <strong className="text-secondary">extra objem betónu</strong>, ktorý sa dopočíta k objednávke, ak je množstvo nevýhodné pre plnú kapacitu auta.
                Cena doťaženia sa počíta rovnakou sadzbou ako doprava v danej zóne (€/m³).
                Pri <strong className="text-secondary">minimálnej doprave</strong> sa doťaženie <span className="text-red-500 font-semibold">nepočíta</span>.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {rows.map(r => (
                  <div key={r.mode} className="bg-gray-50 border border-gray-100 rounded p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span>{r.icon}</span>
                      <span className="text-xs font-black text-secondary uppercase tracking-wide">{r.mode}</span>
                    </div>
                    <div className="space-y-1.5">
                      {r.rules.map((rule, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <div>
                            <span className="text-gray-500">Ak </span>
                            <span className="font-mono font-semibold text-secondary">{rule.when}</span>
                            <span className="text-gray-500"> → </span>
                            <span className="font-semibold text-secondary">{rule.action}</span>
                            <span className="text-gray-400 ml-1">({rule.example})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-800">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>Doťaženie sa <strong>nevypočíta</strong>, ak celková cena dopravy vrátane doťaženia klesne pod <strong className="font-mono">{minFee.toFixed(2)} €/auto</strong> (minimálna doprava). V takom prípade sa použije min. poplatok a doťaženie sa ignoruje.</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── SLUŽBY tab ────────────────────────────────────────────────────────────────
function SluzbyTab() {
  const [services, setServices] = useState<Service[]>(adminData.getServices());
  const [adding, setAdding] = useState(false);
  const emptyForm = { name: "", unit: "", price: "", description: "", serviceMode: "" as "" | "pumpa" | "mix", maxMeters: "", activePeriodFrom: "", activePeriodTo: "" };
  const [form, setForm] = useState(emptyForm);

  const save = (data: Service[]) => { setServices(data); adminData.saveServices(data); };
  const toggle = (id: string) => save(services.map(s => s.id === id ? { ...s, active: !s.active } : s));
  const remove = (id: string) => { if (confirm("Vymazať službu?")) save(services.filter(s => s.id !== id)); };
  const update = (id: string, field: keyof Service, value: string) =>
    save(services.map(s => s.id === id ? { ...s, [field]: (field === "price" || field === "maxMeters") ? (parseFloat(value) || 0) : (value === "—" ? undefined : value) } : s));

  const parsePeriodDate = (v: string) => { const [dd, mm] = v.split("."); return dd && mm ? `${mm}-${dd}` : ""; };
  const add = () => {
    if (!form.name.trim()) return;
    const s: Service = { id: adminData.generateId(), name: form.name.trim(), unit: form.unit.trim(), price: parseFloat(form.price) || 0, description: form.description.trim(), active: true };
    if (form.serviceMode) s.serviceMode = form.serviceMode;
    if (form.maxMeters) s.maxMeters = parseFloat(form.maxMeters) || 0;
    const pf = parsePeriodDate(form.activePeriodFrom); if (pf) s.activePeriodFrom = pf;
    const pt = parsePeriodDate(form.activePeriodTo); if (pt) s.activePeriodTo = pt;
    save([...services, s]);
    setForm(emptyForm); setAdding(false);
  };

  // Zorad: čakačka pumpy hneď za čakačkou mixéra
  const displayServices = (() => {
    const pumpaItems = services.filter(s => s.serviceMode === "pumpa");
    const result: Service[] = [];
    for (const s of services) {
      if (s.serviceMode === "pumpa") continue;
      result.push(s);
      if (s.serviceMode === "mix") result.push(...pumpaItems);
    }
    if (!services.some(s => s.serviceMode === "mix")) result.push(...pumpaItems);
    return result;
  })();

  const ServiceModeBadge = ({ mode }: { mode?: "pumpa" | "mix" }) => mode ? (
    <div className="flex items-center gap-1">
      {mode === "pumpa" ? <PumpTruckIcon /> : <MixTruckIcon />}
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{mode === "pumpa" ? "Iba Pumpa" : "Iba Mixér"}</span>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {displayServices.map((s) => (
          <div key={s.id} className={`bg-white border shadow-sm p-4 ${s.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-secondary text-sm"><EditableField value={s.name} onSave={v => update(s.id, "name", v)} /></div>
                <div className="text-xs text-gray-400 mt-0.5 leading-snug"><EditableField value={s.description || "—"} onSave={v => update(s.id, "description", v)} /></div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggle(s.id)} className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {s.active ? "Aktívna" : "Neakt."}
                </button>
                <button onClick={() => remove(s.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <ServiceModeBadge mode={s.serviceMode} />
              {s.maxMeters !== undefined && <span className="text-[10px] text-gray-400">Max: <EditableField value={s.maxMeters} type="number" onSave={v => update(s.id, "maxMeters", v)} /> m</span>}
              {(s.activePeriodFrom || s.activePeriodTo) && (
                <span className="text-[10px] text-gray-300">{s.activePeriodFrom ? `${s.activePeriodFrom.split("-")[1]}.${s.activePeriodFrom.split("-")[0]}` : ""}–{s.activePeriodTo ? `${s.activePeriodTo.split("-")[1]}.${s.activePeriodTo.split("-")[0]}` : ""}</span>
              )}
              <span className="ml-auto font-bold text-secondary text-sm">
                <EditableField value={(s.price ?? 0).toFixed(2)} type="number" onSave={v => update(s.id, "price", v)} /> €
              </span>
              {s.unit && <span className="text-xs text-gray-400">/ {s.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Názov služby</th>
              <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Jednotka</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Cena bez DPH</th>
              <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-28">Stav</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {displayServices.map((s, i) => (
              <tr key={s.id} className={`border-b border-gray-50 ${s.active ? "" : "opacity-50"} ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                <td className="px-5 py-3">
                  <div className="font-semibold text-secondary"><EditableField value={s.name} onSave={v => update(s.id, "name", v)} /></div>
                  <div className="text-xs text-gray-400 mt-0.5"><EditableField value={s.description || "—"} onSave={v => update(s.id, "description", v)} /></div>
                  {(s.activePeriodFrom || s.activePeriodTo) && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-300">
                      <span>Aktívne:</span>
                      <EditableField value={s.activePeriodFrom ? `${s.activePeriodFrom.split("-")[1]}.${s.activePeriodFrom.split("-")[0]}` : "—"} onSave={v => { const [dd, mm] = v.split("."); update(s.id, "activePeriodFrom", dd && mm ? `${mm}-${dd}` : v); }} />
                      <span>–</span>
                      <EditableField value={s.activePeriodTo ? `${s.activePeriodTo.split("-")[1]}.${s.activePeriodTo.split("-")[0]}` : "—"} onSave={v => { const [dd, mm] = v.split("."); update(s.id, "activePeriodTo", dd && mm ? `${mm}-${dd}` : v); }} />
                      <span className="text-gray-200">(DD.MM)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <ServiceModeBadge mode={s.serviceMode} />
                    {s.maxMeters !== undefined && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span>Max:</span><EditableField value={s.maxMeters} type="number" onSave={v => update(s.id, "maxMeters", v)} /><span>m</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-gray-500"><EditableField value={s.unit || "—"} onSave={v => update(s.id, "unit", v)} /></td>
                <td className="px-3 py-3 text-right font-bold text-secondary"><EditableField value={(s.price ?? 0).toFixed(2)} type="number" onSave={v => update(s.id, "price", v)} /> €</td>
                <td className="px-3 py-3 text-center">
                  <button onClick={() => toggle(s.id)} className={`px-2 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${s.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {s.active ? "Aktívna" : "Neaktívna"}
                  </button>
                </td>
                <td className="px-2 py-3 text-right"><button onClick={() => remove(s.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="bg-white border-2 border-primary p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Nová služba</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input placeholder="Názov služby *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary sm:col-span-2" autoFocus />
            <input placeholder="Popis (nepovinné)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary sm:col-span-2" />
            <input placeholder="Jednotka (napr. 1 ks, 1 h)" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <input placeholder="Cena bez DPH (€)" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>

          {/* Režim kalkulačky */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Režim kalkulačky</p>
            <div className="flex gap-1 flex-wrap">
              {([["", "Všetky režimy"], ["pumpa", "Iba Pumpa"], ["mix", "Iba Mixér"]] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm({ ...form, serviceMode: val })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${form.serviceMode === val ? "bg-secondary text-primary" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {val === "pumpa" && <PumpTruckIcon />}{val === "mix" && <MixTruckIcon />}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Voliteľné atribúty */}
          <div className="mb-4 border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Voliteľné</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Max. dĺžka hadice (m)</label>
                <input placeholder="napr. 32" type="number" min="0" value={form.maxMeters} onChange={e => setForm({ ...form, maxMeters: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Aktívne obdobie (DD.MM – DD.MM)</label>
                <div className="flex gap-2">
                  <input placeholder="od DD.MM" value={form.activePeriodFrom} onChange={e => setForm({ ...form, activePeriodFrom: e.target.value })}
                    className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary flex-1 min-w-0" />
                  <input placeholder="do DD.MM" value={form.activePeriodTo} onChange={e => setForm({ ...form, activePeriodTo: e.target.value })}
                    className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary flex-1 min-w-0" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={add} className="px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90">Pridať službu</button>
            <button onClick={() => { setForm(emptyForm); setAdding(false); }} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm">Zrušiť</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 w-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary font-bold text-sm py-4 justify-center transition-colors">
          <Plus className="w-4 h-4" /> Pridať službu
        </button>
      )}
    </div>
  );
}

// ── OBJEDNÁVKY tab ────────────────────────────────────────────────────────────
const ORDER_STATUSES: { key: Order["status"]; label: string; color: string }[] = [
  { key: "nova",        label: "Nová",        color: "bg-blue-100 text-blue-700" },
  { key: "potvrdena",   label: "Potvrdená",   color: "bg-yellow-100 text-yellow-700" },
  { key: "odoslana",    label: "Odoslaná",    color: "bg-green-100 text-green-700" },
  { key: "vyuctovana",  label: "Vyúčtovaná",  color: "bg-purple-100 text-purple-700" },
  { key: "vyplatena",   label: "Vyplatená",   color: "bg-teal-100 text-teal-700" },
  { key: "zrusena",     label: "Zrušená",     color: "bg-red-100 text-red-500" },
];

function OrderStatusBadge({ status, onChange }: { status: Order["status"]; onChange: (s: Order["status"]) => void }) {
  const [open, setOpen] = useState(false);
  const cur = ORDER_STATUSES.find(s => s.key === status) ?? ORDER_STATUSES.find(s => s.key === "odoslana")!;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className={`px-2 py-1 text-xs font-bold rounded-sm cursor-pointer ${cur.color}`}>{cur.label} ▾</button>
      {open && (
        <div className="absolute z-10 bg-white border border-gray-200 shadow-lg rounded-sm min-w-[110px] left-0 top-full mt-0.5">
          {ORDER_STATUSES.map(s => (
            <button key={s.key} onClick={() => { onChange(s.key); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-gray-50 ${s.color}`}>{s.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const TAB_STYLES: Record<Order["tab"], { badge: string; activeBg: string; dot: string; label: string }> = {
  pumpa:        { badge: "bg-amber-100 text-amber-700 border-amber-200",  activeBg: "bg-amber-500 text-white border-amber-500",  dot: "bg-amber-500",  label: "Pumpa" },
  mix:          { badge: "bg-blue-100 text-blue-700 border-blue-200",     activeBg: "bg-blue-500 text-white border-blue-500",     dot: "bg-blue-500",   label: "Mix" },
  vlastnadoprava: { badge: "bg-green-100 text-green-700 border-green-200", activeBg: "bg-green-500 text-white border-green-500", dot: "bg-green-500",  label: "Vl. doprava" },
};

const STATUS_ACTIVE_COLORS: Record<Order["status"], string> = {
  nova:        "bg-blue-500 text-white border-blue-500",
  potvrdena:   "bg-yellow-400 text-white border-yellow-400",
  odoslana:    "bg-green-600 text-white border-green-600",
  vyuctovana:  "bg-purple-600 text-white border-purple-600",
  vyplatena:   "bg-teal-600 text-white border-teal-600",
  zrusena:     "bg-red-500 text-white border-red-500",
  vybavena:    "bg-indigo-600 text-white border-indigo-600",
};

function TabBadge({ tab }: { tab: Order["tab"] }) {
  const s = TAB_STYLES[tab];
  const icon = tab === "pumpa"
    ? <svg width="14" height="9" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="12" width="24" height="6" rx="1"/><rect x="22" y="9" width="9" height="9" rx="1"/><rect x="8" y="8" width="3" height="4" rx="0.5"/><line x1="9.5" y1="8" x2="3" y2="2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="3" y1="2" x2="22" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="6" cy="19" r="3"/><circle cx="14" cy="19" r="3"/><circle cx="27" cy="19" r="3"/></svg>
    : tab === "mix"
    ? <svg width="14" height="9" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="12" width="24" height="6" rx="1"/><rect x="22" y="9" width="9" height="9" rx="1"/><ellipse cx="12" cy="9" rx="9" ry="6"/><circle cx="6" cy="19" r="3"/><circle cx="20" cy="19" r="3"/><circle cx="27" cy="19" r="3"/></svg>
    : <svg width="14" height="9" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="10" width="30" height="8" rx="1"/><path d="M4 10 L9 4 L24 4 L28 10"/><circle cx="8" cy="19" r="3"/><circle cx="24" cy="19" r="3"/></svg>;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded-sm ${s.badge}`}>
      {icon}{s.label}
    </span>
  );
}

function ObjednavkyTab() {
  const [orders, setOrders] = useState<Order[]>(() => adminData.getOrders());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Order["status"] | "vsetky">("vsetky");
  const [filterTab, setFilterTab] = useState<Order["tab"] | "vsetky">("vsetky");
  const [filterPriceMode, setFilterPriceMode] = useState<"vsetky" | "faktura" | "hotovost">("vsetky");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [newBadge, setNewBadge] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const result = await adminApi.getOrders();
        if (result?.data) {
          const data = result.data as Order[];
          adminData.saveOrders(data);
          setOrders(prev => {
            const prevIds = new Set(prev.map(o => o.id));
            const added = data.filter(o => !prevIds.has(o.id)).length;
            if (added > 0) setNewBadge(n => n + added);
            return data;
          });
        }
      } catch {}
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const save = (data: Order[]) => { setOrders(data); adminData.saveOrders(data); };
  const remove = (id: string) => { if (confirm("Vymazať objednávku?")) save(orders.filter(o => o.id !== id)); };
  const updateStatus = (id: string, status: Order["status"]) => save(orders.map(o => o.id === id ? { ...o, status } : o));

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const searchTerms = search.trim().split(/\s+/).filter(Boolean);
  const filtered = orders
    .filter(o => filterStatus    === "vsetky" || o.status    === filterStatus)
    .filter(o => filterTab       === "vsetky" || o.tab       === filterTab)
    .filter(o => filterPriceMode === "vsetky" || o.priceMode === filterPriceMode)
    .filter(o => {
      if (!searchTerms.length) return true;
      const haystack = [o.clientName, o.company ?? "", o.phone ?? "", o.clientId ?? "", o.address ?? "", o.email ?? ""].join(" ");
      return searchTerms.every(t => norm(haystack).includes(norm(t)) || haystack.includes(t));
    })
    .filter(o => {
      if (dateFrom) { const d = o.createdAt.slice(0, 10); if (d < dateFrom) return false; }
      if (dateTo)   { const d = o.createdAt.slice(0, 10); if (d > dateTo)   return false; }
      return true;
    });
  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("sk-SK")} ${d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}`;
  };
  const fmtEur = (n: number) => n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const tabLabel: Record<Order["tab"], string> = { pumpa: "Pumpa", mix: "Mix", vlastnadoprava: "Vl. doprava" };

  return (
    <div className="space-y-3">
      {/* Filter panel */}
      <div className="bg-white border border-gray-200 shadow-sm">
        {/* Row 1 – stav */}
        <div className="flex items-center gap-2 flex-wrap px-4 py-3">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-7 shrink-0">Stav</span>
          <button onClick={() => { setFilterStatus("vsetky"); setNewBadge(0); }}
            className={`relative px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${filterStatus === "vsetky" ? "bg-secondary text-white border-secondary" : "bg-white text-gray-500 border-gray-200 hover:border-secondary/40"}`}>
            Všetky <span className="ml-1 text-[10px] opacity-60">{orders.length}</span>
            {newBadge > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{newBadge}</span>}
          </button>
          {ORDER_STATUSES.map(s => (
            <button key={s.key} onClick={() => setFilterStatus(s.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${
                filterStatus === s.key ? STATUS_ACTIVE_COLORS[s.key] : `bg-white border-gray-200 ${s.color} opacity-80 hover:opacity-100`
              }`}>
              {s.label} <span className="ml-1 text-[10px] opacity-70">{orders.filter(o => o.status === s.key).length}</span>
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 shrink-0">{sorted.length} objednávok</span>
        </div>
        <div className="border-t border-gray-100 mx-4" />
        {/* Row 2 – typ vozidla */}
        <div className="flex items-center gap-2 flex-wrap px-4 py-3">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-7 shrink-0">Typ</span>
          <button onClick={() => setFilterTab("vsetky")}
            className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${filterTab === "vsetky" ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
            Všetky typy
          </button>
          {(["pumpa", "mix", "vlastnadoprava"] as Order["tab"][]).map(t => {
            const s = TAB_STYLES[t];
            const icon = t === "pumpa"
              ? <svg width="14" height="9" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="12" width="24" height="6" rx="1"/><rect x="22" y="9" width="9" height="9" rx="1"/><rect x="8" y="8" width="3" height="4" rx="0.5"/><line x1="9.5" y1="8" x2="3" y2="2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="3" y1="2" x2="22" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="6" cy="19" r="3"/><circle cx="14" cy="19" r="3"/><circle cx="27" cy="19" r="3"/></svg>
              : t === "mix"
              ? <svg width="14" height="9" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="12" width="24" height="6" rx="1"/><rect x="22" y="9" width="9" height="9" rx="1"/><ellipse cx="12" cy="9" rx="9" ry="6"/><circle cx="6" cy="19" r="3"/><circle cx="20" cy="19" r="3"/><circle cx="27" cy="19" r="3"/></svg>
              : <svg width="14" height="9" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="10" width="30" height="8" rx="1"/><path d="M4 10 L9 4 L24 4 L28 10"/><circle cx="8" cy="19" r="3"/><circle cx="24" cy="19" r="3"/></svg>;
            return (
              <button key={t} onClick={() => setFilterTab(t)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${
                  filterTab === t ? s.activeBg : `bg-white border-gray-200 text-gray-500 hover:border-gray-400`
                }`}>
                {icon}
                {s.label} <span className="text-[10px] opacity-60">{orders.filter(o => o.tab === t).length}</span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-gray-100 mx-4" />
        {/* Row 2b – faktura / hotovosť */}
        <div className="flex items-center gap-2 flex-wrap px-4 py-3">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-7 shrink-0">Typ</span>
          {([["vsetky", "Všetky"], ["faktura", "Faktúra"], ["hotovost", "Hotovosť"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilterPriceMode(val)}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${
                filterPriceMode === val
                  ? val === "hotovost" ? "bg-amber-500 text-white border-amber-500" : val === "faktura" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}>
              {label}
              {val !== "vsetky" && <span className="ml-1 text-[10px] opacity-60">{orders.filter(o => o.priceMode === val).length}</span>}
            </button>
          ))}
        </div>
        <div className="border-t border-gray-100 mx-4" />
        {/* Row 3 – vyhľadávanie + dátumový filter */}
        <div className="flex items-center gap-3 flex-wrap px-4 py-3">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Hľadaj</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Meno, firma, telefón, ID, adresa..."
            className="flex-1 min-w-[160px] border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-secondary rounded-sm"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 shrink-0">od</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-secondary rounded-sm w-32" />
            <span className="text-[10px] text-gray-400 shrink-0">do</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-secondary rounded-sm w-32" />
          </div>
          {(search || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
              className="text-[10px] text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5 border border-gray-200 rounded-sm cursor-pointer">
              Vymazať
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white border border-gray-200 px-8 py-12 text-center text-gray-400 text-sm">
          Žiadne objednávky
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(o => {
            const isExp = expanded === o.id;
            return (
              <div key={o.id} className="bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isExp ? null : o.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-secondary text-sm truncate">{o.clientName}</span>
                      {o.company && <span className="text-xs text-gray-500 font-medium truncate">{o.company}</span>}
                      <TabBadge tab={o.tab} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500 font-medium">{o.concreteType.replace(/ – [\d.,]+ €.*/, "")}</span>
                      <span className="text-xs font-bold text-secondary">{o.totalQty} m³</span>
                      {o.km && <span className="text-xs text-gray-400">{o.km} km</span>}
                      {o.address && <span className="text-xs text-gray-400 truncate max-w-[140px]">{o.address}</span>}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{fmtDate(o.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-black text-secondary">{fmtEur(o.totalSDph)}</div>
                      <div className="text-[10px] text-gray-400">{o.priceMode === "hotovost" ? "hotovosť" : "faktúra"}</div>
                    </div>
                    <OrderStatusBadge status={o.status} onChange={s => updateStatus(o.id, s)} />
                    <button onClick={() => remove(o.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {isExp && (
                  <div className="border-t border-gray-100 bg-gray-50/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                      {/* Kontakt */}
                      <div className="px-4 py-3 space-y-1.5 text-xs">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Kontakt</div>
                        <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Meno</span><span className="font-medium text-gray-700">{o.clientName}</span></div>
                        {o.company && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Firma</span><span className="text-gray-600">{o.company}</span></div>}
                        {o.phone && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Telefón</span><span className="text-gray-600">{formatPhone(o.phone)}</span></div>}
                        {o.email && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Email</span><span className="text-gray-600">{o.email}</span></div>}
                        {o.clientId && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">ID klienta</span><span className="text-gray-500">{o.clientId}</span></div>}
                      </div>
                      {/* Detail dopravy + poznámka */}
                      <div className="px-4 py-3 space-y-1.5 text-xs">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Objednávka</div>
                        <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Dátum</span><span className="text-gray-500">{fmtDate(o.createdAt)}</span></div>
                        <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Režim</span><span className="font-bold text-gray-800">{tabLabel[o.tab]}</span></div>
                        <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Množstvo</span><span className="font-bold text-gray-800">{o.totalQty} m³</span></div>
                        {o.km && <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Vzdialenosť</span><span className="font-medium text-gray-700">{o.km} km</span></div>}
                        {o.address && <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Adresa</span><span className="text-gray-600 break-words">{o.address}</span></div>}
                        {o.deliveryZoneName && (
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Typ dopravy</span>
                            <span className="font-medium text-gray-700">
                              {o.deliveryZoneName}
                              {o.deliveryZoneType && o.deliveryZoneType !== "standard" && (
                                <span className="ml-1 text-[9px] font-black text-primary bg-primary/10 px-1 py-0.5 rounded-sm uppercase">{o.deliveryZoneType === "km" ? "€/km" : "€/auto"}</span>
                              )}
                            </span>
                          </div>
                        )}
                        {(o.fillupM3 ?? 0) > 0 && (
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Doťaženie</span><span className="font-medium text-amber-700">+{o.fillupM3} m³ → {o.fillupTarget} m³</span></div>
                        )}
                        <div className="flex gap-2 items-center"><span className="text-gray-400 w-24 shrink-0">Fakturácia</span>
                          <span className={cn("font-black text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm", o.priceMode === "hotovost" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                            {o.priceMode === "hotovost" ? "Hotovosť" : "Faktúra"}
                          </span>
                        </div>
                        {o.note && <div className="flex gap-2 pt-1"><span className="text-gray-400 w-24 shrink-0">Poznámka</span><span className="text-gray-600 italic">{o.note}</span></div>}
                      </div>
                    </div>
                    {/* Kalkulácia */}
                    {(() => {
                      let parsed: { v: number; s: { h: string; rows: { l: string; v: number; o?: number }[] }[] } | null = null;
                      try { if (o.breakdown?.startsWith("{")) parsed = JSON.parse(o.breakdown); } catch { /* legacy */ }
                      return (
                        <div className="border-t border-gray-100 px-4 py-3">
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Kalkulácia</div>
                          {parsed ? (
                            <div className="space-y-2">
                              {parsed.s.map((sec, si) => (
                                <div key={si}>
                                  <div className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 mb-1 rounded-sm",
                                    sec.h.startsWith("Pridaná") || sec.h.startsWith("Produkty") ? "bg-primary/15 text-primary/80" : "bg-gray-100 text-gray-500 ml-2")}>
                                    {sec.h}
                                  </div>
                                  {sec.rows.map((row, ri) => (
                                    <div key={ri} className={cn("flex justify-between items-baseline text-xs gap-4 py-0.5", sec.h.startsWith("Pridaná") || sec.h.startsWith("Produkty") ? "pl-1" : "pl-4")}>
                                      <span className="text-gray-500">{row.l}</span>
                                      <span className="shrink-0 text-right">
                                        {row.o !== undefined && <span className="line-through text-gray-300 text-[10px] mr-1">{fmtEur(row.o)}</span>}
                                        <span className="font-semibold text-gray-700">{fmtEur(row.v)}</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : o.breakdown ? (
                            <div className="space-y-1">
                              {o.breakdown.split("\n").map((line, i) => {
                                const parts = line.split(": ");
                                const label = parts[0];
                                const value = parts.slice(1).join(": ");
                                return (
                                  <div key={i} className="flex justify-between items-baseline text-xs gap-4">
                                    <span className="text-gray-500">{label}</span>
                                    {value && <span className="font-semibold text-gray-700 shrink-0">{value}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                          <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Spolu bez DPH</span>
                            <span className="text-sm font-bold text-secondary">{fmtEur(o.totalBezDph)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">S DPH</span>
                              <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm", o.priceMode === "hotovost" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                                {o.priceMode === "hotovost" ? "Hotovosť" : "Faktúra"}
                              </span>
                            </div>
                            <span className="text-base font-black text-secondary">{fmtEur(o.totalSDph)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function genPassword() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── KLIENTI tab ───────────────────────────────────────────────────────────────
function DiscountInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className={cn("text-xs block mb-1", disabled ? "text-gray-300" : "text-gray-500")}>{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" min="0" max="100" value={value} onChange={e => onChange(e.target.value.replace(/^0+(?=\d)/, "") || "0")}
          onFocus={e => e.target.select()} disabled={disabled}
          className={cn("border px-2 py-1.5 text-sm focus:outline-none w-full text-center", disabled ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed" : "border-gray-200 focus:border-primary")} />
        <span className={cn("text-xs shrink-0", disabled ? "text-gray-300" : "text-gray-400")}>%</span>
      </div>
    </div>
  );
}

function KlientiTab() {
  const [clients, setClients] = useState<Client[]>(adminData.getClients());
  const [zones] = useState(() => adminData.getDelivery());
  const [pZones] = useState(() => adminData.getTransportZones());
  const [ts, setTs] = useState<TransportSettings>(adminData.getTransportSettings());
  const saveTs = (data: TransportSettings) => { setTs(data); adminData.saveTransportSettings(data); };
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<Set<string>>(new Set());
  const [showTableFor, setShowTableFor] = useState<string | null>(null);
  const [inlineTableMode, setInlineTableMode] = useState<"faktura" | "hotovost">("faktura");
  const [tablePdfModal, setTablePdfModal] = useState<Client | null>(null);
  const [tablePdfMode, setTablePdfMode] = useState<"faktura" | "hotovost">("faktura");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [clientDetailTab, setClientDetailTab] = useState<Record<string, "detail" | "calc">>({});
  const emptyForm = {
    firstName: "", lastName: "", company: "", email: "", phone: "",
    loginId: "", password: "1234",
    discountBeton: "20", discountDoprava: "0", discountSluzby: "0", discountCelkovo: "0",
    hotovostDph: "20",
    canHotovost: true, canPridatBeton: true, canZimneOpatrenia: false, active: true,
    deliveryZoneId: zones.find(z => (z.pricingType ?? "standard") === "standard")?.id ?? zones[0]?.id ?? "",
  };
  const [form, setForm] = useState(emptyForm);
  const [showFormPass, setShowFormPass] = useState(false);
  const [sendRegEmail, setSendRegEmail] = useState(true);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [sysDphOpen, setSysDphOpen] = useState(false);

  const save = (data: Client[]) => { setClients(data); adminData.saveClients(data); };
  // Auto-cleanup: clients with both celkovo AND individual discounts → celkovo wins, clear individual
  useEffect(() => {
    const needFix = clients.filter(c =>
      (c.discountCelkovo ?? 0) > 0 &&
      ((c.discountBeton ?? 0) > 0 || (c.discountDoprava ?? 0) > 0 || (c.discountSluzby ?? 0) > 0)
    );
    if (needFix.length > 0) {
      save(clients.map(c =>
        needFix.some(f => f.id === c.id)
          ? { ...c, discountBeton: 0, discountDoprava: 0, discountSluzby: 0 }
          : c
      ));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const remove = (id: string) => { if (id === SYSTEM_OWNER_ID) return; if (confirm("Vymazať klienta?")) save(clients.filter(c => c.id !== id)); };
  const update = (id: string, patch: Partial<Client>) => save(clients.map(c => c.id === id ? { ...c, ...patch } : c));
  const togglePassVis = (id: string) => setShowPass(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const add = async () => {
    if (!form.firstName.trim() && !form.lastName.trim() && !form.company.trim()) return;
    const newId = adminData.generateId();
    const newLoginId = form.loginId.trim();
    if (!newLoginId) { alert("Prihlasovacie ID je povinné."); return; }
    if (!form.password.trim()) { alert("Heslo je povinné."); return; }
    if (newLoginId.toLowerCase() === "msbeton") {
      alert("Login ID 'msbeton' je rezervované pre administrátora. Zvoľ iné ID.");
      return;
    }
    if (newLoginId && clients.some(c => c.loginId?.toLowerCase() === newLoginId.toLowerCase())) {
      alert(`Login ID '${newLoginId}' už existuje. Zvoľ iné ID.`);
      return;
    }
    const clientName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") || form.company.trim();
    save([...clients, {
      id: newId,
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      company: form.company.trim(), email: form.email.trim(), phone: form.phone.trim(),
      loginId: newLoginId, password: form.password.trim(),
      discountBeton:   parseFloat(form.discountBeton)   || 0,
      discountDoprava: parseFloat(form.discountDoprava) || 0,
      discountSluzby:  parseFloat(form.discountSluzby)  || 0,
      discountCelkovo: parseFloat(form.discountCelkovo) || 0,
      hotovostDph: parseFloat(form.hotovostDph) / 100 || 0.20,
      canHotovost: form.canHotovost, canPridatBeton: form.canPridatBeton,
      canZimneOpatrenia: form.canZimneOpatrenia,
      active: form.active,
      deliveryZoneId: form.deliveryZoneId || undefined,
    }]);
    if (sendRegEmail && form.email.trim()) {
      setEmailStatus("sending");
      const res = await fetch("/api/admin/send-registration-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: form.email.trim(), clientName, clientId: newLoginId, password: form.password.trim() }),
      }).then(r => r.json()).catch(() => ({ ok: false }));
      setEmailStatus(res.ok ? "ok" : "error");
      setTimeout(() => setEmailStatus("idle"), 4000);
    }
    setForm(emptyForm); setAdding(false);
  };

  const normK = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const searchTerms = search.trim().split(/\s+/).filter(Boolean);
  const filtered = clients.filter(c => {
    if (!searchTerms.length) return true;
    const haystack = [c.firstName, c.lastName, c.company, c.email, c.phone, c.loginId].filter(Boolean).join(" ");
    return searchTerms.every(t => normK(haystack).includes(normK(t)) || haystack.includes(t));
  });

  return (
    <div className="space-y-4">
      {/* Systémová DPH — collapsible */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setSysDphOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Systémová DPH</h3>
          {sysDphOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {sysDphOpen && <div className="flex flex-wrap gap-px bg-gray-100">
          <div className="bg-white px-3 py-2 flex-1 min-w-0">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">DPH Faktúra</div>
            <div className="flex items-center gap-1 font-bold text-secondary text-sm">
              <EditableField value={Math.round((ts.dph ?? 0.23) * 100)} type="number"
                onSave={v => saveTs({ ...ts, dph: (parseFloat(v) || 23) / 100 })} /> %
            </div>
          </div>
          <div className="bg-white px-3 py-2 flex-1 min-w-0">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">DPH Hotovosť</div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 font-bold text-secondary text-sm">
                <EditableField value={Math.round((ts.defaultHotovostDph ?? 0.20) * 100)} type="number"
                  onSave={v => saveTs({ ...ts, defaultHotovostDph: (parseFloat(v) || 20) / 100 })} /> %
              </div>
              <button
                onClick={() => {
                  const dph = ts.defaultHotovostDph ?? 0.20;
                  const affected = clients.filter(c => c.hotovostDph === undefined || Math.abs((c.hotovostDph ?? 0.20) - 0.20) < 0.001).length;
                  if (!confirm(`Nastaviť ${Math.round(dph * 100)}% DPH hotovosť pre ${affected} klientov bez vlastnej sadzby?`)) return;
                  save(clients.map(c =>
                    (c.hotovostDph === undefined || Math.abs((c.hotovostDph ?? 0.20) - 0.20) < 0.001)
                      ? { ...c, hotovostDph: dph }
                      : c
                  ));
                }}
                className="px-2 py-1 bg-secondary/10 border border-secondary/20 text-secondary font-bold text-[10px] hover:bg-secondary/20 transition-colors uppercase tracking-wide">
                Nastaviť klientom
              </button>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Platí pre klientov bez vlastnej DPH sadzby</div>
          </div>
          <div className="bg-white px-3 py-2 flex-1 min-w-0 border-l border-gray-100">
            {(() => {
              const enabledCount = clients.filter(c => c.canHotovost !== false).length;
              const disabledCount = clients.length - enabledCount;
              return (
                <>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Hotovosť — hromadne</div>
                  <div className="text-[10px] text-gray-500 mb-2">
                    <span className="text-green-600 font-bold">{enabledCount}</span> zapnutá
                    {disabledCount > 0 && <>, <span className="text-red-500 font-bold">{disabledCount}</span> vypnutá</>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {enabledCount > 0 && (
                      <button
                        onClick={() => {
                          if (!confirm(`Vypnúť Hotovosť VŠETKÝM ${enabledCount} klientom?`)) return;
                          save(clients.map(c => ({ ...c, canHotovost: false })));
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 text-red-700 font-bold text-[10px] hover:bg-red-100 transition-colors uppercase tracking-wide">
                        <ShieldOff className="w-3 h-3" /> Vypnúť ({enabledCount})
                      </button>
                    )}
                    {disabledCount > 0 && (
                      <button
                        onClick={() => {
                          if (!confirm(`Zapnúť Hotovosť VŠETKÝM ${disabledCount} klientom?`)) return;
                          save(clients.map(c => ({ ...c, canHotovost: true })));
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 text-green-700 font-bold text-[10px] hover:bg-green-100 transition-colors uppercase tracking-wide">
                        <ShieldCheck className="w-3 h-3" /> Zapnúť ({disabledCount})
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>}
      </div>

      {/* Search */}
      <div className="py-3">
        <input placeholder="Hľadať klienta..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-white text-secondary placeholder:text-gray-400 px-4 py-3 text-base focus:outline-none rounded border border-gray-200 focus:border-primary" />
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white border-2 border-primary shadow-md">
          <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
            <span className="font-black text-secondary text-sm uppercase tracking-widest">Pridať klienta</span>
            <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 space-y-5">
            {/* Osobné info */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Osobné info</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Meno *" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" autoFocus />
                <input placeholder="Priezvisko" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <input placeholder="E-Mail" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <PhoneInput value={form.phone} onChange={v => setForm({ ...form, phone: v })}
                  placeholder="0944 xxx xxx"
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <input placeholder="Spoločnosť" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary sm:col-span-2" />
              </div>
            </div>

            {/* Prístup */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prístup do kalkulačky</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Prihlasovacie ID (napr. 101)" value={form.loginId} onChange={e => setForm({ ...form, loginId: e.target.value })}
                  autoComplete="off" className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <input type={showFormPass ? "text" : "password"} placeholder="Heslo" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      autoComplete="new-password" className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary pr-8" />
                    <button type="button" onClick={() => setShowFormPass(!showFormPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                      {showFormPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, password: genPassword() })} title="Vygenerovať heslo"
                    className="px-2 border border-gray-200 text-gray-400 hover:text-secondary hover:border-secondary transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Zľavy */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Zľavy</p>
              {(() => {
                const fC = parseInt(form.discountCelkovo) || 0;
                const fB = parseInt(form.discountBeton) || 0;
                const fD = parseInt(form.discountDoprava) || 0;
                const fS = parseInt(form.discountSluzby) || 0;
                const hasInd = fB > 0 || fD > 0 || fS > 0;
                const hasCelk = fC > 0;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <DiscountInput label="Zľava/Betón" value={form.discountBeton} disabled={hasCelk}
                      onChange={v => setForm({ ...form, discountBeton: v, discountCelkovo: "0" })} />
                    <DiscountInput label="Zľava/Doprava" value={form.discountDoprava} disabled={hasCelk}
                      onChange={v => setForm({ ...form, discountDoprava: v, discountCelkovo: "0" })} />
                    <DiscountInput label="Zľava/Služby" value={form.discountSluzby} disabled={hasCelk}
                      onChange={v => setForm({ ...form, discountSluzby: v, discountCelkovo: "0" })} />
                    <DiscountInput label="Zľava/Celkovo" value={form.discountCelkovo} disabled={hasInd}
                      onChange={v => setForm({ ...form, discountCelkovo: v, discountBeton: "0", discountDoprava: "0", discountSluzby: "0" })} />
                  </div>
                );
              })()}
            </div>

            {/* Možnosti */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Možnosti</p>
              <div className="border border-gray-200 bg-white divide-y divide-gray-100">
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canHotovost} onChange={e => setForm({ ...form, canHotovost: e.target.checked })} className="accent-secondary w-5 h-5 shrink-0" />
                  <div>
                    <span className="text-sm text-gray-700">Hotovosť</span>
                    {form.canHotovost ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">DPH hotovosť:</span>
                        <input type="number" min="0" max="100" value={form.hotovostDph} onClick={e => e.stopPropagation()}
                          onChange={e => setForm({ ...form, hotovostDph: e.target.value })}
                          className="border border-gray-200 px-2 py-0.5 text-xs focus:outline-none focus:border-primary w-16 text-center" />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-gray-400">Iba faktúra · DPH <span className="font-bold text-gray-500">23 %</span></div>
                    )}
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canPridatBeton} onChange={e => setForm({ ...form, canPridatBeton: e.target.checked })} className="accent-secondary w-5 h-5 shrink-0" />
                  <span className="text-sm text-gray-700">Pridať položku (betón)</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canZimneOpatrenia} onChange={e => setForm({ ...form, canZimneOpatrenia: e.target.checked })} className="accent-blue-600 w-5 h-5 shrink-0" />
                  <span className="text-sm text-gray-700">Zimné opatrenia (auto-ON v zime)</span>
                </label>
                <div className="px-3 py-3">
                  <div className="text-xs text-gray-400 mb-1.5">Typ dopravy</div>
                  <div className="flex gap-1">
                    {zones.map(z => (
                      <button key={z.id} type="button"
                        onClick={() => setForm({ ...form, deliveryZoneId: z.id })}
                        className={`flex-1 py-2 px-1 text-xs font-semibold border rounded transition-colors ${
                          form.deliveryZoneId === z.id
                            ? "bg-secondary text-white border-secondary"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                        }`}>
                        {z.name}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="accent-green-600 w-5 h-5 shrink-0" />
                  <span className="text-sm text-gray-700">Prístup aktívny</span>
                </label>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={sendRegEmail} onChange={e => setSendRegEmail(e.target.checked)} className="accent-secondary w-4 h-4" />
              <span className="text-sm text-gray-600">Poslať registračný email klientovi</span>
              {!form.email.trim() && sendRegEmail && (
                <span className="text-xs text-orange-500">(vyžaduje email)</span>
              )}
            </label>
            {emailStatus === "ok" && <p className="text-xs text-green-600">✓ Email odoslaný</p>}
            {emailStatus === "error" && <p className="text-xs text-red-500">✗ Email sa neodoslal (SMTP nie je nakonfigurované)</p>}
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-bold uppercase tracking-wide">Zrušiť</button>
              <button onClick={add} disabled={emailStatus === "sending"} className="px-6 py-2 bg-primary text-secondary font-bold text-sm uppercase tracking-wide hover:bg-primary/90 disabled:opacity-60">
                {emailStatus === "sending" ? "Ukladám…" : "Pridať"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-secondary text-white text-xs font-black uppercase tracking-widest">
        <div className="w-9 shrink-0 flex items-center justify-center">
          <span className="text-primary/70 font-bold text-[11px] normal-case tracking-normal">{filtered.length}</span>
        </div>
        <div className="flex-1 min-w-0">Klient</div>
        <div className="hidden sm:flex w-80 shrink-0">
          {["Betón", "Doprava", "Služby", "Celkovo"].map(l => (
            <div key={l} className="w-20 text-center text-primary">{l}</div>
          ))}
        </div>
        <div className="flex items-center justify-end sm:w-64 shrink-0">
          <button onClick={() => { setAdding(true); setExpanded(null); }} title="Pridať klienta"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-secondary font-black text-[10px] hover:bg-primary/90 shrink-0 uppercase tracking-wide">
            <UserPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Client cards */}
      <div className="space-y-px">
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Žiadni klienti.</p>}
        {filtered.map(c => {
          const isExpanded = expanded === c.id;
          const hasLogin = !!(c.loginId && c.password);
          const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
          const maxDisc = Math.max(c.discountBeton ?? 0, c.discountDoprava ?? 0, c.discountSluzby ?? 0, c.discountCelkovo ?? 0);
          const clientZone = c.deliveryZoneId ? zones.find(z => z.id === c.deliveryZoneId) : zones[0];
          const zonePricingType = clientZone?.pricingType ?? "standard";
          return (
            <div key={c.id} className={cn("border shadow-sm overflow-hidden", c.isOwner ? "bg-amber-50 border-primary/40" : "bg-white border-gray-200")}>
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                {/* Avatar + active dot */}
                <div className="relative shrink-0">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", c.isOwner ? "bg-primary/20" : "bg-secondary/10")}>
                    {c.isOwner
                      ? <Crown className="w-4 h-4 text-primary" />
                      : <span className="text-secondary font-black text-sm">{(c.firstName || c.company || "?").charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  {hasLogin && (
                    <span className={`sm:hidden absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${c.active ? "bg-green-500" : "bg-gray-300"}`}
                      title={c.active ? "Aktívny" : "Neaktívny"} />
                  )}
                </div>

                {/* Meno + mobile badges */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-secondary text-sm truncate">{fullName}</div>
                  {c.company && <div className="text-xs text-gray-400 truncate">{c.company}</div>}
                  {/* Mobile-only badges — vždy vlastný riadok */}
                  <div className="sm:hidden flex items-center gap-1 mt-0.5 flex-wrap">
                    {(() => {
                      const discPairs = [
                        { key: "B", val: c.discountBeton ?? 0 },
                        { key: "D", val: c.discountDoprava ?? 0 },
                        { key: "S", val: c.discountSluzby ?? 0 },
                        { key: "C", val: c.discountCelkovo ?? 0 },
                      ].filter(d => d.val > 0);
                      if (discPairs.length === 0) return null;
                      return <span className="text-[10px] font-bold text-primary">
                        {discPairs.map(d => `${d.key}:−${d.val}%`).join(" ")}
                      </span>;
                    })()}
                    {clientZone && (
                      <span className="flex items-center gap-0.5 px-1 py-0 text-[10px] font-bold rounded bg-blue-50 text-blue-600 border border-blue-100">
                        <Truck className="w-2.5 h-2.5" />
                        {zonePricingType === "km" ? "€/km" : zonePricingType === "auto" ? "€/auto" : "Štd"}
                      </span>
                    )}
                    {c.isOwner && <span className="text-[10px] font-black text-primary/70">Admin</span>}
                  </div>
                </div>

                {/* Desktop: zľavy stĺpce */}
                <div className="hidden sm:flex w-80 shrink-0 items-center">
                  {[c.discountBeton ?? 0, c.discountDoprava ?? 0, c.discountSluzby ?? 0, c.discountCelkovo ?? 0].map((val, i) => (
                    <div key={i} className="w-20 text-center">
                      <span className={`text-sm font-bold ${val > 0 ? "text-primary" : "text-gray-300"}`}>{val}%</span>
                    </div>
                  ))}
                </div>

                {/* Desktop: action badges + buttons | Mobile: only chevron + action buttons */}
                <div className="flex items-center gap-1 shrink-0 sm:w-64 sm:justify-end">
                  {/* Desktop-only badges */}
                  <div className="hidden sm:flex items-center gap-1">
                    {clientZone && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-blue-50 text-blue-600 border border-blue-200">
                        <Truck className="w-3 h-3" />
                        {zonePricingType === "km" ? "€/km" : zonePricingType === "auto" ? "€/auto" : "Štd"}
                      </span>
                    )}

                    {hasLogin ? (
                      <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.active ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                        {c.active ? "Aktívny" : "Neaktívny"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm bg-gray-100 text-gray-400">
                        <LogIn className="w-3 h-3" /> Bez prístupu
                      </span>
                    )}
                  </div>
                  {/* Always: chevron + calc (mobile) + table + delete */}
                  <span className="p-1 text-gray-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(c.id); setClientDetailTab(prev => ({ ...prev, [c.id]: "calc" })); }}
                    title="Kalkulačka klienta"
                    className="p-1 text-gray-300 hover:text-primary transition-colors">
                    <Calculator className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setTablePdfModal(c); setTablePdfMode("faktura"); }}
                    title="Zľavové tabuľky"
                    className="p-1 text-gray-300 hover:text-secondary transition-colors">
                    <Table2 className="w-4 h-4" />
                  </button>
                  {c.id !== SYSTEM_OWNER_ID && (
                    <button onClick={(e) => { e.stopPropagation(); remove(c.id); }} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/60">

                  {/* Tab bar: Detail | Kalkulačka */}
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={() => setClientDetailTab(prev => ({ ...prev, [c.id]: "detail" }))}
                      className={cn("flex-1 py-2.5 text-xs font-black uppercase tracking-wide transition-all", (clientDetailTab[c.id] ?? "detail") === "detail" ? "bg-secondary text-white" : "bg-white text-gray-400 hover:text-secondary hover:bg-secondary/5")}
                    >Detail</button>
                    <button
                      onClick={() => setClientDetailTab(prev => ({ ...prev, [c.id]: "calc" }))}
                      className={cn("flex-1 py-2.5 text-xs font-black uppercase tracking-wide transition-all", clientDetailTab[c.id] === "calc" ? "bg-secondary text-white" : "bg-white text-gray-400 hover:text-secondary hover:bg-secondary/5")}
                    >Kalkulačka</button>
                  </div>

                  {(clientDetailTab[c.id] ?? "detail") === "detail" && (<>

                  {/* Zľavy – prominentný pás hore */}
                  <div className="px-4 py-3 bg-white border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Zľavy klienta</p>
                    {(() => {
                      const celkovo = (c.discountCelkovo as number) ?? 0;
                      const hasInd = ((c.discountBeton ?? 0) as number) > 0 || ((c.discountDoprava ?? 0) as number) > 0 || ((c.discountSluzby ?? 0) as number) > 0;
                      return (
                        <>
                        <div className="grid grid-cols-4 gap-2">
                          {([
                            { label: "Betón",   field: "discountBeton" as keyof Client },
                            { label: "Doprava", field: "discountDoprava" as keyof Client },
                            { label: "Služby",  field: "discountSluzby" as keyof Client },
                            { label: "Celkovo", field: "discountCelkovo" as keyof Client },
                          ]).map(({ label, field }) => {
                            const val = (c[field] as number) ?? 0;
                            const isCelkovo = field === "discountCelkovo";
                            const blocked = isCelkovo ? hasInd : celkovo > 0;
                            const active = val > 0;
                            return (
                              <div key={field} className={cn(
                                "border px-2 py-2 text-center",
                                blocked ? "bg-gray-50 border-gray-100 opacity-40" : active ? "bg-primary/10 border-primary/40" : "bg-gray-50 border-gray-200"
                              )}>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">{label}</div>
                                {blocked ? (
                                  <div className="text-[10px] text-gray-400 font-bold py-1.5">{isCelkovo ? "— ind." : "= Celkovo"}</div>
                                ) : (
                                <div className="flex items-center justify-center gap-0.5">
                                  <input
                                    type="number" min="0" max="100"
                                    value={String(val)}
                                    onChange={e => {
                                      const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                      if (isCelkovo) update(c.id, { discountCelkovo: v, discountBeton: 0, discountDoprava: 0, discountSluzby: 0 });
                                      else update(c.id, { [field]: v, discountCelkovo: 0 });
                                    }}
                                    onFocus={e => e.target.select()}
                                    className={cn(
                                      "border-0 px-0.5 py-0 text-xl font-black focus:outline-none w-16 text-center bg-transparent leading-none",
                                      active ? "text-primary" : "text-gray-300"
                                    )}
                                  />
                                  <span className={cn("text-sm font-bold leading-none", active ? "text-primary/70" : "text-gray-300")}>%</span>
                                </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          {celkovo > 0 ? `Celková zľava ${celkovo}% — platí na betón, dopravu aj služby.` : hasInd ? "Individuálne zľavy — Celkovo nie je možné nastaviť súčasne." : "Nastav buď Celkovo alebo jednotlivé zľavy."}
                        </p>
                        </>
                      );
                    })()}
                  </div>

                  {/* Hlavná mriežka: Osobné info | Prístup + Možnosti */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    {/* Ľavý stĺpec: Osobné info */}
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Osobné info</p>
                      <div className="space-y-1.5 text-sm">
                        {([
                          { label: "Meno", field: "firstName" },
                          { label: "Priezvisko", field: "lastName" },
                          { label: "Spoločnosť", field: "company" },
                          { label: "E-mail", field: "email" },
                          { label: "Telefón", field: "phone" },
                        ] as { label: string; field: keyof Client }[]).map(({ label, field }) => (
                          <div key={field} className="flex gap-2 items-start">
                            <span className="text-gray-400 text-xs w-20 shrink-0 pt-0.5">{label}</span>
                            <EditableField value={field === "phone" ? formatPhone((c[field] as string) || "") || "—" : (c[field] as string) || "—"} type={field === "phone" ? "tel" : "text"} onSave={v => update(c.id, { [field]: field === "phone" ? formatPhone(v) : v })} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pravý stĺpec: Prístup + Možnosti */}
                    <div className="px-4 py-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Prístup do kalkulačky</p>
                        <div className="border border-gray-200 bg-white divide-y divide-gray-100 mb-2">
                          <div className="flex items-center gap-2 px-3 py-2">
                            <span className="text-gray-400 text-xs w-14 shrink-0">Login ID</span>
                            <EditableField value={c.loginId || "—"} onSave={v => {
                              if (v.toLowerCase() === "msbeton") { alert("Login ID 'msbeton' je rezervované."); return; }
                              if (clients.some(other => other.id !== c.id && other.loginId?.toLowerCase() === v.toLowerCase())) { alert(`Login ID '${v}' už existuje.`); return; }
                              update(c.id, { loginId: v });
                            }} />
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <span className="text-gray-400 text-xs w-14 shrink-0">Heslo</span>
                            <span className="font-mono text-secondary text-sm flex-1">
                              {showPass.has(c.id) ? (c.password || "—") : (c.password ? "••••••" : "—")}
                            </span>
                            <button onClick={() => togglePassVis(c.id)} className="text-gray-400 hover:text-secondary shrink-0">
                              {showPass.has(c.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => update(c.id, { password: genPassword() })} title="Vygenerovať nové heslo" className="text-gray-400 hover:text-secondary shrink-0">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <button onClick={() => update(c.id, { active: !c.active })}
                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold uppercase border transition-colors ${c.active ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                          {c.active ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          {c.active ? "Prístup aktívny" : "Prístup neaktívny"}
                        </button>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Možnosti</p>
                        <div className="border border-gray-200 bg-white divide-y divide-gray-100">
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.canHotovost ?? true} onChange={e => update(c.id, { canHotovost: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-700">Hotovosť</span>
                              {(c.canHotovost ?? true) ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs text-gray-400">DPH:</span>
                                  <input type="number" min="0" max="100" value={Math.round((c.hotovostDph ?? 0.20) * 100)}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => update(c.id, { hotovostDph: (parseFloat(e.target.value) || 20) / 100 })}
                                    className="border border-gray-200 px-2 py-0.5 text-xs focus:outline-none focus:border-primary w-12 text-center" />
                                  <span className="text-xs text-gray-400">%</span>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Iba faktúra · DPH <span className="font-bold text-gray-500">23 %</span></div>
                              )}
                            </div>
                          </label>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.canPridatBeton ?? true} onChange={e => update(c.id, { canPridatBeton: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                            <span className="text-sm text-gray-700">Pridať položku (betón)</span>
                          </label>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.canZimneOpatrenia ?? false} onChange={e => update(c.id, { canZimneOpatrenia: e.target.checked })} className="accent-blue-600 w-4 h-4 shrink-0" />
                            <span className="text-sm text-gray-700">Zimné opatrenia</span>
                          </label>
                          <div className="px-3 py-2.5">
                            <div className="text-xs text-gray-400 mb-1">Typ dopravy</div>
                            <div className="flex gap-1">
                              {adminData.getDelivery().map(z => (
                                <button key={z.id} type="button"
                                  onClick={() => update(c.id, { deliveryZoneId: z.id })}
                                  className={`flex-1 py-1.5 px-1 text-xs font-semibold border rounded transition-colors ${
                                    (c.deliveryZoneId ?? adminData.getDelivery()[0]?.id) === z.id
                                      ? "bg-secondary text-white border-secondary"
                                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                                  }`}>
                                  {z.name}
                                </button>
                              ))}
                            </div>
                            {clientZone && (
                              <div className="mt-1 text-[11px] text-blue-600 font-medium">
                                {zonePricingType === "km" && `Sadzba: ${clientZone.ratePerKm?.toFixed(2)} €/km`}
                                {zonePricingType === "auto" && `Paušál: ${clientZone.ratePerTruck?.toFixed(2)} €/auto`}
                                {zonePricingType === "standard" && pZones.length > 0 && `Pásma: ${pZones[0].ratePerM3.toFixed(2)} – ${pZones[pZones.length - 1].ratePerM3.toFixed(2)} €/m³`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Zľavové tabuľky */}
                  <div className="border-t border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setShowTableFor(showTableFor === c.id ? null : c.id)}
                        title={showTableFor === c.id ? "Skryť zľavové tabuľky" : "Zobraziť zľavové tabuľky"}
                        className={cn("flex items-center gap-1 p-1.5 rounded transition-colors border shrink-0", showTableFor === c.id ? "bg-secondary text-primary border-secondary" : "text-gray-400 hover:text-secondary border-gray-200 hover:border-secondary")}
                      >
                        <Table2 className="w-4 h-4" />
                        {showTableFor === c.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {showTableFor === c.id && (
                        <>
                          <PriceModeToggle mode={inlineTableMode} onChange={setInlineTableMode} showHotovost={c.canHotovost ?? true} size="sm" />
                          <button onClick={() => exportClientPricePDF(c, inlineTableMode, ts)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-secondary font-black text-xs hover:bg-primary/90 transition-colors cursor-pointer rounded-sm shrink-0">
                            <FileText className="w-3.5 h-3.5" /> PDF
                          </button>
                        </>
                      )}
                    </div>
                    {showTableFor === c.id && (
                      <ClientPriceTable
                        discountBeton={c.discountBeton ?? 0}
                        discountDoprava={c.discountDoprava ?? 0}
                        discountSluzby={c.discountSluzby ?? 0}
                        discountCelkovo={c.discountCelkovo ?? 0}
                        manualPrices={c.manualPrices}
                        onManualPriceChange={(itemId, price) => {
                          const current = c.manualPrices ?? {};
                          let next: Record<string, number>;
                          if (price === null) {
                            const { [itemId]: _removed, ...rest } = current;
                            next = rest;
                          } else {
                            next = { ...current, [itemId]: price };
                          }
                          update(c.id, { manualPrices: next });
                        }}
                        priceMode={inlineTableMode}
                        hotovostDph={c.hotovostDph ?? (ts.defaultHotovostDph ?? 0.20)}
                        variant="light"
                      />
                    )}
                  </div>

                  </>)}

                  {clientDetailTab[c.id] === "calc" && (
                    <div className="bg-[#1e2a3a]">
                      <ConcreteCalculator clientOverride={{
                        id: c.id,
                        clientId: c.loginId ?? "",
                        name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || c.id,
                        company: c.company ?? "",
                        phone: c.phone ?? "",
                        discountBeton: c.discountBeton ?? 0,
                        discountDoprava: c.discountDoprava ?? 0,
                        discountSluzby: c.discountSluzby ?? 0,
                        discountCelkovo: c.discountCelkovo ?? 0,
                        canHotovost: c.canHotovost ?? true,
                        canPridatBeton: c.canPridatBeton ?? true,
                        canZimneOpatrenia: c.canZimneOpatrenia ?? false,
                        hotovostDph: c.hotovostDph,
                        deliveryZoneId: c.deliveryZoneId,
                        manualPrices: c.manualPrices,
                      }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Popup: Zľavové tabuľky klienta ── */}
      {tablePdfModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-auto"
          onClick={() => setTablePdfModal(null)}>
          <div className="bg-gray-50 w-full max-w-3xl my-4 shadow-2xl rounded-sm"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bg-secondary text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="font-black text-base uppercase tracking-widest">Zľavové tabuľky klienta</div>
                <div className="text-sm text-white/60 mt-0.5">
                  {[tablePdfModal.firstName, tablePdfModal.lastName].filter(Boolean).join(" ")}
                  {tablePdfModal.company && ` · ${tablePdfModal.company}`}
                  {tablePdfModal.email && ` · ${tablePdfModal.email}`}
                </div>
              </div>
              <button onClick={() => setTablePdfModal(null)} className="text-white/60 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FAKTÚRA / HOTOVOSŤ tabs */}
            <div className="px-4 py-3 bg-[#1a2535] border-b border-white/10">
              <PriceModeToggle mode={tablePdfMode} onChange={setTablePdfMode} showHotovost={tablePdfModal?.canHotovost ?? true} size="lg" className="w-full" />
            </div>

            {/* Price table */}
            <div className="overflow-y-auto p-4" style={{ maxHeight: "60vh" }}>
              <ClientPriceTable
                discountBeton={tablePdfModal.discountBeton ?? 0}
                discountDoprava={tablePdfModal.discountDoprava ?? 0}
                discountSluzby={tablePdfModal.discountSluzby ?? 0}
                discountCelkovo={tablePdfModal.discountCelkovo ?? 0}
                manualPrices={tablePdfModal.manualPrices}
                onManualPriceChange={(itemId, price) => {
                  const current = tablePdfModal.manualPrices ?? {};
                  let next: Record<string, number>;
                  if (price === null) {
                    const { [itemId]: _removed, ...rest } = current;
                    next = rest;
                  } else {
                    next = { ...current, [itemId]: price };
                  }
                  update(tablePdfModal.id, { manualPrices: next });
                  setTablePdfModal({ ...tablePdfModal, manualPrices: next });
                }}
                priceMode={tablePdfMode}
                hotovostDph={tablePdfModal.hotovostDph ?? (ts.defaultHotovostDph ?? 0.20)}
                variant="light"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-white">
              <button onClick={() => setTablePdfModal(null)}
                className="px-4 py-2 border border-secondary text-secondary font-bold text-sm hover:bg-secondary hover:text-white transition-colors cursor-pointer">
                ZRUŠIŤ
              </button>
              <button onClick={() => exportClientPricePDF(tablePdfModal, tablePdfMode, ts)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90 transition-colors cursor-pointer">
                <FileText className="w-4 h-4" /> EXPORTOVAŤ PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function exportClientPricePDF(client: Client, priceMode: "faktura" | "hotovost", tsettings: TransportSettings) {
  const categories = adminData.getCategories();
  const services = adminData.getServices().filter(s => s.active);
  const zones = adminData.getTransportZones();

  const effectiveBeton   = (client.discountBeton   ?? 0) > 0 ? (client.discountBeton   ?? 0) : (client.discountCelkovo ?? 0);
  const effectiveDoprava = (client.discountDoprava ?? 0) > 0 ? (client.discountDoprava ?? 0) : (client.discountCelkovo ?? 0);
  const effectiveSluzby  = (client.discountSluzby  ?? 0) > 0 ? (client.discountSluzby  ?? 0) : (client.discountCelkovo ?? 0);
  const betonFactor   = 1 - effectiveBeton   / 100;
  const dopravaFactor = 1 - effectiveDoprava / 100;
  const sluzbyFactor  = 1 - effectiveSluzby  / 100;
  const hotovostMult = priceMode === "hotovost" ? 1 + (client.hotovostDph ?? tsettings.defaultHotovostDph ?? 0.20) : 1;
  const mp = client.manualPrices ?? {};
  const hasDiscount = effectiveBeton > 0 || effectiveDoprava > 0 || effectiveSluzby > 0 || Object.keys(mp).length > 0;
  const today = new Date().toLocaleDateString("sk-SK");
  const clientName = [client.firstName, client.lastName].filter(Boolean).join(" ");

  const fmtP = (n: number) => n.toFixed(2) + " €";
  const thS = `padding:5px 8px;font-size:8pt;text-align:left`;
  const thRS = `padding:5px 8px;font-size:8pt;text-align:right`;
  const tdS = `padding:4px 8px;font-size:8.5pt;border-bottom:1px solid #eee`;
  const tdRS = `padding:4px 8px;font-size:8.5pt;border-bottom:1px solid #eee;text-align:right`;
  const discS = `padding:4px 8px;font-size:8.5pt;border-bottom:1px solid #eee;text-align:right;color:#1a7c2e;font-weight:bold;background:#f0fff0`;

  const buildTable = (headers: string[], rows: Array<[string, string, string, string?]>, bg?: string) => {
    const head = headers.map((h, i) => `<th style="background:${bg ?? "#001D3D"};color:#fff;${i < 2 ? thS : thRS}">${h}</th>`).join("");
    const body = rows.map((row, ri) => {
      const rowBg = ri % 2 === 1 ? "background:#f9f9f9;" : "";
      const cols = [
        `<td style="${tdS}${rowBg}">${row[0]}</td>`,
        `<td style="${tdRS}${rowBg}">${row[1]}</td>`,
        `<td style="${tdRS}${rowBg}">${row[2]}</td>`,
        row[3] !== undefined ? `<td style="${discS}${rowBg}">${row[3]}</td>` : (hasDiscount ? `<td style="${tdRS}${rowBg}"></td>` : ""),
      ];
      return `<tr>${cols.join("")}</tr>`;
    }).join("");
    return `<table style="border-collapse:collapse;width:100%;margin-bottom:14px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  };

  const discHdr = hasDiscount ? ["Názov", "Množstvo", "Pôvodná cena", "Zľavnená cena"] : ["Názov", "Množstvo", "Cena"];

  // Betóny
  const betonHtml = categories.map(cat => {
    const rows: Array<[string, string, string, string?]> = cat.types
      .filter(t => t.price > 0 && t.label.trim())
      .map(t => {
        const orig = t.price * hotovostMult;
        const manual = mp[t.id] !== undefined ? mp[t.id] * hotovostMult : undefined;
        const disc = manual !== undefined ? manual : orig * betonFactor;
        const hasItemDisc = Math.abs(orig - disc) > 0.001;
        return hasDiscount
          ? [t.label, "1 m³", fmtP(orig), hasItemDisc ? fmtP(disc) : undefined] as [string, string, string, string?]
          : [t.label, "1 m³", fmtP(orig)] as [string, string, string];
      });
    return `<h3 style="font-size:9.5pt;color:#001D3D;margin:14px 0 3px;border-bottom:2px solid #EDC531;padding-bottom:3px">${cat.name}</h3>
      ${buildTable(discHdr, rows)}`;
  }).join("");

  // Služby
  const sluzbyRows: Array<[string, string, string, string?]> = services.map(s => {
    const disc = s.price * sluzbyFactor;
    const hasItemDisc = Math.abs(s.price - disc) > 0.001;
    return hasDiscount
      ? [s.name, s.unit || "—", fmtP(s.price), hasItemDisc ? fmtP(disc) : undefined] as [string, string, string, string?]
      : [s.name, s.unit || "—", fmtP(s.price)] as [string, string, string];
  });

  // Doprava
  const minFee = tsettings.minimumFee ?? 62.50;
  const minFeeDisc = minFee * dopravaFactor;
  const dopravaRows: Array<[string, string, string, string?]> = [];
  dopravaRows.push(hasDiscount
    ? ["Min. doprava / auto", "1×", fmtP(minFee), Math.abs(minFee - minFeeDisc) > 0.001 ? fmtP(minFeeDisc) : undefined]
    : ["Min. doprava / auto", "1×", fmtP(minFee)]);
  zones.forEach(z => {
    const disc = z.ratePerM3 * dopravaFactor;
    const hasItemDisc = Math.abs(z.ratePerM3 - disc) > 0.001;
    dopravaRows.push(hasDiscount
      ? [`Od ${z.fromKm} – ${z.toKm} km`, "1 m³×", fmtP(z.ratePerM3), hasItemDisc ? fmtP(disc) : undefined]
      : [`Od ${z.fromKm} – ${z.toKm} km`, "1 m³×", fmtP(z.ratePerM3)]);
  });
  const dopravaHdr = hasDiscount ? ["Vzdialenosť", "Množstvo", "Pôvodná cena", "Zľavnená cena"] : ["Vzdialenosť", "Množstvo", "Cena"];

  const discInfo = hasDiscount
    ? `<div style="color:#c9a800;font-size:8pt;margin-top:3px">Zľavy: Betón ${effectiveBeton}% | Doprava ${effectiveDoprava}% | Služby ${effectiveSluzby}%</div>`
    : "";

  const html = `<!DOCTYPE html><html lang="sk"><head>
<meta charset="utf-8">
<title>Zľavové tabuľky – ${clientName || "klient"}</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #222; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:5mm;border-bottom:2px solid #EDC531;margin-bottom:5mm">
  <div>
    <div style="font-size:14pt;font-weight:bold;color:#001D3D">MS-BETON, spol. s r.o.</div>
    <div style="font-size:8pt;color:#555;margin-top:2px">Turie 468, 013 12 Turie &nbsp;|&nbsp; +421 909 205 205 &nbsp;|&nbsp; info@msbeton.sk</div>
    <div style="font-size:7.5pt;color:#777;margin-top:1px">IČO: 55747591 &nbsp;|&nbsp; DIČ: 2122074603 &nbsp;|&nbsp; IČ DPH: SK2122074603</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:13pt;font-weight:bold;color:#EDC531;letter-spacing:0.5px">ZĽAVOVÉ TABUĽKY</div>
    <div style="font-size:8pt;color:#777;margin-top:2px">${priceMode === "hotovost" ? "Hotovosť (s DPH na betón)" : "Faktúra (bez DPH)"}</div>
    <div style="font-size:8pt;color:#999;margin-top:1px">Dátum: ${today}</div>
  </div>
</div>

<div style="border:1px solid #ddd;padding:6px 10px;margin-bottom:5mm;font-size:8.5pt">
  <strong style="color:#001D3D">${clientName}${client.company ? ` – ${client.company}` : ""}</strong>
  ${client.email ? `<br>Email: ${client.email}` : ""}${client.phone ? ` &nbsp;|&nbsp; Tel: ${formatPhone(client.phone)}` : ""}
  ${discInfo}
</div>

<h2 style="font-size:10pt;color:#EDC531;background:#001D3D;padding:4px 8px;margin-bottom:0">Betóny</h2>
${betonHtml}

<h2 style="font-size:10pt;color:#EDC531;background:#001D3D;padding:4px 8px;margin-bottom:8px;margin-top:12px">Služby</h2>
${buildTable(discHdr, sluzbyRows)}

<h2 style="font-size:10pt;color:#EDC531;background:#001D3D;padding:4px 8px;margin-bottom:8px;margin-top:12px">Doprava</h2>
${buildTable(dopravaHdr, dopravaRows)}

<div style="margin-top:10mm;padding-top:4mm;border-top:1px solid #eee;font-size:7.5pt;color:#999">
  Vypracovala spoločnosť: MS-BETON, spol. s r.o. &nbsp;|&nbsp; IČO: 55747591 &nbsp;|&nbsp; IČ DPH: SK2122074603<br>
  Turie 468, 013 12 Turie &nbsp;|&nbsp; +421 909 205 205 &nbsp;|&nbsp; info@msbeton.sk &nbsp;|&nbsp; msbeton.sk
</div>

<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  if (!win) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click(); }
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>(() => {
    const hash = window.location.hash.slice(1) as Tab;
    const valid: Tab[] = ["betony", "sluzby", "doprava", "klienti", "objednavky"];
    return valid.includes(hash) ? hash : "klienti";
  });
  const [syncKey, setSyncKey] = useState(0);

  useEffect(() => {
    if (!isLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  useEffect(() => {
    syncFromServer().then(() => setSyncKey(k => k + 1));
  }, []);

  useEffect(() => {
    const handler = () => setSyncKey(k => k + 1);
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);

  const handleLogout = () => { logout(); navigate("/admin/login"); };

  const tabs: { id: Tab; label: string; short: string; icon: React.ReactNode }[] = [
    { id: "klienti",    label: "KLIENTI",    short: "KLIENTI",  icon: <Users className="w-5 h-5" /> },
    { id: "objednavky", label: "OBJEDNÁVKY", short: "OBJED.",   icon: <ClipboardList className="w-5 h-5" /> },
    { id: "doprava",    label: "DOPRAVA",    short: "DOPRAVA",  icon: <Truck className="w-5 h-5" /> },
    { id: "sluzby",     label: "SLUŽBY",     short: "SLUŽBY",   icon: <Wrench className="w-5 h-5" /> },
    { id: "betony",     label: "BETÓNY",     short: "BETÓNY",   icon: <Layers className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen concrete-light overflow-x-hidden" style={{ fontFamily: "Montserrat, sans-serif" }}>
      {/* Top nav */}
      <header className="bg-secondary shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <a href="/" className="flex items-center gap-0.5 select-none">
            <span className="font-black text-2xl tracking-tighter text-primary">MS</span>
            <span className="font-black text-2xl tracking-tighter text-primary/40">-</span>
            <span className="font-black text-2xl tracking-tighter text-white">BETON</span>
            <span className="ml-3 text-white/30 text-xs font-semibold uppercase tracking-widest hidden sm:block">Admin</span>
            <VersionBadge className="ml-1 text-white/30 hidden sm:block" />
          </a>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Odhlásiť</span>
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-stretch h-16">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); window.location.hash = t.id; }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                tab === t.id ? "text-primary" : "text-gray-400 hover:text-gray-600"
              }`}>
              <span className={`transition-transform duration-150 ${tab === t.id ? "scale-110" : ""}`}>{t.icon}</span>
              <span className={`text-[8px] font-black uppercase tracking-wide leading-none transition-all duration-150 ${tab === t.id ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>
                {t.short}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 sm:pb-8">
        {/* Tab bar — desktop only */}
        <div className="hidden sm:flex gap-1 mb-6 bg-white border border-gray-200 p-1 shadow-sm">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); window.location.hash = t.id; }}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-black uppercase tracking-widest transition-all shrink-0 ${
                tab === t.id
                  ? "bg-secondary text-white"
                  : "text-gray-500 hover:text-secondary hover:bg-gray-50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel heading */}
        <div className="mb-5">
          <h1 className="text-2xl font-black text-secondary uppercase tracking-wide">
            {tabs.find(t => t.id === tab)?.label}
          </h1>
          <div className="h-1 w-16 bg-primary mt-1" />
        </div>

        {/* Tab content */}
        <div>
          {tab === "betony" && <BetonTab key={syncKey} />}
          {tab === "sluzby" && <SluzbyTab key={syncKey} />}
          {tab === "doprava" && <DopravaTab key={syncKey} />}
          {tab === "klienti" && <KlientiTab key={syncKey} />}
          {tab === "objednavky" && <ObjednavkyTab key={syncKey} />}
        </div>
      </div>
    </div>
  );
}
