import { useState, useEffect, useRef, useCallback } from "react";
import { Smartphone, Tablet, Laptop, Globe, UserPlus, Users, TrendingUp, BarChart2, MousePointerClick, RefreshCw, Monitor, FileText, Activity } from "lucide-react";
import { authFetch, MiniBar, SparkLine } from "./_shared";

// ── Realtime types + constants ────────────────────────────────────────────────
interface RealtimeData {
  activeNow: number;
  byMinute: Array<{ minutesAgo: number; users: number }>;
  byDevice: Array<{ device: string; users: number }>;
  byPage: Array<{ page: string; users: number }>;
  byCountry: Array<{ country: string; users: number }>;
}

const REFRESH_SECS = 60;
const COUNTRY_FLAG: Record<string, string> = {
  "Slovakia": "🇸🇰", "Czech Republic": "🇨🇿", "Czechia": "🇨🇿",
  "Austria": "🇦🇹", "Hungary": "🇭🇺", "Poland": "🇵🇱",
  "Germany": "🇩🇪", "Ukraine": "🇺🇦", "Romania": "🇷🇴",
  "United States": "🇺🇸", "United Kingdom": "🇬🇧", "France": "🇫🇷",
  "Netherlands": "🇳🇱", "Italy": "🇮🇹", "Spain": "🇪🇸",
};
const countryFlag = (c: string) => COUNTRY_FLAG[c] ?? "🌍";
const deviceIcon = (d: string) => {
  if (d === "mobile") return <Smartphone className="w-3.5 h-3.5" />;
  if (d === "tablet") return <Tablet className="w-3.5 h-3.5" />;
  return <Laptop className="w-3.5 h-3.5" />;
};
const pageLabel = (p: string) => p.length > 28 ? p.slice(0, 26) + "…" : p;

// ── GA4 types + constants ─────────────────────────────────────────────────────
interface Ga4Data {
  overview: { activeUsers30: number; sessions30: number; pageViews30: number; newUsers30: number; events30: number; activeUsers90: number; sessions90: number; pageViews90: number; newUsers90: number };
  daily: Array<{ date: string; sessions: number; users: number }>;
  events: Array<{ name: string; count: number }>;
  devices: Array<{ device: string; sessions: number; users: number }>;
  sources: Array<{ channel: string; sessions: number }>;
  pages: Array<{ path: string; views: number }>;
  countries: Array<{ country: string; sessions: number }>;
  cities?: Array<{ city: string; country: string; sessions: number }>;
}

const CALC_EVENTS = ["calculator_complete", "pdf_export", "sms_export", "order_submitted", "calc_tab", "calc_type_select"];

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

// SVK cities: [svgX, svgY] in viewBox 0 0 400 160
// projection: x=(lon-16.80)/5.80*400, y=(49.60-lat)/1.90*160
const SVK_CITY_SVG: Record<string, [number, number]> = {
  "Bratislava": [21, 122], "Trnava": [55, 96], "Piešťany": [48, 90], "Piestany": [48, 90],
  "Trenčín": [86, 58], "Trencin": [86, 58], "Nitra": [89, 103], "Nové Zámky": [80, 118], "Nove Zamky": [80, 118],
  "Komárno": [85, 135], "Komarno": [85, 135], "Žilina": [134, 32], "Zilina": [134, 32],
  "Martin": [148, 41], "Ružomberok": [175, 40], "Ruzomberok": [175, 40],
  "Liptovský Mikuláš": [199, 40], "Liptovsky Mikulas": [199, 40],
  "Banská Bystrica": [162, 72], "Banska Bystrica": [162, 72],
  "Zvolen": [162, 86], "Lučenec": [185, 103], "Lucenec": [185, 103],
  "Poprad": [241, 45], "Spišská Nová Ves": [275, 52], "Spisska Nova Ves": [275, 52],
  "Prešov": [306, 51], "Presov": [306, 51], "Košice": [308, 74], "Kosice": [308, 74],
  "Humenné": [358, 52], "Humenne": [358, 52], "Michalovce": [371, 67],
};

