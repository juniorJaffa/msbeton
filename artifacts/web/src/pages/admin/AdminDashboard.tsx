import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { LogOut, Users, Truck, Wrench, Layers, RefreshCw, ClipboardList, BarChart2, TrendingUp, MoreHorizontal, Search, Fingerprint } from "lucide-react";
import { VersionBadge } from "@/components/VersionBadge";
import { useToast } from "@/hooks/use-toast";
import { isLoggedIn, logout, isBiometricAvailable, hasStoredCredential } from "@/lib/adminAuth";
import { adminData, adminApi, syncFromServer, Order } from "@/lib/adminData";

type Tab = "betony" | "sluzby" | "doprava" | "klienti" | "objednavky" | "analytics" | "statistiky" | "gsc";

const BetonTab       = lazy(() => import("./tabs/BetonTab"));
const SluzbyTab      = lazy(() => import("./tabs/SluzbyTab"));
const DopravaTab     = lazy(() => import("./tabs/DopravaTab"));
const KlientiTab     = lazy(() => import("./tabs/KlientiTab"));
const ObjednavkyTab  = lazy(() => import("./tabs/ObjednavkyTab"));
const AnalyticsTab   = lazy(() => import("./tabs/AnalyticsTab"));
const StatistikyTab  = lazy(() => import("./tabs/StatistikyTab"));
const SearchConsoleTab = lazy(() => import("./tabs/SearchConsoleTab"));

