import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const VERSION_KEY = "msbeton_app_version";
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 min

export function VersionChecker() {
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { hash } = await res.json();
        if (!hash || hash === "unknown") return;
        const stored = localStorage.getItem(VERSION_KEY);
        if (!stored) {
          localStorage.setItem(VERSION_KEY, hash);
          return;
        }
        if (stored !== hash) {
          setNeedsRefresh(true);
        }
      } catch {
        // network error – silently ignore
      }
    }

    check();
    const timer = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  if (!needsRefresh) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-xs w-[calc(100%-2rem)] bg-secondary border border-primary/40 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 text-white animate-in slide-in-from-bottom-4">
      <RefreshCw className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary leading-tight">Dostupná nová verzia</p>
        <p className="text-xs text-white/60">Nepoužívate aktuálnu verziu aplikácie.</p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(VERSION_KEY, "");
          window.location.reload();
        }}
        className="shrink-0 bg-primary text-navy text-xs font-black px-3 py-1.5 rounded-lg hover:bg-primary/80 transition-colors"
      >
        Obnoviť
      </button>
    </div>
  );
}
