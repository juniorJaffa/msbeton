import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Check, X } from "lucide-react";
import { adminData, Service } from "@/lib/adminData";
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

export default function SluzbyTab({ onGoToDoprava, scrollToPumpa, onScrollDone }: { onGoToDoprava?: () => void; scrollToPumpa?: boolean; onScrollDone?: () => void }) {
  const [services, setServices] = useState<Service[]>(adminData.getServices());
  useEffect(() => {
    const handler = () => setServices(adminData.getServices());
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);
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