function TabSpinner() {
  return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin" />
    </div>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>(() => {
    const hash = window.location.hash.slice(1) as Tab;
    const valid: Tab[] = ["betony", "sluzby", "doprava", "klienti", "objednavky", "analytics", "statistiky", "gsc"];
    return valid.includes(hash) ? hash : "klienti";
  });
  const [syncKey, setSyncKey] = useState(0);
  const [goToClientId, setGoToClientId] = useState<string | null>(null);
  const [goToOrdersSearch, setGoToOrdersSearch] = useState<string | undefined>(undefined);
  const [goToOrdersFocusId, setGoToOrdersFocusId] = useState<string | undefined>(undefined);
  const [sluzbyScrollPumpa, setSluzbyScrollPumpa] = useState(false);
  const [bioActive, setBioActive] = useState(() => isBiometricAvailable() && hasStoredCredential());

  useEffect(() => {
    const onBio = () => setBioActive(isBiometricAvailable() && hasStoredCredential());
    window.addEventListener("bio-status-changed", onBio);
    return () => window.removeEventListener("bio-status-changed", onBio);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    const el = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    const prev = el?.href ?? "";
    if (el) el.href = "/admin-manifest.json";
    return () => { if (el) el.href = prev; };
  }, []);

  useEffect(() => {
    syncFromServer().then(() => setSyncKey(k => k + 1));
  }, []);

  useEffect(() => {
    const handler = () => setSyncKey(k => k + 1);
    window.addEventListener("admin-data-synced", handler);
    return () => window.removeEventListener("admin-data-synced", handler);
  }, []);

  const [orderBadge, setOrderBadge] = useState(0);
  const knownOrderIds = useRef<Set<string>>(new Set(adminData.getOrders().map(o => o.id)));
  const { toast } = useToast();

  useEffect(() => {
    if (tab === "objednavky") {
      setOrderBadge(0);
      adminData.getOrders().forEach(o => knownOrderIds.current.add(o.id));
      return;
    }
    const poll = async () => {
      try {
        const result = await adminApi.getOrders();
        if (result?.data) {
          const orders = result.data as Order[];
          const newOnes = orders.filter(o => !knownOrderIds.current.has(o.id));
          if (newOnes.length > 0) {
            newOnes.forEach(o => knownOrderIds.current.add(o.id));
            setOrderBadge(n => n + newOnes.length);
            toast({
              title: `${newOnes.length === 1 ? "Nová objednávka" : `${newOnes.length} nové objednávky`}`,
              description: newOnes.map(o => o.clientName).join(", "),
              duration: 6000,
            });
          }
        }
      } catch {}
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  const handleLogout = () => { logout(); navigate("/admin/login"); };
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs: { id: Tab; label: string; short: string; icon: React.ReactNode }[] = [
    { id: "klienti",    label: "KLIENTI",    short: "KLIENTI",  icon: <Users className="w-5 h-5" /> },
    { id: "objednavky", label: "OBJEDNÁVKY", short: "OBJED.",   icon: <ClipboardList className="w-5 h-5" /> },
    { id: "doprava",    label: "DOPRAVA",    short: "DOPRAVA",  icon: <Truck className="w-5 h-5" /> },
    { id: "sluzby",     label: "SLUŽBY",     short: "SLUŽBY",   icon: <Wrench className="w-5 h-5" /> },
    { id: "betony",     label: "BETÓNY",     short: "BETÓNY",   icon: <Layers className="w-5 h-5" /> },
    { id: "statistiky", label: "ŠTATISTIKY", short: "ŠTAT.",    icon: <TrendingUp className="w-5 h-5" /> },
    { id: "analytics",  label: "ANALÝZY",    short: "ANAL.",    icon: <BarChart2 className="w-5 h-5" /> },
    { id: "gsc",        label: "SEO",        short: "SEO",      icon: <Search className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen concrete-light" style={{ fontFamily: "Montserrat, sans-serif", overflowX: "clip" }}>
      {/* Top nav */}
      {/* Combined sticky header — logo row + desktop tab row */}
      <header className="bg-secondary shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12">
          <a href="/" className="flex items-center gap-0.5 select-none">
            <span className="font-black text-2xl tracking-tighter text-primary">MS</span>
            <span className="font-black text-2xl tracking-tighter text-primary/40">-</span>
            <span className="font-black text-2xl tracking-tighter text-white">BETON</span>
            <span className="ml-3 text-primary text-xs font-bold uppercase tracking-widest">Admin</span>
            {bioActive && <Fingerprint className="ml-1 w-3.5 h-3.5 text-primary" title="Biometrické prihlásenie aktívne" />}
            <VersionBadge className="ml-1 text-white/25 hidden sm:block" />
          </a>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout}
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-semibold transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Odhlásiť</span>
            </button>
          </div>
        </div>
        {/* Desktop tab row — dark navy, inside header */}
        <div className="hidden sm:block border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex">
              {tabs.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); window.location.hash = t.id; }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                    tab === t.id ? "text-primary border-primary" : "text-white/50 border-transparent hover:text-white/80"
                  }`}>
                  <span className="relative">
                    {t.icon}
                    {t.id === "objednavky" && orderBadge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                        {orderBadge > 9 ? "9+" : orderBadge}
                      </span>
                    )}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile tab bar — white, fixed pod headerom, ikona + label */}
      <div className="sm:hidden fixed top-12 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex">
          {tabs.filter(t => t.id !== "analytics" && t.id !== "statistiky" && t.id !== "gsc").map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); window.location.hash = t.id; setMoreOpen(false); }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 border-b-2 transition-all ${
                tab === t.id ? "text-primary border-primary" : "text-gray-400 border-transparent"
              }`}>
              <span className="relative">
                {t.icon}
                {t.id === "objednavky" && orderBadge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {orderBadge > 9 ? "9+" : orderBadge}
                  </span>
                )}
              </span>
              <span className="text-[8px] font-bold uppercase leading-none">{t.short}</span>
            </button>
          ))}
          {/* More button */}
          <div className="relative flex-1">
            <button
              onClick={() => setMoreOpen(o => !o)}
              className={`w-full flex flex-col items-center justify-center py-1.5 gap-0.5 border-b-2 transition-all ${
                (tab === "analytics" || tab === "statistiky" || tab === "gsc") ? "text-primary border-primary" : moreOpen ? "text-secondary border-transparent" : "text-gray-400 border-transparent"
              }`}>
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase leading-none">VIAC</span>
            </button>
            {moreOpen && (
              <div className="absolute top-full right-0 mt-px w-44 bg-white border border-gray-200 rounded-sm shadow-xl overflow-hidden z-50">
                <button onClick={() => { setTab("statistiky"); window.location.hash = "statistiky"; setMoreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-colors ${tab === "statistiky" ? "text-primary bg-primary/5" : "text-gray-600 hover:bg-gray-50"}`}>
                  <TrendingUp className="w-4 h-4 shrink-0" /> Štatistiky
                </button>
                <button onClick={() => { setTab("analytics"); window.location.hash = "analytics"; setMoreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-colors border-t border-gray-100 ${tab === "analytics" ? "text-primary bg-primary/5" : "text-gray-600 hover:bg-gray-50"}`}>
                  <BarChart2 className="w-4 h-4 shrink-0" /> Analýzy GA4
                </button>
                <button onClick={() => { setTab("gsc"); window.location.hash = "gsc"; setMoreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-colors border-t border-gray-100 ${tab === "gsc" ? "text-primary bg-primary/5" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Search className="w-4 h-4 shrink-0" /> SEO
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll container — fills viewport below fixed header */}
      <div id="admin-content" className="fixed top-[86px] sm:top-20 left-0 right-0 bottom-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-8">
          <Suspense fallback={<TabSpinner />}>
            {tab === "betony" && <BetonTab key={syncKey} />}
            {tab === "sluzby" && <SluzbyTab key={syncKey} onGoToDoprava={() => { setTab("doprava"); window.location.hash = "doprava"; }} scrollToPumpa={sluzbyScrollPumpa} onScrollDone={() => setSluzbyScrollPumpa(false)} />}
            {tab === "doprava" && <DopravaTab key={syncKey} onGoToSluzby={() => { setTab("sluzby"); setSluzbyScrollPumpa(true); window.location.hash = "sluzby"; }} />}
            {tab === "klienti" && <KlientiTab expandClientId={goToClientId} onExpanded={() => setGoToClientId(null)} onGoToOrders={(loginId, focusId) => { setGoToOrdersSearch(loginId); setGoToOrdersFocusId(focusId); setTab("objednavky"); window.location.hash = "objednavky"; }} />}
            {tab === "objednavky" && <ObjednavkyTab key={syncKey} initialClientId={goToOrdersSearch} focusOrderId={goToOrdersFocusId} onGoToClient={(loginId) => { setGoToOrdersSearch(undefined); setGoToOrdersFocusId(undefined); setTab("klienti"); setGoToClientId(loginId); }} />}
            {tab === "analytics" && <AnalyticsTab />}
            {tab === "statistiky" && <StatistikyTab />}
            {tab === "gsc" && <SearchConsoleTab />}
          </Suspense>
        </div>
      </div>

    </div>
  );
}
