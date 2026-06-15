import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { LogOut, Users, Truck, Wrench, Layers, RefreshCw, ClipboardList, BarChart2, TrendingUp, MoreHorizontal, Search, Fingerprint, Server, Eye } from "lucide-react";
import { VersionBadge } from "@/components/VersionBadge";
import { isLoggedIn, logout, isBiometricAvailable, hasStoredCredential, isReader } from "@/lib/adminAuth";
import { adminData, adminApi, syncFromServer, Order } from "@/lib/adminData";
import { OrderNotificationToast } from "./OrderNotificationToast";
import { AdminLiveBar } from "./AdminLiveBar";

type Tab = "betony" | "sluzby" | "doprava" | "klienti" | "objednavky" | "analytics" | "statistiky" | "gsc" | "server";

const BetonTab       = lazy(() => import("./tabs/BetonTab"));
const SluzbyTab      = lazy(() => import("./tabs/SluzbyTab"));
const DopravaTab     = lazy(() => import("./tabs/DopravaTab"));
const KlientiTab     = lazy(() => import("./tabs/KlientiTab"));
const ObjednavkyTab  = lazy(() => import("./tabs/ObjednavkyTab"));
const AnalyticsTab   = lazy(() => import("./tabs/AnalyticsTab"));
const StatistikyTab  = lazy(() => import("./tabs/StatistikyTab"));
const SearchConsoleTab = lazy(() => import("./tabs/SearchConsoleTab"));
const ServerTab      = lazy(() => import("./tabs/ServerTab"));

function TabSpinner() {
  return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin" />
    </div>
  );
}

