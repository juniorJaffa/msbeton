import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Navbar } from "@/components/Navbar";
import { SEOHead } from "@/components/SEOHead";
import { clientApi } from "@/lib/api";
import { Eye, EyeOff, Check, AlertCircle, Lock } from "lucide-react";

export default function ClientPasswordReset() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <>
        <SEOHead title="Reset hesla – MS-BETON" noindex />
        <Navbar />
        <main className="min-h-screen concrete-light pt-28 pb-16 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-8 max-w-sm w-full text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="font-bold text-gray-700 mb-1">Neplatný odkaz</p>
            <p className="text-sm text-gray-400">Token chýba alebo odkaz bol poškodený.</p>
          </div>
        </main>
      </>
    );
  }

  async function handleSubmit() {
    setError("");
    if (newPassword.length < 6) { setError("Heslo musí mať aspoň 6 znakov"); return; }
    if (newPassword !== confirmPassword) { setError("Heslá sa nezhodujú"); return; }
    setLoading(true);
    const res = await clientApi.confirmPasswordReset(token, newPassword);
    setLoading(false);
    if (res?.ok) {
      setDone(true);
    } else {
      setError(res?.error ?? "Chyba pri zmene hesla");
    }
  }

  return (
    <>
      <SEOHead title="Reset hesla – MS-BETON" noindex />
      <Navbar />
      <main className="min-h-screen concrete-light pt-28 pb-16 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-8 max-w-sm w-full">
          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-black text-secondary mb-1">Heslo bolo zmenené</p>
              <p className="text-sm text-gray-500 mb-6">Môžete sa prihlásiť s novým heslom.</p>
              <button
                onClick={() => navigate("/prihlasenie")}
                className="bg-primary text-secondary font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Prihlásiť sa
              </button>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-black text-secondary/50 uppercase tracking-widest mb-5">Nastavenie nového hesla</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Nové heslo
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimálne 6 znakov"
                      className="w-full border border-gray-300 rounded-sm px-3 py-2 pr-10 text-sm focus:outline-none focus:border-secondary"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Zopakovať heslo</label>
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Zopakujte nové heslo"
                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-xs font-bold text-red-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-primary text-secondary font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Ukladám..." : "Zmeniť heslo"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
