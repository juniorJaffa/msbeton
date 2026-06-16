import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import {
  clientAuth,
  isBiometricAvailable, hasClientBiometric,
  authenticateClientBiometric, registerClientBiometric, forgetClientBiometric,
  getClientAttemptInfo, recordClientFailedAttempt, resetClientAttempts,
} from "@/lib/clientAuth";
import { isLoggedIn as isAdminLoggedIn } from "@/lib/adminAuth";
import { canAutoTriggerBio } from "@/lib/bioPlatform";
import { SEOHead } from "@/components/SEOHead";
import { LogIn, Fingerprint, AlertCircle, Clock, RefreshCw, Check } from "lucide-react";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

type Screen = "form" | "bio-locked" | "bio-pending" | "bio-failed" | "bio-register";

// Kam po prihlásení: povýšený klient (Správca/Čítateľ) → admin prostredie, inak kalkulačka.
function adminDest(c?: { adminReader?: boolean; adminRole?: string } | null): string {
  return c && (c.adminReader || c.adminRole) ? "/admin/dashboard" : "/#calculator";
}

export default function ClientLogin() {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<Screen>("form");
  const [id, setId] = useState("");
  const [pwd, setPwd] = useState("");
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockInfo, setLockInfo] = useState({ locked: false, remainingMs: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCaptcha = () => { setCaptcha(generateCaptcha()); setCaptchaInput(""); };

  const formatLockTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    { const lc = clientAuth.getLoggedClient(); if (lc) { setLocation(adminDest(lc)); return; } }

    const info = getClientAttemptInfo();
    setLockInfo({ locked: info.locked, remainingMs: info.remainingMs });
    if (info.locked) {
      timerRef.current = setInterval(() => {
        const cur = getClientAttemptInfo();
        setLockInfo({ locked: cur.locked, remainingMs: cur.remainingMs });
        if (!cur.locked && timerRef.current) clearInterval(timerRef.current);
      }, 1000);
    }

    // Admin kontext — nekonfliktiť s klientskou biometriou
    if (isAdminLoggedIn()) return;

    if (isBiometricAvailable() && hasClientBiometric()) {
      // iOS Safari blokuje credentials.get() bez tapnutia → zobraz lock screen.
      // Na non-iOS (Chrome/Android/desktop) skús ticho hneď (zero-tap).
      setScreen("bio-locked");
      if (canAutoTriggerBio()) startBiometric();
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLocation]);

  // Spustí biometrické overenie — VŽDY z user gesta (onClick) na iOS, alebo auto na non-iOS
  const startBiometric = () => {
    if (!hasClientBiometric()) { setScreen("form"); return; }
    setScreen("bio-pending");
    authenticateClientBiometric().then(result => {
      if (result.ok && result.session) {
        clientAuth.updateSession(result.session);
        setLocation(adminDest(result.session));
      } else if (!hasClientBiometric()) {
        // Credential bol vymazaný (stale/iné zariadenie) — priamo na formulár
        setScreen("form");
      } else {
        setScreen("bio-failed");
      }
    });
  };

  const retryBiometric = startBiometric;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErr("");
    if (honeypot) { setErr("Odoslanie zamietnuté."); return; }
    if (lockInfo.locked) { setErr("Účet je dočasne zablokovaný."); return; }
    if (parseInt(captchaInput) !== captcha.answer) {
      setErr("Nesprávna odpoveď na overenie.");
      refreshCaptcha();
      return;
    }
    if (!id.trim() || !pwd.trim()) { setErr("Vyplňte ID klienta a heslo"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const res = await clientAuth.login(id.trim(), pwd.trim());
    setLoading(false);
    if (res.ok && res.client) {
      resetClientAttempts();
      // Admin-as-client (loginId "msbeton") nemá server-side credential → neponúkaj klient-bio.
      // Povýšení klienti (Správca/Čítateľ) bio DOSTANÚ — po nej redirect do admin prostredia.
      const isAdminClient = res.client.id === "admin" || res.client.clientId === "msbeton";
      if (!isAdminClient && isBiometricAvailable() && !hasClientBiometric()) {
        setScreen("bio-register"); // po registrácii/preskočení → adminDest(getLoggedClient())
      } else {
        setLocation(adminDest(res.client));
      }
    } else {
      const count = recordClientFailedAttempt();
      const info = getClientAttemptInfo();
      setLockInfo({ locked: info.locked, remainingMs: info.remainingMs });
      if (info.locked) {
        timerRef.current = setInterval(() => {
          const cur = getClientAttemptInfo();
          setLockInfo({ locked: cur.locked, remainingMs: cur.remainingMs });
          if (!cur.locked && timerRef.current) clearInterval(timerRef.current);
        }, 1000);
        setErr(`Príliš veľa pokusov (${count}). Účet zablokovaný na 5 minút.`);
      } else {
        setErr(res.error ?? "Nesprávne prihlasovacie údaje");
      }
      refreshCaptcha();
    }
  };

  const [bioRegLoading, setBioRegLoading] = useState(false);
  const [bioRegError, setBioRegError] = useState("");

  const registerBio = async () => {
    const session = clientAuth.getLoggedClient();
    if (!session) { setLocation("/#calculator"); return; }
    const dest = adminDest(session);
    setBioRegLoading(true);
    setBioRegError("");
    const res = await registerClientBiometric(session.id, session.clientId ?? session.id, session.name);
    setBioRegLoading(false);
    if (res.ok) {
      window.dispatchEvent(new Event("bio-status-changed")); // navbar aktualizuje indikátor
      setLocation(dest);
    } else {
      setBioRegError(res.error ?? "Registrácia zlyhala");
    }
  };

  // ── BIOMETRIC LOCKED (one-tap unlock — iOS-kompatibilné) ──
  if (screen === "bio-locked") return (
    <>
      <SEOHead title="Prihlásenie klienta – MS-BETON" noindex />
      <Navbar />
      <div className="min-h-screen concrete-navy flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-secondary/95 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="px-8 pt-9 pb-7 text-center">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <span className="absolute inset-0 rounded-full bg-primary/15" />
              <span className="absolute inset-0 rounded-full border-2 border-primary/40 flex items-center justify-center">
                <Fingerprint className="w-9 h-9 text-primary" />
              </span>
            </div>
            <p className="text-white font-black text-lg">Vitajte späť</p>
            <p className="text-white/40 text-sm mt-1">Prihláste sa biometricky — bez hesla</p>
          </div>
          <div className="px-8 pb-7 space-y-3">
            <button onClick={startBiometric}
              className="w-full py-4 bg-primary text-secondary font-black text-sm tracking-widest hover:bg-primary/85 active:scale-[0.98] transition-all rounded-lg flex items-center justify-center gap-2.5 cursor-pointer">
              <Fingerprint className="w-5 h-5" /> Odomknúť cez Face ID
            </button>
            <button onClick={() => setScreen("form")}
              className="w-full py-3 text-white/45 hover:text-white/80 font-semibold text-sm tracking-wide transition-colors rounded-lg cursor-pointer">
              Prihlásiť heslom
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── BIOMETRIC PENDING ──
  if (screen === "bio-pending") return (
    <>
      <SEOHead title="Prihlásenie klienta – MS-BETON" noindex />
      <Navbar />
      <div className="min-h-screen concrete-navy flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-secondary/95 rounded-2xl shadow-2xl border border-white/10 p-10 text-center">
          <div className="w-16 h-16 bg-primary/20 border-2 border-primary/40 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse">
            <Fingerprint className="w-8 h-8 text-primary" />
          </div>
          <p className="text-white font-black text-lg mb-2">Biometrické overenie</p>
          <p className="text-white/40 text-sm">Potvrďte odtlačok prsta alebo Face ID…</p>
        </div>
      </div>
    </>
  );

  // ── BIOMETRIC FAILED ──
  if (screen === "bio-failed") return (
    <>
      <SEOHead title="Prihlásenie klienta – MS-BETON" noindex />
      <Navbar />
      <div className="min-h-screen concrete-navy flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-secondary/95 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="px-8 py-7 border-b border-white/10 text-center">
            <div className="w-12 h-12 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-white font-black">Biometria zlyhala</p>
            <p className="text-white/40 text-xs mt-1">Skúste znova alebo zadajte heslo</p>
          </div>
          <div className="px-8 py-5 space-y-3">
            <button onClick={retryBiometric}
              className="w-full py-3 bg-primary text-secondary font-black text-sm tracking-widest hover:bg-primary/85 transition-all rounded-sm flex items-center justify-center gap-2 cursor-pointer">
              <Fingerprint className="w-4 h-4" /> Skúsiť znova
            </button>
            <button onClick={() => setScreen("form")}
              className="w-full py-3 border border-white/15 text-white/50 hover:text-white/80 hover:border-white/30 font-semibold text-sm tracking-widest transition-all rounded-sm cursor-pointer">
              Prihlásiť heslom
            </button>
            <button onClick={() => { forgetClientBiometric(); setScreen("form"); }}
              className="w-full py-2 text-white/20 hover:text-white/40 font-medium text-xs tracking-wide transition-colors cursor-pointer">
              Zabudnúť toto zariadenie
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── BIOMETRIC REGISTER ──
  if (screen === "bio-register") return (
    <>
      <SEOHead title="Prihlásenie klienta – MS-BETON" noindex />
      <Navbar />
      <div className="min-h-screen concrete-navy flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-secondary/95 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="px-8 py-7 border-b border-white/10 text-center">
            <div className="w-12 h-12 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Fingerprint className="w-6 h-6 text-primary" />
            </div>
            <p className="text-white font-black text-lg">Zapamätať biometricky?</p>
            <p className="text-white/40 text-sm mt-1">Budúce prihlásenie bez hesla — odtlačok prsta alebo Face ID</p>
          </div>
          <div className="px-8 py-5 space-y-3">
            {bioRegError && (
              <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-xs">{bioRegError}</p>
              </div>
            )}
            <button onClick={registerBio} disabled={bioRegLoading}
              className="w-full py-3.5 bg-primary text-secondary font-black text-sm tracking-widest hover:bg-primary/85 transition-all disabled:opacity-60 rounded-sm flex items-center justify-center gap-2 cursor-pointer">
              {bioRegLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {bioRegLoading ? "Aktivujem…" : "Áno, aktivovať"}
            </button>
            <button onClick={() => setLocation(adminDest(clientAuth.getLoggedClient()))} disabled={bioRegLoading}
              className="w-full py-3 border border-white/15 text-white/50 hover:text-white/80 font-semibold text-sm tracking-widest transition-all rounded-sm cursor-pointer disabled:opacity-40">
              Nie, preskočiť
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── MAIN FORM ──
  return (
    <>
      <SEOHead title="Prihlásenie klienta – MS-BETON" noindex />
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
                <h1 className="text-xl font-black text-white tracking-wide">Prihlásenie klienta</h1>
              </div>
              <p className="text-white/45 text-sm ml-12">Zadajte vaše klientské ID a heslo</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="px-8 py-7 space-y-4" noValidate autoComplete="off">

              {/* Honeypot — hidden from humans */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
              />

              {lockInfo.locked ? (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <p className="text-red-400 text-sm font-bold">Príliš veľa pokusov</p>
                    <p className="text-red-400/70 text-xs">Skúste znova o {formatLockTime(lockInfo.remainingMs)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-2 tracking-wider uppercase">ID klienta</label>
                    <input
                      value={id}
                      onChange={e => setId(e.target.value)}
                      placeholder="napr. 20"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full bg-white/8 border-b-2 border-b-primary/60 focus:border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/25 text-sm font-medium rounded-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-2 tracking-wider uppercase">Heslo</label>
                    <input
                      type="password"
                      value={pwd}
                      onChange={e => setPwd(e.target.value)}
                      placeholder="••••"
                      autoComplete="current-password"
                      className="w-full bg-white/8 border-b-2 border-b-primary/60 focus:border-b-primary text-white px-4 py-3 focus:outline-none placeholder:text-white/25 text-sm font-medium rounded-sm transition-colors"
                    />
                  </div>

                  {/* Math captcha */}
                  <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-white/50 text-xs mb-2 uppercase tracking-wider whitespace-nowrap">Koľko je <span className="text-primary font-black">{captcha.a}</span> + <span className="text-primary font-black">{captcha.b}</span> ?</p>
                        <input
                          type="number"
                          value={captchaInput}
                          onChange={e => setCaptchaInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleLogin()}
                          placeholder="Výsledok"
                          inputMode="numeric"
                          autoComplete="off"
                          className="w-full bg-white/8 border-b border-b-white/20 focus:border-b-primary text-white px-2 py-1.5 focus:outline-none placeholder:text-white/20 text-sm font-mono rounded-sm transition-colors"
                        />
                      </div>
                      <button type="button" onClick={refreshCaptcha}
                        className="text-white/25 hover:text-white/50 transition-colors p-1" title="Nová otázka">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {err && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{err}</p>
                </div>
              )}

              {!lockInfo.locked && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 bg-primary text-white font-black text-sm tracking-widest hover:bg-primary/85 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-sm cursor-pointer"
                >
                  {loading ? "Prihlasovanie..." : "PRIHLÁSIŤ SA"}
                </button>
              )}

              {isBiometricAvailable() && hasClientBiometric() && !lockInfo.locked && (
                <button type="button" onClick={retryBiometric}
                  className="w-full py-2.5 border border-primary/30 text-primary/70 hover:border-primary hover:text-primary font-bold text-xs tracking-widest transition-all rounded-sm flex items-center justify-center gap-2 cursor-pointer">
                  <Fingerprint className="w-4 h-4" /> Prihlásiť biometricky
                </button>
              )}

              {/* Bio ešte nikdy neaktivovaná — jednoduchý ikonický hint (robotníci, mobil) */}
              {isBiometricAvailable() && !hasClientBiometric() && !lockInfo.locked && (
                <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                    <Fingerprint className="w-4 h-4 text-primary/80" />
                  </div>
                  <p className="text-white/55 text-xs leading-snug">
                    Po prihlásení zapnete <span className="text-white/80 font-bold">Face ID</span> / odtlačok — nabudúce <span className="text-white/80 font-bold">bez hesla</span>.
                  </p>
                </div>
              )}

              <p className="text-center text-white/30 text-xs pt-2">
                Prihlasovacie údaje vám poskytne MS-BETON
              </p>
            </form>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-white/35 hover:text-white/60 text-xs transition-colors">← Späť na hlavnú stránku</a>
          </div>
        </div>
      </div>
    </>
  );
}