// Videné objednávky — persistované, aby re-mount/reload (časté na 3G) nestratil baseline
// a nezopakoval toast pre tú istú objednávku.
const SEEN_ORDERS_KEY = "msbeton_seen_order_ids";
function loadSeenOrderIds(): string[] {
  try { const v = JSON.parse(localStorage.getItem(SEEN_ORDERS_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function saveSeenOrderIds(ids: Set<string>): void {
  try { localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify([...ids].slice(-800))); } catch { /* quota */ }
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>(() => {
    const hash = window.location.hash.slice(1) as Tab;
    const valid: Tab[] = ["betony", "sluzby", "doprava", "klienti", "objednavky", "analytics", "statistiky", "gsc", "server"];
    return valid.includes(hash) ? hash : "klienti";
  });
  const [syncKey, setSyncKey] = useState(0);
  const [goToClientId, setGoToClientId] = useState<string | null>(null);
  const [goToOrdersSearch, setGoToOrdersSearch] = useState<string | undefined>(undefined);
  const [goToOrdersFocusId, setGoToOrdersFocusId] = useState<string | undefined>(undefined);
  const [bioFocus, setBioFocus] = useState<{ loginId?: string; nonce: number } | null>(null);
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
  // baseline = videné objednávky z localStorage (prežijú re-mount/reload) ∪ aktuálny localStorage
  const knownOrderIds = useRef<Set<string>>(new Set([...loadSeenOrderIds(), ...adminData.getOrders().map(o => o.id)]));
  const baselineDone = useRef(false); // prvý fetch = baseline, neupozorňovať na existujúci backlog
  const [toastOrders, setToastOrders] = useState<Order[]>([]);

  const MAX_TOASTS = 5;             // nikdy nespamuj viac ako 5 toastov v rade
  const NEW_ORDER_WINDOW_MS = 10 * 60 * 1000; // toast len objednávky mladšie ako 10 min

  useEffect(() => {
    if (tab === "objednavky") {
      setOrderBadge(0);
      adminData.getOrders().forEach(o => knownOrderIds.current.add(o.id));
      saveSeenOrderIds(knownOrderIds.current);
      return;
    }
    // Rekurzívny setTimeout (nie setInterval) — na 3G fetch trvá >8s, setInterval by
    // spúšťal prekrývajúce sa polls a hromadil ich. Ďalší poll až po dokončení.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await adminApi.getOrders();
        if (cancelled || !result?.data) return;
        const orders = result.data as Order[];

        // Prvý fetch po prihlásení: označ VŠETKY existujúce ako známe a NEUPOZORŇUJ
        // (inak by sa na novom zariadení/prehliadači vyrojil celý backlog ako "nové").
        if (!baselineDone.current) {
          orders.forEach(o => knownOrderIds.current.add(o.id));
          baselineDone.current = true;
          saveSeenOrderIds(knownOrderIds.current);
          return;
        }

        const newOnes = orders.filter(o => !knownOrderIds.current.has(o.id));
        if (newOnes.length === 0) return;
        newOnes.forEach(o => knownOrderIds.current.add(o.id));
        saveSeenOrderIds(knownOrderIds.current); // persist hneď → re-mount nezopakuje toast
        setOrderBadge(n => n + newOnes.length);

        // Toast LEN genuinely nové (čerstvé createdAt) — backlog nikdy nespamuje
        const now = Date.now();
        const toastable = newOnes.filter(o => {
          const t = o.createdAt ? new Date(o.createdAt).getTime() : now;
          return now - t < NEW_ORDER_WINDOW_MS;
        });
        if (toastable.length > 0) {
          setToastOrders(prev => [...prev, ...toastable].slice(0, MAX_TOASTS));
        }
      } catch { /* sieťová chyba — ticho, ďalší poll skúsi znova */ }
      finally {
        if (!cancelled) timer = setTimeout(poll, 8000);
      }
    };
    timer = setTimeout(poll, 8000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [tab]);

  const handleToastDismiss = () => setToastOrders(prev => prev.slice(1));
  const handleToastOpen = (order: Order) => {
    setToastOrders([]);
    setGoToOrdersFocusId(order.id);
    setGoToOrdersSearch(undefined);
    setTab("objednavky");
    window.location.hash = "objednavky";
  };

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
    { id: "server",     label: "SERVER",     short: "SERVER",   icon: <Server className="w-5 h-5" /> },
  ];

  const readerMode = isReader();
  return (
    <div className="min-h-screen concrete-light" style={{ fontFamily: "Montserrat, sans-serif", overflowX: "clip" }}>
      {/* Admin-čitateľ banner — read-only režim */}
      {readerMode && (
        <div className="fixed top-12 sm:top-[88px] left-0 right-0 z-40 bg-blue-600 text-white text-center text-[11px] sm:text-xs font-bold py-1.5 px-4 flex items-center justify-center gap-2 shadow">
          <Eye className="w-4 h-4 shrink-0" />
          Režim čítania — admin-čitateľ. Zmeny a mazanie sú vypnuté.
        </div>
      )}
      {/* Top nav */}
      {/* Combined sticky header — logo row + desktop tab row */}
      <header className="bg-secondary shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12">
          <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = "/"; }} className="flex items-center gap-0.5 select-none cursor-pointer">
            <motion.span
              className="font-black text-2xl tracking-tighter text-primary relative"
              style={{ display: "inline-block" }}
            >
              MS
              <span className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.span
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.65) 50%, transparent 70%)",
                    display: "block",
                  }}
                  animate={{ x: ["-150%", "250%"] }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3.8, ease: "easeInOut" }}
                />
              </span>
            </motion.span>
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
          {tabs.filter(t => t.id !== "analytics" && t.id !== "statistiky" && t.id !== "gsc" && t.id !== "server").map(t => (
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
                (tab === "analytics" || tab === "statistiky" || tab === "gsc" || tab === "server") ? "text-primary border-primary" : moreOpen ? "text-secondary border-transparent" : "text-gray-400 border-transparent"
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
                <button onClick={() => { setTab("server"); window.location.hash = "server"; setMoreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-colors border-t border-gray-100 ${tab === "server" ? "text-primary bg-primary/5" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Server className="w-4 h-4 shrink-0" /> Server
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminLiveBar />

      <OrderNotificationToast
        orders={toastOrders}
        onDismiss={handleToastDismiss}
        onOpen={handleToastOpen}
      />

      {/* Scroll container — fills viewport below fixed header */}
      <div id="admin-content" className="fixed top-[86px] sm:top-20 left-0 right-0 bottom-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-8">
          <Suspense fallback={<TabSpinner />}>
            {tab === "betony" && <BetonTab key={syncKey} />}
            {tab === "sluzby" && <SluzbyTab key={syncKey} onGoToDoprava={() => { setTab("doprava"); window.location.hash = "doprava"; }} scrollToPumpa={sluzbyScrollPumpa} onScrollDone={() => setSluzbyScrollPumpa(false)} />}
            {tab === "doprava" && <DopravaTab key={syncKey} onGoToSluzby={() => { setTab("sluzby"); setSluzbyScrollPumpa(true); window.location.hash = "sluzby"; }} />}
            {tab === "klienti" && <KlientiTab expandClientId={goToClientId} onExpanded={() => setGoToClientId(null)} onGoToOrders={(loginId, focusId) => { setGoToOrdersSearch(loginId); setGoToOrdersFocusId(focusId); setTab("objednavky"); window.location.hash = "objednavky"; }} onGoToBiometria={(loginId) => { setBioFocus(prev => ({ loginId, nonce: (prev?.nonce ?? 0) + 1 })); setTab("server"); window.location.hash = "server"; }} />}
            {tab === "objednavky" && <ObjednavkyTab initialClientId={goToOrdersSearch} focusOrderId={goToOrdersFocusId} onGoToClient={(loginId) => { setGoToOrdersSearch(undefined); setGoToOrdersFocusId(undefined); setTab("klienti"); setGoToClientId(loginId); }} />}
            {tab === "analytics" && <AnalyticsTab />}
            {tab === "statistiky" && <StatistikyTab />}
            {tab === "gsc" && <SearchConsoleTab />}
            {tab === "server" && <ServerTab bioFocus={bioFocus} onOpenClient={(loginId) => { setGoToClientId(loginId); setTab("klienti"); window.location.hash = "klienti"; }} />}
          </Suspense>
        </div>
      </div>

    </div>
  );
}