// ── RealtimeCard component ────────────────────────────────────────────────────
function RealtimeCard() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_SECS);

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/admin/analytics/realtime", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setData(await r.json());
      setErrored(false);
    } catch {
      setErrored(true);
    }
    setLoading(false);
    setCountdown(REFRESH_SECS);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, REFRESH_SECS * 1000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000); return () => clearInterval(t); }, []);

  // bars: index 0 = 30 min ago, index 29 = now (reverse byMinute which is 0=now)
  const bars = data ? [...data.byMinute].reverse() : Array.from({ length: 30 }, (_, i) => ({ minutesAgo: 29 - i, users: 0 }));
  const maxBar = Math.max(...bars.map(b => b.users), 1);
  const totalDevices = (data?.byDevice ?? []).reduce((s, d) => s + d.users, 0);

  return (
    <div className="bg-secondary rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Live</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Aktívni v posledných 30 minútach</span>
        </div>
        <button onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors text-[10px] font-bold">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>{countdown}s</span>
        </button>
      </div>

      {/* Big number */}
      <div className="text-center py-4">
        {errored ? (
          <p className="text-white/30 text-sm">GA4 nedostupné</p>
        ) : loading && !data ? (
          <div className="flex items-center justify-center gap-2 text-white/30 text-sm"><RefreshCw className="w-4 h-4 animate-spin" /> Načítavam…</div>
        ) : (
          <>
            <div className="text-6xl font-black text-white leading-none">{data?.activeNow ?? 0}</div>
            <div className="text-xs text-white/40 mt-1 font-medium">
              {data?.activeNow === 1 ? "aktívny používateľ" : data?.activeNow === 0 ? "žiadni aktívni používatelia" : "aktívnych používateľov"}
            </div>
          </>
        )}
      </div>

      {/* 30-bar minute chart */}
      <div className="px-4 pb-2">
        <div className="flex items-end gap-[2px] h-12">
          {bars.map((b, i) => {
            const pct = Math.max(b.users > 0 ? 8 : 2, (b.users / maxBar) * 100);
            const isRecent = i >= 25;
            return (
              <div key={i} className="flex-1 flex flex-col justify-end" title={`${b.minutesAgo} min späť: ${b.users}`}>
                <div className="rounded-sm transition-all"
                  style={{ height: `${pct}%`, background: b.users === 0 ? "rgba(255,255,255,0.08)" : isRecent ? "#4ade80" : "#EDC531", opacity: b.users === 0 ? 1 : 0.85 + (i / 29) * 0.15 }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-white/20">30 min späť</span>
          <span className="text-[9px] text-white/20">teraz</span>
        </div>
      </div>

      {/* Device + Pages */}
      {data && (data.byDevice.length > 0 || data.byPage.length > 0) && (
        <div className="grid grid-cols-2 gap-px border-t border-white/10">
          {/* Devices */}
          <div className="px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Zariadenia</p>
            <div className="space-y-1.5">
              {data.byDevice.map(d => (
                <div key={d.device} className="flex items-center gap-2">
                  <span className="text-white/40">{deviceIcon(d.device)}</span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${totalDevices > 0 ? (d.users / totalDevices) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-black text-white/70 w-4 text-right">{d.users}</span>
                </div>
              ))}
              {data.byDevice.length === 0 && <p className="text-[10px] text-white/20">—</p>}
            </div>
          </div>
          {/* Pages */}
          <div className="px-4 py-3 border-l border-white/10">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Top stránky</p>
            <div className="space-y-1.5">
              {data.byPage.slice(0, 4).map(p => (
                <div key={p.page} className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-white/50 font-mono truncate">{pageLabel(p.page)}</span>
                  <span className="text-[10px] font-black text-primary shrink-0">{p.users}</span>
                </div>
              ))}
              {data.byPage.length === 0 && <p className="text-[10px] text-white/20">—</p>}
            </div>
          </div>
        </div>
      )}

      {/* Countries */}
      {data && data.byCountry.length > 0 && (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Krajiny</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {data.byCountry.map(c => (
              <div key={c.country} className="flex items-center gap-2">
                <span className="text-sm leading-none">{countryFlag(c.country)}</span>
                <span className="text-[10px] text-white/50 truncate flex-1">{c.country}</span>
                <span className="text-[10px] font-black text-primary shrink-0">{c.users}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AnalyticsTab ──────────────────────────────────────────────────────────────
export default function AnalyticsTab() {
  const [data, setData] = useState<Ga4Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true); setErr(null);
    authFetch("/api/admin/analytics")
      .then(async r => {
        const text = await r.text();
        let json: { error?: string } & Ga4Data;
        try { json = JSON.parse(text); } catch { throw new Error("API server nie je spustený — spustite lokálny API server (PORT=3000 pnpm dev)"); }
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        return json as Ga4Data;
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(String(e instanceof Error ? e.message : e)); setLoading(false); });
  }, [refreshKey]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin" /> Načítavam GA4 dáta…
    </div>
  );
  if (err) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p className="text-red-600 font-semibold mb-2">GA4 nedostupné</p>
      <p className="text-red-400 text-sm mb-4">{err}</p>
      <button onClick={() => setRefreshKey(k => k + 1)} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-semibold transition-colors">Skúsiť znova</button>
    </div>
  );
  if (!data) return null;

  const { overview, daily, events, devices, sources, pages, countries } = data;
  const maxSess = Math.max(...daily.map(d => d.sessions), 1);
  const calcEvents = events.filter(e => CALC_EVENTS.includes(e.name));
  const otherEvents = events.filter(e => !CALC_EVENTS.includes(e.name));
  const maxEvt = Math.max(...events.map(e => e.count), 1);
  const maxSrc = Math.max(...sources.map(s => s.sessions), 1);
  const maxPg = Math.max(...pages.map(p => p.views), 1);
  const maxCtry = Math.max(...(countries ?? []).map(c => c.sessions), 1);
  const totalDevSess = devices.reduce((s, d) => s + d.sessions, 0);

  const kpi = (label: string, val30: number, val90: number, icon: React.ReactNode, tooltip: string) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</span>
      </div>
      <div className="text-3xl font-black text-secondary">{val30.toLocaleString("sk")}</div>
      <div className="text-[11px] text-gray-500 mt-0.5 font-medium">90 dní: {val90.toLocaleString("sk")}</div>
      <div className="text-[10px] text-gray-500 mt-1.5 leading-tight">{tooltip}</div>
    </div>
  );

  const eventLabel: Record<string, string> = {
    calculator_complete: "Kalkulačka dokončená",
    pdf_export: "PDF export",
    sms_export: "SMS export",
    order_submitted: "Objednávka odoslaná",
    calc_tab: "Tab zmena (Pumpa/Mix/…)",
    calc_type_select: "Výber typu betónu",
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Live realtime widget */}
      <RealtimeCard />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-secondary uppercase tracking-widest">Google Analytics 4</h2>
        <button onClick={() => setRefreshKey(k => k + 1)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-semibold transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Obnoviť
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpi("Aktívni užívatelia", overview.activeUsers30, overview.activeUsers90, <Users className="w-4 h-4" />, "Unikátni ľudia, ktorí navštívili stránku — každý sa počíta raz bez ohľadu na počet návštev.")}
        {kpi("Sessiony", overview.sessions30, overview.sessions90, <TrendingUp className="w-4 h-4" />, "Jedno súvislé navštívenie stránky (relácia). Počíta sa ako ukončená po 30 min nečinnosti alebo o polnoci.")}
        {kpi("Zobrazenia stránok", overview.pageViews30, overview.pageViews90, <Globe className="w-4 h-4" />, "Celkový počet zobrazených stránok vrátane opakovaných načítaní — väčší ako počet sessionov.")}
        {kpi("Noví užívatelia", overview.newUsers30, overview.newUsers90, <UserPlus className="w-4 h-4" />, "Prvá návšteva z daného prehliadača alebo zariadenia. Vyčistenie cookies = nový užívateľ.")}
      </div>

      {/* Daily trend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Denný trend — Sessions (30 dní)</span>
        </div>
        <SparkLine data={daily.map(d => d.sessions)} color="#EDC531" />
        <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
          {[...daily].reverse().slice(0, 14).map(d => (
            <div key={d.date} className="flex items-center gap-2 text-[11px]">
              <span className="w-20 text-gray-400 font-mono shrink-0">{d.date.slice(6, 8)}.{d.date.slice(4, 6)}.{d.date.slice(0, 4)}</span>
              <MiniBar value={d.sessions} max={maxSess} />
              <span className="w-8 text-right font-bold text-secondary shrink-0">{d.sessions}</span>
              <span className="w-12 text-right text-gray-400 shrink-0">{d.users} usr</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Calculator events */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <MousePointerClick className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Kalkulačka — interakcie (90 dní)</span>
          </div>
          {calcEvents.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Žiadne kalkulačka eventy ešte — objavia sa po prvom použití.</p>
          ) : (
            <div className="space-y-2">
              {calcEvents.map(e => (
                <div key={e.name} className="flex items-center gap-2 text-[11px]">
                  <span className="flex-1 text-gray-600 font-medium truncate">{eventLabel[e.name] ?? e.name}</span>
                  <MiniBar value={e.count} max={maxEvt} color="#001D3D" />
                  <span className="w-10 text-right font-black text-secondary shrink-0">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Zariadenia (30 dní)</span>
          </div>
          <div className="space-y-2">
            {devices.map(d => (
              <div key={d.device} className="flex items-center gap-2 text-[11px]">
                <span className="w-20 capitalize text-gray-600 font-medium shrink-0">{d.device}</span>
                <MiniBar value={d.sessions} max={totalDevSess} color={d.device === "mobile" ? "#3b82f6" : "#EDC531"} />
                <span className="w-8 text-right font-bold text-secondary shrink-0">{d.sessions}</span>
                <span className="w-10 text-right text-gray-400 shrink-0">{totalDevSess > 0 ? Math.round((d.sessions / totalDevSess) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic sources */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Zdroje návštevnosti (30 dní)</span>
          </div>
          <div className="space-y-2">
            {sources.map(s => (
              <div key={s.channel} className="flex items-center gap-2 text-[11px]">
                <span className="w-32 text-gray-600 font-medium truncate shrink-0">{s.channel || "Direct"}</span>
                <MiniBar value={s.sessions} max={maxSrc} color="#10b981" />
                <span className="w-8 text-right font-bold text-secondary shrink-0">{s.sessions}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top pages */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Top stránky (30 dní)</span>
          </div>
          <div className="space-y-3">
            {pages.map(p => (
              <div key={p.path}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <span className="text-[12px] font-bold text-secondary">{pathHuman(p.path)}</span>
                    <span className="text-[10px] text-gray-400 font-mono ml-2">{p.path}</span>
                  </div>
                  <span className="text-sm font-black text-secondary shrink-0">{p.views}</span>
                </div>
                <MiniBar value={p.views} max={maxPg} color="#8b5cf6" />
              </div>
            ))}
          </div>
        </div>

        {/* Countries + SK cities map */}
        {countries && countries.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">Krajiny a mestá návštevníkov (30 dní)</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Countries list */}
              <div className="space-y-2">
                {countries.map(c => (
                  <div key={c.country} className="flex items-center gap-2 text-[11px]">
                    <span className="text-base leading-none shrink-0">{countryFlag(c.country)}</span>
                    <span className="w-28 text-gray-600 font-medium truncate shrink-0">{c.country}</span>
                    <MiniBar value={c.sessions} max={maxCtry} color="#0ea5e9" />
                    <span className="w-8 text-right font-bold text-secondary shrink-0">{c.sessions}</span>
                  </div>
                ))}
              </div>
              {/* SVK cities map */}
              {data.cities && data.cities.filter(c => c.country === "Slovakia").length > 0 && (() => {
                const skCities = data.cities!
                  .filter(c => c.country === "Slovakia" && SVK_CITY_SVG[c.city])
                  .sort((a, b) => b.sessions - a.sessions);
                const unmapped = data.cities!
                  .filter(c => c.country === "Slovakia" && !SVK_CITY_SVG[c.city] && c.city && c.city !== "(not set)")
                  .sort((a, b) => b.sessions - a.sessions);
                const maxC = Math.max(...skCities.map(c => c.sessions), 1);
                const totalSkSess = skCities.reduce((s, c) => s + c.sessions, 0) + unmapped.reduce((s, c) => s + c.sessions, 0);
                return (
                  <div className="rounded-xl overflow-hidden border border-slate-700/60" style={{ background: "linear-gradient(135deg,#0d1f3c 0%,#071526 100%)" }}>
                    <style>{`@keyframes svkPulse{0%{opacity:.22;transform:scale(1)}100%{opacity:0;transform:scale(2.2)}} .svk-pulse{animation:svkPulse 2.4s ease-out infinite;transform-box:fill-box;transform-origin:center}`}</style>
                    <div className="px-3 pt-2.5 pb-0 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">🇸🇰 Slovensko — mestá</span>
                      <span className="text-[9px] text-slate-500">{skCities.length} miest · {totalSkSess} sess.</span>
                    </div>
                    <svg viewBox="0 0 420 175" className="w-full" style={{ height: 145, display: "block" }}>
                      <defs>
                        <linearGradient id="svkGrad" x1="0" y1="0" x2="0.6" y2="1">
                          <stop offset="0%" stopColor="#1a3a62" />
                          <stop offset="100%" stopColor="#0d2444" />
                        </linearGradient>
                        <filter id="svkShadow">
                          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
                        </filter>
                      </defs>
                      <g transform="translate(10,8)">
                        <path
                          d="M 2,128 L 3,19 L 48,6 L 150,3 L 215,4 L 232,1 L 248,12 L 289,17 L 324,28 L 358,30 L 399,34 L 399,76 L 386,93 L 352,152 L 290,152 L 220,152 L 128,152 L 83,152 L 62,152 L 14,152 L 3,147 Z"
                          fill="url(#svkGrad)" stroke="#2d5a99" strokeWidth="1.5" filter="url(#svkShadow)"
                        />
                        {[38, 76, 114].map(y => (
                          <line key={y} x1="2" y1={y} x2="399" y2={y} stroke="#1e3a5f" strokeWidth="0.4" strokeDasharray="6,6" />
                        ))}
                        {[...skCities].reverse().map((c, ri) => {
                          const i = skCities.length - 1 - ri;
                          const xy = SVK_CITY_SVG[c.city];
                          if (!xy) return null;
                          const pct = c.sessions / maxC;
                          const r = Math.max(3, Math.min(10, 3 + pct * 7));
                          const isTop3 = i < 3;
                          const showLabel = isTop3 || r >= 6;
                          const lw = c.city.length * 3.6 + 8;
                          const pctTotal = totalSkSess > 0 ? Math.round((c.sessions / totalSkSess) * 100) : 0;
                          const labelY = xy[1] - r - 3;
                          const labelPinned = Math.max(12, labelY);
                          return (
                            <g key={c.city} style={{ cursor: "default" }}>
                              <title>{c.city}: {c.sessions} sess. ({pctTotal}% SK)</title>
                              {i === 0 && (
                                <circle className="svk-pulse" cx={xy[0]} cy={xy[1]} r={r + 7} fill="#EDC531" fillOpacity="0.22" />
                              )}
                              <circle cx={xy[0]} cy={xy[1]} r={r + 3} fill="#EDC531" fillOpacity={pct * 0.18} />
                              <circle cx={xy[0]} cy={xy[1]} r={r} fill="#EDC531" fillOpacity={0.6 + pct * 0.4}
                                stroke={isTop3 ? "#fff8e1" : "#b38600"} strokeWidth={isTop3 ? 1.2 : 0.5} />
                              <circle cx={xy[0] - r * 0.25} cy={xy[1] - r * 0.25} r={r * 0.35} fill="#fff" fillOpacity="0.28" />
                              {showLabel && (
                                <g>
                                  <rect x={xy[0] - lw / 2} y={labelPinned - 11} width={lw} height={10} rx="2.5"
                                    fill="#071526" fillOpacity="0.92" stroke="#2d5a99" strokeWidth="0.5" />
                                  <text x={xy[0]} y={labelPinned - 3.5} textAnchor="middle" fontSize="5.5"
                                    fill={isTop3 ? "#EDC531" : "#cbd5e1"} fontFamily="system-ui,sans-serif" fontWeight="700" letterSpacing="0.3">
                                    {c.city}
                                  </text>
                                </g>
                              )}
                              {isTop3 && (
                                <>
                                  <circle cx={xy[0] + r} cy={xy[1] - r} r={4} fill="#071526" stroke="#EDC531" strokeWidth="0.8" />
                                  <text x={xy[0] + r} y={xy[1] - r + 3.2} textAnchor="middle" fontSize="4.5" fill="#EDC531" fontFamily="system-ui,sans-serif" fontWeight="900">{i + 1}</text>
                                </>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                    {/* Ranked legend */}
                    <div className="px-3 pb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-700/40 pt-2.5">
                      {skCities.slice(0, 8).map((c, i) => {
                        const pctTotal = totalSkSess > 0 ? Math.round((c.sessions / totalSkSess) * 100) : 0;
                        return (
                          <div key={c.city} className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[8px] font-black text-slate-600 w-2.5 text-right shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-[9px] font-medium truncate" style={{ color: i < 3 ? "#EDC531" : "#94a3b8" }}>{c.city}</span>
                                <span className="text-[9px] font-black text-primary shrink-0">{c.sessions} <span className="text-slate-600 font-normal">({pctTotal}%)</span></span>
                              </div>
                              <div className="h-[2px] rounded-full" style={{ background: "#1e3a5f" }}>
                                <div className="h-full rounded-full" style={{ width: `${(c.sessions / maxC) * 100}%`, background: i === 0 ? "#EDC531" : i === 1 ? "#d4a017" : i === 2 ? "#b38600" : "#4a6fa5" }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Unmapped SK cities */}
                    {unmapped.length > 0 && (
                      <div className="px-3 pb-2.5 border-t border-slate-700/30 pt-2">
                        <span className="text-[8px] uppercase tracking-widest text-slate-600 font-black">Ostatné mestá: </span>
                        {unmapped.slice(0, 6).map((c, i) => (
                          <span key={c.city} className="text-[8px] text-slate-500">{i > 0 ? " · " : ""}{c.city} <span className="text-slate-600">{c.sessions}</span></span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* All events */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Všetky GA4 eventy (90 dní)</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {otherEvents.map(e => (
            <div key={e.name} className="flex items-center gap-2 text-[11px]">
              <span className="flex-1 text-gray-500 font-mono truncate">{e.name}</span>
              <span className="font-bold text-secondary shrink-0">{e.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
