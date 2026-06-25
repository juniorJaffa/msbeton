import { useEffect, useState, useRef } from "react";
import { X, MapPin, Package, CreditCard, Mountain, Waves, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Order } from "@/lib/adminData";
import { getKamenivoGroup } from "@/lib/adminData";

interface Props {
  orders: Order[];
  onDismiss: () => void;
  onOpen: (order: Order) => void;
}

const DURATION_S = 20;
const RADIUS = 11;
const CIRC = 2 * Math.PI * RADIUS;

function tabLabel(tab: Order["tab"]) {
  if (tab === "pumpa") return "Pumpa";
  if (tab === "mix") return "Mix";
  return "Vl. doprava";
}

export function OrderNotificationToast({ orders, onDismiss, onOpen }: Props) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number | undefined>(undefined);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; });

  const order = orders[0];

  useEffect(() => {
    if (!order) return;
    startRef.current = Date.now();
    setProgress(0);
    const tick = () => {
      const p = Math.min((Date.now() - startRef.current) / (DURATION_S * 1000), 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDismissRef.current();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [order?.id]);

  const secsLeft = Math.ceil(DURATION_S * (1 - progress));
  const dashOffset = CIRC * progress;
  const location = order?.address ?? order?.mapLocality;

  return (
    <AnimatePresence mode="wait">
      {order && (
        <motion.div
          key={order.id}
          initial={{ x: "110%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "110%", opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 220 }}
          className="fixed top-[50px] sm:top-[80px] right-3 z-[200] w-[300px] max-w-[calc(100vw-1.5rem)]"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          <div className="rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] border border-primary/25">
            {/* Shrinking gold bar — countdown indicator */}
            <div className="h-[3px] bg-white/8 relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-primary transition-none"
                style={{ width: `${(1 - progress) * 100}%` }}
              />
            </div>

            <div style={{ background: "#001D3D" }}>
              {/* Header row */}
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
                <span className="text-[9px] font-black tracking-[0.18em] text-primary uppercase bg-primary/15 px-2 py-0.5 rounded-full border border-primary/20">
                  Nová objednávka
                </span>
                {orders.length > 1 && (
                  <span className="text-[9px] font-bold text-white/30">+{orders.length - 1} ďalšie</span>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  {/* Countdown ring + number */}
                  <div className="relative w-6 h-6">
                    <svg width="24" height="24" className="absolute inset-0 -rotate-90">
                      <circle
                        cx="12" cy="12" r={RADIUS}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="12" cy="12" r={RADIUS}
                        fill="none"
                        stroke="#EDC531"
                        strokeWidth="2.5"
                        strokeDasharray={CIRC}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white/55 font-black leading-none" style={{ fontSize: "8px" }}>
                        {secsLeft}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onDismiss}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Zavrieť"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Client name */}
              <div className="px-3 pb-1.5">
                <div className="font-black text-white text-[15px] leading-tight truncate">
                  {order.clientName}
                </div>
                {order.company && (
                  <div className="text-[10px] text-white/40 font-semibold truncate">{order.company}</div>
                )}
              </div>

              {/* Info grid */}
              <div className="mx-3 mb-2 rounded-lg overflow-hidden border border-white/8">
                <div className="grid grid-cols-2 divide-x divide-white/8">
                  <div className="px-2.5 py-2 flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <Package className="w-3 h-3 text-primary shrink-0" />
                    <div>
                      <div className="text-white font-black text-sm leading-none">{order.totalQty} m³</div>
                      <div className="text-white/40 text-[9px] mt-0.5 font-bold uppercase tracking-wide">
                        {tabLabel(order.tab)}
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-2 flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <CreditCard className="w-3 h-3 text-primary shrink-0" />
                    <div>
                      <div className="text-primary font-black text-sm leading-none">
                        {order.totalSDph.toLocaleString("sk")} €
                      </div>
                      <div className="text-white/40 text-[9px] mt-0.5 font-bold uppercase tracking-wide">
                        {order.priceMode === "hotovost" ? "Hotovosť" : "Faktúra"}
                      </div>
                    </div>
                  </div>
                </div>

                {order.createdAt && (() => {
                  const d = new Date(order.createdAt);
                  const now = new Date();
                  const toDay = now.toISOString().slice(0, 10);
                  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
                  const ds = order.createdAt.slice(0, 10);
                  const t = d.toLocaleTimeString("sk", { hour: "2-digit", minute: "2-digit" });
                  const label = ds === toDay ? `Dnes ${t}` : ds === yesterday ? `Včera ${t}` : `${d.getDate()}.${d.getMonth() + 1}. ${t}`;
                  const isOld = ds !== toDay && ds !== yesterday;
                  return (
                    <div className="border-t border-white/8 px-2.5 py-1.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <Clock className="w-2.5 h-2.5 text-white/30 shrink-0" />
                      <span className={`text-[10px] font-bold ${isOld ? "text-amber-400" : "text-white/75"}`}>{label}</span>
                    </div>
                  );
                })()}

                <div className="border-t border-white/8 px-2.5 py-1.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="text-white/30 text-[9px] font-bold uppercase tracking-wide shrink-0">Betón</span>
                  <span className="text-white/75 text-[10px] font-bold truncate">{order.concreteType}</span>
                  {order.concreteCategory && (() => {
                    const kg = getKamenivoGroup(order.concreteCategory);
                    return (
                      <span className="text-primary/60 text-[9px] font-bold shrink-0 flex items-center gap-0.5">
                        {kg === 'drvene' && <Mountain className="w-2.5 h-2.5" />}
                        {kg === 'riecne' && <Waves className="w-2.5 h-2.5" />}
                        · {order.concreteCategory}
                      </span>
                    );
                  })()}
                </div>

                {order.phone && (
                  <div className="border-t border-white/8 px-2.5 py-1.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <span className="text-white/30 text-[9px] font-bold uppercase tracking-wide shrink-0">Tel</span>
                    <a
                      href={`tel:${order.phone}`}
                      className="text-white/75 text-[10px] font-bold hover:text-primary transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      {order.phone}
                    </a>
                  </div>
                )}

                {order.km ? (
                  <div className="border-t border-white/8 px-2.5 py-1.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <span className="text-white/30 text-[9px] font-bold uppercase tracking-wide shrink-0">Km</span>
                    <span className="text-white/75 text-[10px] font-bold">{order.km} km</span>
                  </div>
                ) : null}

                {location && (
                  <div
                    className="border-t border-white/8 px-2.5 py-1.5 flex items-start gap-1.5"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <MapPin className="w-2.5 h-2.5 text-primary shrink-0 mt-px" />
                    <div className="text-white/65 text-[10px] font-semibold leading-snug line-clamp-2">
                      {location}
                    </div>
                  </div>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={() => onOpen(order)}
                className="w-full py-2.5 text-[11px] font-black text-secondary tracking-[0.1em] uppercase bg-primary hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Zobraziť objednávku
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
