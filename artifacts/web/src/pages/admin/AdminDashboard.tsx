import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { LogOut, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Users, Truck, Wrench, Layers, Eye, EyeOff, RefreshCw, LogIn, ShieldCheck, ShieldOff, Table2, ClipboardList } from "lucide-react";
import { ClientPriceTable } from "@/components/ClientPriceTable";
import { isLoggedIn, logout } from "@/lib/adminAuth";
import { adminData, syncFromServer, ConcreteCategory, ConcreteType, DeliveryZone, Service, Client, TransportPricingZone, TransportSettings, Order } from "@/lib/adminData";

type Tab = "betony" | "sluzby" | "doprava" | "klienti" | "objednavky";

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditableField({ value, onSave, type = "text" }: { value: string | number; onSave: (v: string) => void; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  const save = () => { onSave(val); setEditing(false); };
  if (!editing) return (
    <span className="cursor-pointer hover:text-primary transition-colors group flex items-center gap-1" onClick={() => setEditing(true)}>
      {value}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </span>
  );
  return (
    <span className="flex items-center gap-1">
      <input type={type} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="bg-white border border-primary px-2 py-0.5 text-secondary text-sm w-32 focus:outline-none" autoFocus />
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
              <EditableField value={cat.name} onSave={v => updateCatName(cat.id, v)} />
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
                      <td className="py-2">
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
  { key: "standard", label: "Štandard",    desc: "sadzba €/km × objem",         rateLabel: "Sadzba za km",     rateUnit: "€/km" },
  { key: "km",       label: "Kilometre",   desc: "sadzba €/km × m³ × vzdialenosť", rateLabel: "Sadzba €/km × m³", rateUnit: "€/km×m³" },
  { key: "auto",     label: "Počet áut",   desc: "paušál za každé vozidlo",     rateLabel: "Paušál / vozidlo", rateUnit: "€/vozidlo" },
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
      {/* ── Nastavenia cenníka dopravy ── */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Nastavenia cenníka dopravy</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-100 m-4 rounded overflow-hidden">
          {[
            { label: "Min. cena / auto (€)", field: "minimumFee" as keyof TransportSettings },
            { label: "Zimný príplatok (€/m³)", field: "winterSurcharge" as keyof TransportSettings },
            { label: "Čakačka (€/15 min)", field: "waitingRatePer15min" as keyof TransportSettings },
            { label: "Min. objednávka (m³)", field: "minimumLoadM3" as keyof TransportSettings },
          ].map(({ label, field }) => (
            <div key={field} className="bg-gray-50 px-3 py-2.5">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="font-bold text-secondary text-sm">
                <EditableField value={ts[field] as number} type="number" onSave={v => saveTs({ ...ts, [field]: parseFloat(v) || 0 })} />
              </div>
            </div>
          ))}
          <div className="bg-primary/5 px-3 py-2.5">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">DPH Faktúra (%)</div>
            <div className="font-bold text-secondary text-sm flex items-center gap-1">
              <EditableField value={Math.round((ts.dph ?? 0.23) * 100)} type="number" onSave={v => saveTs({ ...ts, dph: (parseFloat(v) || 23) / 100 })} /> %
            </div>
          </div>
        </div>
      </div>

      {/* ── Typy dopravy ── */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Typy dopravy</h3>
        </div>

        {/* Zdieľaná info: Pumpa + Mixér — platí pre všetky typy */}
        {(() => {
          const ref = zones[0];
          const updateAll = (patch: Partial<DeliveryZone>) => save(zones.map(z => ({ ...z, ...patch })));
          return (
            <div className="grid grid-cols-2 gap-px bg-gray-100 m-4 rounded overflow-hidden">
              <div className="bg-yellow-50 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <PumpTruckIcon />
                  <span className="text-xs font-black text-secondary uppercase tracking-wide">Pumpa</span>
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Kapacita</div>
                    <div className="font-bold text-secondary text-sm">
                      <EditableField value={ref?.pumpTruckCapacity ?? 7} type="number" onSave={v => updateAll({ pumpTruckCapacity: parseFloat(v) })} /> m³
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Čakačka / 15 min</div>
                    <div className="font-bold text-secondary text-sm">
                      <EditableField value={ref?.waitingRatePer15minPumpa ?? ref?.waitingRatePer15min ?? 8} type="number" onSave={v => updateAll({ waitingRatePer15minPumpa: parseFloat(v) })} /> €
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <MixTruckIcon />
                  <span className="text-xs font-black text-secondary uppercase tracking-wide">Mixér</span>
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Kapacita</div>
                    <div className="font-bold text-secondary text-sm">
                      <EditableField value={ref?.truckCapacity ?? 9} type="number" onSave={v => updateAll({ truckCapacity: parseFloat(v) })} /> m³
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Čakačka / 15 min</div>
                    <div className="font-bold text-secondary text-sm">
                      <EditableField value={ref?.waitingRatePer15min ?? 8} type="number" onSave={v => updateAll({ waitingRatePer15min: parseFloat(v) })} /> €
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Číslovaný zoznam typov dopravy */}
        <div className="border-t border-gray-100">
          {ZONE_TYPES.map((zt, idx) => {
            const typeZones = zones.filter(z => (z.pricingType ?? "standard") === zt.key);
            if (typeZones.length === 0) return null;
            return (
              <div key={zt.key} className="border-b border-gray-100 last:border-b-0">
                {/* Numbered type header */}
                <div className="flex items-center gap-3 px-5 py-2 bg-gray-50/40">
                  <span className="w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-black text-secondary text-sm">{zt.label}</span>
                  <span className="text-[11px] text-gray-400">{zt.desc}</span>
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
                          {zt.key === "auto"
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
              ) : (
                <input placeholder="Sadzba €/km" type="number" step="0.1" value={addForm.ratePerKm} onChange={e => setAddForm({ ...addForm, ratePerKm: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
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

      {/* ── Zóny dopravy (cenník) ── */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Zóny dopravy (cenník)</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Od km</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Do km</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">€/m³</th>
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
    </div>
  );
}

// ── SLUŽBY tab ────────────────────────────────────────────────────────────────
function SluzbyTab() {
  const [services, setServices] = useState<Service[]>(adminData.getServices());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "", price: "", description: "" });

  const save = (data: Service[]) => { setServices(data); adminData.saveServices(data); };
  const toggle = (id: string) => save(services.map(s => s.id === id ? { ...s, active: !s.active } : s));
  const remove = (id: string) => { if (confirm("Vymazať službu?")) save(services.filter(s => s.id !== id)); };
  const update = (id: string, field: keyof Service, value: string) =>
    save(services.map(s => s.id === id ? { ...s, [field]: field === "price" ? parseFloat(value) || 0 : (value === "—" ? undefined : value) } : s));
  const add = () => {
    if (!form.name) return;
    save([...services, { id: adminData.generateId(), name: form.name, unit: form.unit, price: parseFloat(form.price) || 0, description: form.description, active: true }]);
    setForm({ name: "", unit: "", price: "", description: "" }); setAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Názov služby</th>
              <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Jednotka</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Cena bez DPH</th>
              <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Stav</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={s.id} className={`border-b border-gray-50 ${s.active ? "" : "opacity-50"} ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                <td className="px-5 py-3">
                  <div className="font-semibold text-secondary"><EditableField value={s.name} onSave={v => update(s.id, "name", v)} /></div>
                  <div className="text-xs text-gray-400 mt-0.5"><EditableField value={s.description || "—"} onSave={v => update(s.id, "description", v)} /></div>
                  {s.name.toLowerCase().includes("zimn") && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-300">
                      <span>Aktívne:</span>
                      <EditableField
                        value={s.activePeriodFrom ? `${s.activePeriodFrom.split("-")[1]}.${s.activePeriodFrom.split("-")[0]}` : "—"}
                        onSave={v => { const [dd, mm] = v.split("."); update(s.id, "activePeriodFrom", dd && mm ? `${mm}-${dd}` : v); }}
                      />
                      <span>–</span>
                      <EditableField
                        value={s.activePeriodTo ? `${s.activePeriodTo.split("-")[1]}.${s.activePeriodTo.split("-")[0]}` : "—"}
                        onSave={v => { const [dd, mm] = v.split("."); update(s.id, "activePeriodTo", dd && mm ? `${mm}-${dd}` : v); }}
                      />
                      <span className="text-gray-200">(DD.MM)</span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-center text-gray-500 hidden sm:table-cell">
                  <EditableField value={s.unit || "—"} onSave={v => update(s.id, "unit", v)} />
                </td>
                <td className="px-3 py-3 text-right font-bold text-secondary">
                  <EditableField value={(s.price ?? 0).toFixed(2)} type="number" onSave={v => update(s.id, "price", v)} /> €
                </td>
                <td className="px-3 py-3 text-center">
                  <button onClick={() => toggle(s.id)}
                    className={`px-2 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${s.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {s.active ? "Aktívna" : "Neaktívna"}
                  </button>
                </td>
                <td className="px-2 py-3 text-right">
                  <button onClick={() => remove(s.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="bg-white border-2 border-primary p-5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input placeholder="Názov služby *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary col-span-2" autoFocus />
            <input placeholder="Jednotka (napr. 1 hod.)" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <input placeholder="Cena bez DPH (€)" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <input placeholder="Popis (nepovinné)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90">Pridať</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm">Zrušiť</button>
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
  { key: "nova",       label: "Nová",       color: "bg-blue-100 text-blue-700" },
  { key: "potvrdena",  label: "Potvrdená",  color: "bg-yellow-100 text-yellow-700" },
  { key: "vybavena",   label: "Vybavená",   color: "bg-green-100 text-green-700" },
  { key: "zrusena",    label: "Zrušená",    color: "bg-red-100 text-red-500" },
];

function OrderStatusBadge({ status, onChange }: { status: Order["status"]; onChange: (s: Order["status"]) => void }) {
  const [open, setOpen] = useState(false);
  const cur = ORDER_STATUSES.find(s => s.key === status)!;
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

function ObjednavkyTab() {
  const [orders, setOrders] = useState<Order[]>(() => adminData.getOrders());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Order["status"] | "vsetky">("vsetky");

  const save = (data: Order[]) => { setOrders(data); adminData.saveOrders(data); };
  const remove = (id: string) => { if (confirm("Vymazať objednávku?")) save(orders.filter(o => o.id !== id)); };
  const updateStatus = (id: string, status: Order["status"]) => save(orders.map(o => o.id === id ? { ...o, status } : o));

  const filtered = filterStatus === "vsetky" ? orders : orders.filter(o => o.status === filterStatus);
  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("sk-SK")} ${d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const tabLabel = { pumpa: "Pumpa", mix: "Mix", vlastnadoprava: "Vl. doprava" };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["vsetky", "nova", "potvrdena", "vybavena", "zrusena"] as const).map(s => {
          const st = ORDER_STATUSES.find(x => x.key === s);
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${
                filterStatus === s
                  ? "bg-secondary text-white border-secondary"
                  : "bg-white text-gray-500 border-gray-200 hover:border-secondary/40"
              }`}>
              {s === "vsetky" ? "Všetky" : st?.label} {s !== "vsetky" && <span className="ml-1 text-[10px] opacity-60">{orders.filter(o => o.status === s).length}</span>}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-gray-400">{sorted.length} objednávok</span>
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
                      {o.company && <span className="text-xs text-gray-400 truncate">({o.company})</span>}
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 border border-gray-200 px-1.5 py-0.5 rounded-sm">{tabLabel[o.tab]}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{o.concreteType.replace(/ – [\d.,]+ €.*/, "")}</span>
                      <span className="text-xs text-gray-400">{o.totalQty} m³</span>
                      {o.address && <span className="text-xs text-gray-400 truncate max-w-[160px]">{o.address}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-bold text-secondary">{o.totalSDph.toFixed(2)} €</div>
                      <div className="text-[10px] text-gray-400">{o.priceMode === "hotovost" ? "hotovosť" : "faktúra"}</div>
                    </div>
                    <OrderStatusBadge status={o.status} onChange={s => updateStatus(o.id, s)} />
                    <button onClick={() => remove(o.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <span className="text-[10px] text-gray-300 shrink-0 hidden sm:block">{fmtDate(o.createdAt)}</span>
                </div>
                {isExp && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
                    <div><span className="font-semibold text-gray-600">Dátum:</span> {fmtDate(o.createdAt)}</div>
                    {o.phone && <div><span className="font-semibold text-gray-600">Telefón:</span> {o.phone}</div>}
                    {o.email && <div><span className="font-semibold text-gray-600">Email:</span> {o.email}</div>}
                    {o.clientId && <div><span className="font-semibold text-gray-600">ID klienta:</span> {o.clientId}</div>}
                    {o.km && <div><span className="font-semibold text-gray-600">Vzdialenosť:</span> {o.km} km</div>}
                    <div><span className="font-semibold text-gray-600">Bez DPH:</span> {o.totalBezDph.toFixed(2)} €</div>
                    <div><span className="font-semibold text-gray-600">S DPH:</span> {o.totalSDph.toFixed(2)} €</div>
                    {o.note && <div className="col-span-2"><span className="font-semibold text-gray-600">Poznámka:</span> {o.note}</div>}
                    {o.breakdown && <div className="col-span-2 text-gray-400 whitespace-pre-wrap">{o.breakdown}</div>}
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
function DiscountInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" min="0" max="100" value={value} onChange={e => onChange(e.target.value)}
          onFocus={e => e.target.select()}
          className="border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-primary w-full text-center" />
        <span className="text-xs text-gray-400 shrink-0">%</span>
      </div>
    </div>
  );
}

function KlientiTab() {
  const [clients, setClients] = useState<Client[]>(adminData.getClients());
  const [ts] = useState<TransportSettings>(adminData.getTransportSettings());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<Set<string>>(new Set());
  const [showTableFor, setShowTableFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const emptyForm = {
    firstName: "", lastName: "", company: "", email: "", phone: "",
    loginId: "", password: "",
    discountBeton: "20", discountDoprava: "0", discountSluzby: "0", discountCelkovo: "0",
    hotovostDph: "20",
    canHotovost: true, canPridatBeton: true, canZimneOpatrenia: false, active: true,
  };
  const [form, setForm] = useState(emptyForm);
  const [showFormPass, setShowFormPass] = useState(false);

  const save = (data: Client[]) => { setClients(data); adminData.saveClients(data); };
  const remove = (id: string) => { if (confirm("Vymazať klienta?")) save(clients.filter(c => c.id !== id)); };
  const update = (id: string, patch: Partial<Client>) => save(clients.map(c => c.id === id ? { ...c, ...patch } : c));
  const togglePassVis = (id: string) => setShowPass(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const add = () => {
    if (!form.firstName.trim() && !form.lastName.trim() && !form.company.trim()) return;
    save([...clients, {
      id: adminData.generateId(),
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      company: form.company.trim(), email: form.email.trim(), phone: form.phone.trim(),
      loginId: form.loginId.trim(), password: form.password.trim(),
      discountBeton:   parseFloat(form.discountBeton)   || 0,
      discountDoprava: parseFloat(form.discountDoprava) || 0,
      discountSluzby:  parseFloat(form.discountSluzby)  || 0,
      discountCelkovo: parseFloat(form.discountCelkovo) || 0,
      hotovostDph: parseFloat(form.hotovostDph) / 100 || 0.20,
      canHotovost: form.canHotovost, canPridatBeton: form.canPridatBeton,
      canZimneOpatrenia: form.canZimneOpatrenia,
      active: form.active,
    }]);
    setForm(emptyForm); setAdding(false);
  };

  const filtered = clients.filter(c =>
    [c.firstName, c.lastName, c.company, c.email, c.phone, c.loginId]
      .some(f => (f ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* General systémová DPH info */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Systémová DPH</h3>
        </div>
        <div className="flex flex-wrap gap-px bg-gray-100">
          <div className="bg-white px-5 py-3 flex-1 min-w-36">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">DPH Faktúra</div>
            <div className="font-bold text-secondary text-sm">{Math.round((ts.dph ?? 0.23) * 100)} %</div>
          </div>
          <div className="bg-white px-5 py-3 flex-1 min-w-36">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">DPH Hotovosť (default)</div>
            <div className="font-bold text-secondary text-sm">20 %<span className="text-xs text-gray-400 font-normal ml-1">(per klient)</span></div>
          </div>
          <div className="bg-gray-50 px-5 py-3 flex-1 min-w-48">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Poznámka</div>
            <div className="text-xs text-gray-500">Faktúra DPH sa mení v Admin › Doprava › Nastavenia cenníka</div>
          </div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex gap-3 flex-wrap">
        <input placeholder="Hľadať klienta..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-40 border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:border-primary" />
        <button
          onClick={() => {
            if (!confirm(`Vypnúť Hotovosť VŠETKÝM ${clients.filter(c => c.canHotovost !== false).length} klientom? (napr. pri daňovej kontrole)`)) return;
            save(clients.map(c => ({ ...c, canHotovost: false })));
          }}
          className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 text-red-700 font-bold text-xs hover:bg-red-100 shrink-0 uppercase tracking-wide">
          <ShieldOff className="w-3.5 h-3.5" /> Vypnúť Hotovosť všetkým
        </button>
        <button
          onClick={() => {
            if (!confirm(`Zapnúť Hotovosť VŠETKÝM ${clients.length} klientom?`)) return;
            save(clients.map(c => ({ ...c, canHotovost: true })));
          }}
          className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-300 text-green-700 font-bold text-xs hover:bg-green-100 shrink-0 uppercase tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5" /> Zapnúť všetkým
        </button>
        <button onClick={() => { setAdding(true); setExpanded(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90 shrink-0">
          <Plus className="w-4 h-4" /> Pridať klienta
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white border-2 border-primary shadow-md">
          <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
            <span className="font-black text-secondary text-sm uppercase tracking-widest">Pridať užívateľa</span>
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
                <input placeholder="Tel. číslo" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
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
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <input type={showFormPass ? "text" : "password"} placeholder="Heslo" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary pr-8" />
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <DiscountInput label="Zľava/Betón" value={form.discountBeton} onChange={v => setForm({ ...form, discountBeton: v })} />
                <DiscountInput label="Zľava/Doprava" value={form.discountDoprava} onChange={v => setForm({ ...form, discountDoprava: v })} />
                <DiscountInput label="Zľava/Služby" value={form.discountSluzby} onChange={v => setForm({ ...form, discountSluzby: v })} />
                <DiscountInput label="Zľava/Celkovo" value={form.discountCelkovo} onChange={v => setForm({ ...form, discountCelkovo: v })} />
              </div>
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
                  <span className="text-sm text-gray-700">Pridať betón</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canZimneOpatrenia} onChange={e => setForm({ ...form, canZimneOpatrenia: e.target.checked })} className="accent-blue-600 w-5 h-5 shrink-0" />
                  <span className="text-sm text-gray-700">Zimné opatrenia (auto-ON v zime)</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="accent-green-600 w-5 h-5 shrink-0" />
                  <span className="text-sm text-gray-700">Prístup aktívny</span>
                </label>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 flex gap-2">
            <button onClick={() => setAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-bold uppercase tracking-wide">Zrušiť</button>
            <button onClick={add} className="px-6 py-2 bg-primary text-secondary font-bold text-sm uppercase tracking-wide hover:bg-primary/90">Pridať</button>
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-secondary text-white text-xs font-black uppercase tracking-widest">
        <div className="w-8 shrink-0" />
        <div className="w-36 shrink-0">Klient</div>
        <div className="flex flex-1">
          {["Betón", "Doprava", "Služby", "Celkovo"].map(l => (
            <div key={l} className="flex-1 text-center text-primary">{l}</div>
          ))}
        </div>
        <div className="w-28 shrink-0" />
      </div>

      {/* Client cards */}
      <div className="space-y-px">
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Žiadni klienti.</p>}
        {filtered.map(c => {
          const isExpanded = expanded === c.id;
          const hasLogin = !!(c.loginId && c.password);
          const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
          const maxDisc = Math.max(c.discountBeton ?? 0, c.discountDoprava ?? 0, c.discountSluzby ?? 0, c.discountCelkovo ?? 0);
          return (
            <div key={c.id} className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <span className="text-secondary font-black text-sm">{(c.firstName || c.company || "?").charAt(0).toUpperCase()}</span>
                </div>
                {/* Meno */}
                <div className="w-36 min-w-0 shrink-0">
                  <div className="font-bold text-secondary text-sm truncate">{fullName}</div>
                  {c.company && <div className="text-xs text-gray-400 truncate">{c.company}</div>}
                </div>
                {/* Zľavy — skryté na mobile, viditeľné od sm */}
                <div className="hidden sm:flex flex-1 items-center">
                  {[
                    { label: "Betón",   val: c.discountBeton   ?? 0 },
                    { label: "Doprava", val: c.discountDoprava ?? 0 },
                    { label: "Služby",  val: c.discountSluzby  ?? 0 },
                    { label: "Celkovo", val: c.discountCelkovo ?? 0 },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex-1 text-center">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
                      <div className={`text-sm font-bold ${val > 0 ? "text-primary" : "text-gray-300"}`}>{val} %</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
                  <span className="p-1 text-gray-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); remove(c.id); }} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50/60">
                  {/* Osobné info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
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
                            <EditableField value={(c[field] as string) || "—"} onSave={v => update(c.id, { [field]: v })} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Login + zľavy */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Prístup do kalkulačky</p>
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-400 text-xs w-20 shrink-0">Login ID</span>
                          <EditableField value={c.loginId || "—"} onSave={v => update(c.id, { loginId: v })} />
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-400 text-xs w-20 shrink-0">Heslo</span>
                          <span className="font-mono text-secondary">
                            {showPass.has(c.id) ? (c.password || "—") : (c.password ? "••••••" : "—")}
                          </span>
                          <button onClick={() => togglePassVis(c.id)} className="text-gray-400 hover:text-secondary">
                            {showPass.has(c.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => update(c.id, { password: genPassword() })} title="Vygenerovať nové heslo" className="text-gray-400 hover:text-secondary">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Zľavy</p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {([
                          { label: "Zľava/Betón",   field: "discountBeton" },
                          { label: "Zľava/Doprava", field: "discountDoprava" },
                          { label: "Zľava/Služby",  field: "discountSluzby" },
                          { label: "Zľava/Celkovo", field: "discountCelkovo" },
                        ] as { label: string; field: keyof Client }[]).map(({ label, field }) => (
                          <div key={field}>
                            <label className="text-xs text-gray-400 block mb-1">{label}</label>
                            <div className="flex items-center gap-1">
                              <input type="number" min="0" max="100" value={(c[field] as number) ?? 0}
                                onChange={e => update(c.id, { [field]: parseFloat(e.target.value) || 0 })}
                                onFocus={e => e.target.select()}
                                className="border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-primary w-full text-center" />
                              <span className="text-xs text-gray-400 shrink-0">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Možnosti</p>
                      <div className="border border-gray-200 bg-white divide-y divide-gray-100">
                        <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                          <input type="checkbox" checked={c.canHotovost ?? true} onChange={e => update(c.id, { canHotovost: e.target.checked })} className="accent-secondary w-5 h-5 shrink-0" />
                          <div>
                            <span className="text-sm text-gray-700">Hotovosť</span>
                            {(c.canHotovost ?? true) ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-400">DPH hotovosť:</span>
                                <input type="number" min="0" max="100" value={Math.round((c.hotovostDph ?? 0.20) * 100)}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => update(c.id, { hotovostDph: (parseFloat(e.target.value) || 20) / 100 })}
                                  className="border border-gray-200 px-2 py-0.5 text-xs focus:outline-none focus:border-primary w-16 text-center" />
                                <span className="text-xs text-gray-400">%</span>
                              </div>
                            ) : (
                              <div className="mt-1 text-xs text-gray-400">Iba faktúra · DPH <span className="font-bold text-gray-500">23 %</span></div>
                            )}
                          </div>
                        </label>
                        <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                          <input type="checkbox" checked={c.canPridatBeton ?? true} onChange={e => update(c.id, { canPridatBeton: e.target.checked })} className="accent-secondary w-5 h-5 shrink-0" />
                          <span className="text-sm text-gray-700">Pridať betón</span>
                        </label>
                        <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                          <input type="checkbox" checked={c.canZimneOpatrenia ?? false} onChange={e => update(c.id, { canZimneOpatrenia: e.target.checked })} className="accent-blue-600 w-5 h-5 shrink-0" />
                          <span className="text-sm text-gray-700">Zimné opatrenia (auto-ON v zime)</span>
                        </label>
                        <div className="px-3 py-3">
                          <div className="text-xs text-gray-400 mb-1.5">Typ dopravy</div>
                          <select
                            value={c.deliveryZoneId ?? ""}
                            onChange={e => update(c.id, { deliveryZoneId: e.target.value || undefined })}
                            className="w-full border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                          >
                            {adminData.getDelivery().map(z => (
                              <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button onClick={() => update(c.id, { active: !c.active })}
                        className={`mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-bold uppercase border transition-colors ${c.active ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                        {c.active ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                        {c.active ? "Prístup aktívny" : "Prístup neaktívny"}
                      </button>
                    </div>
                  </div>

                  {/* Zľavové tabuľky */}
                  <div className="border-t border-gray-100 pt-3">
                    <button
                      onClick={() => setShowTableFor(showTableFor === c.id ? null : c.id)}
                      className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-secondary transition-colors cursor-pointer"
                    >
                      <Table2 className="w-3.5 h-3.5" />
                      {showTableFor === c.id ? "Skryť zľavové tabuľky" : "Zobraziť zľavové tabuľky klienta"}
                    </button>
                    {showTableFor === c.id && (
                      <div className="mt-3">
                        <ClientPriceTable
                          discountBeton={c.discountBeton ?? 0}
                          discountDoprava={c.discountDoprava ?? 0}
                          discountSluzby={c.discountSluzby ?? 0}
                          discountCelkovo={c.discountCelkovo ?? 0}
                          variant="light"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("klienti");
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "klienti", label: "KLIENTI", icon: <Users className="w-4 h-4" /> },
    { id: "objednavky", label: "OBJEDNÁVKY", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "doprava", label: "DOPRAVA", icon: <Truck className="w-4 h-4" /> },
    { id: "sluzby", label: "SLUŽBY", icon: <Wrench className="w-4 h-4" /> },
    { id: "betony", label: "BETÓNY", icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden" style={{ fontFamily: "Montserrat, sans-serif" }}>
      {/* Top nav */}
      <header className="bg-secondary shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <a href="/" className="flex items-center gap-0.5 select-none">
            <span className="font-black text-2xl tracking-tighter text-primary">MS</span>
            <span className="font-black text-2xl tracking-tighter text-primary/40">-</span>
            <span className="font-black text-2xl tracking-tighter text-white">BETON</span>
            <span className="ml-3 text-white/30 text-xs font-semibold uppercase tracking-widest hidden sm:block">Admin</span>
          </a>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Odhlásiť</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 p-1 shadow-sm overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wide sm:tracking-widest transition-all shrink-0 ${
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
