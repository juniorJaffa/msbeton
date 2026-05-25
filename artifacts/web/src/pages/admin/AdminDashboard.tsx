import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { LogOut, Plus, UserPlus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Users, Truck, Wrench, Layers, Eye, EyeOff, RefreshCw, LogIn, ShieldCheck, ShieldOff, Table2, ClipboardList, FileText, Crown, Calculator, ExternalLink, FileSpreadsheet, FileType2, SlidersHorizontal, ShoppingCart, MessageSquare, BarChart2, TrendingUp, Monitor, Globe, MousePointerClick, MoreHorizontal, Activity, Smartphone, Laptop, Tablet, Mail, MapPin, Navigation, Copy, Fingerprint, Search, AlertTriangle } from "lucide-react";
import { ClientPriceTable } from "@/components/ClientPriceTable";
import { ConcreteCalculator } from "@/components/Calculator";
import { PriceModeToggle } from "@/components/PriceModeToggle";
import { VersionBadge } from "@/components/VersionBadge";
import { PhoneInput } from "@/components/PhoneInput";
import { cn, formatPhone } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { isLoggedIn, logout, isBiometricAvailable, hasStoredCredential, getAdminToken } from "@/lib/adminAuth";

function authFetch(url: string, opts?: RequestInit): Promise<Response> {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts?.headers as Record<string, string> ?? {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...opts, headers });
}
import { adminData, adminApi, syncFromServer, SYSTEM_OWNER_ID, ConcreteCategory, ConcreteType, DeliveryZone, Service, Client, TransportPricingZone, TransportSettings, Order } from "@/lib/adminData";

type Tab = "betony" | "sluzby" | "doprava" | "klienti" | "objednavky" | "analytics" | "statistiky" | "gsc";

function sharedLinkIcon(url: string): { Icon: React.ElementType; cls: string } {
  const u = url.toLowerCase();
  if (u.includes("spreadsheet") || u.includes(".xlsx") || u.includes(".xls") || u.includes("excel"))
    return { Icon: FileSpreadsheet, cls: "text-green-600" };
  if (u.includes(".pdf") || u.includes("/pdf"))
    return { Icon: FileText, cls: "text-red-500" };
  if (u.includes("document") || u.includes(".docx") || u.includes(".doc") || u.includes("word"))
    return { Icon: FileType2, cls: "text-blue-600" };
  return { Icon: ExternalLink, cls: "text-primary" };
}

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditableField({ value, onSave, type = "text" }: { value: string | number; onSave: (v: string) => void; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  const save = () => { onSave(val); setEditing(false); };
  const cancel = () => setEditing(false);
  const startEdit = () => { setVal(String(value)); setEditing(true); };
  if (!editing) return (
    <span className="cursor-pointer hover:text-primary transition-colors group flex items-center gap-1" onClick={e => { e.stopPropagation(); startEdit(); }}>
      {value}
      <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
    </span>
  );
  return (
    <span className="flex items-center gap-1">
      <input type={type} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); save(); } if (e.key === "Escape") cancel(); }}
        onBlur={cancel}
        className={`bg-white border border-primary px-2 py-0.5 text-secondary text-sm ${type === "number" ? "w-20" : "w-32"} focus:outline-none`} autoFocus onFocus={e => e.target.select()} />
      <button onMouseDown={e => e.preventDefault()} onClick={save} className="text-green-600 hover:text-green-700"><Check className="w-5 h-5" /></button>
      <button onMouseDown={e => e.preventDefault()} onClick={cancel} className="text-red-500 hover:text-red-600"><X className="w-5 h-5" /></button>
    </span>
  );
}

