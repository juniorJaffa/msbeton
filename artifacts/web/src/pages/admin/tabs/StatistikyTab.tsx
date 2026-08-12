import { useState } from "react";
import { adminData } from "@/lib/adminData";

// Statusy považované za "realizované" (doručené / fakturované / zaplatené)
const REALIZED_STATUSES = new Set(["potvrdena", "odoslana", "vyuctovana", "vyplatena"]);

export default function StatistikyTab() {
  const orders = adminData.getOrders();
  const [statsMode, setStatsMode] = useState<"realized" | "all">("realized");

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

  const total = orders.length;
  const todayCount = orders.filter(o => o.createdAt.slice(0, 10) === todayStr).length;
  const weekCount = orders.filter(o => new Date(o.createdAt) >= weekAgo).length;
  const monthCount = orders.filter(o => new Date(o.createdAt) >= monthAgo).length;

  const byStatus = { nova: 0, potvrdena: 0, odoslana: 0, vybavena: 0, vyuctovana: 0, vyplatena: 0, zrusena: 0 } as Record<string, number>;
  const byType = { pumpa: 0, mix: 0, vlastnadoprava: 0 } as Record<string, number>;
  const byPayment = { faktura: 0, hotovost: 0 } as Record<string, number>;
  let sms = 0;
  orders.forEach(o => {
    if (o.status in byStatus) byStatus[o.status]++;
    byType[o.tab] = (byType[o.tab] ?? 0) + 1;
    byPayment[o.priceMode] = (byPayment[o.priceMode] ?? 0) + 1;
    if (o.viaSms) sms++;
  });

  // active = všetky okrem zrušených
  const active = orders.filter(o => o.status !== "zrusena");
  // realized = len potvrdené / odoslané / vyúčtované / vyplatené (nie nova)
  const realized = orders.filter(o => REALIZED_STATUSES.has(o.status));

  const statsOrders = statsMode === "realized" ? realized : active;

  const totalBezDph = statsOrders.reduce((s, o) => s + (o.totalBezDph || 0), 0);
  const totalSDph   = statsOrders.reduce((s, o) => s + (o.totalSDph   || 0), 0);
  const avgValue    = statsOrders.length > 0 ? totalBezDph / statsOrders.length : 0;

  // Nova objednávky per mesiac (pre annotation)
  const novaByMonth = new Map<string, { count: number; bezDph: number; sDph: number }>();
  orders.filter(o => o.status === "nova").forEach(o => {
    const ym = o.createdAt.slice(0, 7);
    const cur = novaByMonth.get(ym) ?? { count: 0, bezDph: 0, sDph: 0 };
    cur.count++;
    cur.bezDph += o.totalBezDph || 0;
    cur.sDph   += o.totalSDph   || 0;
    novaByMonth.set(ym, cur);
  });
  const totalNovaCount = orders.filter(o => o.status === "nova").length;
  const totalNovaBezDph = orders.filter(o => o.status === "nova").reduce((s, o) => s + (o.totalBezDph || 0), 0);

  const weeks: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now); start.setDate(start.getDate() - (i + 1) * 7);
    const end   = new Date(now); end.setDate(end.getDate() - i * 7);
    weeks.push({
      label: i === 0 ? "teraz" : `−${i}t`,
      count: orders.filter(o => { const d = new Date(o.createdAt); return d >= start && d < end; }).length,
    });
  }
  const maxWeek = Math.max(...weeks.map(w => w.count), 1);

  const fmtEur = (n: number) => `${n.toLocaleString("sk", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  // ── Mesačné uzávierky ──
  const SK_MONTHS = ["Jan","Feb","Mar","Apr","Máj","Jún","Júl","Aug","Sep","Okt","Nov","Dec"];
  const fmtMonth = (ym: string) => { const [y, m] = ym.split("-"); return `${SK_MONTHS[parseInt(m) - 1]} ${y}`; };

  const monthlyMap = new Map<string, { count: number; m3: number; bezDph: number; sDph: number; faktura: number; hotovost: number }>();
  statsOrders.forEach(o => {
    const ym = o.createdAt.slice(0, 7);
    const cur = monthlyMap.get(ym) ?? { count: 0, m3: 0, bezDph: 0, sDph: 0, faktura: 0, hotovost: 0 };
    cur.count++;
    cur.m3     += o.totalQty || 0;
    cur.bezDph += o.totalBezDph || 0;
    cur.sDph   += o.totalSDph   || 0;
    if (o.priceMode === "faktura") cur.faktura  += o.totalBezDph || 0;
    else                           cur.hotovost += o.totalBezDph || 0;
    monthlyMap.set(ym, cur);
  });
  // Zabezpeč že mesiace s iba nova objednávkami sa tiež objavia (v realized mode môžu byť prázdne)
  novaByMonth.forEach((_, ym) => { if (!monthlyMap.has(ym)) monthlyMap.set(ym, { count: 0, m3: 0, bezDph: 0, sDph: 0, faktura: 0, hotovost: 0 }); });

  const monthlyData = Array.from(monthlyMap.entries()).sort(([a], [b]) => b.localeCompare(a));
  const maxMonthRev = Math.max(...monthlyData.map(([, v]) => v.bezDph), 1);

  // ── Klientský obrat ──
  const clientMap = new Map<string, { name: string; clientId?: string; count: number; m3: number; bezDph: number; sDph: number }>();
  statsOrders.forEach(o => {
    const key = o.clientId ? `id:${o.clientId}` : `name:${o.clientName}`;
    const cur = clientMap.get(key) ?? { name: o.clientName, clientId: o.clientId, count: 0, m3: 0, bezDph: 0, sDph: 0 };
    cur.count++;
    cur.m3     = Math.round((cur.m3 + (o.totalQty || 0)) * 10) / 10;
    cur.bezDph += o.totalBezDph || 0;
    cur.sDph   += o.totalSDph   || 0;
    clientMap.set(key, cur);
  });
  const clientData = Array.from(clientMap.values()).sort((a, b) => b.bezDph - a.bezDph);
  const maxClientRev = Math.max(...clientData.map(c => c.bezDph), 1);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-secondary uppercase tracking-widest">Štatistiky objednávok</h2>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Celkom", value: total, sub: "všetky" },
          { label: "Dnes", value: todayCount, sub: todayStr },
          { label: "Týždeň", value: weekCount, sub: "posl. 7 dní" },
          { label: "Mesiac", value: monthCount, sub: "posl. 30 dní" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-sm border border-gray-200 p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className="text-3xl font-black text-secondary mt-1">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue + Nova warning */}
      {statsOrders.length > 0 && (
        <div className="bg-white rounded-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {statsMode === "realized" ? "Realizovaný obrat" : "Celkový obrat (bez zrušených)"}
            </p>
            {/* Toggle */}
            <div className="flex rounded-sm border border-gray-200 overflow-hidden text-[10px] font-black">
              <button
                onClick={() => setStatsMode("realized")}
                className={`px-2.5 py-1 transition-colors ${statsMode === "realized" ? "bg-secondary text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                Realizované
              </button>
              <button
                onClick={() => setStatsMode("all")}
                className={`px-2.5 py-1 transition-colors border-l border-gray-200 ${statsMode === "all" ? "bg-secondary text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                Všetky
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-[10px] text-gray-400 uppercase">Bez DPH</p><p className="text-xl font-black text-secondary">{fmtEur(totalBezDph)}</p></div>
            <div><p className="text-[10px] text-gray-400 uppercase">S DPH</p><p className="text-xl font-black text-secondary">{fmtEur(totalSDph)}</p></div>
            <div><p className="text-[10px] text-gray-400 uppercase">Priemerná</p><p className="text-xl font-black text-secondary">{fmtEur(avgValue)}</p></div>
          </div>
          {/* Nova warning — zobrazí sa len v realized mode */}
          {statsMode === "realized" && totalNovaCount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <p className="text-[11px] text-gray-400">
                <span className="font-black text-blue-600">{totalNovaCount} Nových</span> objednávok
                {" "}(<span className="font-bold">{fmtEur(totalNovaBezDph)}</span> bez DPH)
                {" "}nie je zahrnutých — čakajú na potvrdenie
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Status */}
        <div className="bg-white rounded-sm border border-gray-200 p-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Podľa statusu</p>
          <div className="space-y-2">
            {([
              { key: "nova",       label: "Nová",        color: "bg-blue-500" },
              { key: "potvrdena",  label: "Potvrdená",   color: "bg-yellow-400" },
              { key: "odoslana",   label: "Odoslaná",    color: "bg-green-500" },
              { key: "vybavena",   label: "Vybavená",    color: "bg-teal-500" },
              { key: "vyuctovana", label: "Vyúčtovaná",  color: "bg-purple-400" },
              { key: "vyplatena",  label: "Vyplatená",   color: "bg-green-700" },
              { key: "zrusena",    label: "Zrušená",     color: "bg-red-400" },
            ] as { key: string; label: string; color: string }[]).filter(s => byStatus[s.key] > 0).map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-20 text-xs text-gray-600 shrink-0">{s.label}</span>
                <div className="flex-1 bg-gray-100 rounded-sm h-2 overflow-hidden">
                  <div className={`h-full rounded-sm ${s.color}`} style={{ width: `${pct(byStatus[s.key])}%` }} />
                </div>
                <span className="w-6 text-xs font-bold text-gray-500 text-right shrink-0">{byStatus[s.key]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {/* Typ */}
          <div className="bg-white rounded-sm border border-gray-200 p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Typ</p>
            <div className="space-y-2">
              {([
                { key: "pumpa",         label: "Pumpa",       color: "bg-secondary" },
                { key: "mix",           label: "Mix",         color: "bg-primary" },
                { key: "vlastnadoprava",label: "Vl. doprava", color: "bg-gray-400" },
              ] as { key: string; label: string; color: string }[]).filter(t => byType[t.key] > 0).map(t => (
                <div key={t.key} className="flex items-center gap-2">
                  <span className="w-20 text-xs text-gray-600 shrink-0">{t.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-sm h-2 overflow-hidden">
                    <div className={`h-full rounded-sm ${t.color}`} style={{ width: `${pct(byType[t.key])}%` }} />
                  </div>
                  <span className="w-6 text-xs font-bold text-gray-500 text-right shrink-0">{byType[t.key]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-sm border border-gray-200 p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Platba</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-gray-600">Faktúra</span><span className="font-bold text-secondary">{byPayment.faktura ?? 0}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-600">Hotovosť</span><span className="font-bold text-secondary">{byPayment.hotovost ?? 0}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-sm border border-gray-200 p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Zdroj</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-gray-600">Košík</span><span className="font-bold text-secondary">{total - sms}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-600">SMS</span><span className="font-bold text-secondary">{sms}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly trend */}
      {total > 0 && (
        <div className="bg-white rounded-sm border border-gray-200 p-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Trend (posledných 12 týždňov)</p>
          <div className="flex items-end gap-0.5 h-16">
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: "44px" }}>
                  <div
                    className={`w-full rounded-sm ${i === 11 ? "bg-primary" : "bg-secondary/35"}`}
                    style={{ height: `${Math.max((w.count / maxWeek) * 44, w.count > 0 ? 3 : 0)}px` }}
                    title={`${w.label}: ${w.count}`}
                  />
                </div>
                <span className="text-[7px] text-gray-400 leading-none truncate w-full text-center">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mesačné uzávierky ── */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesačné uzávierky</p>
              {statsMode === "realized" && <p className="text-[9px] text-gray-400 mt-0.5">Len potvrdené + odoslané + vyúčtované + vyplatené</p>}
            </div>
            <p className="text-[10px] text-gray-400">{monthlyData.length} mesiacov</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wide">Mesiac</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Obj.</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase hidden sm:table-cell">m³</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Bez DPH</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase hidden sm:table-cell">S DPH</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase hidden md:table-cell">Faktúra</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase hidden md:table-cell">Hotovosť</th>
                <th className="w-20 px-3 py-2 hidden lg:table-cell"></th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(([ym, v], idx) => {
                const nova = novaByMonth.get(ym);
                return (
                  <tr key={ym} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${idx === 0 ? "bg-amber-50/40" : ""}`}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="font-bold text-secondary">{fmtMonth(ym)}</span>
                      {idx === 0 && <span className="inline-block w-2 h-2 rounded-full bg-primary ml-2 align-middle shrink-0" title="Aktuálny mesiac" aria-label="Aktuálny mesiac" />}
                      {/* Nova annotation — iba v realized mode */}
                      {statsMode === "realized" && nova && nova.count > 0 && (
                        <div className="text-[9px] text-blue-400 font-semibold mt-0.5">
                          +{nova.count} nova · {fmtEur(nova.bezDph)}
                        </div>
                      )}
                    </td>
                    <td className="text-right px-3 py-2.5 font-bold text-gray-700">{v.count}</td>
                    <td className="text-right px-3 py-2.5 text-gray-600 hidden sm:table-cell">{v.m3.toFixed(1)}</td>
                    <td className="text-right px-3 py-2.5 font-black text-secondary whitespace-nowrap">{v.bezDph > 0 ? fmtEur(v.bezDph) : <span className="text-gray-300">—</span>}</td>
                    <td className="text-right px-3 py-2.5 text-gray-500 whitespace-nowrap hidden sm:table-cell">{v.sDph > 0 ? fmtEur(v.sDph) : <span className="text-gray-300">—</span>}</td>
                    <td className="text-right px-3 py-2.5 text-gray-400 whitespace-nowrap hidden md:table-cell">{v.faktura > 0 ? fmtEur(v.faktura) : "—"}</td>
                    <td className="text-right px-3 py-2.5 text-gray-400 whitespace-nowrap hidden md:table-cell">{v.hotovost > 0 ? fmtEur(v.hotovost) : "—"}</td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${v.bezDph > 0 ? Math.round((v.bezDph / maxMonthRev) * 100) : 0}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/5 border-t-2 border-secondary/20">
                <td className="px-4 py-2.5 font-black text-secondary text-[10px] uppercase tracking-wide">CELKOM</td>
                <td className="text-right px-3 py-2.5 font-black text-secondary">{statsOrders.length}</td>
                <td className="text-right px-3 py-2.5 font-black text-secondary hidden sm:table-cell">{statsOrders.reduce((s, o) => s + (o.totalQty || 0), 0).toFixed(1)}</td>
                <td className="text-right px-3 py-2.5 font-black text-secondary whitespace-nowrap">{fmtEur(totalBezDph)}</td>
                <td className="text-right px-3 py-2.5 font-black text-secondary whitespace-nowrap hidden sm:table-cell">{fmtEur(totalSDph)}</td>
                <td className="text-right px-3 py-2.5 font-black text-gray-500 whitespace-nowrap hidden md:table-cell">{fmtEur(statsOrders.filter(o => o.priceMode === "faktura").reduce((s, o) => s + (o.totalBezDph || 0), 0))}</td>
                <td className="text-right px-3 py-2.5 font-black text-gray-500 whitespace-nowrap hidden md:table-cell">{fmtEur(statsOrders.filter(o => o.priceMode === "hotovost").reduce((s, o) => s + (o.totalBezDph || 0), 0))}</td>
                <td className="hidden lg:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Klientský obrat ── */}
      {clientData.length > 0 && (
        <div className="bg-white rounded-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOP klienti – obrat</p>
              {statsMode === "realized" && <p className="text-[9px] text-gray-400 mt-0.5">Len realizované objednávky</p>}
            </div>
            <p className="text-[10px] text-gray-400">{clientData.length} klientov</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2 text-[10px] font-black text-gray-400 uppercase">#</th>
                <th className="text-left px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Klient</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Obj.</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase hidden sm:table-cell">m³</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase">Bez DPH</th>
                <th className="text-right px-3 py-2 text-[10px] font-black text-gray-400 uppercase hidden sm:table-cell">S DPH</th>
                <th className="w-24 px-3 py-2 hidden md:table-cell"></th>
              </tr>
            </thead>
            <tbody>
              {clientData.map((c, idx) => (
                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-2.5">
                    {idx === 0 ? <span className="text-primary font-black">🥇</span>
                     : idx === 1 ? <span className="text-gray-400 font-black">🥈</span>
                     : idx === 2 ? <span className="text-amber-700 font-black">🥉</span>
                     : <span className="text-gray-400 font-bold">{idx + 1}</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-secondary truncate max-w-[140px]">{c.name}</div>
                    {c.clientId && <div className="text-[10px] text-gray-400 font-mono">ID: {c.clientId}</div>}
                  </td>
                  <td className="text-right px-3 py-2.5 font-bold text-gray-700">{c.count}</td>
                  <td className="text-right px-3 py-2.5 text-gray-600 hidden sm:table-cell">{c.m3.toFixed(1)}</td>
                  <td className="text-right px-3 py-2.5 font-black text-secondary whitespace-nowrap">{fmtEur(c.bezDph)}</td>
                  <td className="text-right px-3 py-2.5 text-gray-500 whitespace-nowrap hidden sm:table-cell">{fmtEur(c.sDph)}</td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((c.bezDph / maxClientRev) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
