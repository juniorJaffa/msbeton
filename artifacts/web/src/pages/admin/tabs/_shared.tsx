import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { getAdminToken } from "@/lib/adminAuth";

export function authFetch(url: string, opts?: RequestInit): Promise<Response> {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts?.headers as Record<string, string> ?? {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...opts, headers });
}

// ── Inline editable cell ──────────────────────────────────────────────────────
export function EditableField({ value, onSave, type = "text" }: { value: string | number; onSave: (v: string) => void; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  const save = () => { onSave(val); setEditing(false); };
  const cancel = () => { setVal(String(value)); setEditing(false); };
  const startEdit = () => { setVal(String(value)); setEditing(true); };
  if (!editing) return (
    <span className="cursor-pointer hover:text-primary transition-colors group flex items-center gap-1.5 min-w-0" onClick={e => { e.stopPropagation(); startEdit(); }}>
      <span className="break-words min-w-0 leading-snug">{value}</span>
      <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
    </span>
  );
  return (
    <span className="flex items-center gap-1.5">
      <input
        type={type}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); save(); } if (e.key === "Escape") cancel(); }}
        onBlur={save}
        className={`bg-amber-50 border-2 border-primary px-2.5 py-1 text-secondary text-sm focus:outline-none rounded-sm ${type === "number" ? "w-28 text-right" : "w-56 min-w-[120px]"}`}
        autoFocus
        onFocus={e => e.target.select()}
      />
      <button onMouseDown={e => e.preventDefault()} onClick={save} className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors" aria-label="Uložiť">
        <Check className="w-4 h-4" />
      </button>
      <button onMouseDown={e => e.preventDefault()} onClick={cancel} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" aria-label="Zrušiť">
        <X className="w-4 h-4" />
      </button>
    </span>
  );
}

export function MiniBar({ value, max, color = "#EDC531" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-full"><div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" /></div>;
}

export function SparkLine({ data, color = "#EDC531" }: { data: number[]; color?: string }) {
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
