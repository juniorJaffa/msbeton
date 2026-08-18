import { useState, lazy, Suspense } from "react";
import { RefreshCw } from "lucide-react";

const AnalyticsTabInner  = lazy(() => import("./AnalyticsTab"));
const SearchConsoleInner = lazy(() => import("./SearchConsoleTab"));

type Sub = "navstevnost" | "vyhladavanie";

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin" />
    </div>
  );
}

const SUBS: { id: Sub; label: string }[] = [
  { id: "navstevnost",  label: "NÁVŠTEVNOSŤ"  },
  { id: "vyhladavanie", label: "VYHĽADÁVANIE" },
];

export default function SeoTab() {
  const [sub, setSub] = useState<Sub>("navstevnost");

  return (
    <div>
      {/* Sub-tab bar — pill štýl, viditeľný na betónovej textúre */}
      <div className="flex gap-2 mb-6">
        {SUBS.map(s => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all ${
              sub === s.id
                ? "bg-secondary text-primary shadow-sm"
                : "bg-white text-gray-400 border border-gray-200 hover:text-gray-600 hover:border-gray-300"
            }`}
          >
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
