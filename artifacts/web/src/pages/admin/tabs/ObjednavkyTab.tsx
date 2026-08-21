import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, ShoppingCart, MessageSquare, MapPin, Navigation, Copy, Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2, AlertTriangle, FileText, Calculator, Users, Mountain, Waves, Phone, Mail, Truck, Fingerprint, Crown, Percent, ShieldCheck, Eye, Globe, Smartphone, Laptop, Monitor, BarChart2 } from "lucide-react";

// Kto objednávku vytvoril — vizuálna identita.
// "anonym" = neprihlásený návštevník cez verejný košík (bežný web tok) → viditeľný "web" chip.
// undefined = staré objednávky bez údaja → null (žiadny chip).
// Zaokrúhli m³ na 1 desatinné — staré objednávky majú v JSON floating point rozvoj (napr. 0.9000000000000004).
const fM3 = (n?: number) => Math.round((n ?? 0) * 10) / 10;

// Extrahuje lokalitu z textovej adresy (adresový vstup bez GPS).
// "013 04 Dolná Tižina, Slovensko" → "Dolná Tižina"
// "Hlavná 123, 010 01 Žilina, Slovensko" → "Žilina"
const extractAddrLocality = (address: string): string => {
  const parts = address.split(",").map(p => p.trim()).filter(p => p && !/^(Slovensko|Slovakia|Česko|Czech Republic)$/i.test(p));
  if (!parts.length) return address;
  const last = parts[parts.length - 1];
  return last.replace(/^\d{3}\s?\d{2}\s+/, ""); // strip ZIP prefix
};

// Doťaženie cieľ — dodatočná oprava starých objednávok. Bug (chýbal addToMainQty) ukladal target < minimum
// (napr. „do 4 m³" miesto „do 5"). Doťaženie NIKDY nemôže byť pod minimum (fillupMin) → ak je, oprav naň.
// Číta aktuálny minimumLoadM3 (admin Doprava). Staré objednávky bez historickej hodnoty → aktuálne minimum.
const fTgt = (target?: number, fillupM3?: number): number => {
  const t = Math.round((target ?? 0) * 10) / 10;
  if ((fillupM3 ?? 0) <= 0) return t;
  const min = adminData.getTransportSettings()?.minimumLoadM3 ?? 5;
  return Math.max(t, min);
};

function creatorMeta(role?: string): { Icon: React.ElementType; label: string; cls: string } | null {
  switch (role) {
    case "admin":   return { Icon: Crown,       label: "admin",    cls: "bg-primary/15 text-secondary border-primary/30" };
    case "manager": return { Icon: ShieldCheck, label: "správca",  cls: "bg-secondary/10 text-secondary border-secondary/20" };
    case "reader":  return { Icon: Eye,         label: "čítateľ",  cls: "bg-blue-50 text-blue-600 border-blue-200" };
    case "klient":  return { Icon: Users,       label: "klient",   cls: "bg-gray-100 text-gray-500 border-gray-200" };
    case "anonym":  return { Icon: Globe,       label: "web",      cls: "bg-sky-50 text-sky-600 border-sky-200" };
    default: return null; // staré objednávky bez údaja
  }
}
import { adminData, adminApi, Order, StatusHistoryEntry, TransportSettings, getKamenivoGroup, readerBlocked } from "@/lib/adminData";
import { clientAvatar, nameAvatar } from "@/lib/clientAvatar";
import { cn, formatPhone } from "@/lib/utils";
import { isReader, getAdminDeviceLabel } from "@/lib/adminAuth";
import { authFetch } from "./_shared";

const ORDER_STATUSES: { key: Order["status"]; label: string; color: string }[] = [
  { key: "nova",        label: "Nová",        color: "bg-blue-100 text-blue-700" },
  { key: "potvrdena",   label: "Potvrdená",   color: "bg-yellow-100 text-yellow-700" },
  { key: "odoslana",    label: "Odoslaná FA", color: "bg-green-100 text-green-700" },
  { key: "vyuctovana",  label: "Vyúčtovaná",  color: "bg-purple-100 text-purple-700" },
  { key: "vyplatena",   label: "Vyplatená",   color: "bg-teal-100 text-teal-700" },
  { key: "zrusena",     label: "Zrušená",     color: "bg-red-100 text-red-500" },
];

