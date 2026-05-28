import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, ShoppingCart, MessageSquare, MapPin, Navigation, Copy, Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2, AlertTriangle, FileText, Calculator, Users } from "lucide-react";
import { adminData, adminApi, Order, TransportSettings } from "@/lib/adminData";
import { cn, formatPhone } from "@/lib/utils";

const ORDER_STATUSES: { key: Order["status"]; label: string; color: string }[] = [
  { key: "nova",        label: "Nová",        color: "bg-blue-100 text-blue-700" },
  { key: "potvrdena",   label: "Potvrdená",   color: "bg-yellow-100 text-yellow-700" },
  { key: "odoslana",    label: "Odoslaná FA", color: "bg-green-100 text-green-700" },
  { key: "vyuctovana",  label: "Vyúčtovaná",  color: "bg-purple-100 text-purple-700" },
  { key: "vyplatena",   label: "Vyplatená",   color: "bg-teal-100 text-teal-700" },
  { key: "zrusena",     label: "Zrušená",     color: "bg-red-100 text-red-500" },
];

function OrderStatusBadge({ status, onChange, orderTotal }: {
  status: Order["status"];
  onChange: (s: Order["status"], paidAmount?: number) => void;
  orderTotal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const [payModal, setPayModal] = useState(false);
  const [payInput, setPayInput] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const cur = ORDER_STATUSES.find(s => s.key === status) ?? ORDER_STATUSES.find(s => s.key === "odoslana")!;

  const openDrop = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 2, left: r.left });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const openPayModal = () => {
    setPayInput(orderTotal !== undefined ? orderTotal.toFixed(2) : "");
    setPayModal(true);
    setOpen(false);
  };
  const confirmPay = () => {
    const amt = parseFloat(payInput.replace(",", "."));
    onChange("vyplatena", isNaN(amt) ? undefined : amt);
    setPayModal(false);
  };

  return (
    <>
      <div className="relative">
        <button ref={btnRef} onClick={e => { e.stopPropagation(); openDrop(); }} className={`px-2 py-1 text-xs font-bold rounded-sm cursor-pointer ${cur.color}`}>{cur.label} ▾</button>
        {open && createPortal(
          <div className="fixed z-[500] bg-white border border-gray-200 shadow-lg rounded-sm min-w-[110px]" style={{ top: dropPos.top, left: dropPos.left }} onClick={e => e.stopPropagation()}>
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
                <div className="text-xs text-gray-400">Uprav ak klient dal viac (tringelt)</div>
              </div>
            </div>
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
            <div className="flex gap-2">
              <button onClick={() => setPayModal(false)}
                className="flex-1 px-3 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                Zrušiť
              </button>
              <button onClick={confirmPay}
                className="flex-1 px-3 py-2 text-xs font-black text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors cursor-pointer">
                Potvrdiť
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

function exportOrderPDF(o: Order) {
  const tabLabels: Record<string, string> = { pumpa: "Pumpa", mix: "Domiešavač", vlastnadoprava: "Vlastná doprava" };
  const statusLabels: Record<string, string> = { nova: "Nová", potvrdena: "Potvrdená", odoslana: "Odoslaná FA", vyuctovana: "Vyúčtovaná", vyplatena: "Vyplatená", zrusena: "Zrušená" };
  const today = new Date(o.createdAt).toLocaleDateString("sk-SK");
  const fmtEurPdf = (n: number | undefined) => n !== undefined ? n.toFixed(2) + " €" : "";

  let parsed: { v: number; s: { h: string; rows: { l: string; v: number; o?: number; u?: number; uOrig?: number; uSuffix?: string }[] }[] } | null = null;
  try { if (o.breakdown?.startsWith("{")) parsed = JSON.parse(o.breakdown); } catch { /* */ }

  const fmtRate = (n: number, suffix?: string) => n.toFixed(2) + " " + (suffix ?? "€");
  const pdfCats = adminData.getCategories();
  const fixSecH = (h: string) => {
    const np = h.includes(" – ") ? h.split(" – ").slice(1).join(" – ") : "";
    if (!np || pdfCats.some(c => c.name === np)) return h;
    const cat = pdfCats.find(c => c.types.some(t => t.label === np));
    return cat ? h.replace(np, cat.name) : h;
  };
  let pdfRowIdx = 0;
  const breakdownHtml = parsed ? parsed.s.map(sec => {
    const secH = fixSecH(sec.h);
    const isMain = secH.startsWith("Pridaná") || secH.startsWith("Produkty");
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
      const orig = row.o !== undefined ? `<span style="text-decoration:line-through;color:#aaa;font-size:7.5pt">${fmtEurPdf(row.o)}</span> ` : "";
      const unitCell = row.u !== undefined
        ? (row.uOrig !== undefined
          ? `<span style="text-decoration:line-through;color:#aaa;font-size:7.5pt">${fmtRate(row.uOrig, row.uSuffix)}</span><br><span style="font-weight:bold">${fmtRate(row.u, row.uSuffix)}</span>`
          : fmtRate(row.u, row.uSuffix))
        : "—";
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

  const html = `<!DOCTYPE html><html lang="sk"><head>
<meta charset="utf-8">
<title>Objednávka – ${o.clientName || "klient"}</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #222; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:4mm;border-bottom:2px solid #EDC531;margin-bottom:5mm">
  <div>
    <div style="font-size:14pt;font-weight:bold;color:#001D3D">MS-BETON, spol. s r.o.</div>
    <div style="font-size:7.5pt;color:#555;margin-top:2px">Turie 468, 013 12 Turie &nbsp;|&nbsp; IČO: 55747591 &nbsp;|&nbsp; IČ DPH: SK2122074603</div>
    <div style="font-size:7.5pt;color:#777;margin-top:1px">+421 944 069 305 &nbsp;|&nbsp; peter@msbeton.sk &nbsp;|&nbsp; msbeton.sk</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:13pt;font-weight:bold;color:#EDC531;letter-spacing:0.5px">OBJEDNÁVKA</div>
    <div style="font-size:8pt;color:#777;margin-top:2px">${today}</div>
    <div style="font-size:7.5pt;color:#aaa;margin-top:1px">Stav: ${statusLabels[o.status] ?? o.status}</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-bottom:5mm">
  <div style="border:1px solid #eee;padding:4mm;border-radius:2px">
    <div style="font-size:8pt;font-weight:bold;color:#001D3D;border-bottom:1px solid #eee;padding-bottom:2mm;margin-bottom:3mm">KLIENT</div>
    <div style="font-size:8.5pt;font-weight:bold;color:#111;margin-bottom:2px">${o.clientName || "—"}</div>
    ${o.company ? `<div style="font-size:8pt;color:#555">${o.company}</div>` : ""}
    ${o.phone ? `<div style="font-size:8pt;color:#555;margin-top:2px">${o.phone}</div>` : ""}
    ${o.email ? `<div style="font-size:8pt;color:#777">${o.email}</div>` : ""}
    ${discountInfo ? `<div style="font-size:7.5pt;color:#b45309;margin-top:4px;font-weight:bold">Zľavy: ${discountInfo}</div>` : ""}
  </div>
  <div style="border:1px solid #eee;padding:4mm;border-radius:2px">
    <div style="font-size:8pt;font-weight:bold;color:#001D3D;border-bottom:1px solid #eee;padding-bottom:2mm;margin-bottom:3mm">DORUČENIE</div>
    <table style="font-size:8.5pt"><tbody>
      <tr><td style="color:#888;padding:1px 6px 1px 0;width:90px">Typ</td><td style="font-weight:bold">${tabLabels[o.tab] ?? o.tab}</td></tr>
      <tr><td style="color:#888;padding:1px 6px 1px 0">Množstvo</td><td style="font-weight:bold">${o.totalQty} m³${(o.fillupM3 ?? 0) > 0 ? ` <span style="color:#92400e;font-size:8pt;font-weight:normal">+ ${o.fillupM3} m³ doťaženie</span>` : ""}</td></tr>
      ${(o.fillupM3 ?? 0) > 0 ? `<tr><td style="color:#888;padding:1px 6px 1px 0;vertical-align:top">Doťaženie</td><td style="color:#92400e;font-size:8.5pt">${o.totalQty}&nbsp;m³ → +${o.fillupM3}&nbsp;m³ → <strong>${o.fillupTarget}&nbsp;m³/auto</strong></td></tr>` : ""}
      ${o.podmienky ? `<tr><td style="color:#888;padding:1px 6px 1px 0;vertical-align:top">Podmienky</td><td style="${o.podmienky.isRisk ? "color:#991b1b" : "color:#92400e"};font-size:8pt;font-weight:600">${o.podmienky.isRisk ? "⚠ Minusové pretaženie" : "★ Pretaženie"}: ${o.podmienky.pumpa > 0 ? `1× Pumpa + ${o.podmienky.mix}× Mix` : `${o.podmienky.trucks}× Mix`} · ∅ ${o.podmienky.m3PerTruck?.toFixed(1) ?? "—"} m³/vozidlo</td></tr>` : ""}
      ${o.km ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Vzdialenosť</td><td>${o.km} km</td></tr>` : ""}
      ${(o.address || o.mapPlusCode) ? `<tr><td style="color:#888;padding:1px 6px 1px 0;vertical-align:top">Adresa</td><td>${o.address ? o.address : ""}${o.mapPlusCode ? `<br><span style="font-family:monospace;font-size:7.5pt;color:#aaa">${o.mapPlusCode}${o.mapLocality ? " · " + o.mapLocality : ""}</span>` : ""}</td></tr>` : ""}
      ${o.deliveryZoneName ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Zóna</td><td>${o.deliveryZoneName}</td></tr>` : ""}
      <tr><td style="color:#888;padding:1px 6px 1px 0">Platba</td><td style="font-weight:bold">${o.priceMode === "hotovost" ? "Hotovosť" : "Faktúra"}</td></tr>
      ${o.viaSms ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Zdroj</td><td>SMS</td></tr>` : ""}
    </tbody></table>
    ${o.note ? `<div style="font-size:8pt;color:#555;margin-top:4px;font-style:italic">Poznámka: ${o.note}</div>` : ""}
  </div>
</div>

${breakdownHtml ? `
<div style="margin-bottom:5mm">
  <div style="font-size:9.5pt;font-weight:bold;color:#001D3D;border-bottom:2px solid #EDC531;padding-bottom:2px;margin-bottom:4px">KALKULÁCIA</div>
  <table><thead><tr style="background:#001D3D;color:#fff;font-size:8pt"><th style="padding:4px 8px;width:22px;text-align:center;font-weight:bold">#</th><th style="padding:4px 8px;text-align:left;font-weight:bold">Popis</th><th style="padding:4px 8px;text-align:right;font-weight:bold">Množstvo</th><th style="padding:4px 8px;text-align:right;font-weight:bold">Jedn.&nbsp;cena</th><th style="padding:4px 8px;text-align:right;font-weight:bold">Spolu</th></tr></thead><tbody>${breakdownHtml}</tbody></table>
</div>` : ""}

<div style="background:#001D3D;color:#fff;padding:4mm;border-radius:2px;display:flex;justify-content:space-between;align-items:center">
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
    </div>` : ""}
  </div>
</div>

<div style="margin-top:10mm;display:grid;grid-template-columns:1fr 1fr;gap:10mm">
  <div style="border-top:1px solid #ccc;padding-top:3mm;font-size:8pt;color:#888">Dátum a podpis zákazníka</div>
  <div style="border-top:1px solid #ccc;padding-top:3mm;font-size:8pt;color:#888">Pečiatka a podpis MS-BETON</div>
</div>

<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  if (!win) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click(); }
}

export default function ObjednavkyTab({ onGoToClient, initialSearch, initialClientId, focusOrderId }: { onGoToClient?: (loginId: string) => void; initialSearch?: string; initialClientId?: string; focusOrderId?: string }) {
  const [orders, setOrders] = useState<Order[]>(() => adminData.getOrders());
  const allCategories = useMemo(() => adminData.getCategories(), []);
  const [expanded, setExpanded] = useState<string | null>(focusOrderId ?? null);
  const [highlightedOrder, setHighlightedOrder] = useState<string | null>(focusOrderId ?? null);
  const [filterStatus, setFilterStatus] = useState<Order["status"] | "vsetky">("vsetky");
  const [filterTab, setFilterTab] = useState<Order["tab"] | "vsetky">("vsetky");
  const [filterPriceMode, setFilterPriceMode] = useState<"vsetky" | "faktura" | "hotovost">("vsetky");
  const [filterChannel, setFilterChannel] = useState<"vsetky" | "sms" | "kosarik">("vsetky");
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
  const [copiedPlusCode, setCopiedPlusCode] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ts, setTs] = useState<TransportSettings>(adminData.getTransportSettings());
  const saveTs = (data: TransportSettings) => { setTs(data); adminData.saveTransportSettings(data); };
  const [mapModalOrder, setMapModalOrder] = useState<Order | null>(null);
  const plusCodeBackfilledRef = useRef<Set<string>>(new Set());
  const [ordersPage, setOrdersPage] = useState(0);
  const ORDERS_PAGE_SIZE = 30;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const result = await adminApi.getOrders();
        if (result?.data) {
          const data = result.data as Order[];
          adminData.saveOrders(data);
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

  useEffect(() => {
    const w = window as unknown as { google?: { maps?: { Geocoder?: unknown } } };
    if (!w.google?.maps?.Geocoder) return;
    const toFill = orders.filter(o => o.mapPlusCode && !o.mapLocality && !plusCodeBackfilledRef.current.has(o.id));
    if (toFill.length === 0) return;
    toFill.forEach(o => {
      plusCodeBackfilledRef.current.add(o.id);
      new google.maps.Geocoder().geocode({ address: o.mapPlusCode!, region: "SK" }, (results, status) => {
        if (status !== "OK" || !results?.[0]) return;
        const comps = results[0].address_components ?? [];
        const loc = comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("locality"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("postal_town"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_3"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_4"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("sublocality_level_1"))?.long_name
          ?? comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("neighborhood"))?.long_name
          ?? "";
        const district = comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes("administrative_area_level_2"))?.long_name ?? "";
        const mapLocality = [loc, district].filter(Boolean).join(", ");
        if (!mapLocality) return;
        setOrders(prev => {
          const updated = prev.map(p => p.id === o.id ? { ...p, mapLocality } : p);
          adminData.saveOrders(updated);
          return updated;
        });
      });
    });
  }, [orders]);

  const save = (data: Order[]) => { setOrders(data); adminData.saveOrders(data); };
  const remove = (id: string) => { if (confirm("Vymazať objednávku?")) save(orders.filter(o => o.id !== id)); };
  const updateStatus = (id: string, status: Order["status"], paidAmount?: number) =>
    save(orders.map(o => o.id === id ? { ...o, status, ...(paidAmount !== undefined ? { paidAmount } : {}) } : o));

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
    .filter(o => filterStatus    === "vsetky" || o.status    === filterStatus)
    .filter(o => filterTab       === "vsetky" || o.tab       === filterTab)
    .filter(o => filterPriceMode === "vsetky" || o.priceMode === filterPriceMode)
    .filter(o => filterChannel   === "vsetky" || (filterChannel === "sms" ? !!o.viaSms : !o.viaSms))
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

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
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
  const activeFilters = [filterStatus !== "vsetky", filterTab !== "vsetky", filterPriceMode !== "vsetky", filterChannel !== "vsetky", !!clientIdActive, !!search, !!(dateFrom || dateTo)].filter(Boolean).length;
  const sortedCount = sorted.length;
  const sortedCountLabel = sortedCount === 1 ? "objednávka" : sortedCount >= 2 && sortedCount <= 4 ? "objednávky" : "objednávok";
  const totalPages = Math.ceil(sortedCount / ORDERS_PAGE_SIZE);
  const pagedOrders = sorted.slice(ordersPage * ORDERS_PAGE_SIZE, (ordersPage + 1) * ORDERS_PAGE_SIZE);
  useEffect(() => { setOrdersPage(0); }, [filterStatus, filterTab, filterPriceMode, filterChannel, clientIdActive, search, dateFrom, dateTo]);

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
          </div>
        )}
      </div>

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
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${filterOpen ? "rotate-180" : ""}`} />
        </button>
        {filterOpen && (
        <div className="border-t border-gray-200">
          {/* STAV */}
          <div className="border-b border-gray-200">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-1 flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Stav</span>
              {newBadge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{newBadge} nových</span>}
            </div>
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
          </div>

          {/* TYP + PLATBA + ZDROJ — 3 sekcie v jednom vizuálnom bloku */}
          <div className="border-b border-gray-200 divide-y divide-gray-100">
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
          </div>

          {/* DÁTUM */}
          <div className="border-b border-gray-200">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Dátum</span>
            </div>
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
          </div>

          {/* HĽADAJ */}
          <div>
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em]">Hľadaj</span>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-1.5">
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Meno, firma, telefón, ID, adresa..."
                className="flex-1 border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-secondary rounded-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
      {floatingOrder && (
        <div className="bg-secondary/97 border-b border-white/10 px-4 py-1 flex items-center gap-2 text-xs shadow-sm">
          <span className="text-white/30 text-[9px]">▸</span>
          <span className="font-bold text-white truncate">{floatingOrder.clientName}</span>
          {floatingOrder.company && <span className="text-white/40 truncate hidden sm:block">{floatingOrder.company}</span>}
          <span className="text-white/40 shrink-0">{floatingOrder.tab === "pumpa" ? "Pumpa" : floatingOrder.tab === "mix" ? "Mix" : "Vl."} · {floatingOrder.totalQty} m³</span>
          <span className={`ml-auto shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-sm ${floatingOrder.status === "nova" ? "bg-blue-500 text-white" : floatingOrder.status === "potvrdena" ? "bg-yellow-400 text-secondary" : "bg-green-600 text-white"}`}>{floatingOrder.status.toUpperCase()}</span>
        </div>
      )}
      </div>

      {sortedCount === 0 ? (
        <div className="bg-white border border-gray-200 px-8 py-12 text-center text-gray-400 text-sm">
          Žiadne objednávky
        </div>
      ) : (
        <div className="space-y-2">
          {pagedOrders.map(o => {
            const isExp = expanded === o.id;
            return (
              <div key={o.id} id={`order-card-${o.id}`} className={`border shadow-sm transition-all duration-700 ${highlightedOrder === o.id ? "ring-2 ring-primary shadow-primary/30 shadow-md" : ""} ${o.createdAt.slice(0,10) === todayStr ? "bg-gray-50 border-gray-300" : "bg-white border-gray-200"}`}>
                <div className={`flex gap-3 py-3.5 cursor-pointer transition-colors ${o.createdAt.slice(0,10) === todayStr ? "hover:bg-gray-100" : "hover:bg-gray-50"} ${o.status === "nova" ? "pl-3 pr-4" : "px-4"}`}
                  style={o.status === "nova" ? { borderLeft: "4px solid #3b82f6" } : undefined}
                  onClick={() => {
                    const next = isExp ? null : o.id;
                    setExpanded(next);
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
                      <span className="font-bold text-secondary text-base leading-tight">{o.clientName}</span>
                      {o.company && <span className="text-sm text-gray-500 truncate max-w-[120px]">{o.company}</span>}
                    </div>
                    {(() => {
                      const cat = o.concreteCategory ?? allCategories.find(c => c.types.some(t => t.label === o.concreteType))?.name;
                      return cat ? <div className="text-[10px] font-black uppercase tracking-wider text-gray-900">{cat}</div> : null;
                    })()}
                    <div className="flex items-center gap-1.5 flex-wrap text-sm">
                      <span className="font-medium text-gray-600">{o.concreteType.replace(/ – [\d.,]+ €.*/, "")}</span>
                      <span className="font-bold text-secondary">{o.totalQty} m³</span>
                      {o.km ? <span className="text-gray-400">{o.km} km</span> : null}
                      {(o.address || o.mapPlusCode) ? (
                        <button onClick={e => { e.stopPropagation(); setMapModalOrder(o); }}
                          className="inline-flex items-center gap-1 text-primary/50 hover:text-primary transition-colors" title="Zobraziť na mape">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {o.address && <span className="text-gray-600">{o.address}</span>}
                          {!o.address && o.mapLocality && <span className="text-gray-600">{o.mapLocality.split(",")[0]}</span>}
                          {o.mapPlusCode && <span className="text-gray-400 font-mono text-[10px]">{o.mapPlusCode}</span>}
                        </button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold ${o.createdAt.slice(0,10) === todayStr ? "bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-sm" : o.createdAt.slice(0,10) === yesterdayStr ? "text-blue-500" : "text-gray-400 font-normal"}`}>{fmtDate(o.createdAt)}</span>
                      {o.viaSms
                        ? <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm"><MessageSquare className="w-2.5 h-2.5" /> SMS</span>
                        : <span className="inline-flex items-center bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-sm"><ShoppingCart className="w-3 h-3" /></span>}
                      {o.podmienky ? (() => { const ir = getOrderIsRisk(o); return (
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-sm ${ir ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-800"}`}>
                          {ir ? <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> : <span>★</span>}
                          {o.podmienky.pumpa > 0 ? `1×P+${o.podmienky.mix}×M` : `${o.podmienky.trucks}×Mix`}
                        </span>
                      ); })() : null}
                      {(o.discountBeton || o.discountDoprava || o.discountSluzby || o.discountCelkovo) ? (
                        o.discountCelkovo ? (
                          <span className="bg-primary text-secondary text-[9px] font-black px-1.5 py-0.5 rounded-sm">−{o.discountCelkovo}%</span>
                        ) : (<>
                          {o.discountBeton   ? <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">B−{o.discountBeton}%</span>   : null}
                          {o.discountDoprava ? <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">D−{o.discountDoprava}%</span> : null}
                          {o.discountSluzby  ? <span className="bg-primary/20 text-secondary text-[9px] font-black px-1 py-0.5 rounded-sm">S−{o.discountSluzby}%</span>  : null}
                        </>)
                      ) : null}
                    </div>
                  </div>
                  {/* Right */}
                  <div className="flex flex-col items-end justify-between shrink-0 gap-1.5" onClick={e => e.stopPropagation()}>
                    <div className="text-right">
                      <div className="font-black text-secondary text-base tabular-nums leading-tight">{fmtEur(o.totalSDph)}</div>
                      {o.status === "vyplatena" && o.paidAmount !== undefined && Math.abs(o.paidAmount - o.totalSDph) > 0.01 && (
                        <div className={`text-[10px] tabular-nums font-semibold leading-tight mt-0.5 ${o.paidAmount >= o.totalSDph ? "text-teal-600" : "text-red-600"}`}>
                          {fmtEur(o.paidAmount)} <span className={`font-bold ${o.paidAmount > o.totalSDph ? "text-teal-500" : "text-red-500"}`}>{o.paidAmount > o.totalSDph ? `+${fmtEur(o.paidAmount - o.totalSDph)}` : fmtEur(o.paidAmount - o.totalSDph)}</span>
                        </div>
                      )}
                      <div className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm mt-0.5 inline-block",
                        o.priceMode === "hotovost" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {o.priceMode === "hotovost" ? "HOT." : "FA"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <OrderStatusBadge status={o.status} orderTotal={o.totalSDph} onChange={(s, amt) => updateStatus(o.id, s, amt)} />
                      <button onClick={() => remove(o.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
                        {o.phone && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Telefón</span><span className="text-gray-600">{formatPhone(o.phone)}</span></div>}
                        {o.email && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Email</span><span className="text-gray-600">{o.email}</span></div>}
                        {o.clientId && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">ID klienta</span><span className="text-gray-500">{o.clientId}</span></div>}
                        {o.clientId && onGoToClient && (
                          <div className="flex gap-2 items-center pt-1">
                            <span className="text-gray-400 w-20 shrink-0" />
                            <button
                              onClick={e => { e.stopPropagation(); onGoToClient(o.clientId!); }}
                              className="text-[10px] font-bold text-secondary hover:text-primary underline underline-offset-2 transition-colors flex items-center gap-1"
                            >
                              <Users className="w-4 h-4" /> Zobraziť v klientoch →
                            </button>
                          </div>
                        )}
                        {(o.discountBeton || o.discountDoprava || o.discountSluzby || o.discountCelkovo) ? (
                          <div className="flex gap-2 items-start pt-0.5">
                            <span className="text-gray-400 w-20 shrink-0 mt-0.5">Zľavy</span>
                            <div className="space-y-1.5 flex-1">
                              {/* Individuálne skupina */}
                              {(o.discountBeton || o.discountDoprava || o.discountSluzby) ? (
                                <div className="border border-gray-200 rounded-sm px-2 py-1 bg-gray-50/60">
                                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-300 mb-1">Individuálne</div>
                                  <div className="flex flex-wrap gap-1">
                                    {o.discountBeton   ? <span className="bg-primary/15 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm">Betón −{o.discountBeton}%</span>   : null}
                                    {o.discountDoprava ? <span className="bg-primary/15 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm">Doprava −{o.discountDoprava}%</span> : null}
                                    {o.discountSluzby  ? <span className="bg-primary/15 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm">Služby −{o.discountSluzby}%</span>  : null}
                                  </div>
                                </div>
                              ) : null}
                              {/* Celkovo skupina */}
                              {o.discountCelkovo ? (
                                <div className="border border-primary/30 rounded-sm px-2 py-1 bg-primary/5">
                                  <div className="text-[8px] font-black uppercase tracking-widest text-primary/50 mb-1">Celkovo</div>
                                  <span className="bg-primary text-secondary text-[10px] font-black px-2 py-0.5 rounded-sm">−{o.discountCelkovo}%</span>
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
                        {o.deliveryZoneName && (
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Typ dopravy</span>
                            <span className="font-medium text-gray-700">
                              {o.deliveryZoneName}
                              {o.deliveryZoneType && o.deliveryZoneType !== "standard" && (
                                <span className="ml-1 text-[9px] font-black text-primary bg-primary/10 px-1 py-0.5 rounded-sm uppercase">{o.deliveryZoneType === "km" ? "€/km" : "€/auto"}</span>
                              )}
                            </span>
                          </div>
                        )}
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
                          <span className="font-bold text-gray-800">{o.totalQty} m³{(o.fillupM3 ?? 0) > 0 && <span className="text-[10px] text-amber-600 ml-1 font-normal">(+ {o.fillupM3} m³ doťaženie)</span>}</span>
                        </div>
                        {(o.fillupM3 ?? 0) > 0 && (
                          <div className="flex gap-2 items-start">
                            <span className="text-gray-400 w-24 shrink-0 pt-1.5">Doťaženie</span>
                            <div className="bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 flex-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                                <span>{o.totalQty} m³</span>
                                <span className="text-amber-400 font-bold">→</span>
                                <span className="text-amber-600">+{o.fillupM3} m³</span>
                                <span className="text-amber-400 font-bold">→</span>
                                <span className="font-black">{o.fillupTarget} m³/auto</span>
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
                        {(o.address || o.mapPlusCode) && (
                          <div className="flex gap-2 items-start">
                            <span className="text-gray-400 w-24 shrink-0">Adresa</span>
                            <span className="text-gray-600 break-words flex-1">
                              {o.address && <span>{o.address}</span>}
                              {o.mapPlusCode && (
                                <span className="flex items-center gap-1 mt-0.5">
                                  <span className="text-gray-400 text-[10px] font-mono">{o.mapPlusCode}{o.mapLocality ? ` · ${o.mapLocality}` : ""}</span>
                                  <button onClick={e => { e.stopPropagation(); const txt = `${o.mapPlusCode}${o.mapLocality ? " " + o.mapLocality : ""}`; navigator.clipboard?.writeText(txt); setCopiedPlusCode(o.id); setTimeout(() => setCopiedPlusCode(null), 1500); }}
                                    className="text-gray-300 hover:text-blue-500 transition-colors" title="Kopírovať Plus Code">
                                    {copiedPlusCode === o.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </span>
                              )}
                            </span>
                            {(o.mapPlusCode || o.address) && (
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
                        {o.note && <div className="flex gap-2 pt-1"><span className="text-gray-400 w-24 shrink-0">Poznámka</span><span className="text-gray-600 italic">{o.note}</span></div>}
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
                            <button onClick={e => { e.stopPropagation(); exportOrderPDF(o); }}
                              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-secondary border border-secondary/30 rounded-sm hover:bg-secondary hover:text-white transition-all">
                              <FileText className="w-3 h-3" />
                              <span className="hidden sm:inline">PDF</span>
                            </button>
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
                                return (
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
                                );
                              })()}
                            </div>
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
                      <span className="text-white/40 text-[10px] font-mono truncate">{mapModalOrder.mapPlusCode}{mapModalOrder.mapLocality ? ` · ${mapModalOrder.mapLocality}` : ""}</span>
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
    </div>
  );
}
