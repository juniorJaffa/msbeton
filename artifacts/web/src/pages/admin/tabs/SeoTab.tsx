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
      {/* Sub-tab bar — obdĺžnikové */}
      <div className="flex gap-2 mb-6">
        {([
          { id: "navstevnost"  as Sub, title: "NÁVŠTEVNOSŤ",  sub: "GA4"    },
          { id: "vyhladavanie" as Sub, title: "VYHĽADÁVANIE", sub: "search" },
        ]).map(s => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`flex flex-col items-start px-4 py-2 rounded-lg transition-all border cursor-pointer min-w-[110px] ${
              sub === s.id
                ? "bg-secondary border-secondary text-primary shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}>
            <span className="text-xs font-black uppercase tracking-widest leading-tight">{s.title}</span>
            <span className={`text-[9px] font-semibold leading-tight mt-0.5 ${sub === s.id ? "text-primary/70" : "text-gray-400"}`}>[{s.sub}]</span>
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
