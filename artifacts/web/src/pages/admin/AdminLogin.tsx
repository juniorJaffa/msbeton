import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Lock, User, AlertCircle, Clock } from "lucide-react";
import { checkCredentials, login, isLoggedIn, getAttemptInfo, recordFailedAttempt } from "@/lib/adminAuth";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

export default function AdminLogin() {
  const [, navigate] = useLocation();
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

  useEffect(() => {
    if (isLoggedIn()) navigate("/admin/dashboard");
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

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  };

  const formatLockTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

    if (!username.trim() || !password.trim()) {
      setError("Zadajte meno a heslo.");
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    if (checkCredentials(username, password)) {
      login();
      navigate("/admin/dashboard");
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
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{
        backgroundImage: "url('/images/concrete-clean.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#001D3D]/50" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <a href="/" className="flex items-center justify-center gap-0.5 mb-8 select-none">
          <span className="font-black text-4xl tracking-tighter text-primary" style={{ fontFamily: "Montserrat, sans-serif" }}>MS</span>
          <span className="font-black text-4xl tracking-tighter text-primary/40" style={{ fontFamily: "Montserrat, sans-serif" }}>-</span>
          <span className="font-black text-4xl tracking-tighter text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>BETON</span>
        </a>

        {/* Card */}
        <div className="bg-[#424356] rounded-none shadow-2xl overflow-hidden">
          {/* Yellow sidebar label + form */}
          <div className="flex">
            {/* Left yellow panel */}
            <div className="w-2 bg-primary flex-shrink-0" />

            {/* Form */}
            <div className="flex-1 p-8">
              <h2 className="text-2xl font-black text-white uppercase tracking-wide mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
                VITAJTE SPÄŤ!
              </h2>
              <p className="text-white/50 text-sm mb-8">Prihlásenie do administrácie MS-BETON</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 mb-6 rounded">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {lockInfo.locked && (
                <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm px-4 py-3 mb-6 rounded">
                  <Clock className="w-4 h-4 shrink-0" />
                  Zablokované. Skúste o: {formatLockTime(lockInfo.remainingMs)}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot — hidden from humans */}
                <input
                  type="text"
                  name="website_url"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={e => setHoneypot(e.target.value)}
                  style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
                  aria-hidden="true"
                />

                <div>
                  <label className="block text-white/70 text-xs font-bold uppercase tracking-widest mb-2">
                    E-mail alebo užívateľské meno
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      autoComplete="username"
                      disabled={lockInfo.locked || loading}
                      className="w-full bg-[#32334a] text-white border border-white/10 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                      placeholder="admin"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-bold uppercase tracking-widest mb-2">
                    Heslo
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={lockInfo.locked || loading}
                      className="w-full bg-[#32334a] text-white border border-white/10 pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Math CAPTCHA */}
                <div className="bg-[#32334a] border border-white/10 p-4 space-y-3">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Overenie – nie ste robot</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-[#1e1f2e] px-4 py-2 text-white font-bold text-sm text-center border border-white/10">
                      Koľko je <span className="text-primary">{captcha.a}</span> + <span className="text-primary">{captcha.b}</span> ?
                    </div>
                    <input
                      type="number"
                      value={captchaInput}
                      onChange={e => setCaptchaInput(e.target.value)}
                      disabled={lockInfo.locked || loading}
                      className="w-20 bg-[#32334a] text-white border border-white/10 px-3 py-2 text-sm text-center focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                      placeholder="?"
                    />
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="text-white/40 hover:text-primary text-xs transition-colors"
                      title="Obnoviť"
                    >
                      ↺
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={lockInfo.locked || loading}
                  className="w-full bg-primary text-secondary font-black text-sm uppercase tracking-widest py-4 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {loading ? (
                    <><span className="animate-spin border-2 border-secondary/30 border-t-secondary rounded-full w-4 h-4 inline-block" /> Prihlasujem...</>
                  ) : "Prihlásiť sa"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          © {new Date().getFullYear()} MS-BETON s.r.o. — Administrácia
        </p>
      </div>
    </div>
  );
}
