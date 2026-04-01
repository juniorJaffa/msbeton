import { useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { clientAuth } from "@/lib/clientAuth";
import { SEOHead } from "@/components/SEOHead";
import { LogIn } from "lucide-react";

export default function ClientLogin() {
  const [, setLocation] = useLocation();
  const [id, setId] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!id.trim() || !pwd.trim()) {
      setErr("Vyplňte ID klienta a heslo");
      return;
    }
    setLoading(true);
    setErr("");
    const res = await clientAuth.login(id.trim(), pwd.trim());
    setLoading(false);
    if (res.ok) {
      setLocation("/#calculator");
    } else {
      setErr(res.error ?? "Nesprávne prihlasovacie údaje");
    }
  }

  return (
    <>
      <SEOHead title="Prihlásenie klienta – MS-BETON" noIndex />
      <Navbar />
      <div className="min-h-screen concrete-navy flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-secondary/95 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden border border-white/10">

            {/* Header */}
            <div className="bg-secondary px-8 py-7 border-b border-white/10">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-primary" />
                </div>
                <h1 className="text-xl font-black text-white tracking-wide">Prihlásenie</h1>
              </div>
              <p className="text-white/45 text-sm ml-12">Zadajte vaše klientské ID a heslo</p>
            </div>

            {/* Form */}
            <div className="px-8 py-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-2 tracking-wider uppercase">ID klienta</label>
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="napr. 20"
                  autoComplete="username"
                  className="w-full bg-white/8 border-b-2 border-b-primary/60 focus:border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/25 text-sm font-medium rounded-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-2 tracking-wider uppercase">Heslo</label>
                <input
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="••••"
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full bg-white/8 border-b-2 border-b-primary/60 focus:border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/25 text-sm font-medium rounded-sm transition-colors"
                />
              </div>

              {err && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{err}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-primary text-white font-black text-sm tracking-widest hover:bg-primary/85 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-sm cursor-pointer"
              >
                {loading ? "Prihlasovanie..." : "PRIHLÁSIŤ SA"}
              </button>

              <p className="text-center text-white/30 text-xs pt-2">
                Prihlasovacie údaje vám poskytne MS-BETON
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-white/35 hover:text-white/60 text-xs transition-colors">
              ← Späť na hlavnú stránku
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
