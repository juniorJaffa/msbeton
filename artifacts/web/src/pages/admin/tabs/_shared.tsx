import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { getAdminToken } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";

export function authFetch(url: string, opts?: RequestInit): Promise<Response> {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts?.headers as Record<string, string> ?? {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...opts, headers });
}

// ── Inline editable cell ──────────────────────────────────────────────────────
export function EditableField({ value, onSave, type = "text", suggestionSuffixes }: { value: string | number; onSave: (v: string) => void; type?: string; suggestionSuffixes?: string[] }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  const { toast } = useToast();
  const save = () => {
    if (type === "number" && parseFloat(val) < 0) {
      toast({ title: "Záporná hodnota nie je povolená", description: "Minimálna hodnota je 0.", variant: "destructive", duration: 3000 });
      setVal("0");
      onSave("0");
      setEditing(false);
      return;
    }
    onSave(val); setEditing(false);
  };
  const cancel = () => { setVal(String(value)); setEditing(false); };
  const startEdit = () => { setVal(String(value)); setEditing(true); };
  // Rovnaká logika ako CompanyInput: strip akejkoľvek variant právnej formy, potom doplniť kanonický suffix
  const LEGAL_SUFFIX_RE_EF = /[\s,]*(?:s\.?\s*r\.?\s*o|spol\.?\s*s\s*r\.?\s*o|a\.?\s*s|k\.?\s*s|v\.?\s*o\.?\s*s)[.,\s]*$/i;
  const valTrimmed = val.trim();
  const efBase = valTrimmed.replace(LEGAL_SUFFIX_RE_EF, "").trimEnd();
  const efAlreadyComplete = (suggestionSuffixes ?? []).some(s => valTrimmed.toLowerCase() === (efBase + s).toLowerCase());
  const activeSuggs = suggestionSuffixes && efBase && !efAlreadyComplete
    ? suggestionSuffixes.map(s => efBase + s)
    : [];
  if (!editing) return (
    <span className="cursor-pointer hover:text-primary transition-colors group flex items-center gap-1.5 min-w-0" onClick={e => { e.stopPropagation(); startEdit(); }}>
      <span className={`min-w-0 leading-snug ${type === "number" ? "whitespace-nowrap" : "break-words"}`}>{value}</span>
      <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0 hidden sm:inline-block" />
    </span>
  );
  return (
    <span className="flex flex-wrap items-center gap-1.5 w-full">
      {type === "number" ? (
        <input
          type="number"
          min="0"
          step="any"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); save(); } if (e.key === "Escape") cancel(); }}
          onBlur={e => { if (parseFloat(e.target.value) < 0) setVal("0"); save(); }}
          className="bg-amber-50 border-2 border-primary px-2.5 py-1 text-secondary text-sm focus:outline-none rounded-sm w-full sm:w-28 text-right"
          autoFocus
          onFocus={e => e.target.select()}
        />
      ) : (
        <span className="relative flex-1 min-w-0">
          <textarea
            value={val}
            rows={Math.max(2, Math.ceil(val.length / 38))}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                if (activeSuggs.length > 0) { e.preventDefault(); e.stopPropagation(); setVal(activeSuggs[0]); return; }
                e.preventDefault(); e.stopPropagation(); save();
              }
              if (e.key === "Escape") cancel();
            }}
            onBlur={e => { setTimeout(() => save(), 160); }}
            className="bg-amber-50 border-2 border-primary px-2.5 py-1 text-secondary text-sm focus:outline-none rounded-sm w-full min-w-[160px] resize-none leading-snug"
            autoFocus
            onFocus={e => e.target.select()}
          />
          {activeSuggs.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-gray-200 shadow-lg text-sm overflow-hidden">
              {activeSuggs.map(s => (
                <li
                  key={s}
                  onMouseDown={e => { e.preventDefault(); setVal(s); }}
                  className="px-3 py-2 cursor-pointer hover:bg-amber-50 hover:text-secondary truncate border-b border-gray-100 last:border-0"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </span>
      )}
      <button onMouseDown={e => e.preventDefault()} onClick={save} className="shrink-0 p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors" aria-label="Uložiť">
        <Check className="w-4 h-4" />
      </button>
      <button onMouseDown={e => e.preventDefault()} onClick={cancel} className="shrink-0 p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" aria-label="Zrušiť">
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