// ── BETÓNY tab ────────────────────────────────────────────────────────────────
function BetonTab() {
  const [cats, setCats] = useState<ConcreteCategory[]>(adminData.getCategories());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameCatVal, setRenameCatVal] = useState("");
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
          <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
            onClick={() => { setExpanded(expanded === cat.id ? null : cat.id); setRenamingCat(null); }}>
            <div className="flex items-center gap-3 min-w-0">
              {expanded === cat.id ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
              <span className="font-semibold text-secondary truncate">{cat.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
              <span className="text-xs text-gray-400">{cat.types.length} typov</span>
              <button onClick={() => { setRenamingCat(renamingCat === cat.id ? null : cat.id); setRenameCatVal(cat.name); setExpanded(cat.id); }}
                className="p-2.5 bg-gray-100 text-gray-500 hover:bg-primary hover:text-secondary transition-colors rounded-sm" title="Premenovať">
                <Pencil className="w-5 h-5" />
              </button>
              <button onClick={() => deleteCategory(cat.id)} className="p-2.5 bg-secondary text-primary hover:bg-secondary/80 transition-colors rounded-sm">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          {renamingCat === cat.id && (
            <div className="flex gap-2 px-5 pb-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
              <input value={renameCatVal} onChange={e => setRenameCatVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { updateCatName(cat.id, renameCatVal); setRenamingCat(null); } if (e.key === "Escape") setRenamingCat(null); }}
                className="flex-1 border-2 border-primary px-3 py-1.5 text-sm focus:outline-none" autoFocus />
              <button onClick={() => { updateCatName(cat.id, renameCatVal); setRenamingCat(null); }}
                className="px-3 py-1.5 bg-primary text-secondary text-sm font-bold hover:bg-primary/90"><Check className="w-4 h-4" /></button>
              <button onClick={() => setRenamingCat(null)}
                className="px-3 py-1.5 bg-gray-100 text-gray-500 text-sm hover:bg-gray-200"><X className="w-4 h-4" /></button>
            </div>
          )}

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
                        <button onClick={() => deleteType(cat.id, t.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-5 h-5" />
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
          className="flex items-center gap-2 w-full border-2 border-dashed border-gray-400 bg-white shadow-sm text-gray-600 hover:border-primary hover:text-primary font-bold text-sm py-4 justify-center transition-colors rounded-md">
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

function DopravaTab({ onGoToSluzby }: { onGoToSluzby?: () => void }) {
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

// ── SLUŽBY tab ────────────────────────────────────────────────────────────────
function SluzbyTab({ onGoToDoprava, scrollToPumpa, onScrollDone }: { onGoToDoprava?: () => void; scrollToPumpa?: boolean; onScrollDone?: () => void }) {
  const [services, setServices] = useState<Service[]>(adminData.getServices());
  const doScrollRef = useRef(scrollToPumpa ?? false);
  useEffect(() => {
    if (!doScrollRef.current) return;
    const timer = setTimeout(() => {
      const el = document.querySelector("[data-svcmode='pumpa']") as HTMLElement | null;
      const container = document.getElementById("admin-content");
      if (el && container) {
        const cR = container.getBoundingClientRect();
        const eR = el.getBoundingClientRect();
        container.scrollTo({ top: container.scrollTop + (eR.top - cR.top) - 80, behavior: "smooth" });
      }
      onScrollDone?.();
    }, 80);
    return () => clearTimeout(timer);
  }, []);
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

  // Zorad: čakačka pumpy PRED čakačkou mixéra
  const displayServices = (() => {
    const pumpaItems = services.filter(s => s.serviceMode === "pumpa");
    const result: Service[] = [];
    for (const s of services) {
      if (s.serviceMode === "pumpa") continue;
      if (s.serviceMode === "mix") result.push(...pumpaItems); // pumpa pred mix
      result.push(s);
    }
    if (!services.some(s => s.serviceMode === "mix")) result.push(...pumpaItems);
    return result;
  })();

  const ServiceModeBadge = ({ mode }: { mode?: "pumpa" | "mix" }) => mode ? (
    <div className="flex items-center gap-1.5">
      {mode === "pumpa" ? <PumpTruckIcon /> : <MixTruckIcon />}
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
        {mode === "pumpa" ? "Pumpa" : "Mixer"}
      </span>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {displayServices.map((s) => (
          <div key={s.id} data-svcmode={s.serviceMode ?? ""} className={`bg-white border shadow-sm p-4 ${s.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-secondary text-sm"><EditableField value={s.name} onSave={v => update(s.id, "name", v)} /></div>
                <div className="text-xs text-gray-400 mt-0.5 leading-snug"><EditableField value={s.description || "—"} onSave={v => update(s.id, "description", v)} /></div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggle(s.id)} className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {s.active ? "Aktívna" : "Neakt."}
                </button>
                <button onClick={() => remove(s.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <ServiceModeBadge mode={s.serviceMode} />
              {s.maxMeters !== undefined && <span className="text-[10px] text-gray-400">Max: <EditableField value={s.maxMeters} type="number" onSave={v => update(s.id, "maxMeters", v)} /> m</span>}
              {(s.activePeriodFrom || s.activePeriodTo) && (
                <span className="text-[10px] text-gray-300">{s.activePeriodFrom ? `${s.activePeriodFrom.split("-")[1]}.${s.activePeriodFrom.split("-")[0]}` : ""}–{s.activePeriodTo ? `${s.activePeriodTo.split("-")[1]}.${s.activePeriodTo.split("-")[0]}` : ""}</span>
              )}
              <div className="ml-auto flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-bold text-secondary text-sm whitespace-nowrap">
                  <EditableField value={(s.price ?? 0).toFixed(2)} type="number" onSave={v => update(s.id, "price", v)} /> €
                </span>
                {s.unit && <span className="text-xs text-gray-400">/ {s.unit}</span>}
              </div>
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
              <tr key={s.id} data-svcmode={s.serviceMode ?? ""} className={`border-b border-gray-50 ${s.active ? "" : "opacity-50"} ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
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
                <td className="px-2 py-3 text-right"><button onClick={() => remove(s.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button></td>
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
          className="flex items-center gap-2 w-full border-2 border-dashed border-gray-400 bg-white shadow-sm text-gray-600 hover:border-primary hover:text-primary font-bold text-sm py-4 justify-center transition-colors rounded-md">
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

function OrderStatusBadge({ status, onChange, orderTotal }: {
  status: Order["status"];
  onChange: (s: Order["status"], paidAmount?: number) => void;
  orderTotal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const [payModal, setPayModal] = useState(false);
  const [payInput, setPayInput] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const cur = ORDER_STATUSES.find(s => s.key === status) ?? ORDER_STATUSES.find(s => s.key === "odoslana")!;

  const openDrop = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 2, left: r.left });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const openPayModal = () => {
    setPayInput(orderTotal !== undefined ? orderTotal.toFixed(2) : "");
    setPayModal(true);
    setOpen(false);
  };
  const confirmPay = () => {
    const amt = parseFloat(payInput.replace(",", "."));
    onChange("vyplatena", isNaN(amt) ? undefined : amt);
    setPayModal(false);
  };

  return (
    <>
      <div className="relative">
        <button ref={btnRef} onClick={e => { e.stopPropagation(); openDrop(); }} className={`px-2 py-1 text-xs font-bold rounded-sm cursor-pointer ${cur.color}`}>{cur.label} ▾</button>
        {open && createPortal(
          <div className="fixed z-[500] bg-white border border-gray-200 shadow-lg rounded-sm min-w-[110px]" style={{ top: dropPos.top, left: dropPos.left }} onClick={e => e.stopPropagation()}>
            {ORDER_STATUSES.map(s => (
              <button key={s.key} onClick={() => {
                if (s.key === "vyplatena") { openPayModal(); }
                else { onChange(s.key); setOpen(false); }
              }}
                className={`block w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-gray-50 ${s.color}`}>{s.label}</button>
            ))}
          </div>,
          document.body
        )}
      </div>

      {payModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setPayModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <div className="font-black text-secondary text-sm">Vyplatená suma</div>
                <div className="text-xs text-gray-400">Uprav ak klient dal viac (tringelt)</div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Vyplatená suma (€)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payInput}
                  onChange={e => setPayInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") confirmPay(); if (e.key === "Escape") setPayModal(false); }}
                  className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-lg font-black text-secondary text-right focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 pr-10"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none">€</span>
              </div>
              {(() => {
                const cur = parseFloat(payInput.replace(",", "."));
                if (isNaN(cur)) return null;
                const ceilTo = (n: number, step: number) => Math.ceil((n + 0.001) / step) * step;
                const roundTargets = [1, 5, 10, 50, 100]
                  .map(s => ceilTo(cur, s))
                  .filter((v, i, arr) => v > cur + 0.001 && arr.indexOf(v) === i)
                  .slice(0, 4);
                const diff = orderTotal !== undefined ? cur - orderTotal : null;
                return (
                  <>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {[1, 5].map(n => (
                        <button key={`+${n}`} type="button"
                          onClick={() => setPayInput((cur + n).toFixed(2))}
                          className="px-2 py-0.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded cursor-pointer transition-colors">
                          +{n}€
                        </button>
                      ))}
                      {roundTargets.length > 0 && <span className="text-gray-200 font-black self-center">|</span>}
                      {roundTargets.map(v => (
                        <button key={v} type="button"
                          onClick={() => setPayInput(v.toFixed(2))}
                          className="px-2 py-0.5 text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 rounded cursor-pointer transition-colors">
                          →{v % 1 === 0 ? v : v.toFixed(2)}€
                        </button>
                      ))}
                    </div>
                    {diff !== null && Math.abs(diff) >= 0.01 && (
                      <div className={`mt-1.5 text-xs font-bold text-right ${diff > 0 ? "text-teal-600" : "text-red-500"}`}>
                        {diff > 0 ? `+${diff.toFixed(2)} € tringelt` : `${diff.toFixed(2)} € rozdiel`}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPayModal(false)}
                className="flex-1 px-3 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                Zrušiť
              </button>
              <button onClick={confirmPay}
                className="flex-1 px-3 py-2 text-xs font-black text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors cursor-pointer">
                Potvrdiť
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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

function ObjednavkyTab({ onGoToClient }: { onGoToClient?: (loginId: string) => void }) {
  const [orders, setOrders] = useState<Order[]>(() => adminData.getOrders());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Order["status"] | "vsetky">("vsetky");
  const [filterTab, setFilterTab] = useState<Order["tab"] | "vsetky">("vsetky");
  const [filterPriceMode, setFilterPriceMode] = useState<"vsetky" | "faktura" | "hotovost">("vsetky");
  const [filterChannel, setFilterChannel] = useState<"vsetky" | "sms" | "kosarik">("vsetky");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickDate, setQuickDate] = useState("");
  const [quickDays, setQuickDays] = useState("7");
  const [quickMY, setQuickMY] = useState({ m: new Date().getMonth() + 1, y: new Date().getFullYear() });
  const [newBadge, setNewBadge] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [copiedPlusCode, setCopiedPlusCode] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ts, setTs] = useState<TransportSettings>(adminData.getTransportSettings());
  const saveTs = (data: TransportSettings) => { setTs(data); adminData.saveTransportSettings(data); };
  const [mapModalOrder, setMapModalOrder] = useState<Order | null>(null);
  const plusCodeBackfilledRef = useRef<Set<string>>(new Set());
  const [ordersPage, setOrdersPage] = useState(0);
  const ORDERS_PAGE_SIZE = 30;

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

  useEffect(() => {
    const w = window as unknown as { google?: { maps?: { Geocoder?: unknown } } };
    if (!w.google?.maps?.Geocoder) return;
    const toFill = orders.filter(o => o.mapPlusCode && !o.mapLocality && !plusCodeBackfilledRef.current.has(o.id));
    if (toFill.length === 0) return;
    toFill.forEach(o => {
      plusCodeBackfilledRef.current.add(o.id);
      new google.maps.Geocoder().geocode({ address: o.mapPlusCode!, region: "SK" }, (results, status) => {
        if (status !== "OK" || !results?.[0]) return;
        const comps = results[0].address_components ?? [];
        const loc = comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("locality"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("postal_town"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_3"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_4"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("sublocality_level_1"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("neighborhood"))?.long_name
          ?? "";
        const district = comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_2"))?.long_name ?? "";
        const mapLocality = [loc, district].filter(Boolean).join(", ");
        if (!mapLocality) return;
        setOrders(prev => {
          const updated = prev.map(p => p.id === o.id ? { ...p, mapLocality } : p);
          adminData.saveOrders(updated);
          return updated;
        });
      });
    });
  }, [orders]);

  const save = (data: Order[]) => { setOrders(data); adminData.saveOrders(data); };
  const remove = (id: string) => { if (confirm("Vymazať objednávku?")) save(orders.filter(o => o.id !== id)); };
  const updateStatus = (id: string, status: Order["status"], paidAmount?: number) =>
    save(orders.map(o => o.id === id ? { ...o, status, ...(paidAmount !== undefined ? { paidAmount } : {}) } : o));

  const SK_MONTHS = ["Január","Február","Marec","Apríl","Máj","Jún","Júl","August","September","Október","November","December"];

  const applyMonthFilter = (m: number, y: number) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const isCurrentMonth = m === now.getMonth() + 1 && y === now.getFullYear();
    setDateFrom(`${y}-${pad(m)}-01`);
    setDateTo(isCurrentMonth ? now.toISOString().slice(0, 10) : `${y}-${pad(m)}-${new Date(y, m, 0).getDate()}`);
    setQuickDate("mesiac");
    setQuickMY({ m, y });
  };

  const stepMonth = (delta: number) => {
    let { m, y } = quickMY;
    m += delta;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    applyMonthFilter(m, y);
  };

  const applyQuickDate = (preset: string, nDays?: number) => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const today = fmt(now);
    if (preset === "dnes") { setDateFrom(today); setDateTo(today); }
    else if (preset === "vcera") { const y = new Date(now); y.setDate(y.getDate() - 1); const yd = fmt(y); setDateFrom(yd); setDateTo(yd); }
    else if (preset === "tyzden") { const m = new Date(now); m.setDate(now.getDate() - ((now.getDay() + 6) % 7)); setDateFrom(fmt(m)); setDateTo(today); }
    else if (preset === "mesiac") { applyMonthFilter(quickMY.m, quickMY.y); return; }
    else if (preset === "ndni" && nDays && nDays > 0) { const d = new Date(now); d.setDate(d.getDate() - nDays); setDateFrom(fmt(d)); setDateTo(today); }
    setQuickDate(preset);
  };

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const searchTerms = search.trim().split(/\s+/).filter(Boolean);
  const filtered = orders
    .filter(o => filterStatus    === "vsetky" || o.status    === filterStatus)
    .filter(o => filterTab       === "vsetky" || o.tab       === filterTab)
    .filter(o => filterPriceMode === "vsetky" || o.priceMode === filterPriceMode)
    .filter(o => filterChannel   === "vsetky" || (filterChannel === "sms" ? !!o.viaSms : !o.viaSms))
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

  const getOrderIsRisk = (o: Order): boolean => {
    if (o.podmienky?.isRisk === true) return true;
    if (o.podmienky?.isRisk === false) return false;
    try {
      if (o.breakdown?.startsWith("{")) {
        const b = JSON.parse(o.breakdown) as { s: { rows: { l: string }[] }[] };
        return b.s?.some(sec => sec.rows?.some(r => r.l?.includes("Minusové pretaženie"))) ?? false;
      }
    } catch { /* */ }
    return false;
  };

  const [floatingOrder, setFloatingOrder] = useState<Order | null>(null);
  const sortedRef = useRef(sorted);
  sortedRef.current = sorted;
  useEffect(() => {
    const container = document.getElementById("admin-content");
    if (!container) return;
    const onScroll = () => {
      const filterEl = container.querySelector(".sticky.top-0.z-20");
      const tbBottom = filterEl ? filterEl.getBoundingClientRect().bottom + 2 : 60;
      const cards = container.querySelectorAll("[id^='order-card-']");
      let last: Order | null = null;
      for (const el of Array.from(cards)) {
        if (el.getBoundingClientRect().top < tbBottom) {
          const id = el.id.replace("order-card-", "");
          const found = sortedRef.current.find(o => o.id === id);
          if (found) last = found;
        } else break;
      }
      setFloatingOrder(last);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
    const ds = iso.slice(0, 10);
    if (ds === todayStr) return `Dnes ${time}`;
    if (ds === yesterdayStr) return `Včera ${time}`;
    return `${d.toLocaleDateString("sk-SK")} ${time}`;
  };
  const fmtEur = (n: number) => n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const tabLabel: Record<Order["tab"], string> = { pumpa: "Pumpa", mix: "Mix", vlastnadoprava: "Vl. doprava" };
  const activeFilters = [filterStatus !== "vsetky", filterTab !== "vsetky", filterPriceMode !== "vsetky", filterChannel !== "vsetky", !!search, !!(dateFrom || dateTo)].filter(Boolean).length;
  const sortedCount = sorted.length;
  const sortedCountLabel = sortedCount === 1 ? "objednávka" : sortedCount >= 2 && sortedCount <= 4 ? "objednávky" : "objednávok";
  const totalPages = Math.ceil(sortedCount / ORDERS_PAGE_SIZE);
  const pagedOrders = sorted.slice(ordersPage * ORDERS_PAGE_SIZE, (ordersPage + 1) * ORDERS_PAGE_SIZE);
  useEffect(() => { setOrdersPage(0); }, [filterStatus, filterTab, filterPriceMode, filterChannel, search, dateFrom, dateTo]);

  return (
    <div className="space-y-3">
      {/* Nastavenia — collapsible, scrolluje preč (nie sticky) */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <button type="button" onClick={() => setSettingsOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer border-b border-gray-100">
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Nastavenia</h3>
          {settingsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {settingsOpen && (
          <div className="px-4 py-3 space-y-3">
            {/* SMS Objednávky */}
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">SMS Objednávky (prihlásení klienti)</div>
                <div className="text-[11px] text-gray-500">
                  Klienti môžu zadať objednávku cez <em>Export SMS</em> v kalkulačke.
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 pt-0.5">
                <span className={`text-xs font-bold ${ts.smsOrderEnabled ? "text-green-600" : "text-gray-400"}`}>
                  {ts.smsOrderEnabled ? "Zapnuté" : "Vypnuté"}
                </span>
                <button
                  onClick={() => saveTs({ ...ts, smsOrderEnabled: !ts.smsOrderEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${ts.smsOrderEnabled ? "bg-green-500" : "bg-gray-300"}`}
                  title={ts.smsOrderEnabled ? "Vypnúť SMS objednávky" : "Zapnúť SMS objednávky"}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ts.smsOrderEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter panel — sticky, collapsible */}
      <div className="sticky top-0 z-20">
      <div className="bg-white border border-gray-200 shadow-sm">
        {/* Compact header — vždy viditeľný, toggle */}
        <button onClick={() => setFilterOpen(o => !o)}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter</span>
          {activeFilters > 0 && (
            <span className="bg-secondary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{activeFilters}</span>
          )}
          <span className="ml-auto text-xs font-bold text-secondary shrink-0">{sortedCount} {sortedCountLabel}</span>
          {newBadge > 0 && <span className="relative bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{newBadge} nových</span>}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${filterOpen ? "rotate-180" : ""}`} />
        </button>
        {filterOpen && (
        <div className="border-t border-gray-200">
          {/* STAV */}
          <div className="border-b border-gray-200">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-1 flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Stav</span>
              {newBadge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{newBadge} nových</span>}
            </div>
            <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
              <button onClick={() => { setFilterStatus("vsetky"); setNewBadge(0); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${filterStatus === "vsetky" ? "bg-secondary text-white border-secondary" : "bg-white text-gray-500 border-gray-200 hover:border-secondary/40"}`}>
                Všetky <span className="ml-1 text-[10px] opacity-60">{orders.length}</span>
              </button>
              {ORDER_STATUSES.map(s => (
                <button key={s.key} onClick={() => setFilterStatus(s.key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${
                    filterStatus === s.key ? STATUS_ACTIVE_COLORS[s.key] : `bg-white border-gray-200 ${s.color} opacity-80 hover:opacity-100`
                  }`}>
                  {s.label} <span className="ml-1 text-[10px] opacity-70">{orders.filter(o => o.status === s.key).length}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TYP + PLATBA + ZDROJ — 3 sekcie v jednom vizuálnom bloku */}
          <div className="border-b border-gray-200 divide-y divide-gray-100">
            {/* Typ */}
            <div className="flex items-center gap-0 px-4 py-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em] w-14 shrink-0">Typ</span>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFilterTab("vsetky")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-sm border transition-all ${filterTab === "vsetky" ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
                  Všetky
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
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-sm border transition-all ${
                        filterTab === t ? s.activeBg : `bg-white border-gray-200 text-gray-500 hover:border-gray-400`
                      }`}>
                      {icon}
                      {s.label} <span className="text-[10px] opacity-60">{orders.filter(o => o.tab === t).length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Platba */}
            <div className="flex items-center gap-0 px-4 py-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em] w-14 shrink-0">Platba</span>
              <div className="flex flex-wrap gap-1.5">
                {([["vsetky", "Všetky"], ["faktura", "Faktúra"], ["hotovost", "Hotovosť"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setFilterPriceMode(val)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-sm border transition-all ${
                      filterPriceMode === val
                        ? val === "hotovost" ? "bg-amber-500 text-white border-amber-500" : val === "faktura" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-700 text-white border-gray-700"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}>
                    {label}
                    {val !== "vsetky" && <span className="ml-1 text-[10px] opacity-60">{orders.filter(o => o.priceMode === val).length}</span>}
                  </button>
                ))}
              </div>
            </div>
            {/* Zdroj */}
            <div className="flex items-center gap-0 px-4 py-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em] w-14 shrink-0">Zdroj</span>
              <div className="flex flex-wrap gap-1.5">
                {([["vsetky", "Všetky", null], ["kosarik", "Košík", "ShoppingCart"], ["sms", "SMS", "MessageSquare"]] as const).map(([val, label, iconName]) => (
                  <button key={val} onClick={() => setFilterChannel(val)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-sm border transition-all ${
                      filterChannel === val
                        ? val === "sms" ? "bg-green-600 text-white border-green-600" : val === "kosarik" ? "bg-secondary text-white border-secondary" : "bg-gray-700 text-white border-gray-700"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}>
                    {iconName === "ShoppingCart" && <ShoppingCart className="w-3 h-3" />}
                    {iconName === "MessageSquare" && <MessageSquare className="w-3 h-3" />}
                    {label}
                    {val !== "vsetky" && <span className="ml-0.5 text-[10px] opacity-60">{orders.filter(o => val === "sms" ? !!o.viaSms : !o.viaSms).length}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DÁTUM */}
          <div className="border-b border-gray-200">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Dátum</span>
            </div>
            {/* Rýchle filtry */}
            <div className="px-4 pt-2.5 pb-1.5 flex flex-wrap gap-1.5">
              {(["dnes", "vcera", "tyzden"] as const).map((preset, i) => (
                <button key={preset} onClick={() => applyQuickDate(preset)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${
                    quickDate === preset ? "bg-secondary text-white border-secondary" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}>
                  {["Dnes", "Včera", "Týždeň"][i]}
                  {preset === "dnes" && quickDate === "dnes" && (
                    <span className="ml-1 font-normal opacity-80">{new Date().toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" })}</span>
                  )}
                </button>
              ))}
              <button onClick={() => applyQuickDate("mesiac")}
                className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${
                  quickDate === "mesiac" ? "bg-secondary text-white border-secondary" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}>
                Mesiac
              </button>
              {quickDate === "mesiac" && (
                <div className="inline-flex items-center gap-0.5 border border-secondary/30 rounded-sm bg-secondary/5 px-1 py-0.5">
                  <button onClick={() => stepMonth(-1)} className="p-1 text-secondary hover:bg-secondary/10 rounded-sm transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <span className="text-xs font-bold text-secondary w-20 text-center select-none">{SK_MONTHS[quickMY.m - 1]}</span>
                  <button onClick={() => stepMonth(1)} className="p-1 text-secondary hover:bg-secondary/10 rounded-sm transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                  <div className="w-px h-4 bg-secondary/20 mx-0.5" />
                  <button onClick={() => applyMonthFilter(quickMY.m, quickMY.y - 1)} className="p-1 text-secondary hover:bg-secondary/10 rounded-sm transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <span className="text-xs font-bold text-secondary w-10 text-center select-none">{quickMY.y}</span>
                  <button onClick={() => applyMonthFilter(quickMY.m, quickMY.y + 1)} className="p-1 text-secondary hover:bg-secondary/10 rounded-sm transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              )}
              <div className={`inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-sm cursor-pointer transition-all ${
                quickDate === "ndni" ? "border-secondary bg-secondary/5" : "border-gray-200 bg-white hover:border-gray-400"
              }`} onClick={() => applyQuickDate("ndni", Number(quickDays) || 7)}>
                <span className={`text-xs font-bold ${quickDate === "ndni" ? "text-secondary" : "text-gray-400"}`}>–</span>
                <input
                  type="number" min={1} max={365} value={quickDays}
                  onChange={e => { setQuickDays(e.target.value); applyQuickDate("ndni", Number(e.target.value) || 7); }}
                  onClick={e => e.stopPropagation()}
                  className={`w-8 text-xs font-bold text-center outline-none bg-transparent ${quickDate === "ndni" ? "text-secondary" : "text-gray-600"}`}
                />
                <span className={`text-xs font-bold ${quickDate === "ndni" ? "text-secondary" : "text-gray-500"}`}>dní</span>
              </div>
            </div>
            {/* Od–do row */}
            <div className="px-4 pb-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-400 font-semibold">od</span>
              <input type="date" value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setQuickDate(""); }}
                className="border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-secondary rounded-sm w-32" />
              <span className="text-[10px] text-gray-400 font-semibold">do</span>
              <input type="date" value={dateTo}
                onChange={e => { setDateTo(e.target.value); setQuickDate(""); }}
                className="border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-secondary rounded-sm w-32" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); setQuickDate(""); }}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* HĽADAJ */}
          <div>
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Hľadaj</span>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-1.5">
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Meno, firma, telefón, ID, adresa..."
                className="flex-1 border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-secondary rounded-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
      {floatingOrder && (
        <div className="bg-secondary/97 border-b border-white/10 px-4 py-1 flex items-center gap-2 text-xs shadow-sm">
          <span className="text-white/30 text-[9px]">▸</span>
          <span className="font-bold text-white truncate">{floatingOrder.clientName}</span>
          {floatingOrder.company && <span className="text-white/40 truncate hidden sm:block">{floatingOrder.company}</span>}
          <span className="text-white/40 shrink-0">{floatingOrder.tab === "pumpa" ? "Pumpa" : floatingOrder.tab === "mix" ? "Mix" : "Vl."} · {floatingOrder.totalQty} m³</span>
          <span className={`ml-auto shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-sm ${floatingOrder.status === "nova" ? "bg-blue-500 text-white" : floatingOrder.status === "potvrdena" ? "bg-yellow-400 text-secondary" : "bg-green-600 text-white"}`}>{floatingOrder.status.toUpperCase()}</span>
        </div>
      )}
      </div>

      {sortedCount === 0 ? (
        <div className="bg-white border border-gray-200 px-8 py-12 text-center text-gray-400 text-sm">
          Žiadne objednávky
        </div>
      ) : (
        <div className="space-y-2">
          {pagedOrders.map(o => {
            const isExp = expanded === o.id;
            return (
              <div key={o.id} id={`order-card-${o.id}`} className={`border shadow-sm ${o.createdAt.slice(0,10) === todayStr ? "bg-gray-50 border-gray-300" : "bg-white border-gray-200"}`}>
                <div className={`flex gap-3 py-3.5 cursor-pointer transition-colors ${o.createdAt.slice(0,10) === todayStr ? "hover:bg-gray-100" : "hover:bg-gray-50"} ${o.status === "nova" ? "pl-3 pr-4" : "px-4"}`}
                  style={o.status === "nova" ? { borderLeft: "4px solid #3b82f6" } : undefined}
                  onClick={() => {
                    const next = isExp ? null : o.id;
                    setExpanded(next);
                    if (next) {
                      requestAnimationFrame(() => {
                        const container = document.getElementById("admin-content");
                        const el = document.getElementById(`order-card-${next}`);
                        if (!container || !el) return;
                        const filterEl = container.querySelector(".sticky.top-0");
                        const filterH = filterEl ? filterEl.getBoundingClientRect().height : 52;
                        const cR = container.getBoundingClientRect();
                        const eR = el.getBoundingClientRect();
                        container.scrollTo({ top: container.scrollTop + (eR.top - cR.top) - filterH - 8, behavior: "smooth" });
                      });
                    }
                  }}>
                  {/* Left */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <TabBadge tab={o.tab} />
                      <span className="font-bold text-secondary text-base leading-tight">{o.clientName}</span>
                      {o.company && <span className="text-sm text-gray-500 truncate max-w-[120px]">{o.company}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-sm">
                      <span className="font-medium text-gray-600">{o.concreteType.replace(/ – [\d.,]+ €.*/, "")}</span>
                      <span className="font-bold text-secondary">{o.totalQty} m³</span>
                      {o.km ? <span className="text-gray-400">{o.km} km</span> : null}
                      {(o.address || o.mapPlusCode) ? (
                        <button onClick={e => { e.stopPropagation(); setMapModalOrder(o); }}
                          className="inline-flex items-center gap-1 text-primary/50 hover:text-primary transition-colors" title="Zobraziť na mape">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {o.address && <span className="text-gray-600">{o.address}</span>}
                          {!o.address && o.mapLocality && <span className="text-gray-600">{o.mapLocality.split(",")[0]}</span>}
                          {o.mapPlusCode && <span className="text-gray-400 font-mono text-[10px]">{o.mapPlusCode}</span>}
                        </button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold ${o.createdAt.slice(0,10) === todayStr ? "bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-sm" : o.createdAt.slice(0,10) === yesterdayStr ? "text-blue-500" : "text-gray-400 font-normal"}`}>{fmtDate(o.createdAt)}</span>
                      {o.viaSms
                        ? <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm"><MessageSquare className="w-2.5 h-2.5" /> SMS</span>
                        : <span className="inline-flex items-center bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-sm"><ShoppingCart className="w-3 h-3" /></span>}
                      {o.podmienky ? (() => { const ir = getOrderIsRisk(o); return (
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-sm ${ir ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-800"}`}>
                          {ir ? <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> : <span>★</span>}
                          {o.podmienky.pumpa > 0 ? `1×P+${o.podmienky.mix}×M` : `${o.podmienky.trucks}×Mix`}
                        </span>
                      ); })() : null}
                      {(o.discountBeton || o.discountDoprava || o.discountSluzby || o.discountCelkovo) ? (
                        o.discountCelkovo ? (
                          <span className="bg-primary text-secondary text-[9px] font-black px-1.5 py-0.5 rounded-sm">−{o.discountCelkovo}%</span>
                        ) : (<>
                          {o.discountBeton   ? <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">B−{o.discountBeton}%</span>   : null}
                          {o.discountDoprava ? <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">D−{o.discountDoprava}%</span> : null}
                          {o.discountSluzby  ? <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">S−{o.discountSluzby}%</span>  : null}
                        </>)
                      ) : null}
                    </div>
                  </div>
                  {/* Right */}
                  <div className="flex flex-col items-end justify-between shrink-0 gap-1.5" onClick={e => e.stopPropagation()}>
                    <div className="text-right">
                      <div className="font-black text-secondary text-base tabular-nums leading-tight">{fmtEur(o.totalSDph)}</div>
                      {o.status === "vyplatena" && o.paidAmount !== undefined && Math.abs(o.paidAmount - o.totalSDph) > 0.01 && (
                        <div className="text-[10px] tabular-nums text-teal-600 font-semibold leading-tight mt-0.5">
                          {fmtEur(o.paidAmount)} <span className="text-teal-400 font-normal">{o.paidAmount > o.totalSDph ? `+${fmtEur(o.paidAmount - o.totalSDph)}` : fmtEur(o.paidAmount - o.totalSDph)}</span>
                        </div>
                      )}
                      <div className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm mt-0.5 inline-block",
                        o.priceMode === "hotovost" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {o.priceMode === "hotovost" ? "HOT." : "FA"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <OrderStatusBadge status={o.status} orderTotal={o.totalSDph} onChange={(s, amt) => updateStatus(o.id, s, amt)} />
                      <button onClick={() => remove(o.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
                {isExp && (
                  <div className="border-t border-gray-100 bg-gray-50/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                      {/* Kontakt */}
                      <div className="px-4 py-3 space-y-1.5 text-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Kontakt</div>
                        <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Meno</span><span className="font-medium text-gray-700">{o.clientName}</span></div>
                        {o.company && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Firma</span><span className="text-gray-600">{o.company}</span></div>}
                        {o.phone && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Telefón</span><span className="text-gray-600">{formatPhone(o.phone)}</span></div>}
                        {o.email && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Email</span><span className="text-gray-600">{o.email}</span></div>}
                        {o.clientId && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">ID klienta</span><span className="text-gray-500">{o.clientId}</span></div>}
                        {o.clientId && onGoToClient && (
                          <div className="flex gap-2 items-center pt-1">
                            <span className="text-gray-400 w-20 shrink-0" />
                            <button
                              onClick={e => { e.stopPropagation(); onGoToClient(o.clientId!); }}
                              className="text-[10px] font-bold text-secondary hover:text-primary underline underline-offset-2 transition-colors flex items-center gap-1"
                            >
                              <Users className="w-4 h-4" /> Zobraziť v klientoch →
                            </button>
                          </div>
                        )}
                        {(o.discountBeton || o.discountDoprava || o.discountSluzby || o.discountCelkovo) ? (
                          <div className="flex gap-2 items-start pt-0.5">
                            <span className="text-gray-400 w-20 shrink-0 mt-0.5">Zľavy</span>
                            <div className="space-y-1.5 flex-1">
                              {/* Individuálne skupina */}
                              {(o.discountBeton || o.discountDoprava || o.discountSluzby) ? (
                                <div className="border border-gray-200 rounded-sm px-2 py-1 bg-gray-50/60">
                                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-300 mb-1">Individuálne</div>
                                  <div className="flex flex-wrap gap-1">
                                    {o.discountBeton   ? <span className="bg-primary/15 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm">Betón −{o.discountBeton}%</span>   : null}
                                    {o.discountDoprava ? <span className="bg-primary/15 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm">Doprava −{o.discountDoprava}%</span> : null}
                                    {o.discountSluzby  ? <span className="bg-primary/15 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm">Služby −{o.discountSluzby}%</span>  : null}
                                  </div>
                                </div>
                              ) : null}
                              {/* Celkovo skupina */}
                              {o.discountCelkovo ? (
                                <div className="border border-primary/30 rounded-sm px-2 py-1 bg-primary/5">
                                  <div className="text-[8px] font-black uppercase tracking-widest text-primary/50 mb-1">Celkovo</div>
                                  <span className="bg-primary text-secondary text-[10px] font-black px-2 py-0.5 rounded-sm">−{o.discountCelkovo}%</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {/* Detail dopravy + poznámka */}
                      <div className="px-4 py-3 space-y-1.5 text-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Objednávka</div>
                        <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Dátum</span><span className="text-gray-500">{fmtDate(o.createdAt)}</span></div>
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
                        <div className="flex gap-2 items-center"><span className="text-gray-400 w-24 shrink-0">Typ</span>
                          <span className="inline-flex items-center gap-1 font-bold text-gray-800">
                            <span className={`inline-flex items-center justify-center ${o.tab === "pumpa" ? "text-amber-600" : o.tab === "mix" ? "text-blue-600" : "text-green-600"}`}>
                              {o.tab === "pumpa"
                                ? <svg width="14" height="9" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="12" width="24" height="6" rx="1"/><rect x="22" y="9" width="9" height="9" rx="1"/><rect x="8" y="8" width="3" height="4" rx="0.5"/><line x1="9.5" y1="8" x2="3" y2="2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="3" y1="2" x2="22" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="6" cy="19" r="3"/><circle cx="14" cy="19" r="3"/><circle cx="27" cy="19" r="3"/></svg>
                                : o.tab === "mix"
                                ? <svg width="14" height="9" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="12" width="24" height="6" rx="1"/><rect x="22" y="9" width="9" height="9" rx="1"/><ellipse cx="12" cy="9" rx="9" ry="6"/><circle cx="6" cy="19" r="3"/><circle cx="20" cy="19" r="3"/><circle cx="27" cy="19" r="3"/></svg>
                                : <svg width="14" height="9" viewBox="0 0 38 22" fill="currentColor"><rect x="1" y="10" width="30" height="8" rx="1"/><path d="M4 10 L9 4 L24 4 L28 10"/><circle cx="8" cy="19" r="3"/><circle cx="24" cy="19" r="3"/></svg>
                              }
                            </span>
                            {tabLabel[o.tab]}
                          </span>
                        </div>
                        <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Množstvo</span>
                          <span className="font-bold text-gray-800">{o.totalQty} m³{(o.fillupM3 ?? 0) > 0 && <span className="text-[10px] text-amber-600 ml-1 font-normal">(+ {o.fillupM3} m³ doťaženie)</span>}</span>
                        </div>
                        {(o.fillupM3 ?? 0) > 0 && (
                          <div className="flex gap-2 items-start">
                            <span className="text-gray-400 w-24 shrink-0 pt-1.5">Doťaženie</span>
                            <div className="bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 flex-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                                <span>{o.totalQty} m³</span>
                                <span className="text-amber-400 font-bold">→</span>
                                <span className="text-amber-600">+{o.fillupM3} m³</span>
                                <span className="text-amber-400 font-bold">→</span>
                                <span className="font-black">{o.fillupTarget} m³/auto</span>
                              </div>
                              {o.podmienky && (() => { const ir = getOrderIsRisk(o); return (
                                <div className={`flex items-start gap-1.5 mt-1 px-2 py-1.5 rounded-sm ${ir ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
                                  {ir ? <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" /> : <span className="text-amber-600 text-[10px] font-black">★</span>}
                                  <div>
                                    <div className={`text-[10px] font-black uppercase tracking-wide ${ir ? "text-red-600" : "text-amber-700"}`}>{ir ? "Minusové pretaženie — vlastné riziko" : "Pretaženie — terén/počasie"}</div>
                                    <div className={`text-[10px] ${ir ? "text-red-500" : "text-amber-600"}`}>{o.podmienky.pumpa > 0 ? `1× Pumpa + ${o.podmienky.mix}× Mix` : `${o.podmienky.trucks}× Mix`} · ∅ {o.podmienky.m3PerTruck?.toFixed(1) ?? "—"} m³/vozidlo</div>
                                  </div>
                                </div>
                              ); })()}
                            </div>
                          </div>
                        )}
                        {o.podmienky && (o.fillupM3 ?? 0) === 0 && (() => { const ir = getOrderIsRisk(o); return (
                          <div className="flex gap-2 items-start">
                            <span className="text-gray-400 w-24 shrink-0 mt-0.5">Podmienky</span>
                            <div className={`flex items-start gap-1.5 px-2 py-1.5 rounded-sm ${ir ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
                              {ir ? <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" /> : <span className="text-amber-600 text-[10px] font-black mt-0.5">★</span>}
                              <div>
                                <div className={`text-[10px] font-black uppercase tracking-wide ${ir ? "text-red-600" : "text-amber-700"}`}>{ir ? "Minusové pretaženie — vlastné riziko" : "Pretaženie"}</div>
                                <div className={`text-[10px] ${ir ? "text-red-500" : "text-amber-600"}`}>{o.podmienky.pumpa > 0 ? `1× Pumpa + ${o.podmienky.mix}× Mix` : `${o.podmienky.trucks}× Mix`} · ∅ {o.podmienky.m3PerTruck?.toFixed(1) ?? "—"} m³/vozidlo</div>
                              </div>
                            </div>
                          </div>
                        ); })()}
                        {o.km && <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Vzdialenosť</span><span className="font-medium text-gray-700">{o.km} km</span></div>}
                        {(o.address || o.mapPlusCode) && (
                          <div className="flex gap-2 items-start">
                            <span className="text-gray-400 w-24 shrink-0">Adresa</span>
                            <span className="text-gray-600 break-words flex-1">
                              {o.address && <span>{o.address}</span>}
                              {o.mapPlusCode && (
                                <span className="flex items-center gap-1 mt-0.5">
                                  <span className="text-gray-400 text-[10px] font-mono">{o.mapPlusCode}{o.mapLocality ? ` · ${o.mapLocality}` : ""}</span>
                                  <button onClick={e => { e.stopPropagation(); const txt = `${o.mapPlusCode}${o.mapLocality ? " " + o.mapLocality : ""}`; navigator.clipboard?.writeText(txt); setCopiedPlusCode(o.id); setTimeout(() => setCopiedPlusCode(null), 1500); }}
                                    className="text-gray-300 hover:text-blue-500 transition-colors" title="Kopírovať Plus Code">
                                    {copiedPlusCode === o.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </span>
                              )}
                            </span>
                            {(o.mapPlusCode || o.address) && (
                              <button onClick={e => { e.stopPropagation(); setMapModalOrder(o); }}
                                className="shrink-0 text-blue-400 hover:text-blue-600 transition-colors" title="Zobraziť na mape">
                                <MapPin className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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
                        <div className="border-t-2 border-primary/20">
                          {/* Kalkulácia header */}
                          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/5 border-b border-secondary/10">
                            <Calculator className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Kalkulácia</span>
                            <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-sm", o.priceMode === "hotovost" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                              {o.priceMode === "hotovost" ? "Hotovosť" : "Faktúra"}
                            </span>
                            <button onClick={e => { e.stopPropagation(); exportOrderPDF(o); }}
                              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-secondary border border-secondary/30 rounded-sm hover:bg-secondary hover:text-white transition-all">
                              <FileText className="w-3 h-3" />
                              <span className="hidden sm:inline">PDF</span>
                            </button>
                          </div>
                          <div className="px-4 py-3">
                            {parsed ? (
                              <div className="space-y-2">
                                {parsed.s.map((sec, si) => (
                                  <div key={si}>
                                    <div className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 mb-1 rounded-sm",
                                      sec.h.startsWith("Pridaná") || sec.h.startsWith("Produkty") ? "bg-primary/20 text-secondary" : "bg-gray-100 text-gray-500 ml-2")}>
                                      {sec.h}
                                    </div>
                                    {sec.rows.map((row, ri) => {
                                      const isRiskRow = row.l?.includes("Minusové pretaženie");
                                      const isPretazenieRow = !isRiskRow && row.l?.startsWith("★ Pretaženie");
                                      return (
                                        <div key={ri} className={cn(
                                          "flex justify-between items-baseline text-xs gap-4 py-0.5 rounded-sm",
                                          sec.h.startsWith("Pridaná") || sec.h.startsWith("Produkty") ? "pl-1" : "pl-4",
                                          isRiskRow ? "bg-red-50 px-2 py-1 rounded-sm" : isPretazenieRow ? "bg-amber-50 px-2 py-1 rounded-sm" : ""
                                        )}>
                                          <span className={isRiskRow ? "text-red-600 font-semibold" : isPretazenieRow ? "text-amber-700 font-semibold" : "text-gray-500"}>
                                            {row.l}
                                          </span>
                                          <span className="shrink-0 text-right">
                                            {row.o !== undefined && <span className="line-through text-gray-300 text-[10px] mr-1">{fmtEur(row.o)}</span>}
                                            <span className={cn("font-bold", isRiskRow ? "text-red-600" : isPretazenieRow ? "text-amber-700" : row.o !== undefined ? "text-primary" : "text-gray-700")}>{fmtEur(row.v)}</span>
                                          </span>
                                        </div>
                                      );
                                    })}
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
                            {/* Celková suma */}
                            <div className="mt-3 pt-2.5 border-t border-gray-200 space-y-1">
                              {o.priceMode !== "hotovost" && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-400">Bez DPH</span>
                                  <span className="font-semibold text-gray-600">{fmtEur(o.totalBezDph)}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center bg-secondary rounded-sm px-3 py-2">
                                <span className="text-xs font-bold text-white/70">{o.priceMode === "hotovost" ? "Spolu" : "Spolu s DPH"}</span>
                                <span className="text-lg font-black text-primary">{fmtEur(o.totalSDph)}</span>
                              </div>
                              {o.paidAmount !== undefined && o.status === "vyplatena" && (
                                <div className="flex justify-between items-center bg-teal-50 border border-teal-200 rounded-sm px-3 py-2 mt-1.5">
                                  <div>
                                    <div className="text-xs font-bold text-teal-700">Vyplatená suma</div>
                                    {Math.abs(o.paidAmount - o.totalSDph) > 0.01 && (
                                      <div className="text-[10px] text-teal-500">
                                        {o.paidAmount > o.totalSDph
                                          ? `+${(o.paidAmount - o.totalSDph).toFixed(2)} € tringelt`
                                          : `${(o.paidAmount - o.totalSDph).toFixed(2)} € rozdiel`}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-lg font-black text-teal-700">{fmtEur(o.paidAmount)}</span>
                                </div>
                              )}
                            </div>
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

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 px-4 py-2.5">
          <span className="text-xs text-gray-400">
            Strana {ordersPage + 1} z {totalPages} · {sortedCount} {sortedCountLabel}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setOrdersPage(0)} disabled={ordersPage === 0}
              className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">«</button>
            <button onClick={() => setOrdersPage(p => Math.max(0, p - 1))} disabled={ordersPage === 0}
              className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - ordersPage) <= 1)
              .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                if (idx > 0 && (arr[idx - 1] as number) < i - 1) acc.push("…");
                acc.push(i);
                return acc;
              }, [])
              .map((item, idx) => item === "…"
                ? <span key={`e${idx}`} className="px-1 text-xs text-gray-300">…</span>
                : <button key={item} onClick={() => setOrdersPage(item as number)}
                    className={`min-w-[28px] px-1.5 py-1 text-xs font-bold rounded transition-colors ${ordersPage === item ? "bg-secondary text-white" : "text-gray-500 hover:text-secondary"}`}>
                    {(item as number) + 1}
                  </button>
              )}
            <button onClick={() => setOrdersPage(p => Math.min(totalPages - 1, p + 1))} disabled={ordersPage === totalPages - 1}
              className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
            <button onClick={() => setOrdersPage(totalPages - 1)} disabled={ordersPage === totalPages - 1}
              className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">»</button>
          </div>
        </div>
      )}

      {/* ── Map modal ── */}
      {mapModalOrder && (() => {
        const query = mapModalOrder.mapPlusCode
          ? `${mapModalOrder.mapPlusCode}${mapModalOrder.mapLocality ? " " + mapModalOrder.mapLocality : ""}`
          : mapModalOrder.address ?? "";
        const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&t=h&output=embed`;
        const mapsUrl  = `https://maps.google.com/?q=${encodeURIComponent(query)}`;
        const isGpsAddr = /^\s*-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+\s*$/.test(mapModalOrder.address ?? "");
        const humanAddr = !isGpsAddr ? (mapModalOrder.address ?? "") : "";
        const gpsAddr   = isGpsAddr  ? (mapModalOrder.address ?? "") : "";
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setMapModalOrder(null)}>
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-lg"
              onClick={e => e.stopPropagation()}>
              <div className="bg-secondary text-white px-4 py-3 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm uppercase tracking-widest">Poloha doručenia</div>
                  {/* 1. Human address (non-GPS) */}
                  {humanAddr && <div className="text-white/80 text-xs truncate">{humanAddr}</div>}
                  {/* 2. Plus Code + locality */}
                  {mapModalOrder.mapPlusCode && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40 text-[10px] font-mono truncate">{mapModalOrder.mapPlusCode}{mapModalOrder.mapLocality ? ` · ${mapModalOrder.mapLocality}` : ""}</span>
                      <button onClick={() => { const txt = `${mapModalOrder.mapPlusCode}${mapModalOrder.mapLocality ? " " + mapModalOrder.mapLocality : ""}`; navigator.clipboard?.writeText(txt); setCopiedPlusCode(mapModalOrder.id); setTimeout(() => setCopiedPlusCode(null), 1500); }}
                        className="shrink-0 text-white/30 hover:text-primary transition-colors" title="Kopírovať Plus Code">
                        {copiedPlusCode === mapModalOrder.id ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                  {/* 3. GPS fallback — only if no human address */}
                  {!humanAddr && gpsAddr && <div className="text-white/30 text-[10px] font-mono truncate">{gpsAddr}</div>}
                </div>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-secondary text-xs font-black rounded-lg hover:bg-primary/80 transition-colors shrink-0">
                  <Navigation className="w-3.5 h-3.5" /> Navigovať
                </a>
                <button onClick={() => setMapModalOrder(null)} className="text-white/40 hover:text-white transition-colors ml-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <iframe
                title="Mapa doručenia"
                src={embedUrl}
                className="w-full border-0"
                style={{ height: 340 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        );
      })()}
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

function DiscountGroupEditor({
  beton, doprava, sluzby, celkovo, onChange,
}: {
  beton: number; doprava: number; sluzby: number; celkovo: number;
  onChange: (v: { beton: number; doprava: number; sluzby: number; celkovo: number }) => void;
}) {
  const [mode, setMode] = useState<"ind" | "celk">(() => celkovo > 0 ? "celk" : "ind");

  // Len zmení lokálny mode — žiadny onChange, DB sa neaktualizuje
  const activate = (m: "ind" | "celk") => setMode(m);

  const boxes: { label: string; value: number; group: "ind" | "celk"; onCh: (v: number) => void }[] = [
    { label: "Betón",   value: beton,   group: "ind",  onCh: v => onChange({ beton: v, doprava, sluzby, celkovo: 0 }) },
    { label: "Doprava", value: doprava, group: "ind",  onCh: v => onChange({ beton, doprava: v, sluzby, celkovo: 0 }) },
    { label: "Služby",  value: sluzby,  group: "ind",  onCh: v => onChange({ beton, doprava, sluzby: v, celkovo: 0 }) },
    { label: "Celkovo", value: celkovo, group: "celk", onCh: v => onChange({ beton: 0, doprava: 0, sluzby: 0, celkovo: v }) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {boxes.map(({ label, value, group, onCh }) => {
        const blocked = group !== mode;
        const hasValue = value > 0;
        return (
          <div key={label}
            className={cn("border px-2 py-2 text-center transition-all",
              blocked
                ? "bg-gray-50 border-gray-100 opacity-40 cursor-pointer hover:opacity-60"
                : hasValue
                  ? "bg-primary/10 border-primary/40"
                  : "bg-primary/5 border-primary/20")}
            onClick={() => { if (blocked) activate(group); }}>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">{label}</div>
            {blocked ? (
              <div className="text-[10px] text-gray-400 font-bold py-1.5">{group === "celk" ? "— ind." : "= Celkovo"}</div>
            ) : (
              <div className="flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                <input
                  type="number" min="0" max="100"
                  value={String(value)}
                  onChange={e => { const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0)); onCh(v); }}
                  onFocus={e => e.target.select()}
                  className={cn("border-0 px-0.5 py-0 text-xl font-black focus:outline-none w-16 text-center bg-transparent leading-none",
                    hasValue ? "text-primary" : "text-gray-300")}
                />
                <span className={cn("text-sm font-bold leading-none", hasValue ? "text-primary/70" : "text-gray-300")}>%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KlientiTab({ expandClientId, onExpanded }: { expandClientId?: string | null; onExpanded?: () => void }) {
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

  useEffect(() => {
    if (!tablePdfModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // ak je aktívny input → EditRow to rieši sám; popup ostáva otvorený
      if (document.activeElement?.tagName === "INPUT") return;
      setTablePdfModal(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [tablePdfModal]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [clientDetailTab, setClientDetailTab] = useState<Record<string, "detail" | "calc">>({});
  const [sendCredState, setSendCredState] = useState<Record<string, "idle" | "loading" | "ok" | "error">>({});
  const emptyForm = {
    firstName: "", lastName: "", company: "", email: "", phone: "",
    loginId: "", password: "1234",
    discountBeton: "20", discountDoprava: "0", discountSluzby: "0", discountCelkovo: "0",
    hotovostDph: "20",
    canHotovost: true, canPridatBeton: true, canZimneOpatrenia: false, active: true,
    smsOrderDisabled: false, smsShareOnly: false, allowExtraOverload: true,
    deliveryZoneId: zones.find(z => (z.pricingType ?? "standard") === "standard")?.id ?? zones[0]?.id ?? "",
    sharedLink: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [showFormPass, setShowFormPass] = useState(false);
  const [phoneHighlight, setPhoneHighlight] = useState(false);
  const [sendRegEmail, setSendRegEmail] = useState(true);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [sysDphOpen, setSysDphOpen] = useState(false);
  const [editingLinkFor, setEditingLinkFor] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState("");

  const save = (data: Client[]) => { setClients(data); adminData.saveClients(data); };

  // Refresh ts from external changes (e.g. Doprava tab) without remounting/closing expanded
  useEffect(() => {
    const handler = () => setTs(adminData.getTransportSettings());
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);

  const scrollToClientCard = (id: string) => {
    setTimeout(() => {
      const container = document.getElementById("admin-content");
      const toolbar = document.getElementById("klienti-toolbar");
      if (!container) return;
      const cR = container.getBoundingClientRect();
      const toolbarH = toolbar?.getBoundingClientRect().height ?? 82;
      // Always reserve floating indicator height — it will appear after scroll even if not visible yet
      const floatingEl = document.getElementById("floating-client-indicator");
      const floatingH = floatingEl ? floatingEl.getBoundingClientRect().height : 32;
      const targetEl = document.getElementById(`client-tabs-${id}`) ?? document.getElementById(`client-card-${id}`);
      if (!targetEl) return;
      const eR = targetEl.getBoundingClientRect();
      container.scrollTo({ top: container.scrollTop + (eR.top - cR.top) - toolbarH - floatingH - 4, behavior: "smooth" });
    }, 250);
  };

  useEffect(() => {
    if (!expandClientId) return;
    const c = clients.find(cl => cl.loginId === expandClientId);
    if (c) {
      setExpanded(c.id);
      scrollToClientCard(c.id);
    }
    onExpanded?.();
  }, [expandClientId]);

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
      hotovostDph: (() => { const v = parseFloat(form.hotovostDph); return Number.isNaN(v) ? 0.20 : v / 100; })(),
      canHotovost: form.canHotovost, canPridatBeton: form.canPridatBeton,
      canZimneOpatrenia: form.canZimneOpatrenia,
      smsOrderDisabled: form.smsOrderDisabled || undefined,
      smsShareOnly: form.smsShareOnly || undefined,
      allowExtraOverload: form.allowExtraOverload ? undefined : false,
      active: form.active,
      deliveryZoneId: form.deliveryZoneId || undefined,
      sharedLink: form.sharedLink.trim() || undefined,
      createdAt: new Date().toISOString(),
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
  const compactK = (s: string) => s.replace(/\s/g, "");
  const searchTerms = search.trim().split(/\s+/).filter(Boolean);
  const filtered = clients.filter(c => {
    if (!searchTerms.length) return true;
    const haystack = [c.firstName, c.lastName, c.company, c.email, c.phone, c.loginId].filter(Boolean).join(" ");
    const haystackN = normK(haystack);
    const haystackC = compactK(haystackN);
    return searchTerms.every(t => {
      const tn = normK(t);
      return haystackN.includes(tn) || haystackC.includes(compactK(tn));
    });
  });

  const [floatingClient, setFloatingClient] = useState<Client | null>(null);
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  useEffect(() => {
    const container = document.getElementById("admin-content");
    if (!container) return;
    const onScroll = () => {
      const sticky = document.getElementById("klienti-sticky");
      const tbBottom = sticky ? sticky.getBoundingClientRect().bottom : 82;
      const cards = container.querySelectorAll("[id^='client-card-']");
      let last: Client | null = null;
      for (const el of Array.from(cards)) {
        if (el.getBoundingClientRect().top < tbBottom - 4) {
          const id = el.id.replace("client-card-", "");
          const found = filteredRef.current.find(c => c.id === id);
          if (found) last = found;
        } else break;
      }
      setFloatingClient(prev => prev?.id === last?.id ? prev : last);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => { container.removeEventListener("scroll", onScroll); };
  }, []);

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
                        <ShieldOff className="w-4 h-4" /> Vypnúť ({enabledCount})
                      </button>
                    )}
                    {disabledCount > 0 && (
                      <button
                        onClick={() => {
                          if (!confirm(`Zapnúť Hotovosť VŠETKÝM ${disabledCount} klientom?`)) return;
                          save(clients.map(c => ({ ...c, canHotovost: true })));
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 text-green-700 font-bold text-[10px] hover:bg-green-100 transition-colors uppercase tracking-wide">
                        <ShieldCheck className="w-4 h-4" /> Zapnúť ({disabledCount})
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>}
      </div>

      {/* Sticky toolbar — search + table header + floating client indicator */}
      <div id="klienti-sticky" className="sticky top-0 z-20">
      <div id="klienti-toolbar" className="shadow-sm">
        <div className="py-2 px-1 bg-white border-b border-gray-100">
          <input placeholder="Hľadať klienta..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 text-secondary placeholder:text-gray-400 px-4 py-2.5 text-sm focus:outline-none rounded border border-gray-200 focus:border-primary" />
        </div>
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
          <div className="hidden sm:flex w-40 shrink-0 items-center justify-end">
            {/* spacer pre badge stĺpec — zrkadlí šírku badge sekcie v riadkoch */}
          </div>
          <div className="flex items-center justify-end w-40 shrink-0">
            <button onClick={() => { setAdding(true); setExpanded(null); }} title="Pridať klienta"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-secondary font-black text-[10px] hover:bg-primary/90 shrink-0 uppercase tracking-wide">
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {floatingClient && (
        <div id="floating-client-indicator" className="bg-secondary/97 border-b border-white/10 px-4 py-1 flex items-center gap-2 text-xs shadow-sm">
          <span className="text-white/30 text-[9px]">▸</span>
          {floatingClient.isOwner && <Crown className="w-3 h-3 text-primary shrink-0" />}
          <span className="font-bold text-white truncate">{[floatingClient.firstName, floatingClient.lastName].filter(Boolean).join(" ") || floatingClient.company || "—"}</span>
          {floatingClient.company && <span className="text-white/40 truncate hidden sm:block">{floatingClient.company}</span>}
          {(floatingClient.discountCelkovo ?? 0) > 0 && <span className="text-primary text-[9px] font-black ml-auto shrink-0">−{floatingClient.discountCelkovo}% celk.</span>}
        </div>
      )}
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
                <input placeholder="Meno *" value={form.firstName} onChange={e => {
                  const v = e.target.value;
                  const phoneMatch = v.match(/^(\+?(?:00421|421|0)[0-9\s\-]{7,})/);
                  const extracted = phoneMatch ? formatPhone(phoneMatch[1].trim()) : "";
                  setForm(f => {
                    if (extracted) {
                      if (!f.phone) {
                        setPhoneHighlight(true);
                        setTimeout(() => setPhoneHighlight(false), 1200);
                      }
                      return { ...f, firstName: v, phone: extracted };
                    }
                    return { ...f, firstName: v };
                  });
                }} className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" autoFocus />
                <input placeholder="Priezvisko" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <input placeholder="E-Mail" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <PhoneInput value={form.phone} onChange={v => setForm({ ...form, phone: v })}
                  placeholder="0944 xxx xxx"
                  className={`px-3 py-2 text-sm focus:outline-none transition-all duration-300 ${phoneHighlight ? "border-2 border-teal-400 bg-teal-50 shadow-[0_0_0_3px_rgba(45,212,191,0.25)]" : "border border-gray-200 focus:border-primary"}`} />
                <input placeholder="Spoločnosť" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary sm:col-span-2" />
                <div className="relative sm:col-span-2">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input placeholder="Zdielaný odkaz (Google Sheet, PDF…)" value={form.sharedLink} onChange={e => setForm({ ...form, sharedLink: e.target.value })}
                    className="w-full border border-gray-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-primary" type="url" />
                </div>
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
              <DiscountGroupEditor
                beton={parseInt(form.discountBeton) || 0}
                doprava={parseInt(form.discountDoprava) || 0}
                sluzby={parseInt(form.discountSluzby) || 0}
                celkovo={parseInt(form.discountCelkovo) || 0}
                onChange={v => setForm({
                  ...form,
                  discountBeton: String(v.beton),
                  discountDoprava: String(v.doprava),
                  discountSluzby: String(v.sluzby),
                  discountCelkovo: String(v.celkovo),
                })}
              />
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
                        <span className="text-[10px] text-gray-400 italic">· iba betón</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-gray-400">Iba faktúra · DPH <span className="font-bold text-gray-500">23 %</span></div>
                    )}
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canPridatBeton} onChange={e => setForm({ ...form, canPridatBeton: e.target.checked })} className="accent-secondary w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">Pridať položku (betón)</span>
                    <div className="text-[11px] text-gray-400">Zobrazí tlačidlo „+ Pridať položku" v kalkulačke</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canZimneOpatrenia} onChange={e => setForm({ ...form, canZimneOpatrenia: e.target.checked })} className="accent-blue-600 w-5 h-5 shrink-0" />
                  <span className="text-sm text-gray-700">Zimné opatrenia (auto-ON v zime)</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.smsOrderDisabled} onChange={e => setForm({ ...form, smsOrderDisabled: e.target.checked })} className="accent-orange-500 w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">SMS — nevytvárať objednávku</span>
                    <div className="text-[11px] text-gray-400">Klik SMS odošle iba text, bez vytvorenia objednávky</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.smsShareOnly} onChange={e => setForm({ ...form, smsShareOnly: e.target.checked })} className="accent-orange-500 w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">SMS — zobraziť share menu</span>
                    <div className="text-[11px] text-gray-400">Namiesto auto-otvorenia SMS aplikácie · zdieľacie okno</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.allowExtraOverload} onChange={e => setForm({ ...form, allowExtraOverload: e.target.checked })} className="accent-red-500 w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">Minusové pretaženie</span>
                    <div className="text-[11px] text-gray-400">Povolí ísť pod min. limit vozidiel (Pumpa min. {ts.condPumpaMin ?? 1} voz., Mix min. {ts.condMixMin ?? 0} voz.)</div>
                  </div>
                </label>
                <div className="px-3 py-3">
                  <div className="text-xs text-gray-400 mb-1.5">Typ dopravy</div>
                  {(() => {
                    const selZ = zones.find(z => z.id === form.deliveryZoneId) ?? zones[0];
                    const selType = selZ?.pricingType ?? "standard";
                    const kmZones = zones.filter(z => z.pricingType === "km");
                    const btnCls = (active: boolean) => `py-1.5 px-2 text-xs font-semibold border rounded transition-colors ${active ? "bg-secondary text-white border-secondary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`;
                    const typeRow = zones.filter((z, i, arr) => {
                      if (z.pricingType === "km") return arr.findIndex(x => x.pricingType === "km") === i;
                      return true;
                    });
                    return (
                      <div className="space-y-1">
                        <div className="flex gap-1 flex-wrap">
                          {typeRow.map(z => {
                            const isKmGroup = z.pricingType === "km";
                            const isActive = isKmGroup ? selType === "km" : (form.deliveryZoneId ?? zones[0]?.id) === z.id;
                            return (
                              <button key={z.id} type="button"
                                onClick={() => {
                                  if (isKmGroup && selType !== "km") { const first = kmZones[0]; if (first) setForm({ ...form, deliveryZoneId: first.id }); }
                                  else if (!isKmGroup) setForm({ ...form, deliveryZoneId: z.id });
                                }}
                                className={btnCls(isActive)}>
                                {isKmGroup ? "Kilometre" : z.name}
                              </button>
                            );
                          })}
                        </div>
                        {selType === "km" && kmZones.length > 1 && (
                          <div className="flex gap-1 pl-2 border-l-2 border-primary/30">
                            {kmZones.map(z => (
                              <button key={z.id} type="button"
                                onClick={() => setForm({ ...form, deliveryZoneId: z.id })}
                                className={btnCls((form.deliveryZoneId ?? zones[0]?.id) === z.id)}>
                                {z.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {(() => {
                    const selZ = zones.find(z => z.id === form.deliveryZoneId) ?? zones[0];
                    if (!selZ) return null;
                    const pt = selZ.pricingType ?? "standard";
                    if (pt === "km") return (
                      <div className="mt-1.5 text-[11px] text-blue-600 font-medium space-y-0.5">
                        <div>Sadzba: <strong>{selZ.ratePerKm?.toFixed(2)} €/km</strong></div>
                        {selZ.minimumFeeKm != null && <div>Min. poplatok: <strong>{selZ.minimumFeeKm.toFixed(2)} €/auto</strong></div>}
                        {(selZ.minKm ?? 0) > 0 && <div>Min. vzdialenosť: <strong>{selZ.minKm} km</strong></div>}
                        {(selZ.maxKm ?? 0) > 0 && <div>Max. polomer: <strong>{selZ.maxKm} km</strong></div>}
                      </div>
                    );
                    if (pt === "auto") return (
                      <div className="mt-1.5 text-[11px] text-blue-600 font-medium space-y-0.5">
                        <div>Paušál: <strong>{selZ.ratePerTruck?.toFixed(2)} €/auto</strong></div>
                        {selZ.minimumFeeAuto != null && <div>Min. poplatok: <strong>{selZ.minimumFeeAuto.toFixed(2)} €/auto</strong></div>}
                        {(selZ.minTrucks ?? 0) > 0 && <div>Min. áut: <strong>{selZ.minTrucks}</strong></div>}
                        {(selZ.maxTrucks ?? 0) > 0 && <div>Max. áut: <strong>{selZ.maxTrucks}</strong></div>}
                      </div>
                    );
                    const pz = adminData.getTransportZones();
                    if (pz.length > 0) return (
                      <div className="mt-1.5 text-[11px] text-blue-600 font-medium">
                        Pásma: <strong>{pz[0].ratePerM3.toFixed(2)} – {pz[pz.length - 1].ratePerM3.toFixed(2)} €/m³</strong>
                      </div>
                    );
                    return null;
                  })()}
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
            <div key={c.id} id={`client-card-${c.id}`} className={cn("border shadow-sm overflow-hidden", c.isOwner ? "bg-amber-50 border-primary/40" : "bg-white border-gray-200")}>
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { const next = isExpanded ? null : c.id; setExpanded(next); if (next) scrollToClientCard(next); }}>
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

                {/* Desktop: badge stĺpec — pevná šírka zodpovedá header spaceru */}
                <div className="hidden sm:flex w-40 shrink-0 items-center justify-end gap-1">
                  {clientZone && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-blue-50 text-blue-600 border border-blue-200">
                      <Truck className="w-4 h-4" />
                      {zonePricingType === "km" ? "€/km" : zonePricingType === "auto" ? "€/auto" : "Štd"}
                    </span>
                  )}
                  {hasLogin ? (
                    <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.active ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                      {c.active ? "Aktívny" : "Neaktívny"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm bg-gray-100 text-gray-400">
                      <LogIn className="w-4 h-4" /> Bez prístupu
                    </span>
                  )}
                </div>
                {/* Ikona tlačidlá — pevná šírka zodpovedá header akciám */}
                <div className="flex items-center justify-end w-40 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(c.id); setClientDetailTab(prev => ({ ...prev, [c.id]: "calc" })); scrollToClientCard(c.id); }}
                    title="Kalkulačka klienta"
                    className="p-1.5 text-gray-300 hover:text-primary transition-colors">
                    <Calculator className="w-5 h-5" />
                  </button>
                  {c.sharedLink && (
                    <a href={c.sharedLink} target="_blank" rel="noopener noreferrer" title="Zdielaný odkaz"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 text-gray-300 hover:text-primary transition-colors">
                      {(() => { const { Icon, cls } = sharedLinkIcon(c.sharedLink); return <Icon className={`w-5 h-5 ${cls}`} />; })()}
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setTablePdfModal(c); setTablePdfMode("faktura"); }}
                    title="Zľavové tabuľky"
                    className="p-1.5 text-gray-300 hover:text-secondary transition-colors">
                    <Table2 className="w-5 h-5" />
                  </button>
                  {c.id !== SYSTEM_OWNER_ID && (
                    <button onClick={(e) => { e.stopPropagation(); remove(c.id); }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <span className="p-1 text-gray-300">
                    {isExpanded ? <ChevronUp className="w-5 h-5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4" />}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50">

                  {/* Tab bar: Detail | Kalkulačka */}
                  <div id={`client-tabs-${c.id}`} className="flex border-b border-gray-200">
                    <button
                      onClick={() => setClientDetailTab(prev => ({ ...prev, [c.id]: "detail" }))}
                      className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wide transition-all", (clientDetailTab[c.id] ?? "detail") === "detail" ? "bg-secondary text-white" : "bg-white text-gray-400 hover:text-secondary hover:bg-secondary/5")}
                    >
                      <ClipboardList className={cn("w-5 h-5 shrink-0", (clientDetailTab[c.id] ?? "detail") === "detail" ? "text-primary" : "")} />
                      Detail
                    </button>
                    <button
                      onClick={() => setClientDetailTab(prev => ({ ...prev, [c.id]: "calc" }))}
                      className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wide transition-all", clientDetailTab[c.id] === "calc" ? "bg-secondary text-white" : "bg-white text-gray-400 hover:text-secondary hover:bg-secondary/5")}
                    >
                      <Calculator className={cn("w-5 h-5 shrink-0", clientDetailTab[c.id] === "calc" ? "text-primary" : "")} />
                      Kalkulačka
                    </button>
                  </div>

                  {(clientDetailTab[c.id] ?? "detail") === "detail" && (<>

                  {/* Zľavy klienta */}
                  <div className="px-4 py-4 bg-white border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Zľavy klienta</p>
                    <DiscountGroupEditor
                      beton={(c.discountBeton as number) ?? 0}
                      doprava={(c.discountDoprava as number) ?? 0}
                      sluzby={(c.discountSluzby as number) ?? 0}
                      celkovo={(c.discountCelkovo as number) ?? 0}
                      onChange={v => update(c.id, {
                        discountBeton: v.beton,
                        discountDoprava: v.doprava,
                        discountSluzby: v.sluzby,
                        discountCelkovo: v.celkovo,
                      })}
                    />
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
                        {c.createdAt && (
                          <div className="flex gap-2 items-center pt-1 border-t border-gray-100 mt-1">
                            <span className="text-gray-400 text-xs w-20 shrink-0">Vytvorený</span>
                            <span className="text-gray-600 text-xs font-medium">
                              {new Date(c.createdAt).toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-400 text-xs w-20 shrink-0">Prihlásený</span>
                          <span className={`text-xs font-medium ${c.lastLoginAt ? "text-gray-600" : "text-gray-300"}`}>
                            {c.lastLoginAt
                              ? new Date(c.lastLoginAt).toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" })
                              : "—"}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-400 text-xs w-20 shrink-0">Odkaz</span>
                          {editingLinkFor === c.id ? (
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <input autoFocus type="url" value={linkDraft} onChange={e => setLinkDraft(e.target.value)}
                                placeholder="https://…"
                                onKeyDown={e => { if (e.key === "Enter") { update(c.id, { sharedLink: linkDraft.trim() || undefined }); setEditingLinkFor(null); } if (e.key === "Escape") setEditingLinkFor(null); }}
                                className="flex-1 min-w-0 border border-primary px-2 py-0.5 text-xs focus:outline-none" />
                              <button onClick={() => { update(c.id, { sharedLink: linkDraft.trim() || undefined }); setEditingLinkFor(null); }} className="text-green-600 hover:text-green-700 shrink-0"><Check className="w-5 h-5" /></button>
                              <button onClick={() => setEditingLinkFor(null)} className="text-gray-400 hover:text-red-500 shrink-0"><X className="w-5 h-5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {c.sharedLink ? (
                                <a href={c.sharedLink} target="_blank" rel="noopener noreferrer" title={c.sharedLink}
                                  className="transition-colors hover:opacity-70">
                                  {(() => { const { Icon, cls } = sharedLinkIcon(c.sharedLink); return <Icon className={`w-5 h-5 ${cls}`} />; })()}
                                </a>
                              ) : (
                                <span className="text-gray-400 text-[10px]">— Google Sheet, PDF, Word</span>
                              )}
                              <button onClick={() => { setLinkDraft(c.sharedLink || ""); setEditingLinkFor(c.id); }}
                                className="p-2 text-gray-300 hover:text-secondary transition-colors">
                                <Pencil className="w-5 h-5" />
                              </button>
                              {c.sharedLink && (
                                <button onClick={() => update(c.id, { sharedLink: undefined })}
                                  className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
                              const phoneMatch = v.match(/^(\+?(?:00421|421|0)[0-9\s\-]{7,})/);
                              const extracted = phoneMatch ? formatPhone(phoneMatch[1].trim()) : "";
                              update(c.id, { loginId: v, ...(!c.phone && extracted ? { phone: extracted } : {}) });
                            }} />
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <span className="text-gray-400 text-xs w-14 shrink-0">Heslo</span>
                            <span className="font-mono text-secondary text-sm flex-1">
                              {showPass.has(c.id) ? (c.password || "—") : (c.password ? "••••••" : "—")}
                            </span>
                            <button onClick={() => togglePassVis(c.id)} className="text-gray-400 hover:text-secondary shrink-0">
                              {showPass.has(c.id) ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            <button onClick={() => update(c.id, { password: genPassword() })} title="Vygenerovať nové heslo" className="text-gray-400 hover:text-secondary shrink-0">
                              <RefreshCw className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <button onClick={() => update(c.id, { active: !c.active })}
                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold uppercase border transition-colors ${c.active ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                          {c.active ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          {c.active ? "Prístup aktívny" : "Prístup neaktívny"}
                        </button>

                        {/* Odoslať prihlasovacie údaje */}
                        {hasLogin && (
                          c.email ? (
                            (() => {
                              const state = sendCredState[c.id] ?? "idle";
                              return (
                                <button
                                  disabled={state === "loading"}
                                  onClick={async () => {
                                    setSendCredState(s => ({ ...s, [c.id]: "loading" }));
                                    try {
                                      const r = await fetch(`/api/admin/clients/${c.id}/send-credentials`, { method: "POST" });
                                      const json = await r.json() as { ok: boolean; error?: string };
                                      setSendCredState(s => ({ ...s, [c.id]: json.ok ? "ok" : "error" }));
                                      setTimeout(() => setSendCredState(s => ({ ...s, [c.id]: "idle" })), 3500);
                                    } catch {
                                      setSendCredState(s => ({ ...s, [c.id]: "error" }));
                                      setTimeout(() => setSendCredState(s => ({ ...s, [c.id]: "idle" })), 3500);
                                    }
                                  }}
                                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border transition-colors mt-1 ${
                                    state === "ok" ? "bg-green-50 border-green-300 text-green-700" :
                                    state === "error" ? "bg-red-50 border-red-300 text-red-600" :
                                    "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                  } disabled:opacity-60`}>
                                  {state === "loading" ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Odosiela sa…</>
                                    : state === "ok" ? <><Check className="w-3.5 h-3.5" /> Email odoslaný</>
                                    : state === "error" ? <><X className="w-3.5 h-3.5" /> Chyba odoslania</>
                                    : <><Mail className="w-3.5 h-3.5" /> Znova odoslať prihlasovacie údaje</>}
                                </button>
                              );
                            })()
                          ) : (
                            <p className="text-[10px] text-gray-400 text-center mt-1 flex items-center justify-center gap-1">
                              <Mail className="w-3 h-3" /> Klient nemá email — prihlasovacie údaje nemožno odoslať
                            </p>
                          )
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Možnosti</p>
                        <div className="border border-gray-200 bg-white divide-y divide-gray-100">
                          {/* — PLATBA — */}
                          <div className="px-3 pt-1 pb-0 bg-gray-50">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Platba</span>
                          </div>
                          <label className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.canHotovost ?? true} onChange={e => update(c.id, { canHotovost: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                            <span className="text-sm text-gray-700 shrink-0">Hotovosť</span>
                            {(c.canHotovost ?? true) ? (
                              <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                                <span className="text-xs text-gray-400">DPH</span>
                                <input type="number" min="0" max="100" value={Math.round((c.hotovostDph ?? 0.20) * 100)}
                                  onChange={e => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && v >= 0 && v <= 100) update(c.id, { hotovostDph: v / 100 }); }}
                                  className="border border-gray-200 px-1.5 py-0 text-xs focus:outline-none focus:border-primary w-10 text-center" />
                                <span className="text-xs text-gray-400">% · betón</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 ml-1">Iba faktúra · 23 %</span>
                            )}
                          </label>
                          {/* — KALKULAČKA — */}
                          <div className="px-3 pt-1 pb-0 bg-gray-50">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Kalkulačka</span>
                          </div>
                          {/* Pridať + Zimné — 2-col grid; Minusové full-width */}
                          <div className="grid grid-cols-2 divide-x divide-gray-100">
                            <label className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-gray-50 select-none">
                              <input type="checkbox" checked={c.canPridatBeton ?? true} onChange={e => update(c.id, { canPridatBeton: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                              <span className="text-sm text-gray-700 truncate">Pridať položku</span>
                            </label>
                            <label className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-gray-50 select-none">
                              <input type="checkbox" checked={c.canZimneOpatrenia ?? false} onChange={e => update(c.id, { canZimneOpatrenia: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                              <span className="text-sm text-gray-700 truncate">Zimné opatrenia</span>
                            </label>
                          </div>
                          <label className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.allowExtraOverload ?? true} onChange={e => update(c.id, { allowExtraOverload: e.target.checked })} className="accent-red-500 w-4 h-4 shrink-0" />
                            <span className="text-sm text-gray-700 shrink-0">Minusové pretaženie</span>
                            <span className="text-[11px] text-gray-400 truncate">· Pumpa {ts.condPumpaMin ?? 1} voz., Mix {ts.condMixMin ?? 0} voz.</span>
                          </label>
                          {/* — SMS — */}
                          <div className="px-3 pt-1 pb-0 bg-gray-50">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">SMS</span>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-gray-100">
                            <label className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-gray-50 select-none">
                              <input type="checkbox" checked={c.smsOrderDisabled ?? false} onChange={e => update(c.id, { smsOrderDisabled: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                              <span className="text-sm text-gray-700 truncate">Nevytvárať obj.</span>
                            </label>
                            <label className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-gray-50 select-none">
                              <input type="checkbox" checked={c.smsShareOnly ?? false} onChange={e => update(c.id, { smsShareOnly: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                              <span className="text-sm text-gray-700 truncate">Share menu</span>
                            </label>
                          </div>
                          <div className="px-3 py-2">
                            <div className="text-xs text-gray-400 mb-1">Typ dopravy</div>
                            {(() => {
                              const allZ = adminData.getDelivery();
                              const curId = c.deliveryZoneId ?? allZ[0]?.id;
                              const selZ = allZ.find(z => z.id === curId) ?? allZ[0];
                              const selType = selZ?.pricingType ?? "standard";
                              const kmZones = allZ.filter(z => z.pricingType === "km");
                              const btnCls = (active: boolean) => `py-1 px-2 text-xs font-semibold border rounded transition-colors ${active ? "bg-secondary text-white border-secondary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`;
                              const typeRow = allZ.filter((z, i, arr) => {
                                if (z.pricingType === "km") return arr.findIndex(x => x.pricingType === "km") === i;
                                return true;
                              });
                              return (
                                <div className="space-y-1">
                                  <div className="flex gap-1 flex-wrap">
                                    {typeRow.map(z => {
                                      const isKmGroup = z.pricingType === "km";
                                      const isActive = isKmGroup ? selType === "km" : curId === z.id;
                                      return (
                                        <button key={z.id} type="button"
                                          onClick={() => {
                                            if (isKmGroup && selType !== "km") { const first = kmZones[0]; if (first) update(c.id, { deliveryZoneId: first.id }); }
                                            else if (!isKmGroup) update(c.id, { deliveryZoneId: z.id });
                                          }}
                                          className={btnCls(isActive)}>
                                          {isKmGroup ? "Kilometre" : z.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {selType === "km" && kmZones.length > 1 && (
                                    <div className="flex gap-1 pl-2 border-l-2 border-primary/30">
                                      {kmZones.map(z => (
                                        <button key={z.id} type="button"
                                          onClick={() => update(c.id, { deliveryZoneId: z.id })}
                                          className={btnCls(curId === z.id)}>
                                          {z.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
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
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <PriceModeToggle mode={inlineTableMode} onChange={setInlineTableMode} showHotovost={c.canHotovost ?? true} size="sm" />
                          </div>
                          <button onClick={() => exportClientPricePDF(c, inlineTableMode, ts)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-secondary font-black text-xs hover:bg-primary/90 transition-colors cursor-pointer rounded-sm shrink-0">
                            <FileText className="w-5 h-5" /> PDF
                          </button>
                        </div>
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
                        deliveryZoneId={c.deliveryZoneId}
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
                        sharedLink: c.sharedLink,
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-auto">
          <div className="bg-gray-50 w-full max-w-3xl my-4 shadow-2xl rounded-sm">

            {/* Header */}
            <div className="bg-secondary text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {tablePdfModal.isOwner && <Crown className="w-4 h-4 text-primary shrink-0" />}
                  <div className="font-black text-base uppercase tracking-widest">Zľavové tabuľky klienta</div>
                </div>
                <div className="text-sm text-white/60 mt-0.5">
                  {[tablePdfModal.firstName, tablePdfModal.lastName].filter(Boolean).join(" ")}
                  {tablePdfModal.company && ` · ${tablePdfModal.company}`}
                  {tablePdfModal.email && ` · ${tablePdfModal.email}`}
                </div>
              </div>
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
                deliveryZoneId={tablePdfModal.deliveryZoneId}
                variant="light"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-white">
              <button type="button" onClick={() => setTablePdfModal(null)}
                className="px-4 py-2 border border-secondary text-secondary font-bold text-sm hover:bg-secondary hover:text-white transition-colors cursor-pointer">
                ZAVRIEŤ
              </button>
              <button type="button" onClick={() => exportClientPricePDF(tablePdfModal, tablePdfMode, ts)}
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
  const deliveryZones = adminData.getDelivery();
  const clientDZone = deliveryZones.find(z => z.id === client.deliveryZoneId) ?? deliveryZones[0];
  const pType = clientDZone?.pricingType ?? "standard";

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
  const tdS = `padding:4px 8px;font-size:8.5pt;border-bottom:1px solid #eee;`;
  const tdRS = `padding:4px 8px;font-size:8.5pt;border-bottom:1px solid #eee;text-align:right;`;
  const discS = `padding:4px 8px;font-size:8.5pt;border-bottom:1px solid #eee;text-align:right;color:#1a7c2e;font-weight:bold;background:#f0fff0;`;
  const mBadge = `<span style="color:#b45309;font-size:7pt;font-weight:bold;margin-left:3px">M</span>`;

  const buildTable = (headers: string[], rows: Array<[string, string, string, string?]>, bg?: string) => {
    const head = headers.map((h, i) => `<th style="background:${bg ?? "#001D3D"};color:#fff;${i === 0 ? thS : thRS}">${h}</th>`).join("");
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
        const lbl = t.label + (mp[t.id] !== undefined ? mBadge : "");
        return hasDiscount
          ? [lbl, "1 m³", fmtP(orig), hasItemDisc ? fmtP(disc) : undefined] as [string, string, string, string?]
          : [lbl, "1 m³", fmtP(orig)] as [string, string, string];
      });
    return `<h3 style="font-size:9.5pt;color:#001D3D;margin:14px 0 3px;border-bottom:2px solid #EDC531;padding-bottom:3px">${cat.name}</h3>
      ${buildTable(discHdr, rows)}`;
  }).join("");

  // Služby
  const sluzbyRows: Array<[string, string, string, string?]> = services.map(s => {
    const manualS = mp[s.id];
    const disc = manualS !== undefined ? manualS : s.price * sluzbyFactor;
    const hasItemDisc = Math.abs(s.price - disc) > 0.001;
    const lbl = s.name + (manualS !== undefined ? mBadge : "");
    return hasDiscount
      ? [lbl, s.unit || "—", fmtP(s.price), hasItemDisc ? fmtP(disc) : undefined] as [string, string, string, string?]
      : [lbl, s.unit || "—", fmtP(s.price)] as [string, string, string];
  });

  // Doprava — per type
  const minFee = tsettings.minimumFee ?? 62.50;
  const dopravaRows: Array<[string, string, string, string?]> = [];
  let dopravaHdr: string[];

  if (pType === "km" && clientDZone) {
    dopravaHdr = hasDiscount ? ["Typ / Zóna", "Sadzba", "Pôvodná", "Zľavnená"] : ["Typ / Zóna", "Sadzba", "Cena"];
    const baseRate = clientDZone.ratePerKm ?? 1.8;
    const kmRateManual = mp[`km_rate_${clientDZone.id}`];
    const kmRateOrig = baseRate;
    const kmRateDisc = kmRateManual !== undefined ? kmRateManual : baseRate * dopravaFactor;
    const hasKmDisc = Math.abs(kmRateOrig - kmRateDisc) > 0.001;
    const kmLbl = `${clientDZone.name} – sadzba` + (kmRateManual !== undefined ? mBadge : "");
    dopravaRows.push(hasDiscount
      ? [kmLbl, "€/km", fmtP(kmRateOrig), hasKmDisc ? fmtP(kmRateDisc) : undefined]
      : [kmLbl, "€/km", fmtP(kmRateOrig)]);
    if (clientDZone.minimumFeeKm != null) {
      const mfDisc = clientDZone.minimumFeeKm * dopravaFactor;
      const hasMfDisc = Math.abs(clientDZone.minimumFeeKm - mfDisc) > 0.001;
      dopravaRows.push(hasDiscount
        ? ["Min. poplatok / auto", "1×", fmtP(clientDZone.minimumFeeKm), hasMfDisc ? fmtP(mfDisc) : undefined]
        : ["Min. poplatok / auto", "1×", fmtP(clientDZone.minimumFeeKm)]);
    }
    if (clientDZone.minKm != null && clientDZone.minKm > 0)
      dopravaRows.push(["Min. vzdialenosť", "—", `${clientDZone.minKm} km`]);
    if (clientDZone.maxKm != null && clientDZone.maxKm > 0)
      dopravaRows.push(["Max. polomer", "—", `${clientDZone.maxKm} km`]);
  } else if (pType === "auto" && clientDZone) {
    dopravaHdr = hasDiscount ? ["Typ / Zóna", "Sadzba", "Pôvodná", "Zľavnená"] : ["Typ / Zóna", "Sadzba", "Cena"];
    const baseRpt = clientDZone.ratePerTruck ?? 0;
    const autoRateManual = mp[`auto_rate_${clientDZone.id}`];
    const autoRateOrig = baseRpt;
    const autoRateDisc = autoRateManual !== undefined ? autoRateManual : baseRpt * dopravaFactor;
    const hasAutoDisc = Math.abs(autoRateOrig - autoRateDisc) > 0.001;
    const autoLbl = `${clientDZone.name} – paušál` + (autoRateManual !== undefined ? mBadge : "");
    dopravaRows.push(hasDiscount
      ? [autoLbl, "€/auto", fmtP(autoRateOrig), hasAutoDisc ? fmtP(autoRateDisc) : undefined]
      : [autoLbl, "€/auto", fmtP(autoRateOrig)]);
    if (clientDZone.minimumFeeAuto != null) {
      const mfDisc = clientDZone.minimumFeeAuto * dopravaFactor;
      const hasMfDisc = Math.abs(clientDZone.minimumFeeAuto - mfDisc) > 0.001;
      dopravaRows.push(hasDiscount
        ? ["Min. poplatok / auto", "1×", fmtP(clientDZone.minimumFeeAuto), hasMfDisc ? fmtP(mfDisc) : undefined]
        : ["Min. poplatok / auto", "1×", fmtP(clientDZone.minimumFeeAuto)]);
    }
    if (clientDZone.minTrucks != null && clientDZone.minTrucks > 0)
      dopravaRows.push(["Min. počet áut", "—", `${clientDZone.minTrucks}`]);
    if (clientDZone.maxTrucks != null && clientDZone.maxTrucks > 0)
      dopravaRows.push(["Max. počet áut", "—", `${clientDZone.maxTrucks}`]);
  } else {
    // standard
    dopravaHdr = hasDiscount ? ["Vzdialenosť", "Množstvo", "Pôvodná cena", "Zľavnená cena"] : ["Vzdialenosť", "Množstvo", "Cena"];
    const minFeeManual = mp["min_fee"];
    const minFeeDisc = minFeeManual !== undefined ? minFeeManual : minFee * dopravaFactor;
    const minFeeLbl = "Min. doprava / auto" + (minFeeManual !== undefined ? mBadge : "");
    dopravaRows.push(hasDiscount
      ? [minFeeLbl, "1×", fmtP(minFee), Math.abs(minFee - minFeeDisc) > 0.001 ? fmtP(minFeeDisc) : undefined]
      : [minFeeLbl, "1×", fmtP(minFee)]);
    zones.forEach(z => {
      const zManual = mp[z.id];
      const disc = zManual !== undefined ? zManual : z.ratePerM3 * dopravaFactor;
      const hasItemDisc = Math.abs(z.ratePerM3 - disc) > 0.001;
      const zLbl = `Od ${z.fromKm} – ${z.toKm} km` + (zManual !== undefined ? mBadge : "");
      dopravaRows.push(hasDiscount
        ? [zLbl, "1 m³×", fmtP(z.ratePerM3), hasItemDisc ? fmtP(disc) : undefined]
        : [zLbl, "1 m³×", fmtP(z.ratePerM3)]);
    });
  }

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

function exportOrderPDF(o: Order) {
  const tabLabels: Record<string, string> = { pumpa: "Pumpa", mix: "Domiešavač", vlastnadoprava: "Vlastná doprava" };
  const statusLabels: Record<string, string> = { nova: "Nová", potvrdena: "Potvrdená", odoslana: "Odoslaná", vyuctovana: "Vyúčtovaná", vyplatena: "Vyplatená", zrusena: "Zrušená" };
  const today = new Date(o.createdAt).toLocaleDateString("sk-SK");
  const fmtEurPdf = (n: number | undefined) => n !== undefined ? n.toFixed(2) + " €" : "";

  let parsed: { v: number; s: { h: string; rows: { l: string; v: number; o?: number; u?: number; uOrig?: number; uSuffix?: string }[] }[] } | null = null;
  try { if (o.breakdown?.startsWith("{")) parsed = JSON.parse(o.breakdown); } catch { /* */ }

  const fmtRate = (n: number, suffix?: string) => n.toFixed(2) + " " + (suffix ?? "€");
  const breakdownHtml = parsed ? parsed.s.map(sec => {
    const isMain = sec.h.startsWith("Pridaná") || sec.h.startsWith("Produkty");
    const rows = sec.rows.map(row => {
      if (row.l.startsWith("⚠") && row.v === 0) {
        return `<tr><td colspan="3" style="padding:4px 8px 4px 14px;font-size:7.5pt;font-weight:600;color:#991b1b;background:#fef2f2;border-top:1px solid #fca5a5;border-bottom:1px solid #fca5a5">${row.l}</td></tr>`;
      }
      if (row.l.startsWith("★") && row.v === 0) {
        return `<tr><td colspan="3" style="padding:3px 8px 3px 14px;font-size:7.5pt;color:#92400e;background:#fffbeb;border-bottom:1px solid #fde68a">${row.l}</td></tr>`;
      }
      const orig = row.o !== undefined ? `<span style="text-decoration:line-through;color:#aaa;font-size:7.5pt">${fmtEurPdf(row.o)}</span> ` : "";
      const unitCell = row.u !== undefined
        ? (row.uOrig !== undefined
          ? `<span style="text-decoration:line-through;color:#aaa;font-size:7.5pt">${fmtRate(row.uOrig, row.uSuffix)}</span><br><span style="font-weight:bold">${fmtRate(row.u, row.uSuffix)}</span>`
          : fmtRate(row.u, row.uSuffix))
        : "—";
      return `<tr>
        <td style="padding:3px 8px;font-size:8.5pt;border-bottom:1px solid #f0f0f0;color:#444">${row.l}</td>
        <td style="padding:3px 8px;font-size:8.5pt;border-bottom:1px solid #f0f0f0;text-align:right;color:#666;white-space:nowrap">${unitCell}</td>
        <td style="padding:3px 8px;font-size:8.5pt;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;color:${row.o !== undefined ? "#b45309" : "#222"};white-space:nowrap">${orig}${fmtEurPdf(row.v)}</td>
      </tr>`;
    }).join("");
    return `<tr><td colspan="3" style="padding:4px 8px;font-size:8.5pt;font-weight:bold;background:${isMain ? "#001D3D" : "#EDC531"};color:${isMain ? "#EDC531" : "#001D3D"}">${sec.h}</td></tr>${rows}`;
  }).join("") : "";

  const discountInfo = [
    o.discountBeton   ? `Betón −${o.discountBeton}%`   : "",
    o.discountDoprava ? `Doprava −${o.discountDoprava}%` : "",
    o.discountSluzby  ? `Služby −${o.discountSluzby}%`  : "",
    o.discountCelkovo ? `Celkovo −${o.discountCelkovo}%` : "",
  ].filter(Boolean).join(" | ");

  const html = `<!DOCTYPE html><html lang="sk"><head>
<meta charset="utf-8">
<title>Objednávka – ${o.clientName || "klient"}</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #222; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:4mm;border-bottom:2px solid #EDC531;margin-bottom:5mm">
  <div>
    <div style="font-size:14pt;font-weight:bold;color:#001D3D">MS-BETON, spol. s r.o.</div>
    <div style="font-size:7.5pt;color:#555;margin-top:2px">Turie 468, 013 12 Turie &nbsp;|&nbsp; IČO: 55747591 &nbsp;|&nbsp; IČ DPH: SK2122074603</div>
    <div style="font-size:7.5pt;color:#777;margin-top:1px">+421 944 069 305 &nbsp;|&nbsp; peter@msbeton.sk &nbsp;|&nbsp; msbeton.sk</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:13pt;font-weight:bold;color:#EDC531;letter-spacing:0.5px">OBJEDNÁVKA</div>
    <div style="font-size:8pt;color:#777;margin-top:2px">${today}</div>
    <div style="font-size:7.5pt;color:#aaa;margin-top:1px">Stav: ${statusLabels[o.status] ?? o.status}</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-bottom:5mm">
  <div style="border:1px solid #eee;padding:4mm;border-radius:2px">
    <div style="font-size:8pt;font-weight:bold;color:#001D3D;border-bottom:1px solid #eee;padding-bottom:2mm;margin-bottom:3mm">KLIENT</div>
    <div style="font-size:8.5pt;font-weight:bold;color:#111;margin-bottom:2px">${o.clientName || "—"}</div>
    ${o.company ? `<div style="font-size:8pt;color:#555">${o.company}</div>` : ""}
    ${o.phone ? `<div style="font-size:8pt;color:#555;margin-top:2px">${o.phone}</div>` : ""}
    ${o.email ? `<div style="font-size:8pt;color:#777">${o.email}</div>` : ""}
    ${discountInfo ? `<div style="font-size:7.5pt;color:#b45309;margin-top:4px;font-weight:bold">Zľavy: ${discountInfo}</div>` : ""}
  </div>
  <div style="border:1px solid #eee;padding:4mm;border-radius:2px">
    <div style="font-size:8pt;font-weight:bold;color:#001D3D;border-bottom:1px solid #eee;padding-bottom:2mm;margin-bottom:3mm">DORUČENIE</div>
    <table style="font-size:8.5pt"><tbody>
      <tr><td style="color:#888;padding:1px 6px 1px 0;width:90px">Typ</td><td style="font-weight:bold">${tabLabels[o.tab] ?? o.tab}</td></tr>
      <tr><td style="color:#888;padding:1px 6px 1px 0">Množstvo</td><td style="font-weight:bold">${o.totalQty} m³${(o.fillupM3 ?? 0) > 0 ? ` <span style="color:#92400e;font-size:8pt;font-weight:normal">+ ${o.fillupM3} m³ doťaženie</span>` : ""}</td></tr>
      ${(o.fillupM3 ?? 0) > 0 ? `<tr><td style="color:#888;padding:1px 6px 1px 0;vertical-align:top">Doťaženie</td><td style="color:#92400e;font-size:8.5pt">${o.totalQty}&nbsp;m³ → +${o.fillupM3}&nbsp;m³ → <strong>${o.fillupTarget}&nbsp;m³/auto</strong></td></tr>` : ""}
      ${o.podmienky ? `<tr><td style="color:#888;padding:1px 6px 1px 0;vertical-align:top">Podmienky</td><td style="color:#92400e;font-size:8pt;font-weight:600">★ ${o.podmienky.pumpa > 0 ? `1× Pumpa + ${o.podmienky.mix}× Mix` : `${o.podmienky.trucks}× Mix`} · ∅ ${o.podmienky.m3PerTruck?.toFixed(1) ?? "—"} m³/vozidlo</td></tr>` : ""}
      ${o.km ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Vzdialenosť</td><td>${o.km} km</td></tr>` : ""}
      ${(o.address || o.mapPlusCode) ? `<tr><td style="color:#888;padding:1px 6px 1px 0;vertical-align:top">Adresa</td><td>${o.address ? o.address : ""}${o.mapPlusCode ? `<br><span style="font-family:monospace;font-size:7.5pt;color:#aaa">${o.mapPlusCode}${o.mapLocality ? " · " + o.mapLocality : ""}</span>` : ""}</td></tr>` : ""}
      ${o.deliveryZoneName ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Zóna</td><td>${o.deliveryZoneName}</td></tr>` : ""}
      <tr><td style="color:#888;padding:1px 6px 1px 0">Platba</td><td style="font-weight:bold">${o.priceMode === "hotovost" ? "Hotovosť" : "Faktúra"}</td></tr>
      ${o.viaSms ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Zdroj</td><td>SMS</td></tr>` : ""}
    </tbody></table>
    ${o.note ? `<div style="font-size:8pt;color:#555;margin-top:4px;font-style:italic">Poznámka: ${o.note}</div>` : ""}
  </div>
</div>

${breakdownHtml ? `
<div style="margin-bottom:5mm">
  <div style="font-size:9.5pt;font-weight:bold;color:#001D3D;border-bottom:2px solid #EDC531;padding-bottom:2px;margin-bottom:4px">KALKULÁCIA</div>
  <table><thead><tr style="background:#001D3D;color:#fff;font-size:8pt"><th style="padding:4px 8px;text-align:left;font-weight:bold">Popis</th><th style="padding:4px 8px;text-align:right;font-weight:bold">Jedn.&nbsp;cena</th><th style="padding:4px 8px;text-align:right;font-weight:bold">Spolu</th></tr></thead><tbody>${breakdownHtml}</tbody></table>
</div>` : ""}

<div style="background:#001D3D;color:#fff;padding:4mm;border-radius:2px;display:flex;justify-content:space-between;align-items:center">
  ${o.priceMode !== "hotovost" ? `<div>
    <div style="font-size:8pt;color:rgba(255,255,255,0.6)">Bez DPH</div>
    <div style="font-size:9.5pt;font-weight:bold;color:rgba(255,255,255,0.8)">${fmtEurPdf(o.totalBezDph)}</div>
  </div>` : "<div></div>"}
  <div style="text-align:right">
    <div style="font-size:8pt;color:rgba(255,255,255,0.6)">${o.priceMode === "hotovost" ? "Spolu" : "Celkom s DPH"}</div>
    <div style="font-size:16pt;font-weight:bold;color:#EDC531">${fmtEurPdf(o.totalSDph)}</div>
  </div>
</div>

<div style="margin-top:10mm;display:grid;grid-template-columns:1fr 1fr;gap:10mm">
  <div style="border-top:1px solid #ccc;padding-top:3mm;font-size:8pt;color:#888">Dátum a podpis zákazníka</div>
  <div style="border-top:1px solid #ccc;padding-top:3mm;font-size:8pt;color:#888">Pečiatka a podpis MS-BETON</div>
</div>

<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  if (!win) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click(); }
}

// ── Realtime Card ─────────────────────────────────────────────────────────────
interface RealtimeData {
  activeNow: number;
  byMinute: Array<{ minutesAgo: number; users: number }>;
  byDevice: Array<{ device: string; users: number }>;
  byPage: Array<{ page: string; users: number }>;
  byCountry: Array<{ country: string; users: number }>;
}

const REFRESH_SECS = 60;
const COUNTRY_FLAG: Record<string, string> = {
  "Slovakia": "🇸🇰", "Czech Republic": "🇨🇿", "Czechia": "🇨🇿",
  "Austria": "🇦🇹", "Hungary": "🇭🇺", "Poland": "🇵🇱",
  "Germany": "🇩🇪", "Ukraine": "🇺🇦", "Romania": "🇷🇴",
  "United States": "🇺🇸", "United Kingdom": "🇬🇧", "France": "🇫🇷",
  "Netherlands": "🇳🇱", "Italy": "🇮🇹", "Spain": "🇪🇸",
};
const countryFlag = (c: string) => COUNTRY_FLAG[c] ?? "🌍";
const deviceIcon = (d: string) => {
  if (d === "mobile") return <Smartphone className="w-3.5 h-3.5" />;
  if (d === "tablet") return <Tablet className="w-3.5 h-3.5" />;
  return <Laptop className="w-3.5 h-3.5" />;
};
const pageLabel = (p: string) => p.length > 28 ? p.slice(0, 26) + "…" : p;

function RealtimeCard() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_SECS);

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/admin/analytics/realtime", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setData(await r.json());
      setErrored(false);
    } catch {
      setErrored(true);
    }
    setLoading(false);
    setCountdown(REFRESH_SECS);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, REFRESH_SECS * 1000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000); return () => clearInterval(t); }, []);

  // bars: index 0 = 30 min ago, index 29 = now (reverse byMinute which is 0=now)
  const bars = data ? [...data.byMinute].reverse() : Array.from({ length: 30 }, (_, i) => ({ minutesAgo: 29 - i, users: 0 }));
  const maxBar = Math.max(...bars.map(b => b.users), 1);
  const totalDevices = (data?.byDevice ?? []).reduce((s, d) => s + d.users, 0);

  return (
    <div className="bg-secondary rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Live</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Aktívni v posledných 30 minútach</span>
        </div>
        <button onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors text-[10px] font-bold">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>{countdown}s</span>
        </button>
      </div>

      {/* Big number */}
      <div className="text-center py-4">
        {errored ? (
          <p className="text-white/30 text-sm">GA4 nedostupné</p>
        ) : loading && !data ? (
          <div className="flex items-center justify-center gap-2 text-white/30 text-sm"><RefreshCw className="w-4 h-4 animate-spin" /> Načítavam…</div>
        ) : (
          <>
            <div className="text-6xl font-black text-white leading-none">{data?.activeNow ?? 0}</div>
            <div className="text-xs text-white/40 mt-1 font-medium">
              {data?.activeNow === 1 ? "aktívny používateľ" : data?.activeNow === 0 ? "žiadni aktívni používatelia" : "aktívnych používateľov"}
            </div>
          </>
        )}
      </div>

      {/* 30-bar minute chart */}
      <div className="px-4 pb-2">
        <div className="flex items-end gap-[2px] h-12">
          {bars.map((b, i) => {
            const pct = Math.max(b.users > 0 ? 8 : 2, (b.users / maxBar) * 100);
            const isRecent = i >= 25;
            return (
              <div key={i} className="flex-1 flex flex-col justify-end" title={`${b.minutesAgo} min späť: ${b.users}`}>
                <div className="rounded-sm transition-all"
                  style={{ height: `${pct}%`, background: b.users === 0 ? "rgba(255,255,255,0.08)" : isRecent ? "#4ade80" : "#EDC531", opacity: b.users === 0 ? 1 : 0.85 + (i / 29) * 0.15 }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-white/20">30 min späť</span>
          <span className="text-[9px] text-white/20">teraz</span>
        </div>
      </div>

      {/* Device + Pages */}
      {data && (data.byDevice.length > 0 || data.byPage.length > 0) && (
        <div className="grid grid-cols-2 gap-px border-t border-white/10">
          {/* Devices */}
          <div className="px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Zariadenia</p>
            <div className="space-y-1.5">
              {data.byDevice.map(d => (
                <div key={d.device} className="flex items-center gap-2">
                  <span className="text-white/40">{deviceIcon(d.device)}</span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${totalDevices > 0 ? (d.users / totalDevices) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-black text-white/70 w-4 text-right">{d.users}</span>
                </div>
              ))}
              {data.byDevice.length === 0 && <p className="text-[10px] text-white/20">—</p>}
            </div>
          </div>
          {/* Pages */}
          <div className="px-4 py-3 border-l border-white/10">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Top stránky</p>
            <div className="space-y-1.5">
              {data.byPage.slice(0, 4).map(p => (
                <div key={p.page} className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-white/50 font-mono truncate">{pageLabel(p.page)}</span>
                  <span className="text-[10px] font-black text-primary shrink-0">{p.users}</span>
                </div>
              ))}
              {data.byPage.length === 0 && <p className="text-[10px] text-white/20">—</p>}
            </div>
          </div>
        </div>
      )}

      {/* Countries */}
      {data && data.byCountry.length > 0 && (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Krajiny</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {data.byCountry.map(c => (
              <div key={c.country} className="flex items-center gap-2">
                <span className="text-sm leading-none">{countryFlag(c.country)}</span>
                <span className="text-[10px] text-white/50 truncate flex-1">{c.country}</span>
                <span className="text-[10px] font-black text-primary shrink-0">{c.users}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────────────────────────────────
interface Ga4Data {
  overview: { activeUsers30: number; sessions30: number; pageViews30: number; newUsers30: number; events30: number; activeUsers90: number; sessions90: number; pageViews90: number; newUsers90: number };
  daily: Array<{ date: string; sessions: number; users: number }>;
  events: Array<{ name: string; count: number }>;
  devices: Array<{ device: string; sessions: number; users: number }>;
  sources: Array<{ channel: string; sessions: number }>;
  pages: Array<{ path: string; views: number }>;
  countries: Array<{ country: string; sessions: number }>;
  cities?: Array<{ city: string; country: string; sessions: number }>;
}

const CALC_EVENTS = ["calculator_complete", "pdf_export", "sms_export", "order_submitted", "calc_tab", "calc_type_select"];

const PATH_LABELS: Record<string, string> = {
  "/": "Domov",
  "/admin/dashboard": "Admin",
  "/admin/login": "Admin login",
  "/cennik": "Cenník",
  "/prihlasenie": "Prihlásenie",
  "/klient-profil": "Klient profil",
  "/vozovy-park": "Vozový park",
  "/klient-reset": "Reset hesla",
  "/kontakt": "Kontakt",
  "/o-nas": "O nás",
};
const pathHuman = (p: string) => PATH_LABELS[p] ?? p;

// SVK cities: [svgX, svgY] in viewBox 0 0 400 160
// projection: x=(lon-16.80)/5.80*400, y=(49.60-lat)/1.90*160
const SVK_CITY_SVG: Record<string, [number, number]> = {
  "Bratislava": [21, 122], "Trnava": [55, 96], "Piešťany": [48, 90], "Piestany": [48, 90],
  "Trenčín": [86, 58], "Trencin": [86, 58], "Nitra": [89, 103], "Nové Zámky": [80, 118], "Nove Zamky": [80, 118],
  "Komárno": [85, 135], "Komarno": [85, 135], "Žilina": [134, 32], "Zilina": [134, 32],
  "Martin": [148, 41], "Ružomberok": [175, 40], "Ruzomberok": [175, 40],
  "Liptovský Mikuláš": [199, 40], "Liptovsky Mikulas": [199, 40],
  "Banská Bystrica": [162, 72], "Banska Bystrica": [162, 72],
  "Zvolen": [162, 86], "Lučenec": [185, 103], "Lucenec": [185, 103],
  "Poprad": [241, 45], "Spišská Nová Ves": [275, 52], "Spisska Nova Ves": [275, 52],
  "Prešov": [306, 51], "Presov": [306, 51], "Košice": [308, 74], "Kosice": [308, 74],
  "Humenné": [358, 52], "Humenne": [358, 52], "Michalovce": [371, 67],
};

function MiniBar({ value, max, color = "#EDC531" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-full"><div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" /></div>;
}

function SparkLine({ data, color = "#EDC531" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 240, H = 48, pad = 4;
  const pts = data.map((v, i) => `${pad + (i / (data.length - 1)) * (W - pad * 2)},${H - pad - ((v / max) * (H - pad * 2))}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface GscData {
  summary: { clicks28: number; impressions28: number; avgCtr28: number; avgPosition28: number };
  queries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  pages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
  devices: Array<{ device: string; clicks: number; impressions: number; ctr: number }>;
  countries: Array<{ country: string; clicks: number; impressions: number }>;
  daily: Array<{ date: string; clicks: number; impressions: number }>;
}

function SearchConsoleTab() {
  const [data, setData] = useState<GscData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true); setErr(null);
    authFetch("/api/admin/analytics/gsc")
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`); return j as GscData; })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(String(e instanceof Error ? e.message : e)); setLoading(false); });
  }, [refreshKey]);

  if (loading) return <div className="flex items-center justify-center h-64 gap-3 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin" /> Načítavam GSC dáta…</div>;
  if (err) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p className="text-red-600 font-semibold mb-2">Search Console nedostupné</p>
      <p className="text-red-400 text-sm mb-4">{err}</p>
      <button onClick={() => setRefreshKey(k => k + 1)} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-semibold transition-colors">Skúsiť znova</button>
    </div>
  );
  if (!data) return null;

  const maxQ = Math.max(...data.queries.map(q => q.clicks), 1);
  const maxP = Math.max(...data.pages.map(p => p.clicks), 1);
  const maxD = Math.max(...data.daily.map(d => d.impressions), 1);

  const posColor = (p: number) => p <= 3 ? "#10b981" : p <= 10 ? "#EDC531" : "#f87171";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-secondary uppercase tracking-widest">Google Search Console</h2>
        <button onClick={() => setRefreshKey(k => k + 1)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-semibold transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Obnoviť
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Kliky (28 dní)", val: data.summary.clicks28.toLocaleString("sk"), sub: "Organické kliky zo SERPu" },
          { label: "Impresie (28 dní)", val: data.summary.impressions28.toLocaleString("sk"), sub: "Koľkokrát sa objavil v Google" },
          { label: "Priem. CTR", val: `${(data.summary.avgCtr28 * 100).toFixed(1)} %`, sub: "Click-through rate z impresií" },
          { label: "Priem. pozícia", val: data.summary.avgPosition28.toFixed(1), sub: "Priemerná pozícia v Google" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{k.label}</div>
            <div className="text-3xl font-black text-secondary">{k.val}</div>
            <div className="text-[10px] text-gray-400 mt-1 leading-tight">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Denný trend — Impresie / Kliky (90 dní)</span>
        </div>
        <SparkLine data={data.daily.map(d => d.impressions)} color="#3b82f6" />
        <SparkLine data={data.daily.map(d => d.clicks)} color="#EDC531" />
        <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Impresie</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" /> Kliky</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Top queries */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Top vyhľadávacie frázy (28 dní)</span>
          </div>
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_48px_56px_56px_56px] gap-2 text-[9px] uppercase tracking-widest text-gray-400 font-black pb-1 border-b border-gray-100">
              <span>Fráza</span><span className="text-right">Kliky</span><span className="text-right">Impr.</span><span className="text-right">CTR</span><span className="text-right">Poz.</span>
            </div>
            {data.queries.map((q, i) => (
              <div key={q.query} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_48px_56px_56px_56px] gap-2 items-center text-[11px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[8px] text-gray-400 w-3 shrink-0">{i + 1}</span>
                    <span className="font-medium text-gray-700 truncate">{q.query}</span>
                  </div>
                  <MiniBar value={q.clicks} max={maxQ} color="#EDC531" />
                </div>
                <span className="font-black text-secondary text-right">{q.clicks}</span>
                <span className="hidden sm:block text-gray-500 text-right">{q.impressions}</span>
                <span className="hidden sm:block text-gray-500 text-right">{(q.ctr * 100).toFixed(1)}%</span>
                <span className="hidden sm:block font-bold text-right" style={{ color: posColor(q.position) }}>{q.position.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top pages */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Top stránky z organiku (28 dní)</span>
          </div>
          <div className="space-y-2">
            {data.pages.map((p, i) => {
              const path = (() => { try { return new URL(p.page).pathname; } catch { return p.page; } })();
              return (
                <div key={p.page} className="text-[11px]">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[8px] text-gray-400 shrink-0">{i + 1}</span>
                    <span className="font-medium text-gray-700 truncate flex-1">{pathHuman(path)}</span>
                    <span className="font-black text-secondary shrink-0">{p.clicks}</span>
                  </div>
                  <MiniBar value={p.clicks} max={maxP} color="#8b5cf6" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Devices + Countries */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Zariadenia (28 dní)</span>
          </div>
          <div className="space-y-2 mb-4">
            {data.devices.map(d => (
              <div key={d.device} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 capitalize text-gray-600 font-medium shrink-0">{d.device}</span>
                <MiniBar value={d.clicks} max={Math.max(...data.devices.map(x => x.clicks), 1)} color={d.device === "MOBILE" ? "#3b82f6" : "#EDC531"} />
                <span className="w-8 text-right font-bold text-secondary shrink-0">{d.clicks}</span>
                <span className="w-10 text-right text-gray-400 shrink-0">{(d.ctr * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 border-t border-gray-100 pt-3">Krajiny</div>
          <div className="space-y-1.5">
            {data.countries.slice(0, 5).map(c => (
              <div key={c.country} className="flex items-center gap-2 text-[11px]">
                <span className="text-base leading-none shrink-0">{countryFlag(c.country.charAt(0).toUpperCase() + c.country.slice(1).toLowerCase())}</span>
                <span className="flex-1 text-gray-600 font-medium truncate capitalize">{c.country.toLowerCase()}</span>
                <span className="font-bold text-secondary shrink-0">{c.clicks}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState<Ga4Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true); setErr(null);
    authFetch("/api/admin/analytics")
      .then(async r => {
        const text = await r.text();
        let json: { error?: string } & Ga4Data;
        try { json = JSON.parse(text); } catch { throw new Error("API server nie je spustený — spustite lokálny API server (PORT=3000 pnpm dev)"); }
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        return json as Ga4Data;
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(String(e instanceof Error ? e.message : e)); setLoading(false); });
  }, [refreshKey]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin" /> Načítavam GA4 dáta…
    </div>
  );
  if (err) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p className="text-red-600 font-semibold mb-2">GA4 nedostupné</p>
      <p className="text-red-400 text-sm mb-4">{err}</p>
      <button onClick={() => setRefreshKey(k => k + 1)} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-semibold transition-colors">Skúsiť znova</button>
    </div>
  );
  if (!data) return null;

  const { overview, daily, events, devices, sources, pages, countries } = data;
  const maxSess = Math.max(...daily.map(d => d.sessions), 1);
  const calcEvents = events.filter(e => CALC_EVENTS.includes(e.name));
  const otherEvents = events.filter(e => !CALC_EVENTS.includes(e.name));
  const maxEvt = Math.max(...events.map(e => e.count), 1);
  const maxSrc = Math.max(...sources.map(s => s.sessions), 1);
  const maxPg = Math.max(...pages.map(p => p.views), 1);
  const maxCtry = Math.max(...(countries ?? []).map(c => c.sessions), 1);
  const totalDevSess = devices.reduce((s, d) => s + d.sessions, 0);

  const kpi = (label: string, val30: number, val90: number, icon: React.ReactNode, tooltip: string) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</span>
      </div>
      <div className="text-3xl font-black text-secondary">{val30.toLocaleString("sk")}</div>
      <div className="text-[11px] text-gray-500 mt-0.5 font-medium">90 dní: {val90.toLocaleString("sk")}</div>
      <div className="text-[10px] text-gray-500 mt-1.5 leading-tight">{tooltip}</div>
    </div>
  );

  const eventLabel: Record<string, string> = {
    calculator_complete: "Kalkulačka dokončená",
    pdf_export: "PDF export",
    sms_export: "SMS export",
    order_submitted: "Objednávka odoslaná",
    calc_tab: "Tab zmena (Pumpa/Mix/…)",
    calc_type_select: "Výber typu betónu",
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Live realtime widget */}
      <RealtimeCard />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-secondary uppercase tracking-widest">Google Analytics 4</h2>
        <button onClick={() => setRefreshKey(k => k + 1)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-semibold transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Obnoviť
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpi("Aktívni užívatelia", overview.activeUsers30, overview.activeUsers90, <Users className="w-4 h-4" />, "Unikátni ľudia, ktorí navštívili stránku — každý sa počíta raz bez ohľadu na počet návštev.")}
        {kpi("Sessiony", overview.sessions30, overview.sessions90, <TrendingUp className="w-4 h-4" />, "Jedno súvislé navštívenie stránky (relácia). Počíta sa ako ukončená po 30 min nečinnosti alebo o polnoci.")}
        {kpi("Zobrazenia stránok", overview.pageViews30, overview.pageViews90, <Globe className="w-4 h-4" />, "Celkový počet zobrazených stránok vrátane opakovaných načítaní — väčší ako počet sessionov.")}
        {kpi("Noví užívatelia", overview.newUsers30, overview.newUsers90, <UserPlus className="w-4 h-4" />, "Prvá návšteva z daného prehliadača alebo zariadenia. Vyčistenie cookies = nový užívateľ.")}
      </div>

      {/* Daily trend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Denný trend — Sessions (30 dní)</span>
        </div>
        <SparkLine data={daily.map(d => d.sessions)} color="#EDC531" />
        <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
          {[...daily].reverse().slice(0, 14).map(d => (
            <div key={d.date} className="flex items-center gap-2 text-[11px]">
              <span className="w-20 text-gray-400 font-mono shrink-0">{d.date.slice(6, 8)}.{d.date.slice(4, 6)}.{d.date.slice(0, 4)}</span>
              <MiniBar value={d.sessions} max={maxSess} />
              <span className="w-8 text-right font-bold text-secondary shrink-0">{d.sessions}</span>
              <span className="w-12 text-right text-gray-400 shrink-0">{d.users} usr</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Calculator events */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <MousePointerClick className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Kalkulačka — interakcie (90 dní)</span>
          </div>
          {calcEvents.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Žiadne kalkulačka eventy ešte — objavia sa po prvom použití.</p>
          ) : (
            <div className="space-y-2">
              {calcEvents.map(e => (
                <div key={e.name} className="flex items-center gap-2 text-[11px]">
                  <span className="flex-1 text-gray-600 font-medium truncate">{eventLabel[e.name] ?? e.name}</span>
                  <MiniBar value={e.count} max={maxEvt} color="#001D3D" />
                  <span className="w-10 text-right font-black text-secondary shrink-0">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Zariadenia (30 dní)</span>
          </div>
          <div className="space-y-2">
            {devices.map(d => (
              <div key={d.device} className="flex items-center gap-2 text-[11px]">
                <span className="w-20 capitalize text-gray-600 font-medium shrink-0">{d.device}</span>
                <MiniBar value={d.sessions} max={totalDevSess} color={d.device === "mobile" ? "#3b82f6" : "#EDC531"} />
                <span className="w-8 text-right font-bold text-secondary shrink-0">{d.sessions}</span>
                <span className="w-10 text-right text-gray-400 shrink-0">{totalDevSess > 0 ? Math.round((d.sessions / totalDevSess) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic sources */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Zdroje návštevnosti (30 dní)</span>
          </div>
          <div className="space-y-2">
            {sources.map(s => (
              <div key={s.channel} className="flex items-center gap-2 text-[11px]">
                <span className="w-32 text-gray-600 font-medium truncate shrink-0">{s.channel || "Direct"}</span>
                <MiniBar value={s.sessions} max={maxSrc} color="#10b981" />
                <span className="w-8 text-right font-bold text-secondary shrink-0">{s.sessions}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top pages */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Top stránky (30 dní)</span>
          </div>
          <div className="space-y-3">
            {pages.map(p => (
              <div key={p.path}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <span className="text-[12px] font-bold text-secondary">{pathHuman(p.path)}</span>
                    <span className="text-[10px] text-gray-400 font-mono ml-2">{p.path}</span>
                  </div>
                  <span className="text-sm font-black text-secondary shrink-0">{p.views}</span>
                </div>
                <MiniBar value={p.views} max={maxPg} color="#8b5cf6" />
              </div>
            ))}
          </div>
        </div>

        {/* Countries + SK cities map */}
        {countries && countries.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">Krajiny a mestá návštevníkov (30 dní)</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Countries list */}
              <div className="space-y-2">
                {countries.map(c => (
                  <div key={c.country} className="flex items-center gap-2 text-[11px]">
                    <span className="text-base leading-none shrink-0">{countryFlag(c.country)}</span>
                    <span className="w-28 text-gray-600 font-medium truncate shrink-0">{c.country}</span>
                    <MiniBar value={c.sessions} max={maxCtry} color="#0ea5e9" />
                    <span className="w-8 text-right font-bold text-secondary shrink-0">{c.sessions}</span>
                  </div>
                ))}
              </div>
              {/* SVK cities map */}
              {data.cities && data.cities.filter(c => c.country === "Slovakia").length > 0 && (() => {
                const skCities = data.cities!
                  .filter(c => c.country === "Slovakia" && SVK_CITY_SVG[c.city])
                  .sort((a, b) => b.sessions - a.sessions);
                const unmapped = data.cities!
                  .filter(c => c.country === "Slovakia" && !SVK_CITY_SVG[c.city] && c.city && c.city !== "(not set)")
                  .sort((a, b) => b.sessions - a.sessions);
                const maxC = Math.max(...skCities.map(c => c.sessions), 1);
                const totalSkSess = skCities.reduce((s, c) => s + c.sessions, 0) + unmapped.reduce((s, c) => s + c.sessions, 0);
                return (
                  <div className="rounded-xl overflow-hidden border border-slate-700/60" style={{ background: "linear-gradient(135deg,#0d1f3c 0%,#071526 100%)" }}>
                    <style>{`@keyframes svkPulse{0%{opacity:.22;transform:scale(1)}100%{opacity:0;transform:scale(2.2)}} .svk-pulse{animation:svkPulse 2.4s ease-out infinite;transform-box:fill-box;transform-origin:center}`}</style>
                    <div className="px-3 pt-2.5 pb-0 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">🇸🇰 Slovensko — mestá</span>
                      <span className="text-[9px] text-slate-500">{skCities.length} miest · {totalSkSess} sess.</span>
                    </div>
                    <svg viewBox="0 0 420 175" className="w-full" style={{ height: 145, display: "block" }}>
                      <defs>
                        <linearGradient id="svkGrad" x1="0" y1="0" x2="0.6" y2="1">
                          <stop offset="0%" stopColor="#1a3a62" />
                          <stop offset="100%" stopColor="#0d2444" />
                        </linearGradient>
                        <filter id="svkShadow">
                          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
                        </filter>
                      </defs>
                      <g transform="translate(10,8)">
                        <path
                          d="M 2,128 L 3,19 L 48,6 L 150,3 L 215,4 L 232,1 L 248,12 L 289,17 L 324,28 L 358,30 L 399,34 L 399,76 L 386,93 L 352,152 L 290,152 L 220,152 L 128,152 L 83,152 L 62,152 L 14,152 L 3,147 Z"
                          fill="url(#svkGrad)" stroke="#2d5a99" strokeWidth="1.5" filter="url(#svkShadow)"
                        />
                        {[38, 76, 114].map(y => (
                          <line key={y} x1="2" y1={y} x2="399" y2={y} stroke="#1e3a5f" strokeWidth="0.4" strokeDasharray="6,6" />
                        ))}
                        {[...skCities].reverse().map((c, ri) => {
                          const i = skCities.length - 1 - ri;
                          const xy = SVK_CITY_SVG[c.city];
                          if (!xy) return null;
                          const pct = c.sessions / maxC;
                          const r = Math.max(3, Math.min(10, 3 + pct * 7));
                          const isTop3 = i < 3;
                          const showLabel = isTop3 || r >= 6;
                          const lw = c.city.length * 3.6 + 8;
                          const pctTotal = totalSkSess > 0 ? Math.round((c.sessions / totalSkSess) * 100) : 0;
                          const labelY = xy[1] - r - 3;
                          const labelPinned = Math.max(12, labelY);
                          return (
                            <g key={c.city} style={{ cursor: "default" }}>
                              <title>{c.city}: {c.sessions} sess. ({pctTotal}% SK)</title>
                              {i === 0 && (
                                <circle className="svk-pulse" cx={xy[0]} cy={xy[1]} r={r + 7} fill="#EDC531" fillOpacity="0.22" />
                              )}
                              <circle cx={xy[0]} cy={xy[1]} r={r + 3} fill="#EDC531" fillOpacity={pct * 0.18} />
                              <circle cx={xy[0]} cy={xy[1]} r={r} fill="#EDC531" fillOpacity={0.6 + pct * 0.4}
                                stroke={isTop3 ? "#fff8e1" : "#b38600"} strokeWidth={isTop3 ? 1.2 : 0.5} />
                              <circle cx={xy[0] - r * 0.25} cy={xy[1] - r * 0.25} r={r * 0.35} fill="#fff" fillOpacity="0.28" />
                              {showLabel && (
                                <g>
                                  <rect x={xy[0] - lw / 2} y={labelPinned - 11} width={lw} height={10} rx="2.5"
                                    fill="#071526" fillOpacity="0.92" stroke="#2d5a99" strokeWidth="0.5" />
                                  <text x={xy[0]} y={labelPinned - 3.5} textAnchor="middle" fontSize="5.5"
                                    fill={isTop3 ? "#EDC531" : "#cbd5e1"} fontFamily="system-ui,sans-serif" fontWeight="700" letterSpacing="0.3">
                                    {c.city}
                                  </text>
                                </g>
                              )}
                              {isTop3 && (
                                <>
                                  <circle cx={xy[0] + r} cy={xy[1] - r} r={4} fill="#071526" stroke="#EDC531" strokeWidth="0.8" />
                                  <text x={xy[0] + r} y={xy[1] - r + 3.2} textAnchor="middle" fontSize="4.5" fill="#EDC531" fontFamily="system-ui,sans-serif" fontWeight="900">{i + 1}</text>
                                </>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                    {/* Ranked legend */}
                    <div className="px-3 pb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-700/40 pt-2.5">
                      {skCities.slice(0, 8).map((c, i) => {
                        const pctTotal = totalSkSess > 0 ? Math.round((c.sessions / totalSkSess) * 100) : 0;
                        return (
                          <div key={c.city} className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[8px] font-black text-slate-600 w-2.5 text-right shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-[9px] font-medium truncate" style={{ color: i < 3 ? "#EDC531" : "#94a3b8" }}>{c.city}</span>
                                <span className="text-[9px] font-black text-primary shrink-0">{c.sessions} <span className="text-slate-600 font-normal">({pctTotal}%)</span></span>
                              </div>
                              <div className="h-[2px] rounded-full" style={{ background: "#1e3a5f" }}>
                                <div className="h-full rounded-full" style={{ width: `${(c.sessions / maxC) * 100}%`, background: i === 0 ? "#EDC531" : i === 1 ? "#d4a017" : i === 2 ? "#b38600" : "#4a6fa5" }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Unmapped SK cities */}
                    {unmapped.length > 0 && (
                      <div className="px-3 pb-2.5 border-t border-slate-700/30 pt-2">
                        <span className="text-[8px] uppercase tracking-widest text-slate-600 font-black">Ostatné mestá: </span>
                        {unmapped.slice(0, 6).map((c, i) => (
                          <span key={c.city} className="text-[8px] text-slate-500">{i > 0 ? " · " : ""}{c.city} <span className="text-slate-600">{c.sessions}</span></span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* All events */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Všetky GA4 eventy (90 dní)</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {otherEvents.map(e => (
            <div key={e.name} className="flex items-center gap-2 text-[11px]">
              <span className="flex-1 text-gray-500 font-mono truncate">{e.name}</span>
              <span className="font-bold text-secondary shrink-0">{e.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Štatistiky Tab ───────────────────────────────────────────────────────────
function StatistikyTab() {
  const orders = adminData.getOrders();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

  const total = orders.length;
  const todayCount = orders.filter(o => o.createdAt.slice(0, 10) === todayStr).length;
  const weekCount = orders.filter(o => new Date(o.createdAt) >= weekAgo).length;
  const monthCount = orders.filter(o => new Date(o.createdAt) >= monthAgo).length;

  const byStatus = { nova: 0, potvrdena: 0, odoslana: 0, vybavena: 0, vyuctovana: 0, vyplatena: 0, zrusena: 0 } as Record<string, number>;
  const byType = { pumpa: 0, mix: 0, vlastnadoprava: 0 } as Record<string, number>;
  const byPayment = { faktura: 0, hotovost: 0 } as Record<string, number>;
  let sms = 0;
  orders.forEach(o => {
    if (o.status in byStatus) byStatus[o.status]++;
    byType[o.tab] = (byType[o.tab] ?? 0) + 1;
    byPayment[o.priceMode] = (byPayment[o.priceMode] ?? 0) + 1;
    if (o.viaSms) sms++;
  });

  const active = orders.filter(o => o.status !== "zrusena");
  const totalBezDph = active.reduce((s, o) => s + (o.totalBezDph || 0), 0);
  const totalSDph = active.reduce((s, o) => s + (o.totalSDph || 0), 0);
  const avgValue = active.length > 0 ? totalBezDph / active.length : 0;

  const weeks: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now); start.setDate(start.getDate() - (i + 1) * 7);
    const end = new Date(now); end.setDate(end.getDate() - i * 7);
    weeks.push({
      label: i === 0 ? "teraz" : `−${i}t`,
      count: orders.filter(o => { const d = new Date(o.createdAt); return d >= start && d < end; }).length,
    });
  }
  const maxWeek = Math.max(...weeks.map(w => w.count), 1);

  const fmtEur = (n: number) => `${n.toLocaleString("sk", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  // ── Mesačné uzávierky ──
  const SK_MONTHS = ["Jan","Feb","Mar","Apr","Máj","Jún","Júl","Aug","Sep","Okt","Nov","Dec"];
  const fmtMonth = (ym: string) => { const [y, m] = ym.split("-"); return `${SK_MONTHS[parseInt(m) - 1]} ${y}`; };
  const monthlyMap = new Map<string, { count: number; m3: number; bezDph: number; sDph: number; faktura: number; hotovost: number }>();
  active.forEach(o => {
    const ym = o.createdAt.slice(0, 7);
    const cur = monthlyMap.get(ym) ?? { count: 0, m3: 0, bezDph: 0, sDph: 0, faktura: 0, hotovost: 0 };
    cur.count++;
    cur.m3 += o.totalQty || 0;
    cur.bezDph += o.totalBezDph || 0;
    cur.sDph += o.totalSDph || 0;
    if (o.priceMode === "faktura") cur.faktura += o.totalBezDph || 0;
    else cur.hotovost += o.totalBezDph || 0;
    monthlyMap.set(ym, cur);
  });
  const monthlyData = Array.from(monthlyMap.entries()).sort(([a], [b]) => b.localeCompare(a));
  const maxMonthRev = Math.max(...monthlyData.map(([, v]) => v.bezDph), 1);

  // ── Klientský obrat ──
  const clientMap = new Map<string, { name: string; clientId?: string; count: number; m3: number; bezDph: number; sDph: number }>();
  active.forEach(o => {
    const key = o.clientId ? `id:${o.clientId}` : `name:${o.clientName}`;
    const cur = clientMap.get(key) ?? { name: o.clientName, clientId: o.clientId, count: 0, m3: 0, bezDph: 0, sDph: 0 };
    cur.count++;
    cur.m3 = Math.round((cur.m3 + (o.totalQty || 0)) * 10) / 10;
    cur.bezDph += o.totalBezDph || 0;
    cur.sDph += o.totalSDph || 0;
    clientMap.set(key, cur);
  });
  const clientData = Array.from(clientMap.values()).sort((a, b) => b.bezDph - a.bezDph);
  const maxClientRev = Math.max(...clientData.map(c => c.bezDph), 1);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-secondary uppercase tracking-widest">Štatistiky objednávok</h2>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Celkom", value: total, sub: "všetky" },
          { label: "Dnes", value: todayCount, sub: todayStr },
          { label: "Týždeň", value: weekCount, sub: "posl. 7 dní" },
          { label: "Mesiac", value: monthCount, sub: "posl. 30 dní" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-sm border border-gray-200 p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className="text-3xl font-black text-secondary mt-1">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue */}
      {active.length > 0 && (
        <div className="bg-white rounded-sm border border-gray-200 p-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Obrat (bez zrušených)</p>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-[10px] text-gray-400 uppercase">Bez DPH</p><p className="text-xl font-black text-secondary">{fmtEur(totalBezDph)}</p></div>
            <div><p className="text-[10px] text-gray-400 uppercase">S DPH</p><p className="text-xl font-black text-secondary">{fmtEur(totalSDph)}</p></div>
            <div><p className="text-[10px] text-gray-400 uppercase">Priemerná</p><p className="text-xl font-black text-secondary">{fmtEur(avgValue)}</p></div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Status */}
        <div className="bg-white rounded-sm border border-gray-200 p-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Podľa statusu</p>
          <div className="space-y-2">
            {([
              { key: "nova", label: "Nová", color: "bg-blue-500" },
              { key: "potvrdena", label: "Potvrdená", color: "bg-yellow-400" },
              { key: "odoslana", label: "Odoslaná", color: "bg-green-500" },
              { key: "vybavena", label: "Vybavená", color: "bg-teal-500" },
              { key: "vyuctovana", label: "Vyúčtovaná", color: "bg-purple-400" },
              { key: "vyplatena", label: "Vyplatená", color: "bg-green-700" },
              { key: "zrusena", label: "Zrušená", color: "bg-red-400" },
            ] as { key: string; label: string; color: string }[]).filter(s => byStatus[s.key] > 0).map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-20 text-xs text-gray-600 shrink-0">{s.label}</span>
                <div className="flex-1 bg-gray-100 rounded-sm h-2 overflow-hidden">
                  <div className={`h-full rounded-sm ${s.color}`} style={{ width: `${pct(byStatus[s.key])}%` }} />
                </div>
                <span className="w-6 text-xs font-bold text-gray-500 text-right shrink-0">{byStatus[s.key]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {/* Typ */}
          <div className="bg-white rounded-sm border border-gray-200 p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Typ</p>
            <div className="space-y-2">
              {([
                { key: "pumpa", label: "Pumpa", color: "bg-secondary" },
                { key: "mix", label: "Mix", color: "bg-primary" },
                { key: "vlastnadoprava", label: "Vl. doprava", color: "bg-gray-400" },
              ] as { key: string; label: string; color: string }[]).filter(t => byType[t.key] > 0).map(t => (
                <div key={t.key} className="flex items-center gap-2">
                  <span className="w-20 text-xs text-gray-600 shrink-0">{t.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-sm h-2 overflow-hidden">
                    <div className={`h-full rounded-sm ${t.color}`} style={{ width: `${pct(byType[t.key])}%` }} />
                  </div>
                  <span className="w-6 text-xs font-bold text-gray-500 text-right shrink-0">{byType[t.key]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-sm border border-gray-200 p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Platba</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-gray-600">Faktúra</span><span className="font-bold text-secondary">{byPayment.faktura ?? 0}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-600">Hotovosť</span><span className="font-bold text-secondary">{byPayment.hotovost ?? 0}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-sm border border-gray-200 p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Zdroj</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-gray-600">Košík</span><span className="font-bold text-secondary">{total - sms}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-600">SMS</span><span className="font-bold text-secondary">{sms}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly trend */}
      {total > 0 && (
        <div className="bg-white rounded-sm border border-gray-200 p-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Trend (posledných 12 týždňov)</p>
          <div className="flex items-end gap-0.5 h-16">
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: "44px" }}>
                  <div
                    className={`w-full rounded-sm ${i === 11 ? "bg-primary" : "bg-secondary/35"}`}
                    style={{ height: `${Math.max((w.count / maxWeek) * 44, w.count > 0 ? 3 : 0)}px` }}
                    title={`${w.label}: ${w.count}`}
                  />
                </div>
                <span className="text-[7px] text-gray-400 leading-none truncate w-full text-center">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mesačné uzávierky ── */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesačné uzávierky</p>
            <p className="text-[10px] text-gray-400">{monthlyData.length} mesiacov</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wide">Mesiac</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Obj.</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">m³</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Bez DPH</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">S DPH</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase hidden sm:table-cell">Faktúra</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase hidden sm:table-cell">Hotovosť</th>
                  <th className="w-20 px-3 py-2 hidden md:table-cell"></th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(([ym, v], idx) => (
                  <tr key={ym} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${idx === 0 ? "bg-amber-50/40" : ""}`}>
                    <td className="px-4 py-2.5 font-bold text-secondary whitespace-nowrap">
                      {fmtMonth(ym)}
                      {idx === 0 && <span className="ml-1.5 text-[9px] font-black text-primary bg-primary/10 px-1 py-0.5 rounded">aktuálny</span>}
                    </td>
                    <td className="text-right px-3 py-2.5 font-bold text-gray-700">{v.count}</td>
                    <td className="text-right px-3 py-2.5 text-gray-600">{v.m3.toFixed(1)}</td>
                    <td className="text-right px-3 py-2.5 font-black text-secondary whitespace-nowrap">{fmtEur(v.bezDph)}</td>
                    <td className="text-right px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtEur(v.sDph)}</td>
                    <td className="text-right px-3 py-2.5 text-gray-400 whitespace-nowrap hidden sm:table-cell">{v.faktura > 0 ? fmtEur(v.faktura) : "—"}</td>
                    <td className="text-right px-3 py-2.5 text-gray-400 whitespace-nowrap hidden sm:table-cell">{v.hotovost > 0 ? fmtEur(v.hotovost) : "—"}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.round((v.bezDph / maxMonthRev) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-secondary/5 border-t-2 border-secondary/20">
                  <td className="px-4 py-2.5 font-black text-secondary text-[10px] uppercase tracking-wide">CELKOM</td>
                  <td className="text-right px-3 py-2.5 font-black text-secondary">{active.length}</td>
                  <td className="text-right px-3 py-2.5 font-black text-secondary">{active.reduce((s, o) => s + (o.totalQty || 0), 0).toFixed(1)}</td>
                  <td className="text-right px-3 py-2.5 font-black text-secondary whitespace-nowrap">{fmtEur(totalBezDph)}</td>
                  <td className="text-right px-3 py-2.5 font-black text-secondary whitespace-nowrap">{fmtEur(totalSDph)}</td>
                  <td className="text-right px-3 py-2.5 font-black text-gray-500 whitespace-nowrap hidden sm:table-cell">{fmtEur(active.filter(o => o.priceMode === "faktura").reduce((s, o) => s + (o.totalBezDph || 0), 0))}</td>
                  <td className="text-right px-3 py-2.5 font-black text-gray-500 whitespace-nowrap hidden sm:table-cell">{fmtEur(active.filter(o => o.priceMode === "hotovost").reduce((s, o) => s + (o.totalBezDph || 0), 0))}</td>
                  <td className="hidden md:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Klientský obrat ── */}
      {clientData.length > 0 && (
        <div className="bg-white rounded-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOP klienti – obrat</p>
            <p className="text-[10px] text-gray-400">{clientData.length} klientov</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-[10px] font-black text-gray-400 uppercase">#</th>
                  <th className="text-left px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Klient</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Obj.</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">m³</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Bez DPH</th>
                  <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">S DPH</th>
                  <th className="w-24 px-3 py-2 hidden md:table-cell"></th>
                </tr>
              </thead>
              <tbody>
                {clientData.map((c, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      {idx === 0 ? <span className="text-primary font-black">🥇</span>
                       : idx === 1 ? <span className="text-gray-400 font-black">🥈</span>
                       : idx === 2 ? <span className="text-amber-700 font-black">🥉</span>
                       : <span className="text-gray-400 font-bold">{idx + 1}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-secondary truncate max-w-[140px]">{c.name}</div>
                      {c.clientId && <div className="text-[10px] text-gray-400 font-mono">ID: {c.clientId}</div>}
                    </td>
                    <td className="text-right px-3 py-2.5 font-bold text-gray-700">{c.count}</td>
                    <td className="text-right px-3 py-2.5 text-gray-600">{c.m3.toFixed(1)}</td>
                    <td className="text-right px-3 py-2.5 font-black text-secondary whitespace-nowrap">{fmtEur(c.bezDph)}</td>
                    <td className="text-right px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtEur(c.sDph)}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((c.bezDph / maxClientRev) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>(() => {
    const hash = window.location.hash.slice(1) as Tab;
    const valid: Tab[] = ["betony", "sluzby", "doprava", "klienti", "objednavky", "analytics", "statistiky", "gsc"];
    return valid.includes(hash) ? hash : "klienti";
  });
  const [syncKey, setSyncKey] = useState(0);
  const [goToClientId, setGoToClientId] = useState<string | null>(null);
  const [sluzbyScrollPumpa, setSluzbyScrollPumpa] = useState(false);
  const [bioActive, setBioActive] = useState(() => isBiometricAvailable() && hasStoredCredential());

  useEffect(() => {
    const onBio = () => setBioActive(isBiometricAvailable() && hasStoredCredential());
    window.addEventListener("bio-status-changed", onBio);
    return () => window.removeEventListener("bio-status-changed", onBio);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  useEffect(() => {
    const el = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    const prev = el?.href ?? "";
    if (el) el.href = "/admin-manifest.json";
    return () => { if (el) el.href = prev; };
  }, []);

  useEffect(() => {
    syncFromServer().then(() => setSyncKey(k => k + 1));
  }, []);

  useEffect(() => {
    const handler = () => setSyncKey(k => k + 1);
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);

  const [orderBadge, setOrderBadge] = useState(0);
  const knownOrderIds = useRef<Set<string>>(new Set(adminData.getOrders().map(o => o.id)));
  const { toast } = useToast();

  useEffect(() => {
    if (tab === "objednavky") {
      setOrderBadge(0);
      adminData.getOrders().forEach(o => knownOrderIds.current.add(o.id));
      return;
    }
    const poll = async () => {
      try {
        const result = await adminApi.getOrders();
        if (result?.data) {
          const orders = result.data as Order[];
          const newOnes = orders.filter(o => !knownOrderIds.current.has(o.id));
          if (newOnes.length > 0) {
            newOnes.forEach(o => knownOrderIds.current.add(o.id));
            setOrderBadge(n => n + newOnes.length);
            toast({
              title: `${newOnes.length === 1 ? "Nová objednávka" : `${newOnes.length} nové objednávky`}`,
              description: newOnes.map(o => o.clientName).join(", "),
              duration: 6000,
            });
          }
        }
      } catch {}
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  const handleLogout = () => { logout(); navigate("/admin/login"); };
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs: { id: Tab; label: string; short: string; icon: React.ReactNode }[] = [
    { id: "klienti",    label: "KLIENTI",    short: "KLIENTI",  icon: <Users className="w-5 h-5" /> },
    { id: "objednavky", label: "OBJEDNÁVKY", short: "OBJED.",   icon: <ClipboardList className="w-5 h-5" /> },
    { id: "doprava",    label: "DOPRAVA",    short: "DOPRAVA",  icon: <Truck className="w-5 h-5" /> },
    { id: "sluzby",     label: "SLUŽBY",     short: "SLUŽBY",   icon: <Wrench className="w-5 h-5" /> },
    { id: "betony",     label: "BETÓNY",     short: "BETÓNY",   icon: <Layers className="w-5 h-5" /> },
    { id: "statistiky", label: "ŠTATISTIKY", short: "ŠTAT.",    icon: <TrendingUp className="w-5 h-5" /> },
    { id: "analytics",  label: "ANALÝZY",    short: "ANAL.",    icon: <BarChart2 className="w-5 h-5" /> },
    { id: "gsc",        label: "SEO",        short: "SEO",      icon: <Search className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen concrete-light" style={{ fontFamily: "Montserrat, sans-serif", overflowX: "clip" }}>
      {/* Top nav */}
      {/* Combined sticky header — logo row + desktop tab row */}
      <header className="bg-secondary shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12">
          <a href="/" className="flex items-center gap-0.5 select-none">
            <span className="font-black text-2xl tracking-tighter text-primary">MS</span>
            <span className="font-black text-2xl tracking-tighter text-primary/40">-</span>
            <span className="font-black text-2xl tracking-tighter text-white">BETON</span>
            <span className="ml-3 text-primary text-xs font-bold uppercase tracking-widest">Admin</span>
            {bioActive && <Fingerprint className="ml-1 w-3.5 h-3.5 text-primary" title="Biometrické prihlásenie aktívne" />}
            <VersionBadge className="ml-1 text-white/25 hidden sm:block" />
          </a>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout}
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-semibold transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Odhlásiť</span>
            </button>
          </div>
        </div>
        {/* Desktop tab row — dark navy, inside header */}
        <div className="hidden sm:block border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex">
              {tabs.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); window.location.hash = t.id; }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                    tab === t.id ? "text-primary border-primary" : "text-white/50 border-transparent hover:text-white/80"
                  }`}>
                  <span className="relative">
                    {t.icon}
                    {t.id === "objednavky" && orderBadge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                        {orderBadge > 9 ? "9+" : orderBadge}
                      </span>
                    )}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile tab bar — white, fixed pod headerom, ikona + label */}
      <div className="sm:hidden fixed top-12 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex">
          {tabs.filter(t => t.id !== "analytics" && t.id !== "statistiky" && t.id !== "gsc").map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); window.location.hash = t.id; setMoreOpen(false); }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 border-b-2 transition-all ${
                tab === t.id ? "text-primary border-primary" : "text-gray-400 border-transparent"
              }`}>
              <span className="relative">
                {t.icon}
                {t.id === "objednavky" && orderBadge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {orderBadge > 9 ? "9+" : orderBadge}
                  </span>
                )}
              </span>
              <span className="text-[8px] font-bold uppercase leading-none">{t.short}</span>
            </button>
          ))}
          {/* More button */}
          <div className="relative flex-1">
            <button
              onClick={() => setMoreOpen(o => !o)}
              className={`w-full flex flex-col items-center justify-center py-1.5 gap-0.5 border-b-2 transition-all ${
                (tab === "analytics" || tab === "statistiky" || tab === "gsc") ? "text-primary border-primary" : moreOpen ? "text-secondary border-transparent" : "text-gray-400 border-transparent"
              }`}>
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase leading-none">VIAC</span>
            </button>
            {moreOpen && (
              <div className="absolute top-full right-0 mt-px w-44 bg-white border border-gray-200 rounded-sm shadow-xl overflow-hidden z-50">
                <button onClick={() => { setTab("statistiky"); window.location.hash = "statistiky"; setMoreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-colors ${tab === "statistiky" ? "text-primary bg-primary/5" : "text-gray-600 hover:bg-gray-50"}`}>
                  <TrendingUp className="w-4 h-4 shrink-0" /> Štatistiky
                </button>
                <button onClick={() => { setTab("analytics"); window.location.hash = "analytics"; setMoreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-colors border-t border-gray-100 ${tab === "analytics" ? "text-primary bg-primary/5" : "text-gray-600 hover:bg-gray-50"}`}>
                  <BarChart2 className="w-4 h-4 shrink-0" /> Analýzy GA4
                </button>
                <button onClick={() => { setTab("gsc"); window.location.hash = "gsc"; setMoreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-colors border-t border-gray-100 ${tab === "gsc" ? "text-primary bg-primary/5" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Search className="w-4 h-4 shrink-0" /> SEO
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll container — fills viewport below fixed header */}
      <div id="admin-content" className="fixed top-[86px] sm:top-20 left-0 right-0 bottom-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-8">
          {tab === "betony" && <BetonTab key={syncKey} />}
          {tab === "sluzby" && <SluzbyTab key={syncKey} onGoToDoprava={() => { setTab("doprava"); window.location.hash = "doprava"; }} scrollToPumpa={sluzbyScrollPumpa} onScrollDone={() => setSluzbyScrollPumpa(false)} />}
          {tab === "doprava" && <DopravaTab key={syncKey} onGoToSluzby={() => { setTab("sluzby"); setSluzbyScrollPumpa(true); window.location.hash = "sluzby"; }} />}
          {tab === "klienti" && <KlientiTab expandClientId={goToClientId} onExpanded={() => setGoToClientId(null)} />}
          {tab === "objednavky" && <ObjednavkyTab key={syncKey} onGoToClient={(loginId) => { setTab("klienti"); setGoToClientId(loginId); }} />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "statistiky" && <StatistikyTab />}
          {tab === "gsc" && <SearchConsoleTab />}
        </div>
      </div>

    </div>
  );
}
