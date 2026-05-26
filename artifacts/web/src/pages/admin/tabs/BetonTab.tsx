import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, Check, X, Plus, GripVertical } from "lucide-react";
import { adminData, ConcreteCategory, ConcreteType } from "@/lib/adminData";
import { EditableField } from "./_shared";

export default function BetonTab() {
  const [cats, setCats] = useState<ConcreteCategory[]>(adminData.getCategories());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameCatVal, setRenameCatVal] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("");

  // Drag state
  const dragCatId = useRef<string | null>(null);
  const dragTypeId = useRef<string | null>(null);
  const dragTypeCatId = useRef<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);
  const [dragOverType, setDragOverType] = useState<string | null>(null);

  const save = (data: ConcreteCategory[]) => { setCats(data); adminData.saveCategories(data); };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    save([...cats, { id: adminData.generateId(), name: newCatName.trim(), types: [] }]);
    setNewCatName(""); setAddingCat(false);
  };
  const deleteCategory = (id: string) => { if (confirm("Vymazať kategóriu?")) save(cats.filter(c => c.id !== id)); };
  const updateCatName = (id: string, name: string) => save(cats.map(c => c.id === id ? { ...c, name } : c));

  const addType = (catId: string) => {
    if (!newTypeName.trim() || !newTypePrice) return;
    save(cats.map(c => c.id === catId ? { ...c, types: [...c.types, { id: adminData.generateId(), label: newTypeName.trim(), price: parseFloat(newTypePrice) }] } : c));
    setNewTypeName(""); setNewTypePrice(""); setAddingType(null);
  };
  const deleteType = (catId: string, typeId: string) => save(cats.map(c => c.id === catId ? { ...c, types: c.types.filter(t => t.id !== typeId) } : c));
  const updateType = (catId: string, typeId: string, field: keyof ConcreteType, value: string) =>
    save(cats.map(c => c.id === catId ? { ...c, types: c.types.map(t => t.id === typeId ? { ...t, [field]: field === "price" ? parseFloat(value) : value } : t) } : c));

  // Category drag handlers
  const onCatDragStart = (e: React.DragEvent, id: string) => {
    dragCatId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const onCatDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragCatId.current && dragCatId.current !== id) setDragOverCat(id);
  };
  const onCatDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const fromId = dragCatId.current;
    if (!fromId || fromId === targetId) { setDragOverCat(null); return; }
    const arr = [...cats];
    const from = arr.findIndex(c => c.id === fromId);
    const to = arr.findIndex(c => c.id === targetId);
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    save(arr);
    dragCatId.current = null;
    setDragOverCat(null);
  };
  const onCatDragEnd = () => { dragCatId.current = null; setDragOverCat(null); };

  // Type drag handlers
  const onTypeDragStart = (e: React.DragEvent, catId: string, typeId: string) => {
    dragTypeId.current = typeId;
    dragTypeCatId.current = catId;
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };
  const onTypeDragOver = (e: React.DragEvent, typeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragTypeId.current && dragTypeId.current !== typeId) setDragOverType(typeId);
  };
  const onTypeDrop = (e: React.DragEvent, catId: string, targetTypeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const fromTypeId = dragTypeId.current;
    const fromCatId = dragTypeCatId.current;
    if (!fromTypeId || !fromCatId || fromCatId !== catId || fromTypeId === targetTypeId) {
      setDragOverType(null); return;
    }
    save(cats.map(c => {
      if (c.id !== catId) return c;
      const types = [...c.types];
      const from = types.findIndex(t => t.id === fromTypeId);
      const to = types.findIndex(t => t.id === targetTypeId);
      if (from < 0 || to < 0) return c;
      const [moved] = types.splice(from, 1);
      types.splice(to, 0, moved);
      return { ...c, types };
    }));
    dragTypeId.current = null;
    dragTypeCatId.current = null;
    setDragOverType(null);
  };
  const onTypeDragEnd = () => { dragTypeId.current = null; dragTypeCatId.current = null; setDragOverType(null); };

  return (
    <div className="space-y-2">
      {addingCat ? (
        <div className="border-2 border-primary/60 border-l-4 border-l-primary rounded-lg bg-primary/5 p-4 shadow-sm">
          <p className="text-xs font-bold text-secondary/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nová kategória
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              placeholder="Názov kategórie (napr. DRVENÉ KAMENIVO Dmax8, Anhydrit…)"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") { setAddingCat(false); setNewCatName(""); } }}
              className="flex-1 border-2 border-primary/50 focus:border-primary px-4 py-3 text-sm focus:outline-none bg-white rounded-md font-medium placeholder:text-gray-400 text-secondary"
              autoFocus
            />
            <div className="flex gap-2 shrink-0">
              <button onClick={addCategory} className="flex-1 sm:flex-none px-5 py-3 bg-primary text-secondary font-bold text-sm hover:bg-primary/90 rounded-md transition-colors flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Pridať
              </button>
              <button onClick={() => { setAddingCat(false); setNewCatName(""); }} className="flex-1 sm:flex-none px-5 py-3 bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 rounded-md transition-colors font-medium">
                Zrušiť
              </button>
            </div>
          </div>
          <p className="text-xs text-secondary/40 font-medium mt-2 flex items-center gap-1.5">
            <kbd className="bg-secondary/8 border border-secondary/15 text-secondary/50 rounded px-1.5 py-0.5 text-[10px] font-mono leading-none">Enter</kbd> pridanie
            <span className="text-secondary/25">·</span>
            <kbd className="bg-secondary/8 border border-secondary/15 text-secondary/50 rounded px-1.5 py-0.5 text-[10px] font-mono leading-none">Esc</kbd> zrušenie
          </p>
        </div>
      ) : (
        <button onClick={() => setAddingCat(true)}
          className="flex items-center gap-2 w-full border-2 border-dashed border-gray-400 bg-white shadow-sm text-gray-600 hover:border-primary hover:text-primary font-bold text-sm py-4 justify-center transition-colors rounded-md">
          <Plus className="w-4 h-4" /> Pridať kategóriu
        </button>
      )}

      {cats.map(cat => (
        <div key={cat.id}
          draggable
          onDragStart={e => onCatDragStart(e, cat.id)}
          onDragOver={e => onCatDragOver(e, cat.id)}
          onDrop={e => onCatDrop(e, cat.id)}
          onDragEnd={onCatDragEnd}
          className={`border bg-white shadow-sm transition-all ${dragOverCat === cat.id ? "border-primary border-dashed bg-primary/5" : "border-gray-200"}`}>
          <div className="flex items-center justify-between px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
            onClick={() => { setExpanded(expanded === cat.id ? null : cat.id); setRenamingCat(null); }}>
            <div className="flex items-center gap-2 min-w-0">
              {/* Drag handle — category */}
              <span className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                onClick={e => e.stopPropagation()} draggable={false}>
                <GripVertical className="w-4 h-4" />
              </span>
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
            <div className="border-t border-gray-100 px-3 py-3 bg-gray-50/50">
              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide">
                    <th className="w-6" />
                    <th className="text-left pb-2 font-semibold">Typ betónu</th>
                    <th className="text-right pb-2 font-semibold">Cena (€/m³)</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {cat.types.map(t => (
                    <tr key={t.id}
                      draggable
                      onDragStart={e => onTypeDragStart(e, cat.id, t.id)}
                      onDragOver={e => onTypeDragOver(e, t.id)}
                      onDrop={e => onTypeDrop(e, cat.id, t.id)}
                      onDragEnd={onTypeDragEnd}
                      className={`border-t border-gray-100 transition-colors ${dragOverType === t.id ? "bg-primary/8 border-primary border-dashed" : ""}`}>
                      {/* Drag handle — type, LEFT side */}
                      <td className="py-2 pr-1 w-6">
                        <span className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex items-center justify-center touch-none">
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                      </td>
                      <td className="py-2 font-medium text-secondary">
                        <EditableField value={t.label} onSave={v => updateType(cat.id, t.id, "label", v)} />
                      </td>
                      <td className="py-2 text-right">
                        <EditableField value={t.price.toFixed(2)} type="number" onSave={v => updateType(cat.id, t.id, "price", v)} />
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => deleteType(cat.id, t.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {addingType === cat.id ? (
                <div className="mt-3 border border-primary/40 rounded-md bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-bold text-secondary/50 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Nový typ betónu
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      placeholder="Názov betónu (napr. C25/30 XC1)"
                      value={newTypeName}
                      onChange={e => setNewTypeName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Tab") return; if (e.key === "Enter") addType(cat.id); if (e.key === "Escape") setAddingType(null); }}
                      className="flex-1 border-2 border-primary/40 focus:border-primary px-3 py-2.5 text-sm focus:outline-none rounded-md bg-amber-50/30 font-medium placeholder:text-gray-400 text-secondary"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <input
                        placeholder="Cena €/m³"
                        type="number"
                        step="0.01"
                        value={newTypePrice}
                        onChange={e => setNewTypePrice(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addType(cat.id); if (e.key === "Escape") setAddingType(null); }}
                        className="w-32 border-2 border-primary/40 focus:border-primary px-3 py-2.5 text-sm focus:outline-none rounded-md bg-amber-50/30 font-medium text-right placeholder:text-gray-400 text-secondary"
                      />
                      <button onClick={() => addType(cat.id)} className="px-3 py-2.5 bg-primary text-secondary text-sm font-bold hover:bg-primary/90 rounded-md transition-colors flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> OK
                      </button>
                      <button onClick={() => setAddingType(null)} className="px-3 py-2.5 bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 rounded-md transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingType(cat.id); setNewTypeName(""); setNewTypePrice(""); }}
                  className="flex items-center gap-1.5 text-xs text-primary font-bold hover:bg-primary/10 hover:text-secondary transition-colors mt-2 px-3 py-2 rounded-md border border-dashed border-primary/40 hover:border-primary cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Pridať typ betónu
                </button>
              )}
            </div>
          )}
        </div>
      ))}

    </div>
  );
}
