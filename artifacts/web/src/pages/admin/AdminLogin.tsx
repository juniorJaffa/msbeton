import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Eye, EyeOff, Lock, User, AlertCircle, Clock, Fingerprint } from "lucide-react";
import {
  checkCredentials, login, isLoggedIn, getAttemptInfo, recordFailedAttempt, resetAttempts,
  isBiometricAvailable, hasStoredCredential, authenticateBiometric, registerBiometric, clearBiometric,
} from "@/lib/adminAuth";
import { VersionBadge } from "@/components/VersionBadge";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

type Screen = "form" | "bio-pending" | "bio-failed" | "bio-register";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<Screen>("form");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockInfo, setLockInfo] = useState({ locked: false, remainingMs: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-trigger biometric on mount if credential is stored
  useEffect(() => {
    const el = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    const prev = el?.href ?? "";
    if (el) el.href = "/admin-manifest.json";
    return () => { if (el) el.href = prev; };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("reset")) {
      resetAttempts();
      clearBiometric();
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (isLoggedIn()) { navigate("/admin/dashboard"); return; }

    if (isBiometricAvailable() && hasStoredCredential()) {
      setScreen("bio-pending");
      authenticateBiometric().then(result => {
        if (result.ok) {
          login();
          navigate("/admin/dashboard");
        } else {
          setScreen("bio-failed");
        }
      });
    }
  }, [navigate]);

  useEffect(() => {
    const info = getAttemptInfo();
    setLockInfo({ locked: info.locked, remainingMs: info.remainingMs });
    if (info.locked) {
      timerRef.current = setInterval(() => {
        const current = getAttemptInfo();
        setLockInfo({ locked: current.locked, remainingMs: current.remainingMs });
        if (!current.locked && timerRef.current) clearInterval(timerRef.current);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const refreshCaptcha = () => { setCaptcha(generateCaptcha()); setCaptchaInput(""); };

  const formatLockTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const retryBiometric = () => {
    setScreen("bio-pending");
    authenticateBiometric().then(result => {
      if (result.ok) { login(); navigate("/admin/dashboard"); }
      else setScreen("bio-failed");
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (honeypot) { setError("Odoslanie zamietnuté."); return; }
    if (lockInfo.locked) { setError("Účet je dočasne zablokovaný."); return; }
    if (parseInt(captchaInput) !== captcha.answer) {
      setError("Nesprávna odpoveď na overenie.");
      refreshCaptcha();
      return;
    }
    if (!username.trim() || !password.trim()) { setError("Zadajte meno a heslo."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (checkCredentials(username, password)) {
      login();
      // Offer biometric registration if available and not yet stored
      if (isBiometricAvailable() && !hasStoredCredential()) {
        setLoading(false);
        setScreen("bio-register");
      } else {
        navigate("/admin/dashboard");
      }
    } else {
      const count = recordFailedAttempt();
      const info = getAttemptInfo();
      setLockInfo({ locked: info.locked, remainingMs: info.remainingMs });
      if (info.locked) {
        setError(`Príliš veľa pokusov. Skúste o ${formatLockTime(info.remainingMs)}.`);
        timerRef.current = setInterval(() => {
          const c = getAttemptInfo();
          setLockInfo({ locked: c.locked, remainingMs: c.remainingMs });
          if (!c.locked && timerRef.current) clearInterval(timerRef.current);
        }, 1000);
      } else {
        setError(`Nesprávne prihlasovacie údaje. (${5 - count} pokusov zostáva)`);
      }
      refreshCaptcha();
      setLoading(false);
    }
  };

  const handleRegisterBio = async () => {
    try { await registerBiometric(); } catch { /* ignore */ }
    window.location.href = "/admin/dashboard";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 bg-secondary relative overflow-x-hidden"
      style={{ background: "linear-gradient(135deg, #001D3D 0%, #00305f 60%, #001D3D 100%)" }}
    >
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="relative z-10 w-full max-w-md">
        <a href="/" className="flex items-center justify-center gap-0.5 mb-8 select-none">
          <span className="font-black text-4xl tracking-tighter text-primary" style={{ fontFamily: "Montserrat, sans-serif" }}>MS</span>
          <span className="font-black text-4xl tracking-tighter text-primary/40" style={{ fontFamily: "Montserrat, sans-serif" }}>-</span>
          <span className="font-black text-4xl tracking-tighter text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>BETON</span>
          <span className="ml-2 self-end mb-1 text-[10px] font-black text-primary/60 border border-primary/30 px-1.5 py-0.5 rounded-sm tracking-widest">ADMIN</span>
        </a>

        <div className="bg-[#424356] rounded-none shadow-2xl overflow-hidden">
          <div className="flex">
            <div className="w-2 bg-primary flex-shrink-0" />
            <div className="flex-1 p-8">

              {/* ── Bio pending ─────────────────────────────────────── */}
              {screen === "bio-pending" && (
                <div className="flex flex-col items-center justify-center py-8 gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/30 flex items-center justify-center animate-pulse">
                      <Fingerprint className="w-10 h-10 text-primary" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">Overujem totožnosť…</p>
                    <p className="text-white/50 text-sm mt-1">Face ID / Touch ID / Windows Hello</p>
                  </div>
                </div>
              )}

              {/* ── Bio failed — retry + fallback form ──────────────── */}
              {screen === "bio-failed" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-yellow-500/15 border border-yellow-500/30 px-4 py-3 text-yellow-300 text-sm">
                    <Fingerprint className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-bold">Biometrické overenie zlyhalo</p>
                      <p className="text-xs text-yellow-300/70 mt-0.5">Skúste znova alebo zadajte heslo</p>
                    </div>
                  </div>
                  <button onClick={retryBiometric}
                    className="w-full flex items-center justify-center gap-2 border border-primary/40 text-primary font-bold text-sm py-3 hover:bg-primary/10 transition-colors">
                    <Fingerprint className="w-4 h-4" /> Prihlásiť sa biometriou
                  </button>
                  <div className="flex items-center gap-3 text-white/20 text-xs">
                    <div className="flex-1 border-t border-white/10" />
                    <span>alebo zadajte heslo</span>
                    <div className="flex-1 border-t border-white/10" />
                  </div>
                  {renderForm()}
                </div>
              )}

              {/* ── Bio register prompt ──────────────────────────────── */}
              {screen === "bio-register" && (
                <div className="flex flex-col items-center gap-6 py-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Fingerprint className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-black text-xl">Zapamätať biometricky?</p>
                    <p className="text-white/50 text-sm mt-2">Nabudúce sa prihlási automaticky pomocou Face ID, Touch ID alebo Windows Hello — bez hesla.</p>
                  </div>
                  <div className="w-full space-y-2">
                    <button onClick={handleRegisterBio}
                      className="w-full bg-primary text-secondary font-black text-sm uppercase tracking-widest py-4 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                      style={{ fontFamily: "Montserrat, sans-serif" }}>
                      <Fingerprint className="w-4 h-4" /> Áno, aktivovať
                    </button>
                    <button onClick={() => navigate("/admin/dashboard")}
                      className="w-full py-3 text-white/40 hover:text-white/70 text-sm transition-colors">
                      Preskočiť
                    </button>
                  </div>
                </div>
              )}

              {/* ── Normal form ─────────────────────────────────────── */}
              {screen === "form" && (
                <>
                  <h2 className="text-2xl font-black text-white uppercase tracking-wide mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
                    VITAJTE SPÄŤ!
                  </h2>
                  <p className="text-white/50 text-sm mb-8">Prihlásenie do administrácie MS-BETON</p>
                  {error && (
                    <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 mb-6 rounded">
                      <AlertCircle className="w-4 h-4 shrink-0" />{error}
                    </div>
                  )}
                  {lockInfo.locked && (
                    <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm px-4 py-3 mb-6 rounded">
                      <Clock className="w-4 h-4 shrink-0" />Zablokované. Skúste o: {formatLockTime(lockInfo.remainingMs)}
                    </div>
                  )}
                  {renderForm()}
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6 flex items-center justify-center gap-2">
          <span>© {new Date().getFullYear()} MS-BETON s.r.o. — Administrácia</span>
          <VersionBadge className="text-white/30" />
        </p>
      </div>
    </div>
  );

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="text" name="website_url" tabIndex={-1} autoComplete="off" value={honeypot}
          onChange={e => setHoneypot(e.target.value)}
          style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }} aria-hidden="true" />
        <div>
          <label className="block text-white/70 text-xs font-bold uppercase tracking-widest mb-2">
            E-mail alebo užívateľské meno
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="off" disabled={lockInfo.locked || loading}
              className="w-full bg-[#32334a] text-white border border-white/10 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              placeholder="admin" />
          </div>
        </div>
        <div>
          <label className="block text-white/70 text-xs font-bold uppercase tracking-widest mb-2">Heslo</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="off" disabled={lockInfo.locked || loading}
              className="w-full bg-[#32334a] text-white border border-white/10 pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              placeholder="••••••••" />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="bg-[#32334a] border border-white/10 p-4 space-y-3">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Overenie – nie ste robot</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#1e1f2e] px-4 py-2 text-white font-bold text-sm text-center border border-white/10">
              Koľko je <span className="text-primary">{captcha.a}</span> + <span className="text-primary">{captcha.b}</span> ?
            </div>
            <input type="number" value={captchaInput} onChange={e => setCaptchaInput(e.target.value)}
              onWheel={e => (e.target as HTMLInputElement).blur()}
              disabled={lockInfo.locked || loading}
              className="w-20 bg-[#32334a] text-white border border-white/10 px-3 py-2 text-sm text-center focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              placeholder="?" />
            <button type="button" onClick={refreshCaptcha} className="text-white/40 hover:text-primary text-xs transition-colors" title="Obnoviť">↺</button>
          </div>
        </div>
        <button type="submit" disabled={lockInfo.locked || loading}
          className="w-full bg-primary text-secondary font-black text-sm uppercase tracking-widest py-4 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ fontFamily: "Montserrat, sans-serif" }}>
          {loading
            ? <><span className="animate-spin border-2 border-secondary/30 border-t-secondary rounded-full w-4 h-4 inline-block" /> Prihlasujem...</>
            : "Prihlásiť sa"}
        </button>
      </form>
    );
  }
}
