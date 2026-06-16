import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const CHECK_INTERVAL = 90 * 1000; // 90 s

export function VersionChecker() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  // Baseline = hash servera PRI NAČÍTANÍ tejto stránky (nie persistované).
  // Banner sa ukáže LEN ak sa hash zmení počas otvorenej session (reálny deploy medzitým).
  // → každý refresh resetne baseline a banner zmizne (nemusíš klikať Obnoviť).
  const loadHashRef = useRef<string | null>(null);

  useEffect(() => {
    // Cleanup po starej (localStorage) implementácii — predtým banner zostával po refreshi
    localStorage.removeItem("msbeton_app_version");
    localStorage.removeItem("msbeton_app_version_v2");
    sessionStorage.removeItem("msbeton_refreshed");

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { hash?: string };
        const hash = data.hash;
        if (!hash || hash === "unknown") return;
        if (loadHashRef.current === null) { loadHashRef.current = hash; return; } // baseline = táto session
        if (hash !== loadHashRef.current) setNeedsRefresh(true);
      } catch {
        // network error — ignore
      }
    }

    check();
    const timer = setInterval(check, CHECK_INTERVAL);
    // Safari iOS pauses JS timers when tab is backgrounded — recheck on visibility change
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
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
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 bg-primary text-secondary text-xs font-black px-3 py-1.5 rounded-lg hover:bg-primary/80 transition-colors cursor-pointer"
      >
        Obnoviť
      </button>
    </div>
  );
}
