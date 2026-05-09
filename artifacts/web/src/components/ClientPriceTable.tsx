import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { adminData } from "@/lib/adminData";
import { cn } from "@/lib/utils";

type Section = "betony" | "sluzby" | "doprava";

interface Props {
  discountBeton: number;
  discountDoprava: number;
  discountSluzby: number;
  discountCelkovo: number;
  manualPrices?: Record<string, number>;
  onManualPriceChange?: (id: string, price: number | null) => void;
  variant?: "dark" | "light";
  priceMode?: "faktura" | "hotovost";
  hotovostDph?: number;
}

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}

function DiscBadge({ pct, dark }: { pct: number; dark: boolean }) {
  if (pct <= 0) return null;
  return (
    <span className={cn("ml-2 text-[10px] font-black px-1 py-0.5 rounded-sm", dark ? "bg-primary/20 text-primary" : "bg-primary text-white")}>
      −{pct}%
    </span>
  );
}

interface EditRowProps {
  id: string;
  orig: number;
  factor: number;
  manualPrice: number | undefined;
  dark: boolean;
  onManualPriceChange?: (id: string, price: number | null) => void;
}

function EditRow({ id, orig, factor, manualPrice, dark, onManualPriceChange }: EditRowProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const computedDisc = orig * factor;
  const effectivePrice = manualPrice !== undefined ? manualPrice : computedDisc;

  const startEdit = () => {
    setInputVal(effectivePrice.toFixed(2));
    setEditing(true);
  };

  const confirm = () => {
    const v = parseFloat(inputVal.replace(",", "."));
    if (!isNaN(v) && v >= 0) onManualPriceChange?.(id, v);
    setEditing(false);
  };

  const clear = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onManualPriceChange?.(id, null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") confirm();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={confirm}
          autoFocus
          className={cn(
            "w-20 text-right text-sm font-bold px-1.5 py-0.5 rounded border outline-none",
            dark ? "bg-white/10 border-primary/40 text-white" : "bg-gray-50 border-gray-300 text-secondary"
          )}
        />
        {manualPrice !== undefined && (
          <button type="button" onMouseDown={clear} title="Odstrániť manuálnu cenu"
            className={cn("cursor-pointer transition-colors shrink-0", dark ? "text-white/30 hover:text-red-400" : "text-gray-300 hover:text-red-400")}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  const hasManual = manualPrice !== undefined;
  const hasDisc = factor < 1 && Math.abs(orig - computedDisc) > 0.001;

  // When manual: strike the discount-computed price to show "what discount would give"
  // When only discount: strike the orig price
  const strikeVal = hasManual ? computedDisc : orig;
  const showStrike = hasManual
    ? Math.abs(computedDisc - manualPrice) > 0.001
    : hasDisc;

  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="text-right leading-tight">
        {showStrike && (
          <span className={cn(
            "block text-[11px] line-through",
            hasManual
              ? dark ? "text-primary/40" : "text-amber-500/60"
              : dark ? "text-white/30" : "text-gray-400"
          )}>
            {fmt(strikeVal)}
          </span>
        )}
        <span className={cn(
          "font-bold text-sm flex items-center gap-1 justify-end",
          hasManual
            ? dark ? "text-sky-400" : "text-blue-600"
            : hasDisc ? "text-primary" : dark ? "text-white/75" : "text-secondary"
        )}>
          {fmt(effectivePrice)}
          {hasManual && (
            <span className={cn("text-[8px] font-black px-0.5 rounded-sm leading-none shrink-0", dark ? "bg-sky-400/20 text-sky-400" : "bg-blue-100 text-blue-600")}>M</span>
          )}
        </span>
      </div>
      {hasManual && onManualPriceChange && (
        <button type="button" onClick={clear} title="Vrátiť na zľavovú cenu"
          className={cn("cursor-pointer shrink-0 transition-colors", dark ? "text-white/30 hover:text-red-400" : "text-gray-300 hover:text-red-400")}>
          <X className="w-3 h-3" />
        </button>
      )}
      {onManualPriceChange && (
        <button type="button" onClick={startEdit} title={hasManual ? "Upraviť manuálnu cenu" : "Nastaviť manuálnu cenu"}
          className={cn("cursor-pointer shrink-0 transition-colors", dark ? "text-white/20 hover:text-primary" : "text-gray-300 hover:text-secondary")}>
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function ClientPriceTable({
  discountBeton, discountDoprava, discountSluzby, discountCelkovo,
  manualPrices, onManualPriceChange, variant = "dark",
  priceMode = "faktura", hotovostDph = 0.20,
}: Props) {
  const [section, setSection] = useState<Section>("betony");
  const hotovostMult = priceMode === "hotovost" ? 1 + hotovostDph : 1;

  const effectiveBeton   = discountBeton   > 0 ? discountBeton   : discountCelkovo;
  const effectiveDoprava = discountDoprava > 0 ? discountDoprava : discountCelkovo;
  const effectiveSluzby  = discountSluzby  > 0 ? discountSluzby  : discountCelkovo;
  const betonFactor   = 1 - effectiveBeton   / 100;
  const dopravaFactor = 1 - effectiveDoprava / 100;
  const sluzbyFactor  = 1 - effectiveSluzby  / 100;

  const categories = adminData.getCategories();
  const services = adminData.getServices().filter((s) => s.active);
  const zones = adminData.getTransportZones();
  const ts = adminData.getTransportSettings();
  const dark = variant === "dark";

  const tabs: { id: Section; label: string; disc: number }[] = [
    { id: "betony",  label: "BETÓNY",  disc: effectiveBeton },
    { id: "sluzby",  label: "SLUŽBY",  disc: effectiveSluzby },
    { id: "doprava", label: "DOPRAVA", disc: effectiveDoprava },
  ];

  return (
    <div className={cn("rounded-lg overflow-hidden border", dark ? "border-primary/20" : "border-gray-200 shadow-sm")}>
      {/* Section tab bar */}
      <div className={cn("grid grid-cols-3 border-b text-xs", dark ? "border-primary/20" : "border-gray-200")}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setSection(t.id)} className={cn(
            "py-2 font-black tracking-wide sm:tracking-widest transition-all flex flex-col items-center justify-center gap-0.5 px-1",
            section === t.id
              ? dark ? "bg-primary/20 text-primary" : "bg-secondary text-white"
              : dark ? "text-white/40 hover:text-white/60 bg-white/3" : "text-gray-400 hover:text-gray-600 bg-gray-50"
          )}>
            {t.label}
            {t.disc > 0 && (
              <span className={cn(
                "text-[9px] font-black px-1 py-0.5 rounded-sm leading-none",
                section === t.id
                  ? "bg-primary text-white"
                  : dark ? "bg-white/10 text-white/50" : "bg-gray-200 text-gray-500"
              )}>
                −{t.disc}%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table content */}
      <div className={cn("overflow-y-auto", dark ? "" : "bg-white")} style={{ maxHeight: 320 }}>

        {/* ── BETÓNY ── */}
        {section === "betony" && categories.map((cat) => (
          <div key={cat.id}>
            <div className={cn(
              "px-3 py-1.5 flex items-center text-[10px] font-black uppercase tracking-widest",
              dark ? "bg-white/5 text-white/45 border-b border-white/5" : "bg-gray-100 text-gray-500 border-b border-gray-200"
            )}>
              {cat.name}
              <DiscBadge pct={effectiveBeton} dark={dark} />
            </div>
            {cat.types.filter((t) => t.price > 0 && t.label.trim()).map((t, i) => {
              const betonOrig = t.price * hotovostMult;
              // Manual prices stored as faktura price; show with hotovostMult for display, save as faktura
              const betonManual = manualPrices?.[t.id] !== undefined ? manualPrices[t.id] * hotovostMult : undefined;
              const betonEdit = onManualPriceChange;
              return (
                <div key={t.id} className={cn(
                  "flex items-center justify-between px-3 py-2 border-b text-sm",
                  dark ? "border-white/5" : "border-gray-50",
                  i % 2 !== 0 ? dark ? "bg-white/3" : "bg-gray-50/60" : ""
                )}>
                  <span className={dark ? "text-white/70" : "text-secondary"}>{t.label}</span>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs", dark ? "text-white/30" : "text-gray-400")}>/ m³</span>
                    <EditRow id={t.id} orig={betonOrig} factor={betonFactor}
                      manualPrice={betonManual} dark={dark} onManualPriceChange={betonEdit} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* ── SLUŽBY ── */}
        {section === "sluzby" && (
          <div>
            {effectiveSluzby > 0 && (
              <div className={cn(
                "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-b",
                dark ? "bg-white/5 text-white/45 border-white/5" : "bg-gray-100 text-gray-500 border-gray-200"
              )}>
                Zľava na všetky služby
                <DiscBadge pct={effectiveSluzby} dark={dark} />
              </div>
            )}
            {services.map((s, i) => (
              <div key={s.id} className={cn(
                "flex items-start justify-between px-3 py-2.5 border-b text-sm",
                dark ? "border-white/5" : "border-gray-50",
                i % 2 !== 0 ? dark ? "bg-white/3" : "bg-gray-50/60" : ""
              )}>
                <div className="flex-1 pr-4">
                  <div className={dark ? "text-white/80" : "text-secondary font-medium"}>{s.name}</div>
                  {s.unit && <div className={cn("text-xs mt-0.5", dark ? "text-white/35" : "text-gray-400")}>{s.unit}</div>}
                </div>
                <EditRow id={s.id} orig={s.price} factor={sluzbyFactor}
                  manualPrice={manualPrices?.[s.id]} dark={dark} onManualPriceChange={onManualPriceChange} />
              </div>
            ))}
          </div>
        )}

        {/* ── DOPRAVA ── */}
        {section === "doprava" && (
          <div>
            <div className={cn(
              "flex items-center justify-between px-3 py-2.5 border-b text-sm font-bold",
              dark ? "border-white/5 bg-primary/8" : "border-gray-100 bg-primary/5"
            )}>
              <div>
                <div className={dark ? "text-white/85" : "text-secondary"}>Min. doprava / auto</div>
                {effectiveDoprava > 0 && (
                  <div className={cn("text-[10px] font-normal", dark ? "text-white/40" : "text-gray-400")}>
                    Zľava {effectiveDoprava}% sa vzťahuje na celkovú dopravu
                  </div>
                )}
              </div>
              <EditRow id="min_fee" orig={ts.minimumFee} factor={dopravaFactor}
                manualPrice={manualPrices?.["min_fee"]} dark={dark} onManualPriceChange={onManualPriceChange} />
            </div>

            <div className={cn(
              "flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-b",
              dark ? "bg-white/5 text-white/45 border-white/5" : "bg-gray-100 text-gray-500 border-gray-200"
            )}>
              <span>Vzdialenosť</span>
              <span className="flex items-center gap-1">
                Cena / m³
                <DiscBadge pct={effectiveDoprava} dark={dark} />
              </span>
            </div>

            {zones.map((z, i) => (
              <div key={z.id} className={cn(
                "flex items-center justify-between px-3 py-2 border-b text-sm",
                dark ? "border-white/5" : "border-gray-50",
                i % 2 !== 0 ? dark ? "bg-white/3" : "bg-gray-50/60" : ""
              )}>
                <span className={dark ? "text-white/60" : "text-secondary"}>
                  {z.fromKm} – {z.toKm} km
                </span>
                <EditRow id={z.id} orig={z.ratePerM3} factor={dopravaFactor}
                  manualPrice={manualPrices?.[z.id]} dark={dark} onManualPriceChange={onManualPriceChange} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
