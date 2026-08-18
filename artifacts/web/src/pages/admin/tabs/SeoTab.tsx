import { useState, lazy, Suspense } from "react";
import { RefreshCw, BarChart2, Search } from "lucide-react";

const AnalyticsTabInner   = lazy(() => import("./AnalyticsTab"));
const SearchConsoleInner  = lazy(() => import("./SearchConsoleTab"));

type Sub = "navstevnost" | "vyhladavanie";

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin" />
    </div>
  );
}

const SUBS: { id: Sub; label: string; icon: React.ReactNode }[] = [
  { id: "navstevnost",  label: "NÁVŠTEVNOSŤ",  icon: <BarChart2 className="w-4 h-4" /> },
  { id: "vyhladavanie", label: "VYHĽADÁVANIE", icon: <Search   className="w-4 h-4" /> },
];

export default function SeoTab() {
  const [sub, setSub] = useState<Sub>("navstevnost");

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {SUBS.map(s => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition-all ${
              sub === s.id
                ? "text-secondary border-secondary"
                : "text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-300"
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<Spinner />}>
        {sub === "navstevnost"  && <AnalyticsTabInner />}
        {sub === "vyhladavanie" && <SearchConsoleInner />}
      </Suspense>
    </div>
  );
}
