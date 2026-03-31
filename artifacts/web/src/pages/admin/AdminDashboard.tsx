import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { LogOut, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Users, Truck, Wrench, Layers } from "lucide-react";
import { isLoggedIn, logout } from "@/lib/adminAuth";
import { adminData, ConcreteCategory, ConcreteType, DeliveryZone, Service, Client } from "@/lib/adminData";

type Tab = "betony" | "sluzby" | "doprava" | "klienti";

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

// ── DOPRAVA tab ───────────────────────────────────────────────────────────────
function DopravaTab() {
  const [zones, setZones] = useState<DeliveryZone[]>(adminData.getDelivery());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", ratePerKm: "", truckCapacity: "", pumpHourlyRate: "" });

  const save = (data: DeliveryZone[]) => { setZones(data); adminData.saveDelivery(data); };
  const update = (id: string, field: keyof DeliveryZone, value: string) =>
    save(zones.map(z => z.id === id ? { ...z, [field]: ["name"].includes(field) ? value : parseFloat(value) } : z));
  const remove = (id: string) => { if (confirm("Vymazať zónu?")) save(zones.filter(z => z.id !== id)); };
  const add = () => {
    if (!form.name || !form.ratePerKm) return;
    save([...zones, { id: adminData.generateId(), name: form.name, ratePerKm: parseFloat(form.ratePerKm), truckCapacity: parseFloat(form.truckCapacity) || 7, pumpHourlyRate: parseFloat(form.pumpHourlyRate) || 180 }]);
    setForm({ name: "", ratePerKm: "", truckCapacity: "", pumpHourlyRate: "" }); setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {zones.map(z => (
          <div key={z.id} className="bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-bold text-secondary text-lg"><EditableField value={z.name} onSave={v => update(z.id, "name", v)} /></div>
              </div>
              <button onClick={() => remove(z.id)} className="p-1.5 bg-secondary text-primary hover:bg-secondary/80 rounded-sm"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 border border-gray-100">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sadzba za km</div>
                <div className="font-bold text-secondary">
                  <EditableField value={z.ratePerKm} type="number" onSave={v => update(z.id, "ratePerKm", v)} /> €/km
                </div>
              </div>
              <div className="bg-gray-50 p-3 border border-gray-100">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Kapacita mixéra</div>
                <div className="font-bold text-secondary">
                  <EditableField value={z.truckCapacity} type="number" onSave={v => update(z.id, "truckCapacity", v)} /> m³
                </div>
              </div>
              <div className="bg-gray-50 p-3 border border-gray-100">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Hodinová sadzba pumpy</div>
                <div className="font-bold text-secondary">
                  <EditableField value={z.pumpHourlyRate} type="number" onSave={v => update(z.id, "pumpHourlyRate", v)} /> €/hod
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-white border-2 border-primary p-5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input placeholder="Názov zóny" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary col-span-2" />
            <input placeholder="Sadzba €/km (napr. 1.8)" type="number" step="0.1" value={form.ratePerKm} onChange={e => setForm({ ...form, ratePerKm: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <input placeholder="Kapacita mixéra (m³)" type="number" value={form.truckCapacity} onChange={e => setForm({ ...form, truckCapacity: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <input placeholder="Sadzba pumpy (€/hod)" type="number" value={form.pumpHourlyRate} onChange={e => setForm({ ...form, pumpHourlyRate: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90">Pridať</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm hover:bg-gray-200">Zrušiť</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 w-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary font-bold text-sm py-4 justify-center transition-colors">
          <Plus className="w-4 h-4" /> Pridať dopravnú zónu
        </button>
      )}
    </div>
  );
}

// ── SLUŽBY tab ────────────────────────────────────────────────────────────────
function SluzbyTab() {
  const [services, setServices] = useState<Service[]>(adminData.getServices());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const save = (data: Service[]) => { setServices(data); adminData.saveServices(data); };
  const toggle = (id: string) => save(services.map(s => s.id === id ? { ...s, active: !s.active } : s));
  const remove = (id: string) => { if (confirm("Vymazať službu?")) save(services.filter(s => s.id !== id)); };
  const update = (id: string, field: keyof Service, value: string) => save(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  const add = () => {
    if (!form.name) return;
    save([...services, { id: adminData.generateId(), name: form.name, description: form.description, active: true }]);
    setForm({ name: "", description: "" }); setAdding(false);
  };

  return (
    <div className="space-y-3">
      {services.map(s => (
        <div key={s.id} className={`bg-white border shadow-sm p-5 flex items-start justify-between gap-4 ${s.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
          <div className="flex-1">
            <div className="font-bold text-secondary text-base mb-1"><EditableField value={s.name} onSave={v => update(s.id, "name", v)} /></div>
            <div className="text-sm text-gray-500"><EditableField value={s.description} onSave={v => update(s.id, "description", v)} /></div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => toggle(s.id)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${s.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              {s.active ? "Aktívna" : "Neaktívna"}
            </button>
            <button onClick={() => remove(s.id)} className="p-1.5 bg-secondary text-primary hover:bg-secondary/80 rounded-sm"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="bg-white border-2 border-primary p-5 space-y-3">
          <input placeholder="Názov služby" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" autoFocus />
          <input placeholder="Popis služby" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
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

// ── KLIENTI tab ───────────────────────────────────────────────────────────────
function KlientiTab() {
  const [clients, setClients] = useState<Client[]>(adminData.getClients());
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", logo: "", contact: "", phone: "", email: "", note: "" });

  const save = (data: Client[]) => { setClients(data); adminData.saveClients(data); };
  const remove = (id: string) => { if (confirm("Vymazať klienta?")) save(clients.filter(c => c.id !== id)); };
  const update = (id: string, field: keyof Client, value: string) => save(clients.map(c => c.id === id ? { ...c, [field]: value } : c));
  const add = () => {
    if (!form.name) return;
    save([...clients, { id: adminData.generateId(), ...form }]);
    setForm({ name: "", logo: "", contact: "", phone: "", email: "", note: "" }); setAdding(false);
  };

  const filtered = clients.filter(c =>
    [c.name, c.contact, c.email, c.phone].some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input placeholder="Hľadať klienta..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:border-primary" />
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Pridať klienta
        </button>
      </div>

      {adding && (
        <div className="bg-white border-2 border-primary p-5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input placeholder="Názov firmy *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary col-span-2" autoFocus />
            <input placeholder="URL loga (https://...)" value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary col-span-2" />
            <input placeholder="Kontaktná osoba" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <input placeholder="Telefón" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <input placeholder="E-mail" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary col-span-2" />
            <input placeholder="Poznámka" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90">Uložiť</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm">Zrušiť</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Žiadni klienti.</p>}
        {filtered.map(c => (
          <div key={c.id} className="bg-white border border-gray-200 shadow-sm px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {c.logo ? (
                <img src={c.logo} alt={c.name} className="w-16 h-12 object-contain border border-gray-100 rounded shrink-0 bg-gray-50 p-1" />
              ) : (
                <div className="w-16 h-12 border border-dashed border-gray-200 rounded shrink-0 bg-gray-50 flex items-center justify-center text-gray-300 text-xs text-center leading-tight p-1">bez loga</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 flex-1 text-sm">
                <div className="sm:col-span-3">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Firma</div>
                  <div className="font-bold text-secondary"><EditableField value={c.name} onSave={v => update(c.id, "name", v)} /></div>
                </div>
                <div className="sm:col-span-3">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">URL loga</div>
                  <div className="text-xs text-gray-500 break-all"><EditableField value={c.logo || "—"} onSave={v => update(c.id, "logo", v)} /></div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Kontakt</div>
                  <div><EditableField value={c.contact || "—"} onSave={v => update(c.id, "contact", v)} /></div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Telefón</div>
                  <div><EditableField value={c.phone || "—"} onSave={v => update(c.id, "phone", v)} /></div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">E-mail</div>
                  <div><EditableField value={c.email || "—"} onSave={v => update(c.id, "email", v)} /></div>
                </div>
                {c.note && (
                  <div className="sm:col-span-3">
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Poznámka</div>
                    <div className="text-gray-500 italic"><EditableField value={c.note} onSave={v => update(c.id, "note", v)} /></div>
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => remove(c.id)} className="p-1.5 bg-secondary text-primary hover:bg-secondary/80 rounded-sm shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("betony");

  useEffect(() => {
    if (!isLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  const handleLogout = () => { logout(); navigate("/admin/login"); };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "betony", label: "BETÓNY", icon: <Layers className="w-4 h-4" /> },
    { id: "sluzby", label: "SLUŽBY", icon: <Wrench className="w-4 h-4" /> },
    { id: "doprava", label: "DOPRAVA", icon: <Truck className="w-4 h-4" /> },
    { id: "klienti", label: "KLIENTI", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "Montserrat, sans-serif" }}>
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
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 p-1 shadow-sm w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black uppercase tracking-widest transition-all ${
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
          {tab === "betony" && <BetonTab />}
          {tab === "sluzby" && <SluzbyTab />}
          {tab === "doprava" && <DopravaTab />}
          {tab === "klienti" && <KlientiTab />}
        </div>
      </div>
    </div>
  );
}
