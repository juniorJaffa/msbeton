import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Users, Truck, Eye, EyeOff, RefreshCw, LogIn, ShieldCheck, ShieldOff, Table2, ClipboardList, FileText, Crown, Calculator, ExternalLink, FileSpreadsheet, FileType2, Mail, PenLine } from "lucide-react";
import { ClientPriceTable } from "@/components/ClientPriceTable";
import { ConcreteCalculator } from "@/components/Calculator";
import { PriceModeToggle } from "@/components/PriceModeToggle";
import { PhoneInput } from "@/components/PhoneInput";
import { cn, formatPhone } from "@/lib/utils";
import { adminData, adminApi, Client, TransportSettings, Order, SYSTEM_OWNER_ID } from "@/lib/adminData";
import { EditableField, authFetch } from "./_shared";

function genPassword() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function DiscountInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className={cn("text-xs block mb-1", disabled ? "text-gray-300" : "text-gray-500")}>{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" min="0" max="100" value={value} onChange={e => onChange(e.target.value.replace(/^0+(?=\d)/, "") || "0")}
          onFocus={e => e.target.select()} disabled={disabled}
          className={cn("border px-2 py-1.5 text-sm focus:outline-none w-full text-center", disabled ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed" : "border-gray-200 focus:border-primary")} />
        <span className={cn("text-xs shrink-0", disabled ? "text-gray-300" : "text-gray-400")}>%</span>
      </div>
    </div>
  );
}

function DiscountGroupEditor({
  beton, doprava, sluzby, celkovo, onChange,
}: {
  beton: number; doprava: number; sluzby: number; celkovo: number;
  onChange: (v: { beton: number; doprava: number; sluzby: number; celkovo: number }) => void;
}) {
  const [mode, setMode] = useState<"ind" | "celk">(() => celkovo > 0 ? "celk" : "ind");

  // Len zmení lokálny mode — žiadny onChange, DB sa neaktualizuje
  const activate = (m: "ind" | "celk") => setMode(m);

  const boxes: { label: string; value: number; group: "ind" | "celk"; onCh: (v: number) => void }[] = [
    { label: "Betón",   value: beton,   group: "ind",  onCh: v => onChange({ beton: v, doprava, sluzby, celkovo: 0 }) },
    { label: "Doprava", value: doprava, group: "ind",  onCh: v => onChange({ beton, doprava: v, sluzby, celkovo: 0 }) },
    { label: "Služby",  value: sluzby,  group: "ind",  onCh: v => onChange({ beton, doprava, sluzby: v, celkovo: 0 }) },
    { label: "Celkovo", value: celkovo, group: "celk", onCh: v => onChange({ beton: 0, doprava: 0, sluzby: 0, celkovo: v }) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {boxes.map(({ label, value, group, onCh }) => {
        const blocked = group !== mode;
        const hasValue = value > 0;
        return (
          <div key={label}
            className={cn("border px-2 py-2 text-center transition-all",
              blocked
                ? "bg-gray-50 border-gray-100 opacity-40 cursor-pointer hover:opacity-60"
                : hasValue
                  ? "bg-primary/10 border-primary/40"
                  : "bg-primary/5 border-primary/20")}
            onClick={() => { if (blocked) activate(group); }}>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">{label}</div>
            {blocked ? (
              <div className="text-[10px] text-gray-400 font-bold py-1.5">{group === "celk" ? "— ind." : "= Celkovo"}</div>
            ) : (
              <div className="flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                <input
                  type="number" min="0" max="100"
                  value={String(value)}
                  onChange={e => { const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0)); onCh(v); }}
                  onFocus={e => e.target.select()}
                  className={cn("border-0 px-0.5 py-0 text-xl font-black focus:outline-none w-16 text-center bg-transparent leading-none",
                    hasValue ? "text-primary" : "text-gray-300")}
                />
                <span className={cn("text-sm font-bold leading-none", hasValue ? "text-primary/70" : "text-gray-300")}>%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function sharedLinkIcon(url: string): { Icon: React.ElementType; cls: string } {
  const u = url.toLowerCase();
  if (u.includes("spreadsheet") || u.includes(".xlsx") || u.includes(".xls") || u.includes("excel"))
    return { Icon: FileSpreadsheet, cls: "text-green-600" };
  if (u.includes(".pdf") || u.includes("/pdf"))
    return { Icon: FileText, cls: "text-red-500" };
  if (u.includes("document") || u.includes(".docx") || u.includes(".doc") || u.includes("word"))
    return { Icon: FileType2, cls: "text-blue-600" };
  return { Icon: ExternalLink, cls: "text-primary" };
}

function exportClientPricePDF(client: Client, priceMode: "faktura" | "hotovost", tsettings: TransportSettings) {
  const categories = adminData.getCategories();
  const services = adminData.getServices().filter(s => s.active);
  const zones = adminData.getTransportZones();
  const deliveryZones = adminData.getDelivery();
  const clientDZone = deliveryZones.find(z => z.id === client.deliveryZoneId) ?? deliveryZones[0];
  const pType = clientDZone?.pricingType ?? "standard";

  const effectiveBeton   = (client.discountBeton   ?? 0) > 0 ? (client.discountBeton   ?? 0) : (client.discountCelkovo ?? 0);
  const effectiveDoprava = (client.discountDoprava ?? 0) > 0 ? (client.discountDoprava ?? 0) : (client.discountCelkovo ?? 0);
  const effectiveSluzby  = (client.discountSluzby  ?? 0) > 0 ? (client.discountSluzby  ?? 0) : (client.discountCelkovo ?? 0);
  const betonFactor   = 1 - effectiveBeton   / 100;
  const dopravaFactor = 1 - effectiveDoprava / 100;
  const sluzbyFactor  = 1 - effectiveSluzby  / 100;
  const hotovostMult = priceMode === "hotovost" ? 1 + (client.hotovostDph ?? tsettings.defaultHotovostDph ?? 0.20) : 1;
  const mp = client.manualPrices ?? {};
  const hasDiscount = effectiveBeton > 0 || effectiveDoprava > 0 || effectiveSluzby > 0 || Object.keys(mp).length > 0;
  const today = new Date().toLocaleDateString("sk-SK");
  const clientName = [client.firstName, client.lastName].filter(Boolean).join(" ");

  const fmtP = (n: number) => n.toFixed(2) + " €";
  const thS = `padding:5px 8px;font-size:8pt;text-align:left`;
  const thRS = `padding:5px 8px;font-size:8pt;text-align:right`;
  const tdS = `padding:4px 8px;font-size:8.5pt;border-bottom:1px solid #eee;`;
  const tdRS = `padding:4px 8px;font-size:8.5pt;border-bottom:1px solid #eee;text-align:right;`;
  const discS = `padding:4px 8px;font-size:8.5pt;border-bottom:1px solid #eee;text-align:right;color:#1a7c2e;font-weight:bold;background:#f0fff0;`;
  const mBadge = `<span style="color:#b45309;font-size:7pt;font-weight:bold;margin-left:3px">M</span>`;

  const buildTable = (headers: string[], rows: Array<[string, string, string, string?]>, bg?: string) => {
    const head = headers.map((h, i) => `<th style="background:${bg ?? "#001D3D"};color:#fff;${i === 0 ? thS : thRS}">${h}</th>`).join("");
    const body = rows.map((row, ri) => {
      const rowBg = ri % 2 === 1 ? "background:#f9f9f9;" : "";
      const cols = [
        `<td style="${tdS}${rowBg}">${row[0]}</td>`,
        `<td style="${tdRS}${rowBg}">${row[1]}</td>`,
        `<td style="${tdRS}${rowBg}">${row[2]}</td>`,
        row[3] !== undefined ? `<td style="${discS}${rowBg}">${row[3]}</td>` : (hasDiscount ? `<td style="${tdRS}${rowBg}"></td>` : ""),
      ];
      return `<tr>${cols.join("")}</tr>`;
    }).join("");
    return `<table style="border-collapse:collapse;width:100%;margin-bottom:14px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  };

  const discHdr = hasDiscount ? ["Názov", "Množstvo", "Pôvodná cena", "Zľavnená cena"] : ["Názov", "Množstvo", "Cena"];

  // Betóny
  const betonHtml = categories.map(cat => {
    const rows: Array<[string, string, string, string?]> = cat.types
      .filter(t => t.price > 0 && t.label.trim())
      .map(t => {
        const orig = t.price * hotovostMult;
        const manual = mp[t.id] !== undefined ? mp[t.id] * hotovostMult : undefined;
        const disc = manual !== undefined ? manual : orig * betonFactor;
        const hasItemDisc = Math.abs(orig - disc) > 0.001;
        const lbl = t.label + (mp[t.id] !== undefined ? mBadge : "");
        return hasDiscount
          ? [lbl, "1 m³", fmtP(orig), hasItemDisc ? fmtP(disc) : undefined] as [string, string, string, string?]
          : [lbl, "1 m³", fmtP(orig)] as [string, string, string];
      });
    return `<h3 style="font-size:9.5pt;color:#001D3D;margin:14px 0 3px;border-bottom:2px solid #EDC531;padding-bottom:3px">${cat.name}</h3>
      ${buildTable(discHdr, rows)}`;
  }).join("");

  // Služby
  const sluzbyRows: Array<[string, string, string, string?]> = services.map(s => {
    const manualS = mp[s.id];
    const disc = manualS !== undefined ? manualS : s.price * sluzbyFactor;
    const hasItemDisc = Math.abs(s.price - disc) > 0.001;
    const lbl = s.name + (manualS !== undefined ? mBadge : "");
    return hasDiscount
      ? [lbl, s.unit || "—", fmtP(s.price), hasItemDisc ? fmtP(disc) : undefined] as [string, string, string, string?]
      : [lbl, s.unit || "—", fmtP(s.price)] as [string, string, string];
  });

  // Doprava — per type
  const minFee = tsettings.minimumFee ?? 62.50;
  const dopravaRows: Array<[string, string, string, string?]> = [];
  let dopravaHdr: string[];

  if (pType === "km" && clientDZone) {
    dopravaHdr = hasDiscount ? ["Typ / Zóna", "Sadzba", "Pôvodná", "Zľavnená"] : ["Typ / Zóna", "Sadzba", "Cena"];
    const baseRate = clientDZone.ratePerKm ?? 1.8;
    const kmRateManual = mp[`km_rate_${clientDZone.id}`];
    const kmRateOrig = baseRate;
    const kmRateDisc = kmRateManual !== undefined ? kmRateManual : baseRate * dopravaFactor;
    const hasKmDisc = Math.abs(kmRateOrig - kmRateDisc) > 0.001;
    const kmLbl = `${clientDZone.name} – sadzba` + (kmRateManual !== undefined ? mBadge : "");
    dopravaRows.push(hasDiscount
      ? [kmLbl, "€/km", fmtP(kmRateOrig), hasKmDisc ? fmtP(kmRateDisc) : undefined]
      : [kmLbl, "€/km", fmtP(kmRateOrig)]);
    if (clientDZone.minimumFeeKm != null) {
      const mfDisc = clientDZone.minimumFeeKm * dopravaFactor;
      const hasMfDisc = Math.abs(clientDZone.minimumFeeKm - mfDisc) > 0.001;
      dopravaRows.push(hasDiscount
        ? ["Min. poplatok / auto", "1×", fmtP(clientDZone.minimumFeeKm), hasMfDisc ? fmtP(mfDisc) : undefined]
        : ["Min. poplatok / auto", "1×", fmtP(clientDZone.minimumFeeKm)]);
    }
    if (clientDZone.minKm != null && clientDZone.minKm > 0)
      dopravaRows.push(["Min. vzdialenosť", "—", `${clientDZone.minKm} km`]);
    if (clientDZone.maxKm != null && clientDZone.maxKm > 0)
      dopravaRows.push(["Max. polomer", "—", `${clientDZone.maxKm} km`]);
  } else if (pType === "auto" && clientDZone) {
    dopravaHdr = hasDiscount ? ["Typ / Zóna", "Sadzba", "Pôvodná", "Zľavnená"] : ["Typ / Zóna", "Sadzba", "Cena"];
    const baseRpt = clientDZone.ratePerTruck ?? 0;
    const autoRateManual = mp[`auto_rate_${clientDZone.id}`];
    const autoRateOrig = baseRpt;
    const autoRateDisc = autoRateManual !== undefined ? autoRateManual : baseRpt * dopravaFactor;
    const hasAutoDisc = Math.abs(autoRateOrig - autoRateDisc) > 0.001;
    const autoLbl = `${clientDZone.name} – paušál` + (autoRateManual !== undefined ? mBadge : "");
    dopravaRows.push(hasDiscount
      ? [autoLbl, "€/auto", fmtP(autoRateOrig), hasAutoDisc ? fmtP(autoRateDisc) : undefined]
      : [autoLbl, "€/auto", fmtP(autoRateOrig)]);
    if (clientDZone.minimumFeeAuto != null) {
      const mfDisc = clientDZone.minimumFeeAuto * dopravaFactor;
      const hasMfDisc = Math.abs(clientDZone.minimumFeeAuto - mfDisc) > 0.001;
      dopravaRows.push(hasDiscount
        ? ["Min. poplatok / auto", "1×", fmtP(clientDZone.minimumFeeAuto), hasMfDisc ? fmtP(mfDisc) : undefined]
        : ["Min. poplatok / auto", "1×", fmtP(clientDZone.minimumFeeAuto)]);
    }
    if (clientDZone.minTrucks != null && clientDZone.minTrucks > 0)
      dopravaRows.push(["Min. počet áut", "—", `${clientDZone.minTrucks}`]);
    if (clientDZone.maxTrucks != null && clientDZone.maxTrucks > 0)
      dopravaRows.push(["Max. počet áut", "—", `${clientDZone.maxTrucks}`]);
  } else {
    // standard
    dopravaHdr = hasDiscount ? ["Vzdialenosť", "Množstvo", "Pôvodná cena", "Zľavnená cena"] : ["Vzdialenosť", "Množstvo", "Cena"];
    const minFeeManual = mp["min_fee"];
    const minFeeDisc = minFeeManual !== undefined ? minFeeManual : minFee * dopravaFactor;
    const minFeeLbl = "Min. doprava / auto" + (minFeeManual !== undefined ? mBadge : "");
    dopravaRows.push(hasDiscount
      ? [minFeeLbl, "1×", fmtP(minFee), Math.abs(minFee - minFeeDisc) > 0.001 ? fmtP(minFeeDisc) : undefined]
      : [minFeeLbl, "1×", fmtP(minFee)]);
    zones.forEach(z => {
      const zManual = mp[z.id];
      const disc = zManual !== undefined ? zManual : z.ratePerM3 * dopravaFactor;
      const hasItemDisc = Math.abs(z.ratePerM3 - disc) > 0.001;
      const zLbl = `Od ${z.fromKm} – ${z.toKm} km` + (zManual !== undefined ? mBadge : "");
      dopravaRows.push(hasDiscount
        ? [zLbl, "1 m³×", fmtP(z.ratePerM3), hasItemDisc ? fmtP(disc) : undefined]
        : [zLbl, "1 m³×", fmtP(z.ratePerM3)]);
    });
  }

  const discInfo = hasDiscount
    ? `<div style="color:#c9a800;font-size:8pt;margin-top:3px">Zľavy: Betón ${effectiveBeton}% | Doprava ${effectiveDoprava}% | Služby ${effectiveSluzby}%</div>`
    : "";

  const html = `<!DOCTYPE html><html lang="sk"><head>
<meta charset="utf-8">
<title>Zľavové tabuľky – ${clientName || "klient"}</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #222; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:5mm;border-bottom:2px solid #EDC531;margin-bottom:5mm">
  <div>
    <div style="font-size:14pt;font-weight:bold;color:#001D3D">MS-BETON, spol. s r.o.</div>
    <div style="font-size:8pt;color:#555;margin-top:2px">Turie 468, 013 12 Turie &nbsp;|&nbsp; +421 909 205 205 &nbsp;|&nbsp; info@msbeton.sk</div>
    <div style="font-size:7.5pt;color:#777;margin-top:1px">IČO: 55747591 &nbsp;|&nbsp; DIČ: 2122074603 &nbsp;|&nbsp; IČ DPH: SK2122074603</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:13pt;font-weight:bold;color:#EDC531;letter-spacing:0.5px">ZĽAVOVÉ TABUĽKY</div>
    <div style="font-size:8pt;color:#777;margin-top:2px">${priceMode === "hotovost" ? "Hotovosť (s DPH na betón)" : "Faktúra (bez DPH)"}</div>
    <div style="font-size:8pt;color:#999;margin-top:1px">Dátum: ${today}</div>
  </div>
</div>

<div style="border:1px solid #ddd;padding:6px 10px;margin-bottom:5mm;font-size:8.5pt">
  <strong style="color:#001D3D">${clientName}${client.company ? ` – ${client.company}` : ""}</strong>
  ${client.email ? `<br>Email: ${client.email}` : ""}${client.phone ? ` &nbsp;|&nbsp; Tel: ${formatPhone(client.phone)}` : ""}
  ${discInfo}
</div>

<h2 style="font-size:10pt;color:#EDC531;background:#001D3D;padding:4px 8px;margin-bottom:0">Betóny</h2>
${betonHtml}

<h2 style="font-size:10pt;color:#EDC531;background:#001D3D;padding:4px 8px;margin-bottom:8px;margin-top:12px">Služby</h2>
${buildTable(discHdr, sluzbyRows)}

<h2 style="font-size:10pt;color:#EDC531;background:#001D3D;padding:4px 8px;margin-bottom:8px;margin-top:12px">Doprava</h2>
${buildTable(dopravaHdr, dopravaRows)}

<div style="margin-top:10mm;padding-top:4mm;border-top:1px solid #eee;font-size:7.5pt;color:#999">
  Vypracovala spoločnosť: MS-BETON, spol. s r.o. &nbsp;|&nbsp; IČO: 55747591 &nbsp;|&nbsp; IČ DPH: SK2122074603<br>
  Turie 468, 013 12 Turie &nbsp;|&nbsp; +421 909 205 205 &nbsp;|&nbsp; info@msbeton.sk &nbsp;|&nbsp; msbeton.sk
</div>

<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  if (!win) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click(); }
}

export default function KlientiTab({ expandClientId, onExpanded, onGoToOrders }: { expandClientId?: string | null; onExpanded?: () => void; onGoToOrders?: (loginId: string, focusOrderId?: string) => void }) {
  const [clients, setClients] = useState<Client[]>(adminData.getClients());
  const [zones] = useState(() => adminData.getDelivery());
  const [pZones] = useState(() => adminData.getTransportZones());
  const [ts, setTs] = useState<TransportSettings>(adminData.getTransportSettings());
  const [allOrders, setAllOrders] = useState<Order[]>(() => adminData.getOrders());
  const saveTs = (data: TransportSettings) => { setTs(data); adminData.saveTransportSettings(data); };
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<Set<string>>(new Set());
  const [showTableFor, setShowTableFor] = useState<string | null>(null);
  const [inlineTableMode, setInlineTableMode] = useState<"faktura" | "hotovost">("faktura");
  const [tablePdfModal, setTablePdfModal] = useState<Client | null>(null);
  const [tablePdfMode, setTablePdfMode] = useState<"faktura" | "hotovost">("faktura");

  useEffect(() => {
    if (!tablePdfModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // ak je aktívny input → EditRow to rieši sám; popup ostáva otvorený
      if (document.activeElement?.tagName === "INPUT") return;
      setTablePdfModal(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [tablePdfModal]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [clientDetailTab, setClientDetailTab] = useState<Record<string, "detail" | "calc">>({});
  const [sendCredState, setSendCredState] = useState<Record<string, "idle" | "loading" | "ok" | "error">>({});
  const emptyForm = {
    firstName: "", lastName: "", company: "", email: "", phone: "",
    loginId: "", password: "1234",
    discountBeton: "20", discountDoprava: "0", discountSluzby: "0", discountCelkovo: "0",
    hotovostDph: "20",
    canHotovost: true, canPridatBeton: true, canPridatBetonOwn: true, canZimneOpatrenia: false, active: true,
    smsOrderDisabled: false, smsShareOnly: false, allowExtraOverload: true,
    deliveryZoneId: zones.find(z => (z.pricingType ?? "standard") === "standard")?.id ?? zones[0]?.id ?? "",
    sharedLink: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [showFormPass, setShowFormPass] = useState(false);
  const [phoneHighlight, setPhoneHighlight] = useState(false);
  const [sendRegEmail, setSendRegEmail] = useState(true);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [sysDphOpen, setSysDphOpen] = useState(false);
  const [editingLinkFor, setEditingLinkFor] = useState<string | null>(null);
  const [addSuccessMsg, setAddSuccessMsg] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState("");

  const save = (data: Client[]) => { setClients(data); adminData.saveClients(data); };

  // Refresh from external changes (sync, Doprava tab) without remounting/closing expanded
  useEffect(() => {
    const handler = () => {
      setTs(adminData.getTransportSettings());
      setClients(adminData.getClients());
    };
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);

  // Načítaj objednávky pre štatistiky klienta
  useEffect(() => {
    adminApi.getOrders().then(r => {
      if (r?.data) { adminData.saveOrders(r.data as Order[]); setAllOrders(r.data as Order[]); }
    }).catch(() => {});
  }, []);

  const scrollToClientCard = (id: string, toTabs = false) => {
    setTimeout(() => {
      const container = document.getElementById("admin-content");
      const toolbar = document.getElementById("klienti-toolbar");
      if (!container) return;
      const cR = container.getBoundingClientRect();
      const toolbarH = toolbar?.getBoundingClientRect().height ?? 82;
      const floatingEl = document.getElementById("floating-client-indicator");
      const floatingH = floatingEl ? floatingEl.getBoundingClientRect().height : 32;
      const targetEl = toTabs
        ? (document.getElementById(`client-tabs-${id}`) ?? document.getElementById(`client-card-${id}`))
        : document.getElementById(`client-card-${id}`);
      if (!targetEl) return;
      const eR = targetEl.getBoundingClientRect();
      container.scrollTo({ top: container.scrollTop + (eR.top - cR.top) - toolbarH - floatingH - 4, behavior: "smooth" });
    }, 250);
  };

  useEffect(() => {
    if (!expandClientId) return;
    const c = clients.find(cl => cl.loginId === expandClientId);
    if (c) {
      setExpanded(c.id);
      scrollToClientCard(c.id, true);
    }
    onExpanded?.();
  }, [expandClientId]);

  // Auto-cleanup: clients with both celkovo AND individual discounts → celkovo wins, clear individual
  useEffect(() => {
    const needFix = clients.filter(c =>
      (c.discountCelkovo ?? 0) > 0 &&
      ((c.discountBeton ?? 0) > 0 || (c.discountDoprava ?? 0) > 0 || (c.discountSluzby ?? 0) > 0)
    );
    if (needFix.length > 0) {
      save(clients.map(c =>
        needFix.some(f => f.id === c.id)
          ? { ...c, discountBeton: 0, discountDoprava: 0, discountSluzby: 0 }
          : c
      ));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const remove = (id: string) => { if (id === SYSTEM_OWNER_ID) return; if (confirm("Vymazať klienta?")) save(clients.filter(c => c.id !== id)); };
  const update = (id: string, patch: Partial<Client>) => save(clients.map(c => c.id === id ? { ...c, ...patch } : c));
  const togglePassVis = (id: string) => setShowPass(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const add = async () => {
    if (!form.firstName.trim() && !form.lastName.trim() && !form.company.trim()) return;
    const newId = adminData.generateId();
    const newLoginId = form.loginId.trim();
    if (!newLoginId) { alert("Prihlasovacie ID je povinné."); return; }
    if (!form.password.trim()) { alert("Heslo je povinné."); return; }
    if (newLoginId.toLowerCase() === "msbeton") {
      alert("Login ID 'msbeton' je rezervované pre administrátora. Zvoľ iné ID.");
      return;
    }
    if (newLoginId && clients.some(c => c.loginId?.toLowerCase() === newLoginId.toLowerCase())) {
      alert(`Login ID '${newLoginId}' už existuje. Zvoľ iné ID.`);
      return;
    }
    const clientName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") || form.company.trim();
    save([...clients, {
      id: newId,
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      company: form.company.trim(), email: form.email.trim(), phone: form.phone.trim(),
      loginId: newLoginId, password: form.password.trim(),
      discountBeton:   parseFloat(form.discountBeton)   || 0,
      discountDoprava: parseFloat(form.discountDoprava) || 0,
      discountSluzby:  parseFloat(form.discountSluzby)  || 0,
      discountCelkovo: parseFloat(form.discountCelkovo) || 0,
      hotovostDph: (() => { const v = parseFloat(form.hotovostDph); return Number.isNaN(v) ? 0.20 : v / 100; })(),
      canHotovost: form.canHotovost, canPridatBeton: form.canPridatBeton,
      canPridatBetonOwn: form.canPridatBetonOwn || undefined,
      canZimneOpatrenia: form.canZimneOpatrenia,
      smsOrderDisabled: form.smsOrderDisabled || undefined,
      smsShareOnly: form.smsShareOnly || undefined,
      allowExtraOverload: form.allowExtraOverload ? undefined : false,
      active: form.active,
      deliveryZoneId: form.deliveryZoneId || undefined,
      sharedLink: form.sharedLink.trim() || undefined,
      createdAt: new Date().toISOString(),
    }]);
    if (sendRegEmail && form.email.trim()) {
      setEmailStatus("sending");
      const res = await authFetch("/api/admin/send-registration-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: form.email.trim(), clientName, clientId: newLoginId, password: form.password.trim() }),
      }).then(r => r.json()).catch(() => ({ ok: false }));
      setEmailStatus(res.ok ? "ok" : "error");
      setTimeout(() => setEmailStatus("idle"), 4000);
    }
    setForm(emptyForm); setAdding(false);
    setAddSuccessMsg(clientName);
    setExpanded(newId);
    setTimeout(() => scrollToClientCard(newId, true), 120);
    setTimeout(() => setAddSuccessMsg(null), 5000);
  };

  const normK = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const compactK = (s: string) => s.replace(/\s/g, "");
  const searchTerms = search.trim().split(/\s+/).filter(Boolean);
  const filtered = clients.filter(c => {
    if (!searchTerms.length) return true;
    const haystack = [c.firstName, c.lastName, c.company, c.email, c.phone, c.loginId].filter(Boolean).join(" ");
    const haystackN = normK(haystack);
    const haystackC = compactK(haystackN);
    return searchTerms.every(t => {
      const tn = normK(t);
      return haystackN.includes(tn) || haystackC.includes(compactK(tn));
    });
  });

  const [floatingClient, setFloatingClient] = useState<Client | null>(null);
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  useEffect(() => {
    const container = document.getElementById("admin-content");
    if (!container) return;
    const onScroll = () => {
      const sticky = document.getElementById("klienti-sticky");
      const tbBottom = sticky ? sticky.getBoundingClientRect().bottom : 82;
      const cards = container.querySelectorAll("[id^='client-card-']");
      let last: Client | null = null;
      for (const el of Array.from(cards)) {
        if (el.getBoundingClientRect().top < tbBottom - 4) {
          const id = el.id.replace("client-card-", "");
          const found = filteredRef.current.find(c => c.id === id);
          if (found) last = found;
        } else break;
      }
      setFloatingClient(prev => prev?.id === last?.id ? prev : last);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => { container.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <div className="space-y-4">
      {addSuccessMsg && (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold shadow-sm">
          <Check className="w-4 h-4 text-green-500 shrink-0" />
          Klient <span className="font-black">{addSuccessMsg}</span> bol úspešne pridaný
        </div>
      )}
      {/* Systémová DPH — collapsible */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setSysDphOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <h3 className="font-black text-secondary text-sm uppercase tracking-widest">Systémová DPH</h3>
          {sysDphOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {sysDphOpen && <div className="flex flex-wrap gap-px bg-gray-100">
          <div className="bg-white px-3 py-2 flex-1 min-w-0">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">DPH Faktúra</div>
            <div className="flex items-center gap-1 font-bold text-secondary text-sm">
              <EditableField value={Math.round((ts.dph ?? 0.23) * 100)} type="number"
                onSave={v => saveTs({ ...ts, dph: (parseFloat(v) || 23) / 100 })} /> %
            </div>
          </div>
          <div className="bg-white px-3 py-2 flex-1 min-w-0">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">DPH Hotovosť</div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 font-bold text-secondary text-sm">
                <EditableField value={Math.round((ts.defaultHotovostDph ?? 0.20) * 100)} type="number"
                  onSave={v => saveTs({ ...ts, defaultHotovostDph: (parseFloat(v) || 20) / 100 })} /> %
              </div>
              <button
                onClick={() => {
                  const dph = ts.defaultHotovostDph ?? 0.20;
                  const affected = clients.filter(c => c.hotovostDph === undefined || Math.abs((c.hotovostDph ?? 0.20) - 0.20) < 0.001).length;
                  if (!confirm(`Nastaviť ${Math.round(dph * 100)}% DPH hotovosť pre ${affected} klientov bez vlastnej sadzby?`)) return;
                  save(clients.map(c =>
                    (c.hotovostDph === undefined || Math.abs((c.hotovostDph ?? 0.20) - 0.20) < 0.001)
                      ? { ...c, hotovostDph: dph }
                      : c
                  ));
                }}
                className="px-2 py-1 bg-secondary/10 border border-secondary/20 text-secondary font-bold text-[10px] hover:bg-secondary/20 transition-colors uppercase tracking-wide">
                Nastaviť klientom
              </button>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Platí pre klientov bez vlastnej DPH sadzby</div>
          </div>
          <div className="bg-white px-3 py-2 flex-1 min-w-0 border-l border-gray-100">
            {(() => {
              const enabledCount = clients.filter(c => c.canHotovost !== false).length;
              const disabledCount = clients.length - enabledCount;
              return (
                <>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Hotovosť — hromadne</div>
                  <div className="text-[10px] text-gray-500 mb-2">
                    <span className="text-green-600 font-bold">{enabledCount}</span> zapnutá
                    {disabledCount > 0 && <>, <span className="text-red-500 font-bold">{disabledCount}</span> vypnutá</>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {enabledCount > 0 && (
                      <button
                        onClick={() => {
                          if (!confirm(`Vypnúť Hotovosť VŠETKÝM ${enabledCount} klientom?`)) return;
                          save(clients.map(c => ({ ...c, canHotovost: false })));
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 text-red-700 font-bold text-[10px] hover:bg-red-100 transition-colors uppercase tracking-wide">
                        <ShieldOff className="w-4 h-4" /> Vypnúť ({enabledCount})
                      </button>
                    )}
                    {disabledCount > 0 && (
                      <button
                        onClick={() => {
                          if (!confirm(`Zapnúť Hotovosť VŠETKÝM ${disabledCount} klientom?`)) return;
                          save(clients.map(c => ({ ...c, canHotovost: true })));
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 text-green-700 font-bold text-[10px] hover:bg-green-100 transition-colors uppercase tracking-wide">
                        <ShieldCheck className="w-4 h-4" /> Zapnúť ({disabledCount})
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>}
      </div>

      {/* Sticky toolbar — search + table header + floating client indicator */}
      <div id="klienti-sticky" className="sticky top-0 z-20">
      <div id="klienti-toolbar" className="shadow-sm">
        <div className="py-2 px-1 bg-white border-b border-gray-100">
          <input placeholder="Hľadať klienta..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 text-secondary placeholder:text-gray-400 px-4 py-2.5 text-sm focus:outline-none rounded border border-gray-200 focus:border-primary" />
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-secondary text-white text-xs font-black uppercase tracking-widest">
          <div className="w-9 shrink-0 flex items-center justify-center">
            <span className="text-primary/70 font-bold text-[11px] normal-case tracking-normal">{filtered.length}</span>
          </div>
          <div className="flex-1 min-w-0">Klient</div>
          <div className="hidden sm:flex w-80 shrink-0">
            {["Betón", "Doprava", "Služby", "Celkovo"].map(l => (
              <div key={l} className="w-20 text-center text-primary">{l}</div>
            ))}
          </div>
          <div className="hidden sm:flex w-40 shrink-0 items-center justify-end">
            {/* spacer pre badge stĺpec — zrkadlí šírku badge sekcie v riadkoch */}
          </div>
          <div className="flex items-center justify-end w-40 shrink-0">
            <button onClick={() => { setAdding(true); setExpanded(null); }} title="Pridať klienta"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-secondary font-black text-[10px] hover:bg-primary/90 shrink-0 uppercase tracking-wide">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {floatingClient && (
        <div id="floating-client-indicator" className="bg-secondary/97 border-b border-white/10 px-4 py-1 flex items-center gap-2 text-xs shadow-sm">
          <span className="text-white/30 text-[9px]">▸</span>
          {floatingClient.isOwner && <Crown className="w-3 h-3 text-primary shrink-0" />}
          <span className="font-bold text-white truncate">{[floatingClient.firstName, floatingClient.lastName].filter(Boolean).join(" ") || floatingClient.company || "—"}</span>
          {floatingClient.company && <span className="text-white/40 truncate hidden sm:block">{floatingClient.company}</span>}
          {(floatingClient.discountCelkovo ?? 0) > 0 && <span className="text-primary text-[9px] font-black ml-auto shrink-0">−{floatingClient.discountCelkovo}% celk.</span>}
        </div>
      )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white border-2 border-primary shadow-md">
          <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
            <span className="font-black text-secondary text-sm uppercase tracking-widest">Pridať klienta</span>
            <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 space-y-5">
            {/* Osobné info */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Osobné info</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Meno *" value={form.firstName} onChange={e => {
                  const v = e.target.value;
                  const phoneMatch = v.match(/^(\+?(?:00421|421|0)[0-9\s\-]{7,})/);
                  const extracted = phoneMatch ? formatPhone(phoneMatch[1].trim()) : "";
                  setForm(f => {
                    if (extracted) {
                      if (!f.phone) {
                        setPhoneHighlight(true);
                        setTimeout(() => setPhoneHighlight(false), 1200);
                      }
                      return { ...f, firstName: v, phone: extracted };
                    }
                    return { ...f, firstName: v };
                  });
                }} className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" autoFocus />
                <input placeholder="Priezvisko" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <input placeholder="E-Mail" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <PhoneInput value={form.phone} onChange={v => setForm({ ...form, phone: v })}
                  placeholder="0944 xxx xxx"
                  className={`px-3 py-2 text-sm focus:outline-none transition-all duration-300 ${phoneHighlight ? "border-2 border-teal-400 bg-teal-50 shadow-[0_0_0_3px_rgba(45,212,191,0.25)]" : "border border-gray-200 focus:border-primary"}`} />
                <input placeholder="Spoločnosť" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary sm:col-span-2" />
                <div className="relative sm:col-span-2">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input placeholder="Zdielaný odkaz (Google Sheet, PDF…)" value={form.sharedLink} onChange={e => setForm({ ...form, sharedLink: e.target.value })}
                    className="w-full border border-gray-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-primary" type="url" />
                </div>
              </div>
            </div>

            {/* Prístup */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prístup do kalkulačky</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Prihlasovacie ID (napr. 101)" value={form.loginId} onChange={e => setForm({ ...form, loginId: e.target.value })}
                  autoComplete="off" className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <input type={showFormPass ? "text" : "password"} placeholder="Heslo" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      autoComplete="new-password" className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary pr-8" />
                    <button type="button" onClick={() => setShowFormPass(!showFormPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                      {showFormPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, password: genPassword() })} title="Vygenerovať heslo"
                    className="px-2 border border-gray-200 text-gray-400 hover:text-secondary hover:border-secondary transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Zľavy */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Zľavy</p>
              <DiscountGroupEditor
                beton={parseInt(form.discountBeton) || 0}
                doprava={parseInt(form.discountDoprava) || 0}
                sluzby={parseInt(form.discountSluzby) || 0}
                celkovo={parseInt(form.discountCelkovo) || 0}
                onChange={v => setForm({
                  ...form,
                  discountBeton: String(v.beton),
                  discountDoprava: String(v.doprava),
                  discountSluzby: String(v.sluzby),
                  discountCelkovo: String(v.celkovo),
                })}
              />
            </div>

            {/* Možnosti */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Možnosti</p>
              <div className="border border-gray-200 bg-white divide-y divide-gray-100">
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canHotovost} onChange={e => setForm({ ...form, canHotovost: e.target.checked })} className="accent-secondary w-5 h-5 shrink-0" />
                  <div>
                    <span className="text-sm text-gray-700">Hotovosť</span>
                    {form.canHotovost ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">DPH hotovosť:</span>
                        <input type="number" min="0" max="100" value={form.hotovostDph} onClick={e => e.stopPropagation()}
                          onChange={e => setForm({ ...form, hotovostDph: e.target.value })}
                          className="border border-gray-200 px-2 py-0.5 text-xs focus:outline-none focus:border-primary w-16 text-center" />
                        <span className="text-xs text-gray-400">%</span>
                        <span className="text-[10px] text-gray-400 italic">· iba betón</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-gray-400">Iba faktúra · DPH <span className="font-bold text-gray-500">23 %</span></div>
                    )}
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canPridatBeton} onChange={e => setForm({ ...form, canPridatBeton: e.target.checked })} className="accent-secondary w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">Pridať položku — Pumpa a Mix</span>
                    <div className="text-[11px] text-gray-400">„+ Pridať položku" v kalkulačke (Pumpa/Mix tab)</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canPridatBetonOwn} onChange={e => setForm({ ...form, canPridatBetonOwn: e.target.checked })} className="accent-secondary w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">Pridať položku — Vlastná doprava</span>
                    <div className="text-[11px] text-gray-400">„+ Pridať položku" v kalkulačke (Vl. doprava tab, bez dopravy/služieb)</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.canZimneOpatrenia} onChange={e => setForm({ ...form, canZimneOpatrenia: e.target.checked })} className="accent-blue-600 w-5 h-5 shrink-0" />
                  <span className="text-sm text-gray-700">Zimné opatrenia (auto-ON v zime)</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.smsOrderDisabled} onChange={e => setForm({ ...form, smsOrderDisabled: e.target.checked })} className="accent-orange-500 w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">SMS — nevytvárať objednávku</span>
                    <div className="text-[11px] text-gray-400">Klik SMS odošle iba text, bez vytvorenia objednávky</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.smsShareOnly} onChange={e => setForm({ ...form, smsShareOnly: e.target.checked })} className="accent-orange-500 w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">SMS — zobraziť share menu</span>
                    <div className="text-[11px] text-gray-400">Namiesto auto-otvorenia SMS aplikácie · zdieľacie okno</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.allowExtraOverload} onChange={e => setForm({ ...form, allowExtraOverload: e.target.checked })} className="accent-red-500 w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">Minusové pretaženie</span>
                    <div className="text-[11px] text-gray-400">Povolí ísť pod min. limit vozidiel (Pumpa min. {ts.condPumpaMin ?? 1} voz., Mix min. {ts.condMixMin ?? 0} voz.)</div>
                  </div>
                </label>
                <div className="px-3 py-3">
                  <div className="text-xs text-gray-400 mb-1.5">Typ dopravy</div>
                  {(() => {
                    const selZ = zones.find(z => z.id === form.deliveryZoneId) ?? zones[0];
                    const selType = selZ?.pricingType ?? "standard";
                    const kmZones = zones.filter(z => z.pricingType === "km");
                    const btnCls = (active: boolean) => `py-1.5 px-2 text-xs font-semibold border rounded transition-colors ${active ? "bg-secondary text-white border-secondary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`;
                    const typeRow = zones.filter((z, i, arr) => {
                      if (z.pricingType === "km") return arr.findIndex(x => x.pricingType === "km") === i;
                      return true;
                    });
                    return (
                      <div className="space-y-1">
                        <div className="flex gap-1 flex-wrap">
                          {typeRow.map(z => {
                            const isKmGroup = z.pricingType === "km";
                            const isActive = isKmGroup ? selType === "km" : (form.deliveryZoneId ?? zones[0]?.id) === z.id;
                            return (
                              <button key={z.id} type="button"
                                onClick={() => {
                                  if (isKmGroup && selType !== "km") { const first = kmZones[0]; if (first) setForm({ ...form, deliveryZoneId: first.id }); }
                                  else if (!isKmGroup) setForm({ ...form, deliveryZoneId: z.id });
                                }}
                                className={btnCls(isActive)}>
                                {isKmGroup ? "Kilometre" : z.name}
                              </button>
                            );
                          })}
                        </div>
                        {selType === "km" && kmZones.length > 1 && (
                          <div className="flex gap-1 pl-2 border-l-2 border-primary/30">
                            {kmZones.map(z => (
                              <button key={z.id} type="button"
                                onClick={() => setForm({ ...form, deliveryZoneId: z.id })}
                                className={btnCls((form.deliveryZoneId ?? zones[0]?.id) === z.id)}>
                                {z.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {(() => {
                    const selZ = zones.find(z => z.id === form.deliveryZoneId) ?? zones[0];
                    if (!selZ) return null;
                    const pt = selZ.pricingType ?? "standard";
                    if (pt === "km") return (
                      <div className="mt-1.5 text-[11px] text-blue-600 font-medium space-y-0.5">
                        <div>Sadzba: <strong>{selZ.ratePerKm?.toFixed(2)} €/km</strong></div>
                        {selZ.minimumFeeKm != null && <div>Min. poplatok: <strong>{selZ.minimumFeeKm.toFixed(2)} €/auto</strong></div>}
                        {(selZ.minKm ?? 0) > 0 && <div>Min. vzdialenosť: <strong>{selZ.minKm} km</strong></div>}
                        {(selZ.maxKm ?? 0) > 0 && <div>Max. polomer: <strong>{selZ.maxKm} km</strong></div>}
                      </div>
                    );
                    if (pt === "auto") return (
                      <div className="mt-1.5 text-[11px] text-blue-600 font-medium space-y-0.5">
                        <div>Paušál: <strong>{selZ.ratePerTruck?.toFixed(2)} €/auto</strong></div>
                        {selZ.minimumFeeAuto != null && <div>Min. poplatok: <strong>{selZ.minimumFeeAuto.toFixed(2)} €/auto</strong></div>}
                        {(selZ.minTrucks ?? 0) > 0 && <div>Min. áut: <strong>{selZ.minTrucks}</strong></div>}
                        {(selZ.maxTrucks ?? 0) > 0 && <div>Max. áut: <strong>{selZ.maxTrucks}</strong></div>}
                      </div>
                    );
                    const pz = adminData.getTransportZones();
                    if (pz.length > 0) return (
                      <div className="mt-1.5 text-[11px] text-blue-600 font-medium">
                        Pásma: <strong>{pz[0].ratePerM3.toFixed(2)} – {pz[pz.length - 1].ratePerM3.toFixed(2)} €/m³</strong>
                      </div>
                    );
                    return null;
                  })()}
                </div>
                <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 select-none">
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="accent-green-600 w-5 h-5 shrink-0" />
                  <span className="text-sm text-gray-700">Prístup aktívny</span>
                </label>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={sendRegEmail} onChange={e => setSendRegEmail(e.target.checked)} className="accent-secondary w-4 h-4" />
              <span className="text-sm text-gray-600">Poslať registračný email klientovi</span>
              {!form.email.trim() && sendRegEmail && (
                <span className="text-xs text-orange-500">(vyžaduje email)</span>
              )}
            </label>
            {emailStatus === "ok" && <p className="text-xs text-green-600">✓ Email odoslaný</p>}
            {emailStatus === "error" && <p className="text-xs text-red-500">✗ Email sa neodoslal (SMTP nie je nakonfigurované)</p>}
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-bold uppercase tracking-wide">Zrušiť</button>
              <button onClick={add} disabled={emailStatus === "sending"} className="px-6 py-2 bg-primary text-secondary font-bold text-sm uppercase tracking-wide hover:bg-primary/90 disabled:opacity-60">
                {emailStatus === "sending" ? "Ukladám…" : "Pridať"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client cards */}
      <div className="space-y-px">
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Žiadni klienti.</p>}
        {filtered.map(c => {
          const isExpanded = expanded === c.id;
          const isHashedPass = c.password?.startsWith("$2b$") || c.password?.startsWith("$2a$");
          const hasLogin = !!(c.loginId && c.password);
          const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
          const maxDisc = Math.max(c.discountBeton ?? 0, c.discountDoprava ?? 0, c.discountSluzby ?? 0, c.discountCelkovo ?? 0);
          const clientZone = c.deliveryZoneId ? zones.find(z => z.id === c.deliveryZoneId) : zones[0];
          const zonePricingType = clientZone?.pricingType ?? "standard";
          return (
            <div key={c.id} id={`client-card-${c.id}`} className={cn("border shadow-sm overflow-hidden transition-opacity", c.isOwner ? "bg-amber-50 border-primary/40" : "bg-white border-gray-200", !c.active && !c.isOwner && "opacity-50")}>
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { const next = isExpanded ? null : c.id; setExpanded(next); if (next) scrollToClientCard(next, true); }}>
                {/* Avatar + active dot */}
                <div className="relative shrink-0">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", c.isOwner ? "bg-primary/20" : "bg-secondary/10")}>
                    {c.isOwner
                      ? <Crown className="w-4 h-4 text-primary" />
                      : <span className="text-secondary font-black text-sm">{(c.firstName || c.company || "?").charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  {hasLogin && (
                    <span className={`sm:hidden absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${c.active ? "bg-green-500" : "bg-gray-300"}`}
                      title={c.active ? "Aktívny" : "Neaktívny"} />
                  )}
                </div>

                {/* Meno + mobile badges */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-secondary text-sm break-words leading-tight">{fullName}</div>
                  {c.company && <div className="text-xs text-gray-400 truncate">{c.company}</div>}
                  {/* Mobile-only badges — vždy vlastný riadok */}
                  <div className="sm:hidden flex items-center gap-1 mt-0.5 flex-wrap">
                    {(() => {
                      const discPairs = [
                        { key: "B", val: c.discountBeton ?? 0 },
                        { key: "D", val: c.discountDoprava ?? 0 },
                        { key: "S", val: c.discountSluzby ?? 0 },
                        { key: "C", val: c.discountCelkovo ?? 0 },
                      ].filter(d => d.val > 0);
                      if (discPairs.length === 0) return null;
                      return <span className="text-[10px] font-bold text-primary">
                        {discPairs.map(d => `${d.key}:−${d.val}%`).join(" ")}
                      </span>;
                    })()}
                    {clientZone && (
                      <span className="flex items-center gap-0.5 px-1 py-0 text-[10px] font-bold rounded bg-blue-50 text-blue-600 border border-blue-100">
                        <Truck className="w-2.5 h-2.5" />
                        {zonePricingType === "km" ? "€/km" : zonePricingType === "auto" ? "€/auto" : "Štd"}
                      </span>
                    )}
                    {c.isOwner && <span className="text-[10px] font-black text-primary/70">Admin</span>}
                  </div>
                </div>

                {/* Desktop: zľavy stĺpce */}
                <div className="hidden sm:flex w-80 shrink-0 items-center">
                  {[c.discountBeton ?? 0, c.discountDoprava ?? 0, c.discountSluzby ?? 0, c.discountCelkovo ?? 0].map((val, i) => (
                    <div key={i} className="w-20 text-center">
                      <span className={`text-sm font-bold ${val > 0 ? "text-primary" : "text-gray-300"}`}>{val}%</span>
                    </div>
                  ))}
                </div>

                {/* Desktop: badge stĺpec — pevná šírka zodpovedá header spaceru */}
                <div className="hidden sm:flex w-40 shrink-0 items-center justify-end gap-1">
                  {clientZone && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-blue-50 text-blue-600 border border-blue-200">
                      <Truck className="w-4 h-4" />
                      {zonePricingType === "km" ? "€/km" : zonePricingType === "auto" ? "€/auto" : "Štd"}
                    </span>
                  )}
                  {hasLogin ? (
                    <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.active ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                      {c.active ? "Aktívny" : "Neaktívny"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm bg-gray-100 text-gray-400">
                      <LogIn className="w-4 h-4" /> Bez prístupu
                    </span>
                  )}
                </div>
                {/* Ikona tlačidlá — pevná šírka zodpovedá header akciám */}
                <div className="flex items-center justify-end w-40 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(c.id); setClientDetailTab(prev => ({ ...prev, [c.id]: "calc" })); scrollToClientCard(c.id, true); }}
                    title="Kalkulačka klienta"
                    className="p-1.5 text-gray-300 hover:text-primary transition-colors">
                    <Calculator className="w-5 h-5" />
                  </button>
                  {c.sharedLink && (
                    <a href={c.sharedLink} target="_blank" rel="noopener noreferrer" title="Zdielaný odkaz"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 text-gray-300 hover:text-primary transition-colors">
                      {(() => { const { Icon, cls } = sharedLinkIcon(c.sharedLink); return <Icon className={`w-5 h-5 ${cls}`} />; })()}
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setTablePdfModal(c); setTablePdfMode("faktura"); }}
                    title="Zľavové tabuľky"
                    className="p-1.5 text-amber-400 hover:text-amber-600 transition-colors">
                    <Table2 className="w-5 h-5" />
                  </button>
                  {c.id !== SYSTEM_OWNER_ID && (
                    <button onClick={(e) => { e.stopPropagation(); remove(c.id); }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <span className="p-1 text-gray-300">
                    {isExpanded ? <ChevronUp className="w-5 h-5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4" />}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50">

                  {/* Tab bar: Detail | Kalkulačka */}
                  <div id={`client-tabs-${c.id}`} className="flex border-b border-gray-200">
                    <button
                      onClick={() => { setClientDetailTab(prev => ({ ...prev, [c.id]: "detail" })); scrollToClientCard(c.id, true); }}
                      className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wide transition-all", (clientDetailTab[c.id] ?? "detail") === "detail" ? "bg-secondary text-white" : "bg-white text-gray-400 hover:text-secondary hover:bg-secondary/5")}
                    >
                      <ClipboardList className={cn("w-5 h-5 shrink-0", (clientDetailTab[c.id] ?? "detail") === "detail" ? "text-primary" : "")} />
                      Detail
                    </button>
                    <button
                      onClick={() => { setClientDetailTab(prev => ({ ...prev, [c.id]: "calc" })); scrollToClientCard(c.id, true); }}
                      className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wide transition-all", clientDetailTab[c.id] === "calc" ? "bg-secondary text-white" : "bg-white text-gray-400 hover:text-secondary hover:bg-secondary/5")}
                    >
                      <Calculator className={cn("w-5 h-5 shrink-0", clientDetailTab[c.id] === "calc" ? "text-primary" : "")} />
                      Kalkulačka
                    </button>
                  </div>

                  {(clientDetailTab[c.id] ?? "detail") === "detail" && (<>

                  {/* Zľavy klienta */}
                  <div className="px-4 py-4 bg-white border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Zľavy klienta</p>
                    <DiscountGroupEditor
                      beton={(c.discountBeton as number) ?? 0}
                      doprava={(c.discountDoprava as number) ?? 0}
                      sluzby={(c.discountSluzby as number) ?? 0}
                      celkovo={(c.discountCelkovo as number) ?? 0}
                      onChange={v => update(c.id, {
                        discountBeton: v.beton,
                        discountDoprava: v.doprava,
                        discountSluzby: v.sluzby,
                        discountCelkovo: v.celkovo,
                      })}
                    />
                  </div>

                  {/* Hlavná mriežka: Osobné info | Prístup + Možnosti */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    {/* Ľavý stĺpec: Osobné info */}
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Osobné info</p>
                      <div className="space-y-1.5 text-sm">
                        {([
                          { label: "Meno", field: "firstName" },
                          { label: "Priezvisko", field: "lastName" },
                          { label: "Spoločnosť", field: "company" },
                          { label: "E-mail", field: "email" },
                          { label: "Telefón", field: "phone" },
                        ] as { label: string; field: keyof Client }[]).map(({ label, field }) => (
                          <div key={field} className="flex gap-2 items-start">
                            <span className="text-gray-400 text-xs w-20 shrink-0 pt-0.5">{label}</span>
                            <EditableField value={field === "phone" ? formatPhone((c[field] as string) || "") || "—" : (c[field] as string) || "—"} type={field === "phone" ? "tel" : "text"} onSave={v => update(c.id, { [field]: field === "phone" ? formatPhone(v) : v })} />
                          </div>
                        ))}
                        {c.createdAt && (
                          <div className="flex gap-2 items-center pt-1 border-t border-gray-100 mt-1">
                            <span className="text-gray-400 text-xs w-20 shrink-0">Vytvorený</span>
                            <span className="text-gray-600 text-xs font-medium">
                              {new Date(c.createdAt).toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-400 text-xs w-20 shrink-0">Prihlásený</span>
                          <span className={`text-xs font-medium ${c.lastLoginAt ? "text-gray-600" : "text-gray-300"}`}>
                            {c.lastLoginAt
                              ? new Date(c.lastLoginAt).toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" })
                              : "—"}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-400 text-xs w-20 shrink-0">Odkaz</span>
                          {editingLinkFor === c.id ? (
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <input autoFocus type="url" value={linkDraft} onChange={e => setLinkDraft(e.target.value)}
                                placeholder="https://…"
                                onKeyDown={e => { if (e.key === "Enter") { update(c.id, { sharedLink: linkDraft.trim() || undefined }); setEditingLinkFor(null); } if (e.key === "Escape") setEditingLinkFor(null); }}
                                className="flex-1 min-w-0 border border-primary px-2 py-0.5 text-xs focus:outline-none" />
                              <button onClick={() => { update(c.id, { sharedLink: linkDraft.trim() || undefined }); setEditingLinkFor(null); }} className="text-green-600 hover:text-green-700 shrink-0"><Check className="w-5 h-5" /></button>
                              <button onClick={() => setEditingLinkFor(null)} className="text-gray-400 hover:text-red-500 shrink-0"><X className="w-5 h-5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {c.sharedLink ? (
                                <a href={c.sharedLink} target="_blank" rel="noopener noreferrer" title={c.sharedLink}
                                  className="transition-colors hover:opacity-70">
                                  {(() => { const { Icon, cls } = sharedLinkIcon(c.sharedLink); return <Icon className={`w-5 h-5 ${cls}`} />; })()}
                                </a>
                              ) : (
                                <span className="text-gray-400 text-[10px]">— Google Sheet, PDF, Word</span>
                              )}
                              <button onClick={() => { setLinkDraft(c.sharedLink || ""); setEditingLinkFor(c.id); }}
                                className="p-2 text-gray-300 hover:text-secondary transition-colors">
                                <Pencil className="w-5 h-5" />
                              </button>
                              {c.sharedLink && (
                                <button onClick={() => update(c.id, { sharedLink: undefined })}
                                  className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pravý stĺpec: Prístup + Možnosti */}
                    <div className="px-4 py-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Prístup do kalkulačky</p>
                        <div className="border border-gray-200 bg-white divide-y divide-gray-100 mb-2">
                          <div className="flex items-center gap-2 px-3 py-2">
                            <span className="text-gray-400 text-xs w-14 shrink-0">Login ID</span>
                            <EditableField value={c.loginId || "—"} onSave={v => {
                              if (v.toLowerCase() === "msbeton") { alert("Login ID 'msbeton' je rezervované."); return; }
                              if (clients.some(other => other.id !== c.id && other.loginId?.toLowerCase() === v.toLowerCase())) { alert(`Login ID '${v}' už existuje.`); return; }
                              const phoneMatch = v.match(/^(\+?(?:00421|421|0)[0-9\s\-]{7,})/);
                              const extracted = phoneMatch ? formatPhone(phoneMatch[1].trim()) : "";
                              update(c.id, { loginId: v, ...(!c.phone && extracted ? { phone: extracted } : {}) });
                            }} />
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <span className="text-gray-400 text-xs w-14 shrink-0">Heslo</span>
                            <span className="font-mono text-secondary text-sm flex-1">
                              {isHashedPass
                                ? <span className="text-gray-400 text-xs italic">Zmenené klientom</span>
                                : showPass.has(c.id) ? (c.password || "—") : (c.password ? "••••••" : "—")}
                            </span>
                            <button onClick={() => togglePassVis(c.id)} className="text-gray-400 hover:text-secondary shrink-0">
                              {showPass.has(c.id) ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            <button onClick={() => update(c.id, { password: genPassword() })} title="Vygenerovať nové heslo" className="text-gray-400 hover:text-secondary shrink-0">
                              <RefreshCw className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <button onClick={() => update(c.id, { active: !c.active })}
                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold uppercase border transition-colors ${c.active ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                          {c.active ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          {c.active ? "Prístup aktívny" : "Prístup neaktívny"}
                        </button>

                        {/* Odoslať prihlasovacie údaje */}
                        {hasLogin && (
                          c.email ? (
                            (() => {
                              const state = sendCredState[c.id] ?? "idle";
                              return (
                                <button
                                  disabled={state === "loading"}
                                  onClick={async () => {
                                    setSendCredState(s => ({ ...s, [c.id]: "loading" }));
                                    try {
                                      const r = await authFetch(`/api/admin/clients/${c.id}/send-credentials`, { method: "POST" });
                                      const json = await r.json() as { ok: boolean; error?: string };
                                      setSendCredState(s => ({ ...s, [c.id]: json.ok ? "ok" : "error" }));
                                      setTimeout(() => setSendCredState(s => ({ ...s, [c.id]: "idle" })), 3500);
                                    } catch {
                                      setSendCredState(s => ({ ...s, [c.id]: "error" }));
                                      setTimeout(() => setSendCredState(s => ({ ...s, [c.id]: "idle" })), 3500);
                                    }
                                  }}
                                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border transition-colors mt-1 ${
                                    state === "ok" ? "bg-green-50 border-green-300 text-green-700" :
                                    state === "error" ? "bg-red-50 border-red-300 text-red-600" :
                                    "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                  } disabled:opacity-60`}>
                                  {state === "loading" ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Odosiela sa…</>
                                    : state === "ok" ? <><Check className="w-3.5 h-3.5" /> Email odoslaný</>
                                    : state === "error" ? <><X className="w-3.5 h-3.5" /> Chyba odoslania</>
                                    : <><Mail className="w-3.5 h-3.5" /> Znova odoslať prihlasovacie údaje</>}
                                </button>
                              );
                            })()
                          ) : (
                            <p className="text-[10px] text-gray-400 text-center mt-1 flex items-center justify-center gap-1">
                              <Mail className="w-3 h-3" /> Klient nemá email — prihlasovacie údaje nemožno odoslať
                            </p>
                          )
                        )}
                      </div>

                      {/* Štatistiky klienta */}
                      {(() => {
                        const cOrders = allOrders
                          .filter(o => o.clientId != null && (o.clientId === c.loginId || o.clientId === c.id))
                          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                        const totalM3 = cOrders.reduce((s, o) => s + o.quantity, 0);
                        const totalEur = cOrders.reduce((s, o) => s + o.totalBezDph, 0);
                        const last = cOrders[0];
                        const now = new Date();
                        const months = [2, 1, 0].map(i => {
                          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                          const cnt = cOrders.filter(o => o.createdAt.slice(0, 7) === key).length;
                          return { key, cnt, label: d.toLocaleString("sk", { month: "short" }) };
                        });
                        const maxCnt = Math.max(1, ...months.map(m => m.cnt));
                        return (
                          <div className="border-t border-gray-100 pt-3 mt-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Štatistiky</p>
                            {cOrders.length === 0 ? (
                              <p className="text-[10px] text-gray-400 text-center py-1">Žiadne objednávky</p>
                            ) : (
                              <>
                                <div className="grid grid-cols-3 gap-1.5 mb-2">
                                  {[
                                    { v: String(cOrders.length), l: "Objednávky" },
                                    { v: totalM3.toFixed(1) + " m³", l: "Celkom m³" },
                                    { v: "€ " + Math.round(totalEur).toLocaleString("sk"), l: "Bez DPH" },
                                  ].map(({ v, l }) => (
                                    <div key={l} className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-center">
                                      <div className="text-sm font-black text-secondary">{v}</div>
                                      <div className="text-[9px] text-gray-400 uppercase tracking-wide leading-tight">{l}</div>
                                    </div>
                                  ))}
                                </div>
                                {last && (
                                  <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded mb-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[9px] text-gray-400 uppercase tracking-wider">Posledná objednávka</div>
                                      <div className="text-xs text-secondary font-medium truncate">
                                        {new Date(last.createdAt).toLocaleDateString("sk")} · {last.concreteType} · {last.quantity} m³
                                      </div>
                                    </div>
                                    {onGoToOrders && (
                                      <button onClick={() => onGoToOrders(c.loginId ?? c.id, last?.id)} title="Zobraziť objednávky klienta" className="shrink-0 text-primary hover:text-secondary transition-colors cursor-pointer">
                                        <ExternalLink className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-end gap-1.5 h-9 px-0.5">
                                  {months.map(m => (
                                    <div key={m.key} className="flex-1 flex flex-col items-center gap-0.5">
                                      <div className="w-full rounded-sm" style={{ height: `${Math.max(3, (m.cnt / maxCnt) * 24)}px`, background: m.cnt > 0 ? "#001D3D99" : "#e5e7eb" }} />
                                      <span className="text-[8px] text-gray-400 leading-none">{m.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Možnosti — full-width pod 2-col mriežkou */}
                  <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Možnosti</p>
                        <div className="border border-gray-200 bg-white divide-y divide-gray-100">
                          {/* — PLATBA — */}
                          <div className="px-3 pt-1.5 pb-0.5 bg-gray-50">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Platba</span>
                          </div>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.canHotovost ?? true} onChange={e => update(c.id, { canHotovost: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-700">Hotovosť</span>
                              {(c.canHotovost ?? true) ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs text-gray-400">DPH:</span>
                                  <input type="number" min="0" max="100" value={Math.round((c.hotovostDph ?? 0.20) * 100)}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && v >= 0 && v <= 100) update(c.id, { hotovostDph: v / 100 }); }}
                                    className="border border-gray-200 px-2 py-0.5 text-xs focus:outline-none focus:border-primary w-16 text-center" />
                                  <span className="text-xs text-gray-400">%</span>
                                  <span className="text-[10px] text-gray-400 italic">· iba betón</span>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Iba faktúra · DPH <span className="font-bold text-gray-500">23 %</span></div>
                              )}
                            </div>
                          </label>
                          {/* — KALKULAČKA — */}
                          <div className="px-3 pt-1.5 pb-0.5 bg-gray-50">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Kalkulačka</span>
                          </div>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.canPridatBeton ?? true} onChange={e => update(c.id, { canPridatBeton: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-700">Pridať položku — Pumpa a Mix</span>
                              <div className="text-[11px] text-gray-400">„+ Pridať položku" v Pumpa/Mix tab</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.canPridatBetonOwn ?? true} onChange={e => update(c.id, { canPridatBetonOwn: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-700">Pridať položku — Vlastná doprava</span>
                              <div className="text-[11px] text-gray-400">„+ Pridať položku" vo Vl. doprava tab</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.canZimneOpatrenia ?? false} onChange={e => update(c.id, { canZimneOpatrenia: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                            <span className="text-sm text-gray-700">Zimné opatrenia</span>
                          </label>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.allowExtraOverload ?? true} onChange={e => update(c.id, { allowExtraOverload: e.target.checked })} className="accent-red-500 w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-700">Minusové pretaženie</span>
                              <div className="text-[11px] text-gray-400">Pod min. limit vozidiel (Pumpa {ts.condPumpaMin ?? 1} voz., Mix {ts.condMixMin ?? 0} voz.)</div>
                            </div>
                          </label>
                          {/* — SMS — */}
                          <div className="px-3 pt-1.5 pb-0.5 bg-gray-50">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">SMS</span>
                          </div>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.smsOrderDisabled ?? false} onChange={e => update(c.id, { smsOrderDisabled: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-700">Nevytvárať objednávku</span>
                              <div className="text-[11px] text-gray-400">Pretlačí globálne nastavenie · klik SMS = iba text, bez záznamu</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <input type="checkbox" checked={c.smsShareOnly ?? false} onChange={e => update(c.id, { smsShareOnly: e.target.checked })} className="accent-secondary w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-700">Zobraziť share menu</span>
                              <div className="text-[11px] text-gray-400">Namiesto auto-otvorenia SMS aplikácie · zdieľacie okno</div>
                            </div>
                          </label>
                          <div className="px-3 py-2.5">
                            <div className="text-xs text-gray-400 mb-1">Typ dopravy</div>
                            {(() => {
                              const allZ = adminData.getDelivery();
                              const curId = c.deliveryZoneId ?? allZ[0]?.id;
                              const selZ = allZ.find(z => z.id === curId) ?? allZ[0];
                              const selType = selZ?.pricingType ?? "standard";
                              const kmZones = allZ.filter(z => z.pricingType === "km");
                              const btnCls = (active: boolean) => `py-1 px-2 text-xs font-semibold border rounded transition-colors ${active ? "bg-secondary text-white border-secondary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`;
                              const typeRow = allZ.filter((z, i, arr) => {
                                if (z.pricingType === "km") return arr.findIndex(x => x.pricingType === "km") === i;
                                return true;
                              });
                              return (
                                <div className="space-y-1">
                                  <div className="flex gap-1 flex-wrap">
                                    {typeRow.map(z => {
                                      const isKmGroup = z.pricingType === "km";
                                      const isActive = isKmGroup ? selType === "km" : curId === z.id;
                                      return (
                                        <button key={z.id} type="button"
                                          onClick={() => {
                                            if (isKmGroup && selType !== "km") { const first = kmZones[0]; if (first) update(c.id, { deliveryZoneId: first.id }); }
                                            else if (!isKmGroup) update(c.id, { deliveryZoneId: z.id });
                                          }}
                                          className={btnCls(isActive)}>
                                          {isKmGroup ? "Kilometre" : z.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {selType === "km" && kmZones.length > 1 && (
                                    <div className="flex gap-1 pl-2 border-l-2 border-primary/30">
                                      {kmZones.map(z => (
                                        <button key={z.id} type="button"
                                          onClick={() => update(c.id, { deliveryZoneId: z.id })}
                                          className={btnCls(curId === z.id)}>
                                          {z.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {clientZone && (
                              <div className="mt-1 text-[11px] text-blue-600 font-medium">
                                {zonePricingType === "km" && `Sadzba: ${clientZone.ratePerKm?.toFixed(2)} €/km`}
                                {zonePricingType === "auto" && `Paušál: ${clientZone.ratePerTruck?.toFixed(2)} €/auto`}
                                {zonePricingType === "standard" && pZones.length > 0 && `Pásma: ${pZones[0].ratePerM3.toFixed(2)} – ${pZones[pZones.length - 1].ratePerM3.toFixed(2)} €/m³`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                  {/* Zľavové tabuľky */}
                  <div className="border-t border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setShowTableFor(showTableFor === c.id ? null : c.id)}
                        title={showTableFor === c.id ? "Skryť zľavové tabuľky" : "Zobraziť zľavové tabuľky"}
                        className={cn("flex items-center gap-1 p-1.5 rounded transition-colors border shrink-0", showTableFor === c.id ? "bg-amber-400 text-secondary border-amber-400" : "text-amber-400 hover:text-amber-600 border-amber-200 hover:border-amber-400")}
                      >
                        <Table2 className="w-4 h-4" />
                        {showTableFor === c.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {showTableFor === c.id && (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <PriceModeToggle mode={inlineTableMode} onChange={setInlineTableMode} showHotovost={c.canHotovost ?? true} size="sm" />
                          </div>
                          <button onClick={() => exportClientPricePDF(c, inlineTableMode, ts)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-secondary font-black text-xs hover:bg-primary/90 transition-colors cursor-pointer rounded-sm shrink-0">
                            <FileText className="w-5 h-5" /> PDF
                          </button>
                        </div>
                      )}
                    </div>
                    {showTableFor === c.id && (
                      <ClientPriceTable
                        discountBeton={c.discountBeton ?? 0}
                        discountDoprava={c.discountDoprava ?? 0}
                        discountSluzby={c.discountSluzby ?? 0}
                        discountCelkovo={c.discountCelkovo ?? 0}
                        manualPrices={c.manualPrices}
                        onManualPriceChange={(itemId, price) => {
                          const current = c.manualPrices ?? {};
                          let next: Record<string, number>;
                          if (price === null) {
                            const { [itemId]: _removed, ...rest } = current;
                            next = rest;
                          } else {
                            next = { ...current, [itemId]: price };
                          }
                          update(c.id, { manualPrices: next });
                        }}
                        priceMode={inlineTableMode}
                        hotovostDph={c.hotovostDph ?? (ts.defaultHotovostDph ?? 0.20)}
                        deliveryZoneId={c.deliveryZoneId}
                        variant="light"
                      />
                    )}
                  </div>

                  </>)}

                  {clientDetailTab[c.id] === "calc" && (
                    <div className="bg-[#1e2a3a]">
                      <ConcreteCalculator clientOverride={{
                        id: c.id,
                        clientId: c.loginId ?? "",
                        name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || c.id,
                        company: c.company ?? "",
                        phone: c.phone ?? "",
                        discountBeton: c.discountBeton ?? 0,
                        discountDoprava: c.discountDoprava ?? 0,
                        discountSluzby: c.discountSluzby ?? 0,
                        discountCelkovo: c.discountCelkovo ?? 0,
                        canHotovost: c.canHotovost ?? true,
                        canPridatBeton: c.canPridatBeton ?? true,
                        canZimneOpatrenia: c.canZimneOpatrenia ?? false,
                        hotovostDph: c.hotovostDph,
                        deliveryZoneId: c.deliveryZoneId,
                        manualPrices: c.manualPrices,
                        sharedLink: c.sharedLink,
                      }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Popup: Zľavové tabuľky klienta ── */}
      {tablePdfModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-14 px-4 pb-4 overflow-auto">
          <div className="bg-gray-50 w-full max-w-3xl my-4 shadow-2xl rounded-sm border-4 border-amber-400 overflow-hidden">

            {/* Header — amber top stripe signalizuje edit mode */}
            <div className="bg-secondary text-white px-6 pt-5 pb-4 border-t-4 border-amber-400">
              <div className="flex items-center gap-2 mb-0.5">
                {tablePdfModal.isOwner && <Crown className="w-4 h-4 text-primary shrink-0" />}
                <div className="font-black text-base uppercase tracking-widest">Zľavové tabuľky klienta</div>
              </div>
              <div className="text-sm text-white/60">
                {[tablePdfModal.firstName, tablePdfModal.lastName].filter(Boolean).join(" ")}
                {tablePdfModal.company && ` · ${tablePdfModal.company}`}
                {tablePdfModal.email && ` · ${tablePdfModal.email}`}
              </div>
            </div>

            {/* FAKTÚRA / HOTOVOSŤ tabs */}
            <div className="px-4 py-3 bg-[#1a2535] border-b border-white/10">
              <PriceModeToggle mode={tablePdfMode} onChange={setTablePdfMode} showHotovost={tablePdfModal?.canHotovost ?? true} size="lg" className="w-full" />
            </div>

            {/* Price table */}
            <div className="overflow-y-auto p-4" style={{ maxHeight: "60vh" }}>
              <ClientPriceTable
                discountBeton={tablePdfModal.discountBeton ?? 0}
                discountDoprava={tablePdfModal.discountDoprava ?? 0}
                discountSluzby={tablePdfModal.discountSluzby ?? 0}
                discountCelkovo={tablePdfModal.discountCelkovo ?? 0}
                manualPrices={tablePdfModal.manualPrices}
                onManualPriceChange={(itemId, price) => {
                  const current = tablePdfModal.manualPrices ?? {};
                  let next: Record<string, number>;
                  if (price === null) {
                    const { [itemId]: _removed, ...rest } = current;
                    next = rest;
                  } else {
                    next = { ...current, [itemId]: price };
                  }
                  update(tablePdfModal.id, { manualPrices: next });
                  setTablePdfModal({ ...tablePdfModal, manualPrices: next });
                }}
                priceMode={tablePdfMode}
                hotovostDph={tablePdfModal.hotovostDph ?? (ts.defaultHotovostDph ?? 0.20)}
                deliveryZoneId={tablePdfModal.deliveryZoneId}
                variant="light"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-white">
              <button type="button" onClick={() => setTablePdfModal(null)}
                className="px-4 py-2 border border-secondary text-secondary font-bold text-sm hover:bg-secondary hover:text-white transition-colors cursor-pointer">
                ZAVRIEŤ
              </button>
              <button type="button" onClick={() => exportClientPricePDF(tablePdfModal, tablePdfMode, ts)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-bold text-sm hover:bg-primary/90 transition-colors cursor-pointer">
                <FileText className="w-4 h-4" /> EXPORTOVAŤ PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
