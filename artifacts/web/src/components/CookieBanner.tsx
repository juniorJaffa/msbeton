import { useState, useEffect } from "react";
import { Cookie, X, Shield } from "lucide-react";
import { useLocation } from "wouter";

const STORAGE_KEY = "msbeton_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false); // CSS enter/exit slide
  const [, navigate] = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const t = setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  function close(store: string, after?: () => void) {
    localStorage.setItem(STORAGE_KEY, store);
    setShown(false);
    setTimeout(() => { setVisible(false); after?.(); }, 280);
  }

  function accept() {
    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    w.gtag?.("consent", "update", { analytics_storage: "granted" });
    close("accepted");
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-4 sm:px-6 sm:pb-6 transition-all duration-300 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
    >
      <div
        className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-4 shadow-2xl"
        style={{ background: "#001D3D", borderTop: "3px solid #EDC531" }}
      >
        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-sm" style={{ background: "#EDC531" }}>
          <Cookie className="w-5 h-5" style={{ color: "#001D3D" }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold mb-0.5">Táto stránka používa cookies</p>
          <p className="text-white/60 text-xs leading-relaxed">
            Používame základné cookies na zabezpečenie funkčnosti webu. Žiadne marketingové ani sledovacie cookies bez Vášho súhlasu.{" "}
            <button onClick={() => close("dismissed", () => navigate("/ochrana-osobnych-udajov"))} className="underline underline-offset-2 hover:text-white/90 transition-colors" style={{ color: "#EDC531" }}>
              Ochrana osobných údajov
            </button>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={accept}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#EDC531", color: "#001D3D" }}
          >
            <Shield className="w-3.5 h-3.5" />
            Súhlasím
          </button>
          <button
            onClick={() => close("dismissed")}
            className="p-2 text-white/40 hover:text-white/70 transition-colors"
            title="Zatvoriť"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
