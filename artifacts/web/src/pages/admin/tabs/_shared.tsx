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
