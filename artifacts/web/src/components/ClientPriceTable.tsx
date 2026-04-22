import { useState } from "react";
import { adminData } from "@/lib/adminData";
import { cn } from "@/lib/utils";

type Section = "betony" | "sluzby" | "doprava";

interface Props {
  discountBeton: number;
  discountDoprava: number;
  discountSluzby: number;
  discountCelkovo: number;
  variant?: "dark" | "light";
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

function PriceCell({ orig, factor, dark }: { orig: number; factor: number; dark: boolean }) {
  const disc = orig * factor;
  const hasDisc = factor < 1 && Math.abs(orig - disc) > 0.001;
  return (
    <div className="text-right leading-tight">
      {hasDisc && (
        <span className={cn("block text-[11px] line-through", dark ? "text-white/30" : "text-gray-400")}>
          {fmt(orig)}
        </span>
      )}
      <span className={cn("font-bold text-sm", hasDisc ? "text-primary" : dark ? "text-white/75" : "text-secondary")}>
        {fmt(disc)}
      </span>
    </div>
  );
}

export function ClientPriceTable({ discountBeton, discountDoprava, discountSluzby, discountCelkovo, variant = "dark" }: Props) {
  const [section, setSection] = useState<Section>("betony");

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
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={cn(
              "py-2.5 font-black tracking-widest transition-all flex items-center justify-center gap-1",
              section === t.id
                ? dark ? "bg-primary/20 text-primary" : "bg-secondary text-white"
                : dark ? "text-white/40 hover:text-white/60 bg-white/3" : "text-gray-400 hover:text-gray-600 bg-gray-50"
            )}
          >
            {t.label}
            {t.disc > 0 && (
              <span className={cn(
                "text-[9px] font-black px-1 py-0.5 rounded-sm leading-none",
                section === t.id
                  ? dark ? "bg-primary text-white" : "bg-primary text-white"
                  : dark ? "bg-white/10 text-white/50" : "bg-gray-200 text-gray-500"
              )}>
                −{t.disc}%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table content */}
      <div className={cn("overflow-y-auto", dark ? "" : "bg-white")} style={{ maxHeight: 280 }}>

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
            {cat.types.filter((t) => t.price > 0 && t.label.trim()).map((t, i) => (
              <div key={t.id} className={cn(
                "flex items-center justify-between px-3 py-2 border-b text-sm",
                dark ? "border-white/5" : "border-gray-50",
                i % 2 !== 0 ? dark ? "bg-white/3" : "bg-gray-50/60" : ""
              )}>
                <span className={dark ? "text-white/70" : "text-secondary"}>{t.label}</span>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs", dark ? "text-white/30" : "text-gray-400")}>/ m³</span>
                  <PriceCell orig={t.price} factor={betonFactor} dark={dark} />
                </div>
              </div>
            ))}
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
                <PriceCell orig={s.price} factor={sluzbyFactor} dark={dark} />
              </div>
            ))}
          </div>
        )}

        {/* ── DOPRAVA ── */}
        {section === "doprava" && (
          <div>
            {/* Min fee */}
            <div className={cn(
              "flex items-center justify-between px-3 py-2.5 border-b text-sm font-bold",
              dark ? "border-white/5 bg-primary/8" : "border-gray-100 bg-primary/5"
            )}>
              <div>
                <div className={dark ? "text-white/85" : "text-secondary"}>Min. doprava / auto</div>
                {effectiveDoprava > 0 && (
                  <div className={cn("text-[10px]", dark ? "text-white/40" : "text-gray-400")}>
                    Zľava {effectiveDoprava}% sa vzťahuje na celkovú dopravu
                  </div>
                )}
              </div>
              <PriceCell orig={ts.minimumFee} factor={dopravaFactor} dark={dark} />
            </div>

            {/* Zone header */}
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
                <PriceCell orig={z.ratePerM3} factor={dopravaFactor} dark={dark} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