function OrderStatusBadge({ status, onChange, orderTotal, depositBalance, depositEnabled, onDepositPay, existingDepositUsed }: {
  status: Order["status"];
  onChange: (s: Order["status"], paidAmount?: number) => void;
  orderTotal?: number;
  depositBalance?: number;         // zostatok zálohy klienta (ak má)
  depositEnabled?: boolean;        // záloha on/off pre tohto klienta
  onDepositPay?: (amount: number) => void; // callback: odpočítať zo zálohy + zmeniť stav
  existingDepositUsed?: number;    // > 0 = záloha už bola odpočítaná — chrániť pred dvojitým odpočtom
}) {
  const [open, setOpen] = useState(false);
  // right = vzdialenosť od pravého okraja viewportu; zarovná pravý okraj dropdownu k pravému okraju buttona
  const [dropPos, setDropPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const [payModal, setPayModal] = useState(false);
  const [payInput, setPayInput] = useState("");
  const [payTab, setPayTab] = useState<"cash" | "deposit">("cash");
  // Auto-select deposit tab keď je záloha zapnutá a má balance
  const canUseDeposit = depositEnabled === true && depositBalance !== undefined && depositBalance > 0 && !!onDepositPay;
  // Záloha má zostatok ale je vypnutá (enabled=false) → zobraziť info banner
  const depositOffButHasBalance = depositEnabled === false && depositBalance !== undefined && depositBalance > 0;
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const cur = ORDER_STATUSES.find(s => s.key === status) ?? ORDER_STATUSES.find(s => s.key === "odoslana")!;

  const DROP_H = ORDER_STATUSES.length * 32; // ~32px/položka
  const openDrop = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      // right = zarovnaj pravý okraj dropdownu na pravý okraj buttona (nič nepretečie cez okraj displeja)
      const cssRight = window.innerWidth - r.right;
      if (spaceBelow < DROP_H + 8) {
        // otvoriť nahor
        setDropPos({ bottom: window.innerHeight - r.top + 2, right: cssRight });
      } else {
        setDropPos({ top: r.bottom + 2, right: cssRight });
      }
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      // klik na vlastný trigger → nechaj openDrop toggle riešiť
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      // klik vnútri portálového dropdownu → nechaj onClick na buttone prebublať
      if (dropRef.current && dropRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    // capture:true = fired pred stopPropagation iných komponentov (fix multi-dropdown)
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [open]);

  const openPayModal = () => {
    setPayInput(orderTotal !== undefined ? orderTotal.toFixed(2) : "");
    // Ak záloha je zapnutá a má dostatok → predvolene vybrať zálohu
    setPayTab(canUseDeposit ? "deposit" : "cash");
    setPayModal(true);
    setOpen(false);
  };
  // isPartialDeposit = záloha nestačí → čiastočná platba + doplatok
  const isPartialDeposit = canUseDeposit && orderTotal !== undefined && depositBalance! < orderTotal - 0.01;
  const depositPayAmt = canUseDeposit ? Math.min(orderTotal ?? depositBalance!, depositBalance!) : 0;
  const doplatokAmt = isPartialDeposit && orderTotal ? orderTotal - depositPayAmt : 0;

  const confirmPay = () => {
    if (payTab === "deposit" && canUseDeposit) {
      onDepositPay!(depositPayAmt);
    } else {
      const amt = parseFloat(payInput.replace(",", "."));
      onChange("vyplatena", isNaN(amt) ? undefined : amt);
    }
    setPayModal(false);
  };

  return (
    <>
      <div className="relative">
        <button ref={btnRef} onClick={e => { e.stopPropagation(); openDrop(); }} className={`px-2 py-1 text-xs font-bold rounded-sm cursor-pointer ${cur.color}`}>{cur.label} ▾</button>
        {open && createPortal(
          <div ref={dropRef} className="fixed z-[500] bg-white border border-gray-200 shadow-lg rounded-sm min-w-[110px]" style={{ top: dropPos.top, bottom: dropPos.bottom, right: dropPos.right }} onClick={e => e.stopPropagation()}>
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
                <div className="text-xs text-gray-400">{payTab === "deposit" ? "Odpočíta zo zálohy klienta" : "Uprav ak klient dal viac (tringelt)"}</div>
              </div>
            </div>

            {/* Info: záloha má zostatok ale je OFF — treba aktivovať */}
            {depositOffButHasBalance && (
              <div className="mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2.5">
                <span className="text-base shrink-0 leading-none mt-0.5">🏦</span>
                <div>
                  <div className="text-xs font-black text-amber-700">ZÁLOHA OFF — zostatok {depositBalance!.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Aktivuj zálohu v karte klienta (Klienti → Záloha ON)</div>
                </div>
              </div>
            )}

            {/* Tab prepínač: Hotovosť / Záloha — len keď záloha zapnutá */}
            {canUseDeposit && (
              <div className="flex mb-4 rounded-md overflow-hidden border border-gray-200">
                <button onClick={() => setPayTab("cash")}
                  className={`flex-1 py-1.5 text-xs font-bold transition-colors ${payTab === "cash" ? "bg-secondary text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  💵 Hotovosť
                </button>
                <button onClick={() => setPayTab("deposit")}
                  className={`flex-1 py-1.5 text-xs font-bold transition-colors ${payTab === "deposit" ? "bg-amber-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  🏦 Záloha ({depositBalance.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)
                </button>
              </div>
            )}

            {/* ⚠ Varovanie: záloha už bola odpočítaná pre túto objednávku */}
            {payTab === "deposit" && existingDepositUsed !== undefined && existingDepositUsed > 0 && (
              <div className="mb-3 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>
                <span>Záloha {existingDepositUsed.toLocaleString("sk-SK", {minimumFractionDigits:2,maximumFractionDigits:2})} € už bola odpočítaná. Záloha sa NEodpočíta znovu — iba sa zmení stav.</span>
              </div>
            )}
            {payTab === "deposit" && depositBalance !== undefined ? (
              <div className={`mb-4 p-3 rounded-md border ${isPartialDeposit ? "bg-orange-50 border-orange-200" : "bg-amber-50 border-amber-200"}`}>
                <div className={`text-xs font-bold mb-2 ${isPartialDeposit ? "text-orange-700" : "text-amber-700"}`}>
                  {isPartialDeposit ? "⚠ Čiastočná platba zo zálohy" : "Záloha klienta"}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Zostatok zálohy:</span>
                  <span className="font-black text-amber-700 tabular-nums">{depositBalance.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">Odpočet zo zálohy:</span>
                  <span className="font-black text-red-500 tabular-nums">−{depositPayAmt.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
                {!isPartialDeposit && orderTotal !== undefined && (
                  <div className="flex justify-between items-center mt-1 pt-1 border-t border-amber-200">
                    <span className="text-xs font-bold text-amber-700">Zostatok zálohy po:</span>
                    <span className="font-black text-teal-600 tabular-nums">{(depositBalance - depositPayAmt).toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                  </div>
                )}
                {isPartialDeposit && (
                  <div className="mt-2 pt-2 border-t border-orange-200 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-orange-700">Doplatok (hotovosť/iné):</span>
                      <span className="font-black text-orange-700 tabular-nums">{doplatokAmt.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                    </div>
                    <div className="text-[10px] text-gray-500 italic">Objednávka bude označená ako Vyplatená. Záloha: {depositPayAmt.toFixed(2)} € + doplatok: {doplatokAmt.toFixed(2)} €.</div>
                  </div>
                )}
              </div>
            ) : (
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
            )}
            <div className="flex gap-2">
              <button onClick={() => setPayModal(false)}
                className="flex-1 px-3 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                Zrušiť
              </button>
              <button onClick={confirmPay}
                className={`flex-1 px-3 py-2 text-xs font-black text-white rounded-md transition-colors cursor-pointer ${payTab === "deposit" ? (isPartialDeposit ? "bg-orange-500 hover:bg-orange-600" : "bg-amber-500 hover:bg-amber-600") : "bg-teal-600 hover:bg-teal-700"}`}>
                {payTab === "deposit" ? (isPartialDeposit ? `💰 ${depositPayAmt.toFixed(2)} € + doplatok ${doplatokAmt.toFixed(2)} €` : "Odpočítať zo zálohy") : "Potvrdiť"}
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

function exportOrderPDF(o: Order, format: "a4" | "a5" = "a4") {
  const tabLabels: Record<string, string> = { pumpa: "Pumpa", mix: "Domiešavač", vlastnadoprava: "Vlastná doprava" };
  const statusLabels: Record<string, string> = { nova: "Nová", potvrdena: "Potvrdená", odoslana: "Odoslaná FA", vyuctovana: "Vyúčtovaná", vyplatena: "Vyplatená", zrusena: "Zrušená" };
  const today = new Date(o.createdAt).toLocaleDateString("sk-SK");
  const fmtEurPdf = (n: number | undefined) => n !== undefined ? n.toFixed(2) + " €" : "";
  // Čiastočná platba zo zálohy — doplatok banner v PDF
  const isPartialDepPdf = o.depositUsed !== undefined && o.depositUsed > 0 && o.paidAmount !== undefined && o.depositUsed < o.paidAmount - 0.01;
  const doplatokPdf = isPartialDepPdf ? (o.paidAmount! - o.depositUsed!) : 0;

  let parsed: { v: number; s: { h: string; rows: { l: string; v: number; o?: number; u?: number; uOrig?: number; uSuffix?: string }[] }[]; fT?: number } | null = null;
  try { if (o.breakdown?.startsWith("{")) parsed = JSON.parse(o.breakdown); } catch { /* */ }

  // Detekcia manuálnych cien dopravy — pre opravu starých objednávok kde buildBreakdown
  // nesprávne aplikoval dopravaFactor (namiesto fTransport=1) na manuálne ceny.
  // Nové objednávky majú fT uložené; staré nemajú → fallback na aktuálne manualPrices klienta.
  const storedFT = parsed?.fT ?? null;
  let isManualTransport = false;
  if (storedFT !== null) {
    isManualTransport = storedFT >= 1;
  } else {
    const orderDiscD = Math.max(o.discountDoprava ?? 0, o.discountCelkovo ?? 0);
    if (orderDiscD > 0) {
      const client = clientMap.get(String(o.clientId));
      const mp = client?.manualPrices ?? {};
      const allZones = adminData.getDelivery();
      isManualTransport = Object.keys(mp).some(k =>
        k.startsWith("km_rate_") || k.startsWith("auto_rate_") || k === "min_fee" ||
        allZones.some(z => z.id === k)
      );
    }
  }

  // Effective zone: stored on order (Košík) OR lookup z klientovej zóny (SMS bez poľa).
  // Fallback reťazec: objednávka → klientova priradená zóna → prvá zóna (default) → "standard".
  const zoneFromClient = (() => {
    const cl = clientMap.get(String(o.clientId));
    const all = adminData.getDelivery();
    if (cl?.deliveryZoneId) return all.find(z => z.id === cl.deliveryZoneId) ?? all[0];
    return all[0]; // klient bez explicitnej zóny používa prvú (default) zónu
  })();
  const effectiveZoneType = o.deliveryZoneType ?? zoneFromClient?.pricingType ?? "standard";
  const zoneTypeLabel = effectiveZoneType === "km" ? "Kilometre" : effectiveZoneType === "auto" ? "Počet áut" : "Štandard";
  const effectiveZoneName = o.deliveryZoneName ?? zoneFromClient?.name ?? zoneTypeLabel;

  // Retroactive fix: old km/auto/standard-min orders stored q as "N autá (X m³)" and uSuffix as "€/m³"
  if (parsed) {
    // Floating point sanitizácia — staré objednávky majú v texte dlhý rozvoj (napr. "0.9000000000000004 m³").
    const fixFloat = (s: string) => s.replace(/\d+\.\d{4,}/g, (m) => String(Math.round(parseFloat(m) * 10) / 10));
    const fillupMinTs = adminData.getTransportSettings()?.minimumLoadM3 ?? 5;
    const fixRows = (rows: typeof parsed.s[0]["rows"]) => rows.forEach(row => {
      const r = row as typeof row & { q?: string };
      if (r.l) r.l = fixFloat(r.l);
      if (r.q) r.q = fixFloat(r.q);
      // Doťaženie cieľ — oprav label „Doťaženie do X m³" (dve staré chyby):
      // 1. target < minimum (chýbal addToMainQty) → oprav na fillupMin
      // 2. target má desatinné (napr. 5.1 — rounding bug 1.25→1.3→5.05→5.1) → round na integer
      const dm = r.l.match(/Doťaženie do[\s&nbsp;]*([\d.,]+)/);
      if (dm) {
        const cur = parseFloat(dm[1].replace(",", "."));
        if (cur > 0 && cur < fillupMinTs) {
          r.l = r.l.replace(dm[0], dm[0].replace(dm[1], String(fillupMinTs)));
        } else if (cur > 0 && cur !== Math.round(cur)) {
          r.l = r.l.replace(dm[0], dm[0].replace(dm[1], String(Math.round(cur))));
        }
      }
      const isDoprava = r.l.toLowerCase().includes("doprava") || r.l.startsWith("HLAVNÁ ");
      if (!isDoprava) return;
      const isMinRow = r.l.includes("Min. doprava");
      if (effectiveZoneType === "km" && o.km && o.km > 0) {
        if (r.q && /m³/.test(r.q)) r.q = r.q.replace(/\([\d.,+\s]+\s*m³\)/, `(${o.km} km)`);
        if (r.uSuffix === "€/m³") {
          r.uSuffix = isMinRow ? "€/auto" : "€/km";
          if (!isMinRow) {
            const pumpa = parseInt((r.l.match(/(\d+)×Pumpa/) || ['','0'])[1]);
            const mix   = parseInt((r.l.match(/(\d+)×Mix/)   || ['','0'])[1]);
            const trucks = Math.max(1, pumpa + mix);
            r.u = parseFloat((r.v / o.km / trucks).toFixed(3));
            if (r.uOrig !== undefined && r.o !== undefined) r.uOrig = parseFloat((r.o / o.km / trucks).toFixed(3));
          } else if (r.q) {
            const trucks = Math.max(1, parseInt(r.q) || 1);
            r.u = parseFloat((r.v / trucks).toFixed(2));
            if (r.o !== undefined) r.uOrig = parseFloat((r.o / trucks).toFixed(2));
          }
        }
      } else if (effectiveZoneType === "auto") {
        if (r.q && /m³/.test(r.q)) r.q = r.q.replace(/\s*\([\d.,+\s]+\s*m³\)/, '');
        if (r.uSuffix === "€/m³") r.uSuffix = "€/auto";
      } else if (isMinRow && r.uSuffix === "€/m³" && r.q) {
        // Standard min doprava: old breakdown stored €/m³ instead of €/auto
        r.uSuffix = "€/auto";
        const trucks = Math.max(1, parseInt(r.q) || 1);
        r.u = parseFloat((r.v / trucks).toFixed(2));
        if (r.o !== undefined) r.uOrig = parseFloat((r.o / trucks).toFixed(2));
      }
    });
    parsed.s.forEach(sec => fixRows(sec.rows));
  }

  const fmtRate = (n: number, suffix?: string) => n.toFixed(2) + " " + (suffix ?? "€");
  const pdfCats = adminData.getCategories();
  const kamenivoSvg = (name: string): string => {
    const kg = getKamenivoGroup(name);
    if (kg === 'drvene') return `<svg style="display:inline-block;vertical-align:middle;margin-right:4px;margin-bottom:1px" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 21h20L12 3z"/></svg>`;
    if (kg === 'riecne') return `<svg style="display:inline-block;vertical-align:middle;margin-right:4px;margin-bottom:1px" width="13" height="11" viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 5 Q6 2 10 5 Q14 8 18 5 Q22 2 26 5"/><path d="M2 11 Q6 8 10 11 Q14 14 18 11 Q22 8 26 11"/><path d="M2 17 Q6 14 10 17 Q14 20 18 17 Q22 14 26 17"/></svg>`;
    return '';
  };
  const fixSecH = (h: string) => {
    const dashIdx = h.indexOf(" – ");
    if (dashIdx === -1) return h;
    const sectionPrefix = h.slice(0, dashIdx + 3);
    const rawName = h.slice(dashIdx + 3).replace(/^[▲≋]\s*/, '');
    const resolvedName = pdfCats.some(c => c.name === rawName)
      ? rawName
      : (pdfCats.find(c => c.types.some(t => t.label === rawName))?.name ?? rawName);
    return sectionPrefix + kamenivoSvg(resolvedName) + resolvedName;
  };
  let pdfRowIdx = 0;
  const breakdownHtml = parsed ? parsed.s.map(sec => {
    const secH = fixSecH(sec.h);
    const isMain = sec.h.startsWith("Produkty");
    const rows = sec.rows.map(row => {
      if (row.l.startsWith("⚠") && row.v === 0) {
        return `<tr><td colspan="5" style="padding:4px 8px 4px 14px;font-size:7.5pt;font-weight:600;color:#991b1b;background:#fef2f2;border-top:1px solid #fca5a5;border-bottom:1px solid #fca5a5">${row.l}</td></tr>`;
      }
      if (row.l.startsWith("★") && row.v === 0) {
        return `<tr><td colspan="5" style="padding:3px 8px 3px 14px;font-size:7.5pt;color:#92400e;background:#fffbeb;border-bottom:1px solid #fde68a">${row.l}</td></tr>`;
      }
      if (row.l.startsWith("↑") && row.v === 0) {
        const badge = `<span style="display:inline-block;background:#1d4ed8;color:#fff;font-weight:900;font-size:6pt;padding:1px 4px;border-radius:3px;vertical-align:middle;margin:0 3px">&#9673;&nbsp;HLAVNÁ</span>`;
        const txt = row.l.replace("HLAVNÁ", badge);
        return `<tr><td colspan="5" style="padding:3px 8px 3px 14px;font-size:7.5pt;color:#1d4ed8;background:#eff6ff;border-bottom:1px solid #bfdbfe">${txt}</td></tr>`;
      }
      pdfRowIdx++;
      // Stará objednávka s manuálnou cenou dopravy: row.o = správna cena, row.v = nesprávne zdiskontovaná
      const isTransRow = isManualTransport && (row.l.toLowerCase().includes("doprava") || row.l.toLowerCase().includes("doťaženie") || row.l.startsWith("HLAVNÁ"));
      const corrected = isTransRow && row.o !== undefined;
      const finalV = corrected ? row.o! : row.v;
      const orig = (!corrected && row.o !== undefined) ? `<span style="text-decoration:line-through;color:#aaa;font-size:7.5pt">${fmtEurPdf(row.o)}</span> ` : "";
      const unitCell = (() => {
        if (row.u === undefined) return "—";
        const finalU = corrected && row.uOrig !== undefined ? row.uOrig : row.u;
        if (!corrected && row.uOrig !== undefined) {
          return `<span style="text-decoration:line-through;color:#aaa;font-size:7.5pt">${fmtRate(row.uOrig, row.uSuffix)}</span><br><span style="font-weight:bold">${fmtRate(finalU, row.uSuffix)}</span>`;
        }
        return fmtRate(finalU, row.uSuffix);
      })();
      const hlavnaBadge = `<span style="display:inline-block;background:#1d4ed8;color:#fff;font-weight:900;font-size:6pt;padding:1px 4px;border-radius:3px;vertical-align:middle;margin-right:4px">&#9673;&nbsp;HLAVNÁ</span>`;
      const rowLabel = row.l.startsWith("HLAVNÁ ") ? `${hlavnaBadge}${row.l.slice(7)}` : row.l;
      return `<tr>
        <td style="padding:3px 8px;font-size:8pt;border-bottom:1px solid #f0f0f0;color:#aaa;text-align:center;width:22px">${pdfRowIdx}</td>
        <td style="padding:3px 8px;font-size:8.5pt;border-bottom:1px solid #f0f0f0;color:#444">${rowLabel}</td>
        <td style="padding:3px 8px;font-size:8.5pt;border-bottom:1px solid #f0f0f0;text-align:right;color:#666;white-space:nowrap">${(row as { q?: string }).q ?? "—"}</td>
        <td style="padding:3px 8px;font-size:8.5pt;border-bottom:1px solid #f0f0f0;text-align:right;color:#666;white-space:nowrap">${unitCell}</td>
        <td style="padding:3px 8px;font-size:8.5pt;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;color:${row.o !== undefined ? "#b45309" : "#222"};white-space:nowrap">${orig}${fmtEurPdf(row.v)}</td>
      </tr>`;
    }).join("");
    return `<tr><td colspan="5" style="padding:4px 8px;font-size:8.5pt;font-weight:bold;background:${isMain ? "#001D3D" : "#EDC531"};color:${isMain ? "#EDC531" : "#001D3D"}">${secH}</td></tr>${rows}`;
  }).join("") : "";

  const discountInfo = [
    o.discountBeton   ? `Betón −${o.discountBeton}%`   : "",
    o.discountDoprava ? `Doprava −${o.discountDoprava}%` : "",
    o.discountSluzby  ? `Služby −${o.discountSluzby}%`  : "",
    o.discountCelkovo ? `Celkovo −${o.discountCelkovo}%` : "",
  ].filter(Boolean).join(" | ");

  // ── A5 kompaktný interný doklad — páruje s ručným čerpacím listkom (hotovostné betonáže) ──
  // Bez podpisového boxu / Google QR / plného footera — len to podstatné na pol stránky.
  const platbaLbl = o.priceMode === "hotovost" ? "Hotovosť" : "Faktúra";
  const a5Doruc = [
    `<tr><td style="color:#999;padding:0.5mm 4mm 0.5mm 0;white-space:nowrap">Typ</td><td style="font-weight:bold">${tabLabels[o.tab] ?? o.tab}</td></tr>`,
    `<tr><td style="color:#999;padding:0.5mm 4mm 0.5mm 0">Množstvo</td><td style="font-weight:bold">${o.totalQty} m³${(o.fillupM3 ?? 0) > 0 ? ` <span style="color:#92400e;font-weight:normal">+${fM3(o.fillupM3)} doťaž.</span>` : ""}</td></tr>`,
    o.km ? `<tr><td style="color:#999;padding:0.5mm 4mm 0.5mm 0">Vzdialenosť</td><td>${o.km} km</td></tr>` : "",
    (o.address || o.mapPlusCode || o.mapLocality) ? `<tr><td style="color:#999;padding:0.5mm 4mm 0.5mm 0;vertical-align:top">Adresa</td><td>${o.mapLocality ? `<strong>${o.mapLocality}</strong>${o.address ? "<br>" : ""}` : ""}${o.address ?? ""}${o.mapPlusCode ? `<br><span style="font-family:monospace;font-size:6.5pt;color:#aaa">${o.mapPlusCode}</span>` : ""}</td></tr>` : "",
    effectiveZoneName ? `<tr><td style="color:#999;padding:0.5mm 4mm 0.5mm 0">Doprava</td><td>${effectiveZoneName}${effectiveZoneType !== "standard" ? ` <span style="color:#b58c00;font-weight:700">${effectiveZoneType === "km" ? "(€/km)" : "(€/auto)"}</span>` : ""}</td></tr>` : "",
    `<tr><td style="color:#999;padding:0.5mm 4mm 0.5mm 0">Platba</td><td style="font-weight:bold">${platbaLbl}</td></tr>`,
    o.viaSms ? `<tr><td style="color:#999;padding:0.5mm 4mm 0.5mm 0">Zdroj</td><td>SMS</td></tr>` : "",
  ].filter(Boolean).join("");

  const a5Html = `<!DOCTYPE html><html lang="sk"><head>
<meta charset="utf-8">
<title>Objednávka A5 – ${o.clientName || "klient"}</title>
<style>
  @page { size: A5; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #222; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<!-- Kompaktná hlavička -->
<div style="background:#001D3D;color:#fff;padding:4mm 8mm 3.5mm;display:flex;justify-content:space-between;align-items:flex-end">
  <div>
    <div style="font-size:13pt;font-weight:bold;letter-spacing:-0.3px">MS-BETON</div>
    <div style="font-size:6.5pt;opacity:0.65;margin-top:1px">Turie 468, 013 12 Turie · IČO 55747591 · 0944 069 305</div>
  </div>
  <div style="text-align:right">
    <div style="color:#EDC531;font-size:11pt;font-weight:bold;letter-spacing:0.5px">OBJEDNÁVKA</div>
    <div style="font-size:7pt;opacity:0.7;margin-top:1px">${today} · ${platbaLbl}</div>
  </div>
</div>
<div style="padding:3.5mm 8mm 5mm">
  <!-- Klient + Doručenie -->
  <div style="display:grid;grid-template-columns:1fr 1.15fr;gap:4mm;margin-bottom:3mm;font-size:7.5pt">
    <div>
      <div style="font-weight:bold;color:#001D3D;font-size:7pt;border-bottom:1px solid #eee;padding-bottom:1mm;margin-bottom:1.5mm">KLIENT</div>
      <div style="font-weight:bold;color:#111">${o.clientName || "—"}</div>
      ${o.company ? `<div style="color:#666">${o.company}</div>` : ""}
      ${o.phone ? `<div style="color:#666">${o.phone}</div>` : ""}
      ${discountInfo ? `<div style="color:#b45309;font-weight:bold;margin-top:1.5mm;font-size:7pt">Zľavy: ${discountInfo}</div>` : ""}
    </div>
    <div>
      <div style="font-weight:bold;color:#001D3D;font-size:7pt;border-bottom:1px solid #eee;padding-bottom:1mm;margin-bottom:1.5mm">DORUČENIE</div>
      <table style="font-size:7.5pt"><tbody>${a5Doruc}</tbody></table>
    </div>
  </div>
  <!-- Kalkulácia (rovnaká tabuľka ako A4) -->
  ${breakdownHtml ? `<table style="border:1px solid #ddd;margin-bottom:3mm">
    <thead><tr style="background:#001D3D;color:#fff;font-size:7.5pt;font-weight:bold">
      <th style="padding:3px 5px;width:18px;text-align:center">#</th>
      <th style="padding:3px 6px;text-align:left">Popis</th>
      <th style="padding:3px 6px;text-align:right">Množ.</th>
      <th style="padding:3px 6px;text-align:right">Jedn.</th>
      <th style="padding:3px 6px;text-align:right">Spolu</th>
    </tr></thead>
    <tbody>${breakdownHtml}</tbody>
  </table>` : ""}
  <!-- Suma -->
  <div style="background:#001D3D;color:#fff;padding:3mm 4mm;display:flex;justify-content:space-between;align-items:center;border-radius:${isPartialDepPdf ? "2px 2px 0 0" : "0"}">
    <div style="font-size:8pt;color:rgba(255,255,255,0.6)">${o.priceMode === "hotovost" ? "Spolu" : "Celkom s DPH"}</div>
    <div style="text-align:right">
      <div style="font-size:15pt;font-weight:bold;color:#EDC531;line-height:1">${fmtEurPdf(o.totalSDph)}</div>
      ${o.status === "vyplatena" && o.paidAmount !== undefined ? `<div style="font-size:7.5pt;color:rgba(255,255,255,0.7);margin-top:1.5mm">Zaplatené ${fmtEurPdf(o.paidAmount)}${Math.abs(o.paidAmount - o.totalSDph) > 0.01 ? ` <span style="font-weight:bold;color:${o.paidAmount > o.totalSDph ? "#86efac" : "#ef4444"}">${o.paidAmount > o.totalSDph ? `+${(o.paidAmount - o.totalSDph).toFixed(2)} € tringelt` : `${(o.paidAmount - o.totalSDph).toFixed(2)} €`}</span>` : ""}${o.depositUsed !== undefined && o.depositUsed > 0 ? `<span style="margin-left:5px;background:rgba(251,191,36,0.25);color:#fcd34d;border-radius:2px;padding:0 3px;font-weight:bold">💰 záloha ${fmtEurPdf(o.depositUsed)}${o.depositUsed < o.paidAmount - 0.01 ? ` + doplatok ${fmtEurPdf(o.paidAmount - o.depositUsed)}` : ""}</span>` : ""}</div>` : ""}
    </div>
  </div>
  ${isPartialDepPdf ? `<div style="background:#ea580c;color:#fff;padding:2.5mm 4mm;border-radius:0 0 2px 2px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:7.5pt;font-weight:bold;letter-spacing:0.3px;text-transform:uppercase">Klient musí doplatiť</div>
      <div style="font-size:6.5pt;opacity:0.8;margin-top:0.5mm">na mieste alebo doplniť zálohu</div>
    </div>
    <div style="font-size:12pt;font-weight:bold">${fmtEurPdf(doplatokPdf)}</div>
  </div>` : ""}
  <!-- Podpisy + Google QR — zmenšené, stále na A5 -->
  <div style="display:flex;gap:5mm;margin-top:4mm;align-items:flex-end">
    <div style="flex:1;display:flex;gap:4mm">
      <div style="flex:1;text-align:center"><div style="height:10mm"></div><div style="border-top:1px solid #bbb;padding-top:1mm;font-size:7pt;color:#888">Dodal</div></div>
      <div style="flex:1;text-align:center"><div style="height:10mm"></div><div style="border-top:1px solid #bbb;padding-top:1mm;font-size:7pt;color:#888">Prevzal</div></div>
    </div>
    <div style="display:flex;align-items:center;gap:2.5mm;border-left:1px solid #eee;padding-left:4mm">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=0&data=https%3A%2F%2Fg.page%2Fr%2FCeTg2gjXL3dWEBM%2Freview" style="width:15mm;height:15mm;display:block;flex-shrink:0" />
      <div style="max-width:30mm">
        <div style="font-size:7pt;font-weight:bold;color:#001D3D;line-height:1.2">Ohodnoťte nás na Google</div>
        <div style="font-size:6pt;color:#999;margin-top:0.5mm">msbeton.sk/recenzia</div>
      </div>
    </div>
  </div>
  <div style="margin-top:3mm;padding-top:2mm;border-top:1px solid #eee;font-size:6.5pt;color:#aaa;text-align:center">Interný doklad · MS-BETON, spol. s r.o. · IČO 55747591 · IČ DPH SK2122074603</div>
</div>
</body></html>`;

  const a4Html = `<!DOCTYPE html><html lang="sk"><head>
<meta charset="utf-8">
<title>Objednávka – ${o.clientName || "klient"}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #222; position: relative; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>

<!-- Header -->
<div style="background:#001D3D;color:#fff;padding:10mm 14mm 8mm;position:relative;z-index:1">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:20pt;font-weight:bold;letter-spacing:-0.5px;margin-bottom:2px">MS-BETON, spol. s r.o.</div>
      <div style="font-size:8pt;opacity:0.7;margin-bottom:1px">Turie 468, 013 12 Turie &nbsp;|&nbsp; Slovenská republika</div>
      <div style="font-size:8pt;opacity:0.6">+421&nbsp;944&nbsp;069&nbsp;305 &nbsp;|&nbsp; info@msbeton.sk &nbsp;|&nbsp; msbeton.sk</div>
    </div>
    <div style="text-align:right;font-size:8pt;opacity:0.65;line-height:1.8">
      IČO: 55747591<br>DIČ: 2122074603<br>IČ DPH: SK2122074603
    </div>
  </div>
</div>

<!-- Body -->
<div style="padding:7mm 14mm 12mm;position:relative;z-index:1">

  <!-- Title -->
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4mm">
    <div style="color:#EDC531;font-size:16pt;font-weight:bold;letter-spacing:1px">OBJEDNÁVKA</div>
    <div style="text-align:right;font-size:8pt;color:#666;line-height:1.6">
      <div>${today}</div>
      <div style="color:#aaa;font-size:7.5pt">Stav: ${statusLabels[o.status] ?? o.status}</div>
    </div>
  </div>

  <!-- Klient + Doručenie -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-bottom:5mm">
    <div style="border:1px solid #e0e0ec;padding:4mm;border-radius:3px">
      <div style="font-size:8pt;font-weight:bold;color:#001D3D;border-bottom:1px solid #eee;padding-bottom:2mm;margin-bottom:3mm">KLIENT</div>
      <div style="font-size:8.5pt;font-weight:bold;color:#111;margin-bottom:2px">${o.clientName || "—"}</div>
      ${o.company ? `<div style="font-size:8pt;color:#555">${o.company}</div>` : ""}
      ${o.phone ? `<div style="font-size:8pt;color:#555;margin-top:2px">${o.phone}</div>` : ""}
      ${o.email ? `<div style="font-size:8pt;color:#777">${o.email}</div>` : ""}
      ${discountInfo ? `<div style="font-size:7.5pt;color:#b45309;margin-top:4px;font-weight:bold">Zľavy: ${discountInfo}</div>` : ""}
    </div>
    <div style="border:1px solid #e0e0ec;padding:4mm;border-radius:3px">
      <div style="font-size:8pt;font-weight:bold;color:#001D3D;border-bottom:1px solid #eee;padding-bottom:2mm;margin-bottom:3mm">DORUČENIE</div>
      <table style="font-size:8.5pt"><tbody>
        <tr><td style="color:#888;padding:1px 6px 1px 0;width:88px">Typ</td><td style="font-weight:bold">${tabLabels[o.tab] ?? o.tab}</td></tr>
        <tr><td style="color:#888;padding:1px 6px 1px 0">Množstvo</td><td style="font-weight:bold">${o.totalQty} m³${(o.fillupM3 ?? 0) > 0 ? ` <span style="color:#92400e;font-size:8pt;font-weight:normal">+ ${fM3(o.fillupM3)} m³ doťaženie</span>` : ""}</td></tr>
        ${(o.fillupM3 ?? 0) > 0 ? `<tr><td style="color:#888;padding:1px 6px 1px 0;vertical-align:top">Doťaženie</td><td style="color:#92400e;font-size:8.5pt">${o.totalQty}&nbsp;m³ → +${fM3(o.fillupM3)}&nbsp;m³ → <strong>${fTgt(o.fillupTarget, o.fillupM3)}&nbsp;m³/auto</strong></td></tr>` : ""}
        ${o.podmienky ? `<tr><td style="color:#888;padding:1px 6px 1px 0;vertical-align:top">Podmienky</td><td style="${o.podmienky.isRisk ? "color:#991b1b" : "color:#92400e"};font-size:8pt;font-weight:600">${o.podmienky.isRisk ? "⚠ Minusové pretaženie" : "★ Pretaženie"}: ${o.podmienky.pumpa > 0 ? `1× Pumpa + ${o.podmienky.mix}× Mix` : `${o.podmienky.trucks}× Mix`} · ∅ ${o.podmienky.m3PerTruck?.toFixed(1) ?? "—"} m³/vozidlo</td></tr>` : ""}
        ${o.km ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Vzdialenosť</td><td>${o.km} km</td></tr>` : ""}
        ${(o.address || o.mapPlusCode || o.mapLocality) ? `<tr><td style="color:#888;padding:1px 6px 1px 0;vertical-align:top">Adresa</td><td>${o.mapLocality ? `<strong>${o.mapLocality}</strong>${o.address ? "<br>" : ""}` : ""}${o.address ?? ""}${o.mapPlusCode ? `<br><span style="font-family:monospace;font-size:7.5pt;color:#aaa">${o.mapPlusCode}</span>` : ""}</td></tr>` : ""}
        ${effectiveZoneName ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Typ dopravy</td><td>${effectiveZoneName}${effectiveZoneType !== "standard" ? ` <span style="font-size:7.5pt;color:#b58c00;font-weight:700">${effectiveZoneType === "km" ? "(€/km)" : "(€/auto)"}</span>` : ""}</td></tr>` : ""}
        <tr><td style="color:#888;padding:1px 6px 1px 0">Platba</td><td style="font-weight:bold">${o.priceMode === "hotovost" ? "Hotovosť" : "Faktúra"}</td></tr>
        ${o.viaSms ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Zdroj</td><td>SMS</td></tr>` : ""}
      </tbody></table>
      ${o.note ? `<div style="font-size:8pt;color:#555;margin-top:4px;font-style:italic">Poznámka: ${o.note}</div>` : ""}
    </div>
  </div>

  <!-- Kalkulácia -->
  ${breakdownHtml ? `
  <div style="margin-bottom:5mm">
    <table style="border:1px solid #ddd">
      <thead><tr style="background:#001D3D;color:#fff;font-size:8pt;font-weight:bold">
        <th style="padding:5px 6px;width:24px;text-align:center">#</th>
        <th style="padding:5px 8px;text-align:left">Popis</th>
        <th style="padding:5px 8px;text-align:right">Množstvo</th>
        <th style="padding:5px 8px;text-align:right">Jedn.&nbsp;cena</th>
        <th style="padding:5px 8px;text-align:right">Spolu</th>
      </tr></thead>
      <tbody>${breakdownHtml}</tbody>
    </table>
  </div>` : ""}

  <!-- Celková suma -->
  <div style="margin-bottom:8mm">
  <div style="background:#001D3D;color:#fff;padding:4mm;border-radius:${isPartialDepPdf ? "2px 2px 0 0" : "2px"};display:flex;justify-content:space-between;align-items:center">
    ${o.priceMode !== "hotovost" ? `<div>
      <div style="font-size:8pt;color:rgba(255,255,255,0.6)">Bez DPH</div>
      <div style="font-size:9.5pt;font-weight:bold;color:rgba(255,255,255,0.8)">${fmtEurPdf(o.totalBezDph)}</div>
    </div>` : "<div></div>"}
    <div style="text-align:right">
      <div style="font-size:8pt;color:rgba(255,255,255,0.6)">${o.priceMode === "hotovost" ? "Spolu" : "Celkom s DPH"}</div>
      <div style="font-size:16pt;font-weight:bold;color:#EDC531">${fmtEurPdf(o.totalSDph)}</div>
      ${o.status === "vyplatena" && o.paidAmount !== undefined ? `
      <div style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.2);padding-top:4px">
        <div style="font-size:8pt;color:rgba(255,255,255,0.6)">Zaplatené</div>
        <div style="font-size:11pt;font-weight:bold;color:#fff">${fmtEurPdf(o.paidAmount)}</div>
        ${Math.abs(o.paidAmount - o.totalSDph) > 0.01 ? `<div style="font-size:9pt;font-weight:bold;color:${o.paidAmount > o.totalSDph ? "#86efac" : "#ef4444"}">${o.paidAmount > o.totalSDph ? `+${(o.paidAmount - o.totalSDph).toFixed(2)} € tringelt` : `${(o.paidAmount - o.totalSDph).toFixed(2)} € rozdiel`}</div>` : ""}
        ${o.depositUsed !== undefined && o.depositUsed > 0 ? `<div style="margin-top:3px;font-size:8pt;background:rgba(251,191,36,0.2);border-radius:3px;padding:2px 5px;color:#fcd34d;font-weight:bold">💰 Záloha: ${fmtEurPdf(o.depositUsed)}${o.depositUsed < o.paidAmount - 0.01 ? ` + doplatok: ${fmtEurPdf(o.paidAmount - o.depositUsed)}` : ""}</div>` : ""}
      </div>` : ""}
    </div>
  </div>
  ${isPartialDepPdf ? `<div style="background:#ea580c;color:#fff;padding:3.5mm 4mm;border-radius:0 0 2px 2px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:9pt;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase">Klient musí doplatiť</div>
      <div style="font-size:7.5pt;opacity:0.8;margin-top:1px">na mieste alebo doplniť zálohu</div>
    </div>
    <div style="font-size:15pt;font-weight:bold">${fmtEurPdf(doplatokPdf)}</div>
  </div>` : ""}
  </div>

  <!-- Podpisy — rovnaká štruktúra ako Cenová ponuka -->
  <div style="display:flex;align-items:flex-start;gap:6mm;margin-bottom:5mm">
    <div style="flex:1;border:1px solid #c8c8d8;border-radius:3px;padding:4mm 6mm;text-align:center">
      <div style="font-size:8pt;color:#888;margin-bottom:3mm">Vypracovala spoločnosť</div>
      <img src="${window.location.origin}/ms-beton-watermark.png" style="width:36mm;height:auto;opacity:0.22;display:block;margin:0 auto" />
    </div>
    <div style="flex:1;border:1px solid #c8c8d8;border-radius:3px;padding:4mm 6mm;min-height:28mm">
      <div style="font-size:8pt;color:#888;margin-bottom:2mm">Podpis a pečiatka zákazníka</div>
    </div>
  </div>

  <!-- Google Review -->
  <div style="padding:4mm 6mm;border:1px solid #ddd;border-radius:3px;display:flex;align-items:center;gap:6mm;margin-bottom:5mm">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=https%3A%2F%2Fg.page%2Fr%2FCeTg2gjXL3dWEBM%2Freview" style="width:22mm;height:22mm;display:block;flex-shrink:0" />
    <div>
      <div style="font-size:9pt;font-weight:bold;color:#001D3D;margin-bottom:2px">Ohodnoťte nás na Google</div>
      <div style="font-size:7.5pt;color:#555;margin-bottom:3px">Vážime si Váš názor. Pomôžte ostatným zákazníkom svojou recenziou.</div>
      <div style="font-size:7pt;color:#888">msbeton.sk/recenzia</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding-top:4mm;border-top:1px solid #ddd;font-size:7.5pt;color:#888;line-height:1.7">
    MS-BETON, spol. s r.o. &nbsp;|&nbsp; IČO: 55747591 &nbsp;|&nbsp; DIČ: 2122074603 &nbsp;|&nbsp; IČ DPH: SK2122074603 &nbsp;|&nbsp;
    Turie 468, 013 12 Turie &nbsp;|&nbsp; +421&nbsp;944&nbsp;069&nbsp;305 &nbsp;|&nbsp; info@msbeton.sk
  </div>

</div>

</body></html>`;

  const html = format === "a5" ? a5Html : a4Html;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  if (!win) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click(); }
}

export default function ObjednavkyTab({ onGoToClient, initialSearch, initialClientId, focusOrderId, onGoToHistoria }: { onGoToClient?: (loginId: string) => void; initialSearch?: string; initialClientId?: string; focusOrderId?: string; onGoToHistoria?: (filter: { sub: "zalohy" | "cashflow"; clientId?: string; date?: string; orderId?: string; dateFilter?: string }) => void }) {
  const [orders, setOrders] = useState<Order[]>(() => adminData.getOrders());
  const [allCategories, setAllCategories] = useState(() => adminData.getCategories());
  const [allClients, setAllClients] = useState(() => adminData.getClients());
  // Rýchle vyhľadávanie klienta podľa loginId alebo id — reaktívne (fotky, zľavy)
  const clientMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof adminData.getClients>[number]>();
    for (const c of allClients) { if (c.loginId) m.set(c.loginId, c); m.set(c.id, c); }
    return m;
  }, [allClients]);
  useEffect(() => {
    const handler = () => {
      setAllCategories(adminData.getCategories());
      // Refresh orders — nové objednávky (SMS/Košík) sa ukladajú cez API, nie cez lokálny save()
      // Poll (AdminDashboard) ich cacheuje do localStorage + dispatchuje admin-data-synced
      // → tu načítame čerstvý zoznam aby sa ihneď objavili vrátane discount badges
      setOrders(adminData.getOrders());
      setAllClients(adminData.getClients()); // foto/zľavy klientov sa menia v KlientiTab
    };
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);

  // Conflict toast: iný admin zmenil objednávky súbežne → "merged" event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; state: string }>).detail;
      if (detail.key === "orders" && detail.state === "merged") {
        // Refresh lokálneho zoznamu z čerstvého localStorage (syncFromServer ho naplnil)
        setOrders(adminData.getOrders());
        setConflictToast("⚠ Iný admin zmenil niektoré objednávky — zobrazujem aktuálny stav");
        setTimeout(() => setConflictToast(null), 5000);
      }
    };
    window.addEventListener("admin-save-state", handler);
    return () => window.removeEventListener("admin-save-state", handler);
  }, []);
  const [expanded, setExpanded] = useState<string | null>(focusOrderId ?? null);
  const [highlightedOrder, setHighlightedOrder] = useState<string | null>(focusOrderId ?? null);
  const [filterStatus, setFilterStatus] = useState<Order["status"] | "vsetky">("vsetky");
  const [filterTab, setFilterTab] = useState<Order["tab"] | "vsetky">("vsetky");
  const [filterPriceMode, setFilterPriceMode] = useState<"vsetky" | "faktura" | "hotovost">("vsetky");
  const [filterChannel, setFilterChannel] = useState<"vsetky" | "sms" | "kosarik">("vsetky");
  const [filterZaloha, setFilterZaloha] = useState<"vsetky" | "zaloha" | "doplatok">("vsetky");
  const [search, setSearch] = useState(initialSearch ?? "");
  const [clientIdActive, setClientIdActive] = useState<string | null>(initialClientId ?? null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickDate, setQuickDate] = useState("");
  const [quickDays, setQuickDays] = useState("7");
  const [quickMY, setQuickMY] = useState({ m: new Date().getMonth() + 1, y: new Date().getFullYear() });
  const [newBadge, setNewBadge] = useState(0);
  useEffect(() => {
    if (!focusOrderId) return;
    const t1 = setTimeout(() => {
      const container = document.getElementById("admin-content");
      const el = document.getElementById(`order-card-${focusOrderId}`);
      if (container && el) {
        const filterEl = container.querySelector(".sticky.top-0");
        const filterH = filterEl ? filterEl.getBoundingClientRect().height : 52;
        const cR = container.getBoundingClientRect();
        const eR = el.getBoundingClientRect();
        container.scrollTo({ top: container.scrollTop + (eR.top - cR.top) - filterH - 8, behavior: "smooth" });
      }
    }, 120);
    const t2 = setTimeout(() => setHighlightedOrder(null), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [focusOrderId]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [secStavOpen, setSecStavOpen] = useState(true);
  const [secTypOpen, setSecTypOpen] = useState(false);
  const [secDateOpen, setSecDateOpen] = useState(false);
  const [copiedPlusCode, setCopiedPlusCode] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ts, setTs] = useState<TransportSettings>(adminData.getTransportSettings());
  const saveTs = (data: TransportSettings) => { setTs(data); adminData.saveTransportSettings(data); };
  const [mapModalOrder, setMapModalOrder] = useState<Order | null>(null);
  useEffect(() => {
    if (!mapModalOrder) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMapModalOrder(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mapModalOrder]);
  const [clientPhotoModal, setClientPhotoModal] = useState<string | null>(null); // client.id
  const plusCodeBackfilledRef = useRef<Set<string>>(new Set());
  const [ordersPage, setOrdersPage] = useState(0);
  const ORDERS_PAGE_SIZE = 30;
  const [scaleAlertDismissed, setScaleAlertDismissed] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [noteEditVal, setNoteEditVal] = useState("");
  // Deposit reversal — keď admin zmení stav preč z vyplatena a order mal depositUsed > 0
  const [depositReversal, setDepositReversal] = useState<{ orderId: string; depositUsed: number; clientLoginId: string; newStatus: Order["status"] } | null>(null);
  // Presence: kto iný práve prezerá danú objednávku (soft lock indicator)
  const [presenceMap, setPresenceMap] = useState<Record<string, string[]>>({});
  const [conflictToast, setConflictToast] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const result = await adminApi.getOrders();
        if (result?.data) {
          const data = result.data as Order[];
          adminData.cacheOrders(data); // len lokálny refresh — žiaden re-PUT (inak stale poll prepíše čerstvú zmenu)
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

  // Backfill mapLocality via Nominatim (OpenStreetMap) — bez Google Geocoding API
  useEffect(() => {
    const toFill = orders.filter(o => o.mapPlusCode && !o.mapLocality && !plusCodeBackfilledRef.current.has(o.id));
    if (toFill.length === 0) return;
    // Inline OLC (Plus Code) decoder
    const decodePlusCode = (code: string): { lat: number; lng: number } => {
      const AL = "23456789CFGHJMPQRVWX";
      const s = code.toUpperCase().replace("+", "");
      let lat = 0, lng = 0, lR = 400, lnR = 400;
      for (let i = 0; i < s.length - 1; i += 2) {
        lR /= 20; lnR /= 20;
        lat += AL.indexOf(s[i]) * lR;
        lng += AL.indexOf(s[i + 1]) * lnR;
      }
      return { lat: lat - 90 + lR / 2, lng: lng - 180 + lnR / 2 };
    };
    toFill.forEach((o, idx) => {
      plusCodeBackfilledRef.current.add(o.id);
      setTimeout(async () => {
        try {
          const { lat, lng } = decodePlusCode(o.mapPlusCode!);
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=sk`,
            { headers: { "User-Agent": "msbeton-admin/1.0" } }
          );
          const d = await r.json();
          const a = d.address ?? {};
          const loc = (a.village ?? a.town ?? a.city ?? a.municipality ?? "") as string;
          const dist = (a.county ?? "") as string;
          const mapLocality = [loc, dist].filter(Boolean).join(", ");
          if (!mapLocality) return;
          setOrders(prev => {
            const updated = prev.map(p => p.id === o.id ? { ...p, mapLocality } : p);
            adminData.saveOrders(updated);
            return updated;
          });
        } catch { /* silent */ }
      }, idx * 1100); // Nominatim rate limit: 1 req/s
    });
  }, [orders]);

  const readOnly = isReader(); // admin-čitateľ — žiadne zmeny objednávok
  const save = (data: Order[]) => { if (readerBlocked()) return; setOrders(data); adminData.saveOrders(data); };
  // Soft delete — zachová objednávku v DB pre História, len zmení status + history entry
  const remove = (id: string) => { updateStatus(id, "zmazana"); setDeleteConfirmId(null); };

  const handleDepositPay = (orderId: string, depositAmount: number, clientLoginId: string) => {
    if (readerBlocked()) return;
    const order = orders.find(o => o.id === orderId);
    // GUARD: záloha už bola odpočítaná — neodpočítaj znovu, iba zmeň stav
    if (order?.depositUsed !== undefined && order.depositUsed > 0) {
      updateStatus(orderId, "vyplatena", order.paidAmount ?? order.totalSDph, order.depositUsed);
      return;
    }
    // orderTotal = plná suma objednávky (paidAmount = vždy celá suma, depositUsed = koľko zo zálohy)
    const orderTotal = order?.totalSDph ?? depositAmount;
    const now = new Date().toISOString();
    // Deduct from client deposit — zachovaj enabled flag!
    const clients = adminData.getClients();
    const updatedClients = clients.map(c => {
      if (c.loginId !== clientLoginId && c.id !== clientLoginId) return c;
      const cur = c.deposit ?? { balance: 0, transactions: [] };
      const tx = {
        id: crypto.randomUUID(),
        type: "payment" as const,
        amount: -depositAmount,
        orderId,
        note: depositAmount < orderTotal - 0.01 ? `Čiastočná platba, doplatok: ${(orderTotal - depositAmount).toFixed(2)} €` : undefined,
        createdAt: now,
        createdBy: getAdminDeviceLabel() || "admin",
      };
      return {
        ...c,
        deposit: {
          enabled: c.deposit?.enabled,  // zachovaj enabled flag!
          balance: Math.max(0, cur.balance - depositAmount),
          transactions: [...cur.transactions, tx],
        },
      };
    });
    adminData.saveClients(updatedClients);
    // paidAmount = celá suma objednávky, depositUsed = koľko zo zálohy
    updateStatus(orderId, "vyplatena", orderTotal, depositAmount);
  };

  // Reverzia zálohy — vráti depositUsed späť na klientov zostatok, vymaže depositUsed z objednávky
  const handleDepositReversal = (orderId: string, depositUsed: number, clientLoginId: string, newStatus: Order["status"]) => {
    if (readerBlocked()) return;
    const now = new Date().toISOString();
    const clients = adminData.getClients();
    const updatedClients = clients.map(c => {
      if (c.loginId !== clientLoginId && c.id !== clientLoginId) return c;
      const cur = c.deposit ?? { balance: 0, transactions: [] };
      const tx = {
        id: crypto.randomUUID(),
        type: "topup" as const,
        amount: depositUsed,  // kladné = credit back
        orderId,
        note: `Vrátenie zálohy — zmena stavu objednávky`,
        createdAt: now,
        createdBy: getAdminDeviceLabel() || "admin",
      };
      return {
        ...c,
        deposit: { enabled: c.deposit?.enabled, balance: cur.balance + depositUsed, transactions: [...cur.transactions, tx] },
      };
    });
    adminData.saveClients(updatedClients);
    // Zmeniť stav + vymazať depositUsed a paidAmount
    const entry: StatusHistoryEntry = {
      status: newStatus,
      changedAt: now,
      changedBy: getAdminDeviceLabel() || "admin",
    };
    save(orders.map(o => {
      if (o.id !== orderId) return o;
      const entryWithPrev: StatusHistoryEntry = { ...entry, prevStatus: o.status };
      const { depositUsed: _d, paidAmount: _p, ...rest } = o;
      void _d; void _p;
      return { ...rest, status: newStatus, statusHistory: [...(o.statusHistory ?? []), entryWithPrev], updatedAt: now };
    }));
    setDepositReversal(null);
  };

  const updateStatus = (id: string, status: Order["status"], paidAmount?: number, depositUsed?: number) => {
    const now = new Date().toISOString();
    const entry: StatusHistoryEntry = {
      status,
      changedAt: now,
      changedBy: getAdminDeviceLabel() || "admin",
      ...(paidAmount !== undefined ? { paidAmount } : {}),
    };
    save(orders.map(o => {
      if (o.id !== id) return o;
      const hist = o.statusHistory ?? [];
      const entryWithPrev: StatusHistoryEntry = { ...entry, prevStatus: o.status };
      // updatedAt je kritické — mergeSaveArray ho používa na určenie víťaza pri súbežných zmenách
      return {
        ...o, status, statusHistory: [...hist, entryWithPrev], updatedAt: now,
        ...(paidAmount !== undefined ? { paidAmount } : {}),
        ...(depositUsed !== undefined ? { depositUsed } : {}),
      };
    }));
  };

  // Pridaj poznámku do statusHistory (type:"note") a aktualizuj o.note
  const addNoteHistory = (id: string, newNote: string) => {
    const now = new Date().toISOString();
    save(orders.map(o => {
      if (o.id !== id) return o;
      const entry: StatusHistoryEntry = {
        type: "note",
        note: newNote,
        status: o.status,   // status sa nemení, ale pole je required
        changedAt: now,
        changedBy: getAdminDeviceLabel() || "admin",
      };
      return { ...o, note: newNote, statusHistory: [...(o.statusHistory ?? []), entry], updatedAt: now };
    }));
  };

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
    .filter(o => o.status !== "zmazana")   // zmazané sú len v História, nie tu
    .filter(o => filterStatus    === "vsetky" || o.status    === filterStatus)
    .filter(o => filterTab       === "vsetky" || o.tab       === filterTab)
    .filter(o => filterPriceMode === "vsetky" || o.priceMode === filterPriceMode)
    .filter(o => filterChannel   === "vsetky" || (filterChannel === "sms" ? !!o.viaSms : !o.viaSms))
    .filter(o => filterZaloha    === "vsetky" || (
      filterZaloha === "zaloha" ? (o.depositUsed !== undefined && o.depositUsed > 0) :
      /* doplatok */ (o.depositUsed !== undefined && o.depositUsed > 0 && o.paidAmount !== undefined && o.paidAmount - o.depositUsed > 0.01)
    ))
    .filter(o => !clientIdActive || o.clientId === clientIdActive)
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

  // Lokálny dátum (SK čas, nie UTC) — correct po polnoci
  const localDay = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const todayStr = localDay(0);
  const yesterdayStr = localDay(-1);
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
  const activeFilters = [filterStatus !== "vsetky", filterTab !== "vsetky", filterPriceMode !== "vsetky", filterChannel !== "vsetky", filterZaloha !== "vsetky", !!clientIdActive, !!search, !!(dateFrom || dateTo)].filter(Boolean).length;
  const sortedCount = sorted.length;
  const sortedCountLabel = sortedCount === 1 ? "objednávka" : sortedCount >= 2 && sortedCount <= 4 ? "objednávky" : "objednávok";
  const totalPages = Math.ceil(sortedCount / ORDERS_PAGE_SIZE);
  const pagedOrders = sorted.slice(ordersPage * ORDERS_PAGE_SIZE, (ordersPage + 1) * ORDERS_PAGE_SIZE);
  // Klienti s fotkou z aktuálnych filtrovaných objednávok — pre navigáciu v photo lightboxe
  const clientsWithPhoto = useMemo(() => {
    const seen = new Set<string>();
    const result: { client: (typeof allClients)[number]; }[] = [];
    for (const o of sorted) {
      const c = clientMap.get(String(o.clientId));
      if (c?.photo && !seen.has(c.id)) { seen.add(c.id); result.push({ client: c }); }
    }
    return result;
  }, [sorted, clientMap]);
  useEffect(() => { setOrdersPage(0); }, [filterStatus, filterTab, filterPriceMode, filterChannel, filterZaloha, clientIdActive, search, dateFrom, dateTo]);

  // ── Presence polling — zisti kto iný prezerá objednávky (každých 30s) ──
  useEffect(() => {
    const device = getAdminDeviceLabel() || "admin";
    const fetchPresence = async () => {
      try {
        const r = await authFetch("/api/admin/orders/presence");
        if (r.ok) {
          const json = await r.json() as { data: Record<string, string[]> };
          // Odfiltruj seba samého zo zoznamu
          const filtered: Record<string, string[]> = {};
          for (const [id, devs] of Object.entries(json.data ?? {})) {
            const others = devs.filter((d: string) => d !== device);
            if (others.length) filtered[id] = others;
          }
          setPresenceMap(filtered);
        }
      } catch { /* presence je best-effort */ }
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 30_000);
    return () => clearInterval(interval);
  }, []);

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
            {/* Potvrdzovací email klientovi — default zapnutý (undefined = zap) */}
            <div className="flex items-start gap-4 flex-wrap border-t border-gray-100 pt-3">
              <div className="flex-1 min-w-[220px]">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Potvrdzovací email klientovi</div>
                <div className="text-[11px] text-gray-500">
                  Po objednávke pošle klientovi (ak má email) automatické „Prijali sme, pracujeme na nej, budeme kontaktovať".
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 pt-0.5">
                <span className={`text-xs font-bold ${ts.orderConfirmEmail !== false ? "text-green-600" : "text-gray-400"}`}>
                  {ts.orderConfirmEmail !== false ? "Zapnuté" : "Vypnuté"}
                </span>
                <button
                  onClick={() => saveTs({ ...ts, orderConfirmEmail: ts.orderConfirmEmail === false ? true : false })}
                  className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${ts.orderConfirmEmail !== false ? "bg-green-500" : "bg-gray-300"}`}
                  title={ts.orderConfirmEmail !== false ? "Vypnúť potvrdzovací email" : "Zapnúť potvrdzovací email"}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ts.orderConfirmEmail !== false ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scale alert — zobrazuje sa keď objednávok je >1000/2000/5000 */}
      {/* Conflict toast — iný admin zmenil objednávky súbežne */}
      {conflictToast && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5 text-sm animate-pulse">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 font-semibold flex-1">{conflictToast}</span>
          <button onClick={() => setConflictToast(null)} className="text-amber-500 hover:text-amber-700 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {!scaleAlertDismissed && (() => {
        const n = orders.length;
        if (n >= 5000) return (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            <span className="text-red-500 text-base shrink-0 mt-0.5">⚠</span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-red-700">Kritické: {n} objednávok</span>
              <span className="text-red-600 ml-1">— JSONB blob je príliš veľký. Nutná migrácia na orders tabuľku + server-side páging. Pozri <code className="text-xs bg-red-100 px-1 rounded">docs/db-scalability.md</code>.</span>
            </div>
            <button onClick={() => setScaleAlertDismissed(true)} className="text-red-400 hover:text-red-600 transition-colors shrink-0 p-0.5" aria-label="Zavrieť"><X className="w-4 h-4" /></button>
          </div>
        );
        if (n >= 2000) return (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
            <span className="text-amber-500 text-base shrink-0 mt-0.5">◈</span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-amber-700">{n} objednávok</span>
              <span className="text-amber-600 ml-1">— viditeľné spomalenie admin načítania (JSONB ~{Math.round(n * 1.2 / 1000)} MB). Plánujte migráciu na orders tabuľku. Pozri <code className="text-xs bg-amber-100 px-1 rounded">docs/db-scalability.md</code>.</span>
            </div>
            <button onClick={() => setScaleAlertDismissed(true)} className="text-amber-400 hover:text-amber-600 transition-colors shrink-0 p-0.5" aria-label="Zavrieť"><X className="w-4 h-4" /></button>
          </div>
        );
        if (n >= 1000) return (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
            <span className="text-blue-400 text-base shrink-0 mt-0.5">ℹ</span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-blue-700">{n} objednávok</span>
              <span className="text-blue-600 ml-1">— stránkovanie beží (30/strana). Čoskoro bude vhodné prejsť na server-side páging a filtrovanie na DB. Pozri <code className="text-xs bg-blue-100 px-1 rounded">docs/db-scalability.md</code>.</span>
            </div>
            <button onClick={() => setScaleAlertDismissed(true)} className="text-blue-400 hover:text-blue-600 transition-colors shrink-0 p-0.5" aria-label="Zavrieť"><X className="w-4 h-4" /></button>
          </div>
        );
        return null;
      })()}

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
          {clientIdActive && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              Klient: {clientIdActive}
              <button onClick={e => { e.stopPropagation(); setClientIdActive(null); }} className="hover:text-red-500 transition-colors leading-none">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          <span className="ml-auto text-xs font-bold text-secondary shrink-0">{sortedCount} {sortedCountLabel}</span>
          {newBadge > 0 && <span className="relative bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{newBadge} nových</span>}
          {onGoToHistoria && (
            <button
              onClick={(e) => { e.stopPropagation(); onGoToHistoria({ sub: "cashflow" }); }}
              className="text-[10px] font-bold text-amber-600 hover:text-amber-800 border border-amber-200 hover:border-amber-400 rounded-full px-2 py-0.5 transition-colors cursor-pointer shrink-0">
              História
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${filterOpen ? "rotate-180" : ""}`} />
        </button>
        {filterOpen && (
        <div className="border-t border-gray-200">
          {/* HĽADAJ — vždy hore, vždy viditeľný */}
          <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-1.5">
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setSearch(""); }}
              placeholder="Meno, firma, telefón, ID, adresa..."
              className="flex-1 border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-secondary rounded-sm"
              autoComplete="off"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* STAV — collapsible */}
          <div className="border-b border-gray-200">
            <button type="button" onClick={() => setSecStavOpen(o => !o)}
              className="w-full bg-gray-50 border-b border-gray-100 px-4 py-1.5 flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Stav</span>
              {filterStatus !== "vsetky" && (
                <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  {ORDER_STATUSES.find(s => s.key === filterStatus)?.label}
                </span>
              )}
              {newBadge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{newBadge} nových</span>}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform duration-150 ${secStavOpen ? "rotate-180" : ""}`} />
            </button>
            {secStavOpen && (
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
            )}
          </div>

          {/* TYP + PLATBA + ZDROJ — collapsible */}
          <div className="border-b border-gray-200">
            <button type="button" onClick={() => setSecTypOpen(o => !o)}
              className="w-full bg-gray-50 border-b border-gray-100 px-4 py-1.5 flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Typ / Platba / Zdroj</span>
              {(filterTab !== "vsetky" || filterPriceMode !== "vsetky" || filterChannel !== "vsetky" || filterZaloha !== "vsetky") && (
                <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  {[filterTab !== "vsetky" && TAB_STYLES[filterTab]?.label, filterPriceMode !== "vsetky" && (filterPriceMode === "faktura" ? "FA" : "HOT"), filterChannel !== "vsetky" && (filterChannel === "sms" ? "SMS" : "Košík"), filterZaloha !== "vsetky" && (filterZaloha === "doplatok" ? "⚠ Doplatok" : "💰 Záloha")].filter(Boolean).join(" · ")}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform duration-150 ${secTypOpen ? "rotate-180" : ""}`} />
            </button>
            {secTypOpen && (
              <div className="divide-y divide-gray-100">
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
                {/* Záloha */}
                <div className="flex items-center gap-0 px-4 py-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em] w-14 shrink-0">Záloha</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setFilterZaloha("vsetky")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-sm border transition-all ${filterZaloha === "vsetky" ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
                      Všetky
                    </button>
                    <button onClick={() => setFilterZaloha("zaloha")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-sm border transition-all ${filterZaloha === "zaloha" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-500 border-gray-200 hover:border-amber-300"}`}>
                      💰 Zo zálohy
                      <span className="text-[10px] opacity-70 ml-0.5">{orders.filter(o => o.depositUsed !== undefined && o.depositUsed > 0).length}</span>
                    </button>
                    <button onClick={() => setFilterZaloha("doplatok")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-sm border transition-all ${filterZaloha === "doplatok" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-500 border-gray-200 hover:border-orange-300"}`}>
                      ⚠ Doplatok
                      <span className="text-[10px] opacity-70 ml-0.5">{orders.filter(o => o.depositUsed !== undefined && o.depositUsed > 0 && o.paidAmount !== undefined && o.paidAmount - o.depositUsed > 0.01).length}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DÁTUM — collapsible */}
          <div className="border-b border-gray-200">
            <button type="button" onClick={() => setSecDateOpen(o => !o)}
              className="w-full bg-gray-50 border-b border-gray-100 px-4 py-1.5 flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Dátum</span>
              {(quickDate || dateFrom || dateTo) && (
                <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  {quickDate === "dnes" ? "Dnes" : quickDate === "vcera" ? "Včera" : quickDate === "tyzden" ? "Týždeň" : quickDate === "mesiac" ? `${SK_MONTHS[quickMY.m - 1]} ${quickMY.y}` : quickDate === "ndni" ? `–${quickDays}d` : dateFrom || dateTo ? "Vlastný" : ""}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform duration-150 ${secDateOpen ? "rotate-180" : ""}`} />
            </button>
            {secDateOpen && (<>
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
            </>)}
          </div>
        </div>
        )}
      </div>
      {floatingOrder && (
        <div className="bg-secondary/97 border-b border-white/10 px-4 py-1.5 flex items-center gap-2 text-xs shadow-sm">
          <span className="text-white/30 text-[9px]">▸</span>
          <span className="font-bold text-white truncate">{floatingOrder.clientName}</span>
          {floatingOrder.company && <span className="text-white/50 truncate hidden sm:block">{floatingOrder.company}</span>}
          <span className="text-white/50 shrink-0">{floatingOrder.tab === "pumpa" ? "Pumpa" : floatingOrder.tab === "mix" ? "Mix" : "Vl."} · {floatingOrder.totalQty} m³</span>
          <span className="text-white/70 font-bold shrink-0 tabular-nums hidden sm:block">{floatingOrder.totalSDph?.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {/* Záloha badge v floating bare */}
            {floatingOrder.status === "vyplatena" && (floatingOrder.depositUsed !== undefined && floatingOrder.depositUsed > 0) && (() => {
              const isPartialFl = floatingOrder.paidAmount !== undefined && floatingOrder.depositUsed < floatingOrder.paidAmount - 0.01;
              return (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm border ${isPartialFl ? "bg-orange-400/30 text-orange-300 border-orange-400/30" : "bg-amber-400/30 text-amber-300 border-amber-400/30"}`}>
                  💰 {isPartialFl ? "záloha+doplatok" : "záloha"}
                </span>
              );
            })()}
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm ${STATUS_ACTIVE_COLORS[floatingOrder.status] ?? "bg-gray-500 text-white"}`}>
              {ORDER_STATUSES.find(s => s.key === floatingOrder.status)?.label ?? floatingOrder.status}
            </span>
          </div>
        </div>
      )}
      </div>

      {sortedCount === 0 ? (
        <div className="bg-white border border-gray-200 px-8 py-12 text-center text-gray-400 text-sm">
          Žiadne objednávky
        </div>
      ) : (
        <div className="space-y-3">
          {pagedOrders.map(o => {
            const isExp = expanded === o.id;
            // Napojený klient (pre avatar + biometriu) + zónový typ dopravy
            const linkedClient = clientMap.get(String(o.clientId));
            const av = linkedClient ? clientAvatar(linkedClient) : nameAvatar(o.clientName, o.company ?? "", o.clientId ?? o.id);
            const clientBio = (linkedClient?.webauthnCredentials?.length ?? 0) > 0;
            // Effective discounts — order-stored value (čo reálne platilo) ALEBO live client fallback
            // (objednávky bez clientOverride nemajú uložené discount polia → fallback zobrazí aktuálnu zľavu klienta)
            const effDiscBeton   = o.discountBeton   ?? linkedClient?.discountBeton   ?? 0;
            const effDiscDoprava = o.discountDoprava ?? linkedClient?.discountDoprava ?? 0;
            const effDiscSluzby  = o.discountSluzby  ?? linkedClient?.discountSluzby  ?? 0;
            const effDiscCelkovo = o.discountCelkovo ?? linkedClient?.discountCelkovo ?? 0;
            const oZoneType = o.deliveryZoneType ?? (() => {
              const all = adminData.getDelivery();
              const z = linkedClient?.deliveryZoneId ? (all.find(zz => zz.id === linkedClient.deliveryZoneId) ?? all[0]) : all[0];
              return z?.pricingType ?? "standard";
            })();
            return (
              <div key={o.id} id={`order-card-${o.id}`} className={`border rounded-sm shadow-md transition-all duration-700 ${highlightedOrder === o.id ? "ring-2 ring-primary shadow-primary/30 shadow-lg" : ""} ${o.createdAt.slice(0,10) === todayStr ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
                <div className={`flex gap-3 py-3.5 cursor-pointer transition-colors ${o.createdAt.slice(0,10) === todayStr ? "hover:bg-gray-100" : "hover:bg-gray-50"} ${o.status === "nova" ? "pl-3 pr-4" : "px-4"}`}
                  style={o.status === "nova" ? { borderLeft: "4px solid #3b82f6" } : undefined}
                  onClick={() => {
                    const next = isExp ? null : o.id;
                    setExpanded(next);
                    // Presence: oznám expand (acquire) alebo collapse (release)
                    const device = getAdminDeviceLabel() || "admin";
                    if (next) {
                      authFetch(`/api/admin/orders/${next}/presence`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device }) }).catch(() => {});
                    } else if (o.id) {
                      authFetch(`/api/admin/orders/${o.id}/presence?device=${encodeURIComponent(device)}`, { method: "DELETE" }).catch(() => {});
                    }
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
                      {/* Avatar klienta (smart) + biometria — foto ak existuje */}
                      <span className="relative shrink-0"
                        onClick={linkedClient?.photo ? e => { e.stopPropagation(); setClientPhotoModal(linkedClient.id); } : undefined}
                        style={linkedClient?.photo ? { cursor: "pointer" } : undefined}>
                        {linkedClient?.photo
                          ? <img src={linkedClient.photo} className="w-6 h-6 rounded-full object-cover object-top ring-1 ring-primary/30" alt="" />
                          : <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", av.palette.bg, av.palette.fg)}>
                              {av.kind === "owner" ? <Crown className="w-3 h-3" />
                                : av.kind === "template" ? <Percent className="w-3 h-3" />
                                : av.kind === "phone" ? <Phone className="w-3 h-3" />
                                : (av.mono || av.char)}
                            </span>
                        }
                        {clientBio && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-1 ring-white flex items-center justify-center" title={`Biometria — ${linkedClient!.webauthnCredentials!.length} zariadenie`}>
                            <Fingerprint className="w-2 h-2 text-white" />
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-secondary text-base leading-tight">{o.clientName}</span>
                      {o.company && <span className="text-sm text-gray-500 truncate max-w-[120px]">{o.company}</span>}
                    </div>
                    {(() => {
                      const cat = o.concreteCategory ?? allCategories.find(c => c.types.some(t => t.label === o.concreteType))?.name;
                      const kg = cat ? getKamenivoGroup(cat) : null;
                      return cat ? <div className="flex items-center gap-1 text-[10px] font-black tracking-wide text-gray-900">
                        {kg === 'drvene' && <Mountain className="w-3 h-3 shrink-0 text-stone-500" />}
                        {kg === 'riecne' && <Waves className="w-3 h-3 shrink-0 text-blue-400" />}
                        {cat}
                      </div> : null;
                    })()}
                    <div className="flex items-center gap-1.5 flex-wrap text-sm">
                      <span className="font-medium text-gray-600">{o.concreteType.replace(/ – [\d.,]+ €.*/, "")}</span>
                      <span className="font-bold text-secondary">{o.totalQty} m³</span>
                      {o.km ? <span className="text-gray-400">{o.km} km</span> : null}
                    </div>
                    {(o.address || o.mapPlusCode || o.mapLocality) ? (
                      <button onClick={e => { e.stopPropagation(); setMapModalOrder(o); }}
                        className="inline-flex items-center gap-1 text-primary/50 hover:text-primary transition-colors" title="Zobraziť na mape">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {o.mapLocality
                          ? <span className="font-semibold text-secondary">{o.mapLocality.split(",")[0]}</span>
                          : o.address && <span className="font-semibold text-secondary">{extractAddrLocality(o.address)}</span>
                        }
                        {o.mapPlusCode && <span className="text-gray-400 font-mono text-[10px]">{o.mapPlusCode}</span>}
                      </button>
                    ) : null}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold ${o.createdAt.slice(0,10) === todayStr ? "bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-sm" : o.createdAt.slice(0,10) === yesterdayStr ? "text-blue-500" : "text-gray-400 font-normal"}`}>{fmtDate(o.createdAt)}</span>
                      {/* Typ dopravy — konzistentné s Klienti listom */}
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold rounded-sm bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5">
                        <Truck className="w-3 h-3" />
                        {oZoneType === "km" ? "€/km" : oZoneType === "auto" ? "€/auto" : "Štd"}
                      </span>
                      {o.viaSms
                        ? <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm"><MessageSquare className="w-2.5 h-2.5" /> SMS</span>
                        : <span className="inline-flex items-center bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-sm"><ShoppingCart className="w-3 h-3" /></span>}
                      {/* Kto vytvoril objednávku — admin / čítateľ / klient */}
                      {(() => { const cm = creatorMeta(o.createdByRole); return cm ? (
                        <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border", cm.cls)}
                          title={`Vytvoril: ${o.createdByDevice ?? cm.label} (${cm.label})`}>
                          <cm.Icon className="w-2.5 h-2.5" /> {o.createdByDevice ?? cm.label}
                        </span>
                      ) : null; })()}
                      {o.podmienky ? (() => { const ir = getOrderIsRisk(o); return (
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-sm ${ir ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-800"}`}>
                          {ir ? <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> : <span>★</span>}
                          {o.podmienky.pumpa > 0 ? `1×P+${o.podmienky.mix}×M` : `${o.podmienky.trucks}×Mix`}
                        </span>
                      ); })() : null}
                      {(effDiscBeton || effDiscDoprava || effDiscSluzby || effDiscCelkovo) ? (
                        effDiscCelkovo ? (
                          <span className="bg-primary text-secondary text-[9px] font-black px-1.5 py-0.5 rounded-sm">−{effDiscCelkovo}%</span>
                        ) : (<>
                          {effDiscBeton   ? <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">B−{effDiscBeton}%</span>   : null}
                          {effDiscDoprava ? <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">D−{effDiscDoprava}%</span> : null}
                          {effDiscSluzby  ? <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">S−{effDiscSluzby}%</span>  : null}
                        </>)
                      ) : null}
                    </div>
                  </div>
                  {/* Right */}
                  <div className="flex flex-col items-end justify-between shrink-0 gap-1.5">
                    <div className="text-right">
                      <div className="font-black text-secondary text-base tabular-nums leading-tight">{fmtEur(o.totalSDph)}</div>
                      {o.status === "vyplatena" && o.paidAmount !== undefined && Math.abs(o.paidAmount - o.totalSDph) > 0.01 && (
                        <div className={`text-[10px] tabular-nums font-semibold leading-tight mt-0.5 ${o.paidAmount >= o.totalSDph ? "text-teal-600" : "text-red-600"}`}>
                          {fmtEur(o.paidAmount)} <span className={`font-bold ${o.paidAmount > o.totalSDph ? "text-teal-500" : "text-red-500"}`}>{o.paidAmount > o.totalSDph ? `+${fmtEur(o.paidAmount - o.totalSDph)}` : fmtEur(o.paidAmount - o.totalSDph)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 justify-end flex-wrap mt-0.5">
                        {/* Záloha badge — depositUsed (nové) ALEBO fallback z client tx (staré orders) */}
                        {o.status === "vyplatena" && (() => {
                          const depUsedDirect = o.depositUsed !== undefined && o.depositUsed > 0 ? o.depositUsed : undefined;
                          // Fallback pre staré orders bez depositUsed: hľadaj v client deposit.transactions
                          const depUsedFallback = !depUsedDirect && linkedClient
                            ? linkedClient.deposit?.transactions?.filter(tx => tx.orderId === o.id && tx.type === "payment").reduce((s, tx) => s + Math.abs(tx.amount), 0) || undefined
                            : undefined;
                          const depUsed = depUsedDirect ?? depUsedFallback;
                          if (!depUsed || depUsed <= 0) return null;
                          const isPartial = o.paidAmount !== undefined && depUsed < o.paidAmount - 0.01;
                          return (
                            <span
                              onClick={onGoToHistoria ? (e) => { e.stopPropagation(); onGoToHistoria({ sub: "cashflow", date: o.createdAt.slice(0, 10) }); } : undefined}
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm border leading-tight ${isPartial ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-amber-100 text-amber-700 border-amber-200"} ${onGoToHistoria ? "cursor-pointer hover:brightness-95" : ""}`}
                              title={isPartial ? `Záloha: ${depUsed.toFixed(2)} € + doplatok: ${(o.paidAmount! - depUsed).toFixed(2)} €` : "Vyplatená zo zálohy — klik pre Históriu"}>
                              💰 {isPartial ? `záloha+doplatok` : "záloha"}
                            </span>
                          );
                        })()}
                        <div className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block",
                          o.priceMode === "hotovost" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {o.priceMode === "hotovost" ? "HOT." : "FA"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Presence: iný admin práve prezerá túto objednávku */}
                      {presenceMap[o.id] && presenceMap[o.id].length > 0 && (
                        <span title={`Prezerá: ${presenceMap[o.id].join(", ")}`}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-amber-100 border border-amber-300 text-amber-700 text-[9px] font-bold whitespace-nowrap">
                          <Eye className="w-2.5 h-2.5 shrink-0" />
                          {presenceMap[o.id][0].split(" ·")[0].split(" ")[0]}
                        </span>
                      )}
                      {readOnly
                        ? <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-sm", ORDER_STATUSES.find(s => s.key === o.status)?.color ?? "bg-gray-100 text-gray-600")}>{ORDER_STATUSES.find(s => s.key === o.status)?.label ?? o.status}</span>
                        : (() => {
                            const oc = o.clientId ? clientMap.get(String(o.clientId)) : undefined;
                            const depBal = oc?.deposit?.balance;
                            // enabled musí byť explicitne true — undefined/false = záloha vypnutá
                            const depEnabled = oc?.deposit?.enabled === true;
                            return (
                              <OrderStatusBadge
                                status={o.status}
                                orderTotal={o.totalSDph}
                                onChange={(s, amt) => {
                                  // Keď order bol vyplatený zo zálohy a admin mení stav preč → ponúknuť reverziu
                                  // oc môže byť undefined ak bol klient soft-deleted → preskočí reverziu, len zmení stav
                                  // oc.loginId môže byť "" ak klient nemá loginId → tiež preskočí (nenašiel by správny účet)
                                  const canReverse = s !== "vyplatena" && o.depositUsed !== undefined && o.depositUsed > 0 && oc && oc.loginId;
                                  if (canReverse) {
                                    setDepositReversal({ orderId: o.id, depositUsed: o.depositUsed!, clientLoginId: oc!.loginId!, newStatus: s });
                                  } else {
                                    updateStatus(o.id, s, amt);
                                  }
                                }}
                                // depositBalance posielame vždy (aj keď enabled=false) — Badge zobrazí info banner ak OFF
                                // onDepositPay len keď enabled — canUseDeposit v Badge je ďalšia ochrana
                                depositBalance={depBal && depBal > 0 ? depBal : undefined}
                                depositEnabled={depEnabled}
                                onDepositPay={oc && depEnabled ? (amt) => handleDepositPay(o.id, amt, oc.loginId) : undefined}
                                existingDepositUsed={o.depositUsed}
                              />
                            );
                          })()}
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
                        {o.phone && (
                          <div className="flex gap-2 items-center">
                            <span className="text-gray-400 w-20 shrink-0">Telefón</span>
                            <a href={`tel:${o.phone.replace(/\s/g, "")}`} onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-green-600 font-medium hover:text-green-700 active:scale-95 transition-all">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100"><Phone className="w-3.5 h-3.5" /></span>
                              {formatPhone(o.phone)}
                            </a>
                          </div>
                        )}
                        {o.email && (
                          <div className="flex gap-2 items-center">
                            <span className="text-gray-400 w-20 shrink-0">Email</span>
                            <a href={`mailto:${o.email}`} onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-blue-600 font-medium hover:text-blue-700 active:scale-95 transition-all break-all">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 shrink-0"><Mail className="w-3.5 h-3.5" /></span>
                              {o.email}
                            </a>
                          </div>
                        )}
                        {o.clientId && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">ID klienta</span><span className="text-gray-500">{o.clientId}</span></div>}
                        {o.clientId && onGoToClient && (
                          <div className="flex gap-2 items-center pt-1 flex-wrap">
                            <span className="text-gray-400 w-20 shrink-0" />
                            <button
                              onClick={e => { e.stopPropagation(); onGoToClient(o.clientId!); }}
                              className="text-[10px] font-bold text-secondary hover:text-primary underline underline-offset-2 transition-colors flex items-center gap-1"
                            >
                              <Users className="w-4 h-4" /> Zobraziť v klientoch →
                            </button>
                          </div>
                        )}
                        {(effDiscBeton || effDiscDoprava || effDiscSluzby || effDiscCelkovo) ? (
                          <div className="flex gap-2 items-start pt-0.5">
                            <span className="text-gray-400 w-20 shrink-0 mt-0.5">Zľavy</span>
                            <div className="space-y-1.5 flex-1">
                              {/* Individuálne skupina */}
                              {(effDiscBeton || effDiscDoprava || effDiscSluzby) ? (
                                <div className="border border-gray-200 rounded-sm px-2 py-1 bg-gray-50/60">
                                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-300 mb-1">Individuálne</div>
                                  <div className="flex flex-wrap gap-1">
                                    {effDiscBeton   ? <span className="bg-primary/15 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm">Betón −{effDiscBeton}%</span>   : null}
                                    {effDiscDoprava ? <span className="bg-primary/15 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm">Doprava −{effDiscDoprava}%</span> : null}
                                    {effDiscSluzby  ? <span className="bg-primary/15 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm">Služby −{effDiscSluzby}%</span>  : null}
                                  </div>
                                </div>
                              ) : null}
                              {/* Celkovo skupina */}
                              {effDiscCelkovo ? (
                                <div className="border border-primary/30 rounded-sm px-2 py-1 bg-primary/5">
                                  <div className="text-[8px] font-black uppercase tracking-widest text-primary/50 mb-1">Celkovo</div>
                                  <span className="bg-primary text-secondary text-[10px] font-black px-2 py-0.5 rounded-sm">−{effDiscCelkovo}%</span>
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
                        {/* Kto objednávku vytvoril — multi-admin previazanie */}
                        {(() => {
                          const cm = creatorMeta(o.createdByRole);
                          return (
                            <div className="flex gap-2 items-center">
                              <span className="text-gray-400 w-24 shrink-0">Vytvoril</span>
                              {cm ? (
                                <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-sm border", cm.cls)}>
                                  <cm.Icon className="w-3 h-3" />
                                  {o.createdByDevice ?? cm.label}
                                  {o.createdByRole !== "klient" && o.createdByRole !== "anonym" && <span className="font-normal opacity-70">· {cm.label}</span>}
                                </span>
                              ) : (
                                <span className="text-gray-400">{o.viaSms ? "SMS (neznáme zariadenie)" : "—"}</span>
                              )}
                            </div>
                          );
                        })()}
                        {(() => {
                          // Fallback reťazec — Typ dopravy MUSÍ byť vždy viditeľný:
                          // objednávka → klientova zóna → prvá (default) zóna → label podľa typu
                          const cl = clientMap.get(String(o.clientId));
                          const all = adminData.getDelivery();
                          const zone = cl?.deliveryZoneId ? (all.find(z => z.id === cl.deliveryZoneId) ?? all[0]) : all[0];
                          const dType = o.deliveryZoneType ?? zone?.pricingType ?? "standard";
                          const typeLabel = dType === "km" ? "Kilometre" : dType === "auto" ? "Počet áut" : "Štandard";
                          const dName = o.deliveryZoneName ?? zone?.name ?? typeLabel;
                          return (
                            <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Typ dopravy</span>
                              <span className="font-medium text-gray-700">
                                {dName}
                                {dType !== "standard" && (
                                  <span className="ml-1 text-[9px] font-black text-primary bg-primary/10 px-1 py-0.5 rounded-sm uppercase">{dType === "km" ? "€/km" : "€/auto"}</span>
                                )}
                              </span>
                            </div>
                          );
                        })()}
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
                          <span className="font-bold text-gray-800">{o.totalQty} m³{(o.fillupM3 ?? 0) > 0 && <span className="text-[10px] text-amber-600 ml-1 font-normal">(+ {fM3(o.fillupM3)} m³ doťaženie)</span>}</span>
                        </div>
                        {(o.fillupM3 ?? 0) > 0 && (
                          <div className="flex gap-2 items-start">
                            <span className="text-gray-400 w-24 shrink-0 pt-1.5">Doťaženie</span>
                            <div className="bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 flex-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                                <span>{o.totalQty} m³</span>
                                <span className="text-amber-400 font-bold">→</span>
                                <span className="text-amber-600">+{fM3(o.fillupM3)} m³</span>
                                <span className="text-amber-400 font-bold">→</span>
                                <span className="font-black">{fTgt(o.fillupTarget, o.fillupM3)} m³/auto</span>
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
                        {(o.address || o.mapPlusCode || o.mapLocality) && (
                          <div className="flex gap-2 items-start">
                            <span className="text-gray-400 w-24 shrink-0">Adresa</span>
                            <span className="text-gray-600 break-words flex-1">
                              {(o.mapLocality || o.address) && (
                                <span className="font-semibold text-secondary block">
                                  {o.mapLocality ?? extractAddrLocality(o.address!)}
                                </span>
                              )}
                              {o.address && <span className="block text-gray-500 text-xs">{o.address}</span>}
                              {o.mapPlusCode && (
                                <span className="flex items-center gap-1 mt-0.5">
                                  <span className="text-gray-400 text-[10px] font-mono">{o.mapPlusCode}</span>
                                  <button onClick={e => { e.stopPropagation(); const txt = `${o.mapPlusCode}${o.mapLocality ? " " + o.mapLocality : ""}`; navigator.clipboard?.writeText(txt); setCopiedPlusCode(o.id); setTimeout(() => setCopiedPlusCode(null), 1500); }}
                                    className="text-gray-300 hover:text-blue-500 transition-colors" title="Kopírovať Plus Code">
                                    {copiedPlusCode === o.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </span>
                              )}
                            </span>
                            {(o.mapPlusCode || o.address || o.mapLocality) && (
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
                        {/* Editovateľná poznámka — klik = textarea, blur/Enter = uloží + história */}
                        <div className="flex gap-2 pt-1 items-start" onClick={e => e.stopPropagation()}>
                          <span className="text-gray-400 w-24 shrink-0 pt-1 text-xs">Poznámka</span>
                          {noteEditId === o.id ? (
                            <textarea
                              autoFocus
                              rows={2}
                              value={noteEditVal}
                              onChange={e => setNoteEditVal(e.target.value)}
                              onBlur={() => {
                                const trimmed = noteEditVal.trim();
                                if (trimmed !== (o.note ?? "")) addNoteHistory(o.id, trimmed);
                                setNoteEditId(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === "Escape") { setNoteEditId(null); e.stopPropagation(); }
                                if (e.key === "Enter" && !e.shiftKey) {
                                  const trimmed = noteEditVal.trim();
                                  if (trimmed !== (o.note ?? "")) addNoteHistory(o.id, trimmed);
                                  setNoteEditId(null);
                                  e.preventDefault();
                                }
                              }}
                              className="flex-1 text-xs text-gray-700 border border-secondary/30 rounded px-2 py-1 resize-none focus:outline-none focus:border-secondary bg-white"
                            />
                          ) : (
                            <button
                              onClick={() => { setNoteEditId(o.id); setNoteEditVal(o.note ?? ""); }}
                              className="flex-1 text-left text-xs text-gray-600 italic hover:bg-gray-50 rounded px-1 -mx-1 py-1 transition-colors cursor-text min-h-[24px]">
                              {o.note || <span className="text-gray-300 not-italic">+ Pridať poznámku…</span>}
                            </button>
                          )}
                        </div>
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
                            <div className="ml-auto flex items-center gap-1.5">
                              <button onClick={e => { e.stopPropagation(); exportOrderPDF(o, "a5"); }}
                                title="Kompaktný A5 doklad — na hotovostné betonáže (páruje s ručným čerpacím listkom)"
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-secondary border border-secondary/30 rounded-sm hover:bg-secondary hover:text-white transition-all">
                                <FileText className="w-3 h-3" />
                                A5
                              </button>
                              <button onClick={e => { e.stopPropagation(); exportOrderPDF(o, "a4"); }}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-secondary border border-secondary/30 rounded-sm hover:bg-secondary hover:text-white transition-all">
                                <FileText className="w-3 h-3" />
                                <span className="hidden sm:inline">PDF</span> A4
                              </button>
                            </div>
                          </div>
                          <div className="px-4 py-3">
                            {parsed ? (
                              <div className="space-y-2">
                                {parsed.s.map((sec, si) => {
                                  const hNamePart = sec.h.includes(" – ") ? sec.h.split(" – ").slice(1).join(" – ") : "";
                                  const hFixed = hNamePart && !allCategories.some(c => c.name === hNamePart)
                                    ? sec.h.replace(hNamePart, allCategories.find(c => c.types.some(t => t.label === hNamePart))?.name ?? hNamePart)
                                    : sec.h;
                                  return (
                                  <div key={si}>
                                    <div className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 mb-1 rounded-sm",
                                      sec.h.startsWith("Pridaná") || sec.h.startsWith("Produkty") ? "bg-primary/20 text-secondary" : "bg-gray-100 text-gray-500 ml-2")}>
                                      {hFixed}
                                    </div>
                                    {sec.rows.map((row, ri) => {
                                      const isRiskRow = row.l?.includes("Minusové pretaženie");
                                      const isPretazenieRow = !isRiskRow && row.l?.startsWith("★ Pretaženie");
                                      const isAddToMainRow = row.l?.startsWith("↑") && row.v === 0;
                                      const isHlavnaTransport = row.l?.startsWith("HLAVNÁ ");
                                      if (isAddToMainRow) return (
                                        <div key={ri} className="flex items-center gap-1.5 text-xs py-0.5 pl-3 text-blue-600 bg-blue-50 rounded-sm">
                                          <span className="shrink-0 inline-flex items-center bg-blue-700 text-white text-[9px] font-black px-1 py-px rounded-sm">HLAVNÁ</span>
                                          <span>{row.l.replace("HLAVNÁ – ", "").replace("↑ ", "↑ ")}</span>
                                        </div>
                                      );
                                      return (
                                        <div key={ri} className={cn(
                                          "flex justify-between items-baseline text-xs gap-4 py-0.5 rounded-sm",
                                          sec.h.startsWith("Pridaná") || sec.h.startsWith("Produkty") ? "pl-1" : "pl-4",
                                          isRiskRow ? "bg-red-50 px-2 py-1 rounded-sm" : isPretazenieRow ? "bg-amber-50 px-2 py-1 rounded-sm" : ""
                                        )}>
                                          <span className={isRiskRow ? "text-red-600 font-semibold" : isPretazenieRow ? "text-amber-700 font-semibold" : "text-gray-500"}>
                                            {isHlavnaTransport ? (
                                              <><span className="inline-flex items-center bg-blue-700 text-white text-[9px] font-black px-1 py-px rounded-sm mr-1">HLAVNÁ</span>{row.l.slice(7)}</>
                                            ) : row.l}
                                          </span>
                                          <span className="shrink-0 text-right">
                                            {row.o !== undefined && <span className="line-through text-gray-300 text-[10px] mr-1">{fmtEur(row.o)}</span>}
                                            <span className={cn("font-bold", isRiskRow ? "text-red-600" : isPretazenieRow ? "text-amber-700" : row.o !== undefined ? "text-primary" : "text-gray-700")}>{fmtEur(row.v)}</span>
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  );
                                })}
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
                              {o.paidAmount !== undefined && o.status === "vyplatena" && (() => {
                                const diff = o.paidAmount - o.totalSDph;
                                const isNeg = Math.abs(diff) > 0.01 && diff < 0;
                                const isPos = Math.abs(diff) > 0.01 && diff > 0;
                                const depUsed = o.depositUsed !== undefined && o.depositUsed > 0 ? o.depositUsed : undefined;
                                const isPartialDep = depUsed !== undefined && o.paidAmount - depUsed > 0.01;
                                return (
                                  <>
                                    <div className={`flex justify-between items-center rounded-sm px-3 py-2 mt-1.5 border ${isNeg ? "bg-red-50 border-red-200" : "bg-teal-50 border-teal-200"}`}>
                                      <div>
                                        <div className={`text-xs font-bold ${isNeg ? "text-red-700" : "text-teal-700"}`}>Vyplatená suma</div>
                                        {Math.abs(diff) > 0.01 && (
                                          <div className={`text-[10px] font-bold ${isNeg ? "text-red-600" : "text-teal-500"}`}>
                                            {isPos ? `+${diff.toFixed(2)} € tringelt` : `${diff.toFixed(2)} € rozdiel`}
                                          </div>
                                        )}
                                      </div>
                                      <span className={`text-lg font-black ${isNeg ? "text-red-700" : "text-teal-700"}`}>{fmtEur(o.paidAmount)}</span>
                                    </div>
                                    {depUsed !== undefined && (
                                      <div className={`rounded-md mt-1.5 border overflow-hidden ${isPartialDep ? "border-orange-300" : "border-amber-200"}`}>
                                        {/* Záloha riadok */}
                                        <div className={`flex justify-between items-center px-3 py-2 ${isPartialDep ? "bg-orange-50" : "bg-amber-50"}`}>
                                          <span className={`text-xs font-bold flex items-center gap-1.5 ${isPartialDep ? "text-orange-700" : "text-amber-700"}`}>
                                            💰 Záloha klienta
                                          </span>
                                          <span className={`font-black tabular-nums text-sm ${isPartialDep ? "text-orange-700" : "text-amber-700"}`}>
                                            −{depUsed.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                          </span>
                                        </div>
                                        {isPartialDep && (() => {
                                          const doplatokVal = o.paidAmount - depUsed;
                                          return (
                                            <>
                                              {/* Call-to-action banner */}
                                              <div className="bg-orange-500 px-3 py-2.5 flex items-center gap-2.5">
                                                <svg className="w-4 h-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
                                                </svg>
                                                <div className="flex-1 min-w-0">
                                                  <div className="text-white font-black text-xs tracking-wide uppercase leading-tight">Klient musí doplatiť</div>
                                                  <div className="text-white/80 text-[10px] font-semibold">na mieste alebo doplniť zálohu</div>
                                                </div>
                                                <span className="text-white font-black text-lg tabular-nums shrink-0 leading-tight">
                                                  {doplatokVal.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                                </span>
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            {/* ── Unified timeline: História zmien + záloha transakcie ── */}
                            {(() => {
                              const hist = o.statusHistory ?? [];
                              const STATUS_LABELS: Record<string, string> = {
                                nova: "Nová", potvrdena: "Potvrdená", odoslana: "Odoslaná",
                                vyuctovana: "Vyúčtovaná", vyplatena: "Vyplatená", zrusena: "Zrušená", vybavena: "Vybavená",
                              };
                              const STATUS_DOT: Record<string, string> = {
                                nova: "bg-blue-400", potvrdena: "bg-yellow-400", odoslana: "bg-green-500",
                                vyuctovana: "bg-purple-500", vyplatena: "bg-teal-500", zrusena: "bg-red-400", vybavena: "bg-gray-400",
                              };
                              const fmtTs = (iso: string) => {
                                const d = new Date(iso);
                                const lDay = (off=0) => { const x=new Date(); x.setDate(x.getDate()+off); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; };
                                const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                                const t = d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bratislava" });
                                if (dStr === lDay(0))  return `Dnes ${t}`;
                                if (dStr === lDay(-1)) return `Včera ${t}`;
                                return `${d.toLocaleDateString("sk-SK", { day:"numeric", month:"numeric", timeZone:"Europe/Bratislava" })} ${t}`;
                              };

                              // Záloha transakcie viazané na túto objednávku
                              const ocForTimeline = o.clientId
                                ? clientMap.get(String(o.clientId))
                                : undefined;
                              const depTxForOrder = (ocForTimeline?.deposit?.transactions ?? []).filter(tx => tx.orderId === o.id);

                              // Unified timeline — spojiť + zoradiť chronologicky
                              type TLEntry =
                                | { kind: "created"; ts: string }
                                | { kind: "status"; ts: string; h: typeof hist[0] }
                                | { kind: "deposit"; ts: string; tx: typeof depTxForOrder[0] };
                              const entries: TLEntry[] = [
                                { kind: "created" as const, ts: o.createdAt },
                                ...hist.map(h => ({ kind: "status" as const, ts: h.changedAt, h })),
                                ...depTxForOrder.map(tx => ({ kind: "deposit" as const, ts: tx.createdAt, tx })),
                              ].sort((a, b) => a.ts.localeCompare(b.ts));

                              const hasDepTx = depTxForOrder.length > 0;

                              return (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">História</span>
                                    {hasDepTx && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                                        💰 záloha
                                      </span>
                                    )}
                                    <div className="flex-1" />
                                    {onGoToHistoria && (
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          onGoToHistoria(o.clientId
                                            ? { sub: "cashflow", clientId: o.clientId, dateFilter: "vsetko", orderId: o.id }
                                            : { sub: "cashflow", date: o.createdAt.slice(0, 10), dateFilter: "vsetko", orderId: o.id });
                                        }}
                                        className="text-[9px] font-bold text-secondary hover:text-primary underline underline-offset-2 transition-colors flex items-center gap-0.5 shrink-0"
                                      >
                                        <BarChart2 className="w-3 h-3" /> → História objednávky
                                      </button>
                                    )}
                                  </div>
                                  {entries.map((entry, ei) => {
                                    // KTO chip — zariadenie ikona + meno + typ
                                    const KtoChip = ({ label, amber }: { label: string; amber?: boolean }) => {
                                      const l = label.toLowerCase();
                                      const DevIcon = /iphone|ipad|android|mobil|phone|tablet/.test(l) ? Smartphone
                                                    : /mac|macbook|laptop|notebook|ntb/.test(l) ? Laptop
                                                    : Monitor;
                                      const DEVICE_RE = /\b(iphone|ipad|android|mac|macbook|laptop|notebook|ntb|windows|linux|chrome|firefox|safari|edge|opera|monitor|pc|imac|zariadenie|tablet|phone)\b/gi;
                                      const withoutHash = label.replace(/\s*·\s*#[a-f0-9]{1,8}/gi, "").trim();
                                      const deviceWords = (withoutHash.match(DEVICE_RE) ?? []).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
                                      const person = withoutHash.replace(DEVICE_RE, "").replace(/\s+/g, " ").trim();
                                      const deviceType = deviceWords.join(" ");
                                      return (
                                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${amber ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`} title={label}>
                                          <DevIcon className="w-3 h-3 shrink-0 opacity-60" />
                                          {person && <span className="font-bold">{person}</span>}
                                          {deviceType && <span className="opacity-60">{deviceType}</span>}
                                          {!person && !deviceType && label}
                                        </span>
                                      );
                                    };
                                    if (entry.kind === "created") return (
                                      <div key="created" className="flex items-center gap-2 text-xs py-1">
                                        <span className="text-gray-400 tabular-nums text-[10px] shrink-0 w-24">{fmtTs(entry.ts)}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                                        <span className="flex-1 text-gray-400 italic">Vytvorená</span>
                                        {o.createdByDevice && <KtoChip label={o.createdByDevice} />}
                                      </div>
                                    );
                                    if (entry.kind === "status") {
                                      const h = entry.h;
                                      // Poznámka (type:"note") — iný vizuál ako status zmena
                                      if (h.type === "note") return (
                                        <div key={`s-${ei}`} className="flex items-start gap-2 text-xs py-1 border-t border-gray-50 bg-gray-50/60">
                                          <span className="text-gray-400 tabular-nums text-[10px] shrink-0 w-24 mt-0.5">{fmtTs(entry.ts)}</span>
                                          <MessageSquare className="w-2.5 h-2.5 text-gray-400 shrink-0 mt-1" />
                                          <span className="flex-1 text-gray-500 italic text-[11px] min-w-0 break-words">{h.note || "—"}</span>
                                          <KtoChip label={h.changedBy} />
                                        </div>
                                      );
                                      return (
                                        <div key={`s-${ei}`} className="flex items-start gap-2 text-xs py-1 border-t border-gray-50">
                                          <span className="text-gray-500 tabular-nums text-[10px] shrink-0 w-24 mt-0.5">{fmtTs(entry.ts)}</span>
                                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${STATUS_DOT[h.status] ?? "bg-gray-300"}`} />
                                          <span className="flex-1 text-gray-600 min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                            {h.prevStatus && <span className="text-gray-400 text-[10px] whitespace-nowrap">{STATUS_LABELS[h.prevStatus] ?? h.prevStatus} →</span>}
                                            <span className="font-semibold whitespace-nowrap">{STATUS_LABELS[h.status] ?? h.status}</span>
                                            {h.paidAmount !== undefined && (
                                              <span className="text-[10px] font-bold text-teal-600 whitespace-nowrap">{h.paidAmount.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                                            )}
                                          </span>
                                          <KtoChip label={h.changedBy} />
                                        </div>
                                      );
                                    }
                                    if (entry.kind === "deposit") {
                                      const tx = entry.tx;
                                      const isReversal = tx.note?.startsWith("Vrátenie zálohy");
                                      return (
                                        <div key={`d-${ei}`} className="flex items-start gap-2 text-xs py-1.5 border-t border-amber-50 bg-amber-50/60 -mx-1 px-1 rounded-sm">
                                          <span className="text-amber-500 tabular-nums text-[10px] shrink-0 w-24 mt-0.5">{fmtTs(entry.ts)}</span>
                                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400 mt-1" />
                                          <span className="flex-1 text-amber-700 font-semibold text-[11px] min-w-0">
                                            <span className="block">
                                              {isReversal ? "↩ Vrátenie zálohy" : tx.type === "payment" ? "💰 Odpočet zo zálohy" : "💰 Záloha/dobíjanie"}
                                              <span className={`ml-1.5 font-black tabular-nums ${tx.amount < 0 ? "text-red-500" : "text-teal-600"}`}>
                                                {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                              </span>
                                            </span>
                                            {tx.note && !isReversal && (
                                              <span className="block text-[9px] text-amber-500 font-normal leading-tight mt-0.5">{tx.note}</span>
                                            )}
                                          </span>
                                          {tx.createdBy && <KtoChip label={tx.createdBy} amber />}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                  {hist.length === 0 && depTxForOrder.length === 0 && (
                                    <div className="text-[10px] text-gray-400 italic">Bez záznamu — zmeny sa budú zaznamenávať od teraz</div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* ── Action strip ── */}
                            {!readOnly && (
                              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100">
                                {/* Priestor pre budúce akcie: Upraviť, Čerpací listok */}
                                <div className="flex-1" />
                                {deleteConfirmId === o.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-red-500 font-semibold">Naozaj zmazať?</span>
                                    <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                      className="px-2.5 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">Nie</button>
                                    <button onClick={e => { e.stopPropagation(); remove(o.id); }}
                                      className="px-2.5 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-semibold">Zmazať</button>
                                  </div>
                                ) : (
                                  <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(o.id); }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" /> Zmazať
                                  </button>
                                )}
                              </div>
                            )}
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
        <div className="bg-white border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm text-gray-400 text-center sm:text-left">
            Strana {ordersPage + 1} z {totalPages} · {sortedCount} {sortedCountLabel}
          </span>
          <div className="flex items-center justify-center gap-1.5">
            <button onClick={() => setOrdersPage(0)} disabled={ordersPage === 0}
              className="h-11 min-w-[44px] px-2 flex items-center justify-center text-base font-bold text-gray-500 hover:text-secondary hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">«</button>
            <button onClick={() => setOrdersPage(p => Math.max(0, p - 1))} disabled={ordersPage === 0}
              className="h-11 min-w-[44px] px-2 flex items-center justify-center text-base font-bold text-gray-500 hover:text-secondary hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - ordersPage) <= 1)
              .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                if (idx > 0 && (arr[idx - 1] as number) < i - 1) acc.push("…");
                acc.push(i);
                return acc;
              }, [])
              .map((item, idx) => item === "…"
                ? <span key={`e${idx}`} className="h-11 min-w-[44px] flex items-center justify-center text-sm text-gray-300">…</span>
                : <button key={item} onClick={() => setOrdersPage(item as number)}
                    className={`h-11 min-w-[44px] px-2 flex items-center justify-center text-sm font-bold rounded-lg transition-colors cursor-pointer ${ordersPage === item ? "bg-secondary text-white" : "text-gray-500 hover:text-secondary hover:bg-gray-100"}`}>
                    {(item as number) + 1}
                  </button>
              )}
            <button onClick={() => setOrdersPage(p => Math.min(totalPages - 1, p + 1))} disabled={ordersPage === totalPages - 1}
              className="h-11 min-w-[44px] px-2 flex items-center justify-center text-base font-bold text-gray-500 hover:text-secondary hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">›</button>
            <button onClick={() => setOrdersPage(totalPages - 1)} disabled={ordersPage === totalPages - 1}
              className="h-11 min-w-[44px] px-2 flex items-center justify-center text-base font-bold text-gray-500 hover:text-secondary hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">»</button>
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
                      <span className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-white/40 text-[10px] font-mono shrink-0">{mapModalOrder.mapPlusCode}</span>
                        {mapModalOrder.mapLocality && <span className="text-white font-bold text-xs truncate">· {mapModalOrder.mapLocality}</span>}
                      </span>
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

      {/* ── Deposit reversal confirmation modal ── */}
      {depositReversal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setDepositReversal(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <div className="font-black text-secondary text-sm mb-3">Vrátiť zálohu klientovi?</div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <div className="text-sm text-gray-800">
                Záloha <span className="font-black text-amber-700">{depositReversal.depositUsed.toFixed(2)} €</span> bola odpočítaná pri platbe.
              </div>
              <div className="mt-1.5 text-xs text-gray-500">
                Zmenou stavu môžete zálohu vrátiť späť na zostatok klienta.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { updateStatus(depositReversal.orderId, depositReversal.newStatus); setDepositReversal(null); }}
                className="flex-1 px-3 py-2.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Nechať zálohu
              </button>
              <button
                onClick={() => handleDepositReversal(depositReversal.orderId, depositReversal.depositUsed, depositReversal.clientLoginId, depositReversal.newStatus)}
                className="flex-1 px-3 py-2.5 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors cursor-pointer"
              >
                Vrátiť {depositReversal.depositUsed.toFixed(2)} €
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Client photo lightbox ── */}
      {clientPhotoModal && (() => {
        const idx = clientsWithPhoto.findIndex(x => x.client.id === clientPhotoModal);
        const cur = idx >= 0 ? clientsWithPhoto[idx] : null;
        if (!cur) return null;
        const c = cur.client;
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || c.loginId || "Klient";
        const hasPrev = idx > 0;
        const hasNext = idx < clientsWithPhoto.length - 1;
        return (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setClientPhotoModal(null)}>
            <div className="relative flex flex-col items-center gap-3 max-w-sm w-full"
              onClick={e => e.stopPropagation()}>
              {/* X */}
              <button onClick={() => setClientPhotoModal(null)}
                className="absolute top-0 right-0 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors cursor-pointer z-10">
                <X className="w-5 h-5 text-white" />
              </button>
              {/* Photo */}
              <img src={c.photo!} className="w-56 h-56 rounded-full object-cover object-top shadow-2xl ring-4 ring-primary/60" alt={name} />
              {/* Name + login */}
              <div className="text-center">
                <div className="font-black text-white text-lg leading-snug">{name}</div>
                {c.loginId && <div className="text-white/50 text-xs font-mono mt-0.5">#{c.loginId}</div>}
              </div>
              {/* Prev / Next */}
              {clientsWithPhoto.length > 1 && (
                <div className="flex items-center gap-4 mt-1">
                  <button onClick={() => setClientPhotoModal(clientsWithPhoto[idx - 1].client.id)}
                    disabled={!hasPrev}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${hasPrev ? "bg-white/20 hover:bg-white/40 text-white" : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white/40 text-xs tabular-nums">{idx + 1} / {clientsWithPhoto.length}</span>
                  <button onClick={() => setClientPhotoModal(clientsWithPhoto[idx + 1].client.id)}
                    disabled={!hasNext}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${hasNext ? "bg-white/20 hover:bg-white/40 text-white" : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
