import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, Search, FileText, Monitor } from "lucide-react";
import { authFetch, MiniBar, SparkLine } from "./_shared";

interface GscData {
  summary: { clicks28: number; impressions28: number; avgCtr28: number; avgPosition28: number };
  queries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  pages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
  devices: Array<{ device: string; clicks: number; impressions: number; ctr: number }>;
  countries: Array<{ country: string; clicks: number; impressions: number }>;
  daily: Array<{ date: string; clicks: number; impressions: number }>;
}

const COUNTRY_FLAG: Record<string, string> = {
  "Slovakia": "🇸🇰", "Czech Republic": "🇨🇿", "Czechia": "🇨🇿",
  "Austria": "🇦🇹", "Hungary": "🇭🇺", "Poland": "🇵🇱",
  "Germany": "🇩🇪", "Ukraine": "🇺🇦", "Romania": "🇷🇴",
  "United States": "🇺🇸", "United Kingdom": "🇬🇧", "France": "🇫🇷",
  "Netherlands": "🇳🇱", "Italy": "🇮🇹", "Spain": "🇪🇸",
};
const countryFlag = (c: string) => COUNTRY_FLAG[c] ?? "🌍";

const PATH_LABELS: Record<string, string> = {
  "/": "Domov",
  "/admin/dashboard": "Admin",
  "/admin/login": "Admin login",
  "/cennik": "Cenník",
  "/prihlasenie": "Prihlásenie",
  "/klient-profil": "Klient profil",
  "/vozovy-park": "Vozový park",
  "/klient-reset": "Reset hesla",
  "/kontakt": "Kontakt",
  "/o-nas": "O nás",
};
const pathHuman = (p: string) => PATH_LABELS[p] ?? p;

export default function SearchConsoleTab() {
  const [data, setData] = useState<GscData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true); setErr(null);
    authFetch("/api/admin/analytics/gsc")
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`); return j as GscData; })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(String(e instanceof Error ? e.message : e)); setLoading(false); });
  }, [refreshKey]);

  if (loading) return <div className="flex items-center justify-center h-64 gap-3 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin" /> Načítavam GSC dáta…</div>;
  if (err) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p className="text-red-600 font-semibold mb-2">Search Console nedostupné</p>
      <p className="text-red-400 text-sm mb-4">{err}</p>
      <button onClick={() => setRefreshKey(k => k + 1)} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-semibold transition-colors">Skúsiť znova</button>
    </div>
  );
  if (!data) return null;

  const maxQ = Math.max(...data.queries.map(q => q.clicks), 1);
  const maxP = Math.max(...data.pages.map(p => p.clicks), 1);

  const posColor = (p: number) => p <= 3 ? "#10b981" : p <= 10 ? "#EDC531" : "#f87171";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-secondary uppercase tracking-widest">Google Search Console</h2>
        <button onClick={() => setRefreshKey(k => k + 1)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-semibold transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Obnoviť
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Kliky (28 dní)", val: data.summary.clicks28.toLocaleString("sk"), sub: "Organické kliky zo SERPu" },
          { label: "Impresie (28 dní)", val: data.summary.impressions28.toLocaleString("sk"), sub: "Koľkokrát sa objavil v Google" },
          { label: "Priem. CTR", val: `${(data.summary.avgCtr28 * 100).toFixed(1)} %`, sub: "Click-through rate z impresií" },
          { label: "Priem. pozícia", val: data.summary.avgPosition28.toFixed(1), sub: "Priemerná pozícia v Google" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{k.label}</div>
            <div className="text-3xl font-black text-secondary">{k.val}</div>
            <div className="text-[10px] text-gray-400 mt-1 leading-tight">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Denný trend — Impresie / Kliky (90 dní)</span>
        </div>
        <SparkLine data={data.daily.map(d => d.impressions)} color="#3b82f6" />
        <SparkLine data={data.daily.map(d => d.clicks)} color="#EDC531" />
        <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Impresie</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" /> Kliky</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Top queries */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Top vyhľadávacie frázy (28 dní)</span>
          </div>
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_48px_56px_56px_56px] gap-2 text-[9px] uppercase tracking-widest text-gray-400 font-black pb-1 border-b border-gray-100">
              <span>Fráza</span><span className="text-right">Kliky</span><span className="text-right">Impr.</span><span className="text-right">CTR</span><span className="text-right">Poz.</span>
            </div>
            {data.queries.map((q, i) => (
              <div key={q.query} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_48px_56px_56px_56px] gap-2 items-center text-[11px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[8px] text-gray-400 w-3 shrink-0">{i + 1}</span>
                    <span className="font-medium text-gray-700 truncate">{q.query}</span>
                  </div>
                  <MiniBar value={q.clicks} max={maxQ} color="#EDC531" />
                </div>
                <span className="font-black text-secondary text-right">{q.clicks}</span>
                <span className="hidden sm:block text-gray-500 text-right">{q.impressions}</span>
                <span className="hidden sm:block text-gray-500 text-right">{(q.ctr * 100).toFixed(1)}%</span>
                <span className="hidden sm:block font-bold text-right" style={{ color: posColor(q.position) }}>{q.position.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top pages */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Top stránky z organiku (28 dní)</span>
          </div>
          <div className="space-y-2">
            {data.pages.map((p, i) => {
              const path = (() => { try { return new URL(p.page).pathname; } catch { return p.page; } })();
              return (
                <div key={p.page} className="text-[11px]">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[8px] text-gray-400 shrink-0">{i + 1}</span>
                    <span className="font-medium text-gray-700 truncate flex-1">{pathHuman(path)}</span>
                    <span className="font-black text-secondary shrink-0">{p.clicks}</span>
                  </div>
                  <MiniBar value={p.clicks} max={maxP} color="#8b5cf6" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Devices + Countries */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Zariadenia (28 dní)</span>
          </div>
          <div className="space-y-2 mb-4">
            {data.devices.map(d => (
              <div key={d.device} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 capitalize text-gray-600 font-medium shrink-0">{d.device}</span>
                <MiniBar value={d.clicks} max={Math.max(...data.devices.map(x => x.clicks), 1)} color={d.device === "MOBILE" ? "#3b82f6" : "#EDC531"} />
                <span className="w-8 text-right font-bold text-secondary shrink-0">{d.clicks}</span>
                <span className="w-10 text-right text-gray-400 shrink-0">{(d.ctr * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 border-t border-gray-100 pt-3">Krajiny</div>
          <div className="space-y-1.5">
            {data.countries.slice(0, 5).map(c => (
              <div key={c.country} className="flex items-center gap-2 text-[11px]">
                <span className="text-base leading-none shrink-0">{countryFlag(c.country.charAt(0).toUpperCase() + c.country.slice(1).toLowerCase())}</span>
                <span className="flex-1 text-gray-600 font-medium truncate capitalize">{c.country.toLowerCase()}</span>
                <span className="font-bold text-secondary shrink-0">{c.clicks}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
