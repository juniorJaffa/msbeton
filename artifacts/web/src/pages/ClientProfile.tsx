import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { SEOHead } from "@/components/SEOHead";
import { clientAuth, isBiometricAvailable, hasClientBiometric, registerClientBiometric, forgetClientBiometric } from "@/lib/clientAuth";
import { clientApi } from "@/lib/api";
import { Eye, EyeOff, Check, AlertCircle, Mail, User, Lock, KeyRound, Fingerprint, ShieldCheck, ShieldOff } from "lucide-react";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

const fieldCls = "w-full bg-white/10 border border-white/20 focus:border-primary text-white px-3 py-2.5 focus:outline-none placeholder:text-white/35 text-base font-medium rounded-sm transition-colors";
const labelCls = "block text-xs font-bold text-white/60 mb-1.5 tracking-widest uppercase";

function MathCheck({ captcha, input, setInput, onRefresh }: { captcha: { a: number; b: number }; input: string; setInput: (v: string) => void; onRefresh: () => void }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/8 flex items-center justify-between">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nie ste robot</p>
        <button type="button" onClick={onRefresh} className="text-white/30 hover:text-primary transition-colors cursor-pointer text-sm leading-none" title="Nová otázka">↺</button>
      </div>
      <div className="px-3 py-3 flex items-center gap-2 flex-nowrap">
        <span className="text-white/70 text-sm font-medium shrink-0 whitespace-nowrap">Koľko je</span>
        <span className="text-primary font-black text-xl">{captcha.a}</span>
        <span className="text-white/40 font-bold">+</span>
        <span className="text-primary font-black text-xl">{captcha.b}</span>
        <span className="text-white/40 font-bold">=</span>
        <input type="number" value={input} onChange={e => setInput(e.target.value)} inputMode="numeric" autoComplete="off"
          placeholder="?"
          className="w-16 bg-secondary border border-primary/30 focus:border-primary text-primary font-black text-xl text-center py-1.5 focus:outline-none transition-colors rounded-md" />
      </div>
    </div>
  );
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold mt-2 ${msg.ok ? "text-green-400" : "text-red-400"}`}>
      {msg.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      {msg.text}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, show, onToggle, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  show: boolean; onToggle: () => void; autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "••••"} className={fieldCls + " pr-10"} autoComplete={autoComplete} />
      <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ClientProfile() {
  const [, navigate] = useLocation();
  const client = clientAuth.getLoggedClient();

  useEffect(() => {
    const handler = () => { if (!clientAuth.getLoggedClient()) navigate("/prihlasenie"); };
    window.addEventListener("client-session-changed", handler);
    return () => window.removeEventListener("client-session-changed", handler);
  }, [navigate]);

  const [loginId, setLoginId] = useState(client?.clientId ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [currentPassData, setCurrentPassData] = useState("");
  const [showCurrentData, setShowCurrentData] = useState(false);
  const [captchaData, setCaptchaData] = useState(generateCaptcha);
  const [captchaDataInput, setCaptchaDataInput] = useState("");
  const [savingData, setSavingData] = useState(false);
  const [msgData, setMsgData] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPassPwd, setCurrentPassPwd] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [captchaPwd, setCaptchaPwd] = useState(generateCaptcha);
  const [captchaPwdInput, setCaptchaPwdInput] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [msgPwd, setMsgPwd] = useState<{ ok: boolean; text: string } | null>(null);

  const [resetSending, setResetSending] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [bioActive, setBioActive] = useState(() => hasClientBiometric());
  const [bioAvailable] = useState(() => isBiometricAvailable());
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMsg, setBioMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!client || client.id === "admin") { navigate("/prihlasenie"); return null; }

  async function handleBioActivate() {
    setBioLoading(true); setBioMsg(null);
    const result = await registerClientBiometric(client!.id, client!.clientId ?? "", client!.name ?? "");
    setBioLoading(false);
    if (result.ok) {
      setBioActive(true);
      setBioMsg({ ok: true, text: "Biometria aktivovaná. Ďalší login bez hesla." });
    } else {
      setBioMsg({ ok: false, text: result.error ?? "Aktivácia zlyhala" });
    }
  }

  async function handleBioForget() {
    if (!confirm("Zabudnúť biometrické prihlásenie na tomto zariadení?")) return;
    setBioLoading(true); setBioMsg(null);
    await forgetClientBiometric();
    setBioActive(false);
    setBioLoading(false);
    setBioMsg({ ok: true, text: "Zariadenie zabudnuté. Ďalší login vyžaduje heslo." });
  }

  const discounts = [
    client.discountBeton   > 0 && { label: `Betón −${client.discountBeton}%` },
    client.discountDoprava > 0 && { label: `Doprava −${client.discountDoprava}%` },
    client.discountSluzby  > 0 && { label: `Služby −${client.discountSluzby}%` },
    client.discountCelkovo > 0 && { label: `Celkovo −${client.discountCelkovo}%` },
  ].filter(Boolean) as { label: string }[];

  async function handleSaveData() {
    if (!currentPassData) { setMsgData({ ok: false, text: "Zadajte aktuálne heslo" }); return; }
    if (parseInt(captchaDataInput) !== captchaData.answer) {
      setMsgData({ ok: false, text: "Nesprávna odpoveď na overenie" });
      setCaptchaData(generateCaptcha()); setCaptchaDataInput(""); return;
    }
    const changedLoginId = loginId.trim() !== client.clientId ? loginId.trim() : undefined;
    const changedEmail = email.trim() !== (client.email ?? "") ? email.trim() : undefined;
    if (!changedLoginId && changedEmail === undefined) { setMsgData({ ok: false, text: "Žiadne zmeny na uloženie" }); return; }
    setSavingData(true); setMsgData(null);
    const res = await clientApi.updateProfile(client.id, currentPassData, changedLoginId, changedEmail);
    setSavingData(false);
    if (res?.ok && res.client) {
      clientAuth.updateSession(res.client);
      setMsgData({ ok: true, text: "Údaje uložené" });
      setCurrentPassData(""); setCaptchaData(generateCaptcha()); setCaptchaDataInput("");
    } else {
      setMsgData({ ok: false, text: res?.error ?? "Chyba pri ukladaní" });
      setCaptchaData(generateCaptcha()); setCaptchaDataInput("");
    }
  }

  async function handleChangePassword() {
    if (!currentPassPwd) { setMsgPwd({ ok: false, text: "Zadajte aktuálne heslo" }); return; }
    if (newPass.length < 6) { setMsgPwd({ ok: false, text: "Nové heslo musí mať aspoň 6 znakov" }); return; }
    if (newPass !== confirmPass) { setMsgPwd({ ok: false, text: "Heslá sa nezhodujú" }); return; }
    if (parseInt(captchaPwdInput) !== captchaPwd.answer) {
      setMsgPwd({ ok: false, text: "Nesprávna odpoveď na overenie" });
      setCaptchaPwd(generateCaptcha()); setCaptchaPwdInput(""); return;
    }
    setSavingPwd(true); setMsgPwd(null);
    const res = await clientApi.updateProfile(client.id, currentPassPwd, undefined, undefined, newPass);
    setSavingPwd(false);
    if (res?.ok) {
      setMsgPwd({ ok: true, text: "Heslo zmenené" });
      setCurrentPassPwd(""); setNewPass(""); setConfirmPass("");
      setCaptchaPwd(generateCaptcha()); setCaptchaPwdInput("");
    } else {
      setMsgPwd({ ok: false, text: res?.error ?? "Chyba pri zmene hesla" });
      setCaptchaPwd(generateCaptcha()); setCaptchaPwdInput("");
    }
  }

  async function handleEmailReset() {
    setResetSending(true); setResetMsg(null);
    const res = await clientApi.requestPasswordReset(client.id);
    setResetSending(false);
    if (res?.ok) setResetMsg({ ok: true, text: "Odkaz odoslaný na váš email" });
    else setResetMsg({ ok: false, text: res?.error ?? "Chyba pri odosielaní" });
  }

  const btnCls = "px-5 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-wider hover:bg-primary/85 transition-colors disabled:opacity-50 rounded-sm cursor-pointer";

  return (
    <>
      <SEOHead title="Môj profil – MS-BETON" noindex />
      <Navbar />
      <main className="min-h-screen concrete-light">

        {/* Header */}
        <div className="bg-secondary border-b border-white/10 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white uppercase tracking-wide leading-tight">
                  {client.name}
                  {client.company && <span className="text-white/55 font-medium text-sm ml-2 normal-case tracking-normal">· {client.company}</span>}
                </h1>
                <p className="text-white/55 text-xs">ID: <span className="text-white/60 font-mono">{client.clientId}</span></p>
              </div>
            </div>
            {discounts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {discounts.map(d => (
                  <span key={d.label} className="px-2.5 py-1 bg-primary/20 text-primary text-[10px] font-black rounded-sm border border-primary/20">
                    {d.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2-col layout */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Zmena údajov ── */}
            <div className="bg-secondary rounded-xl border border-white/10 shadow-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/8 bg-white/5">
                <User className="w-4 h-4 text-primary shrink-0" />
                <p className="text-[11px] font-black text-white/80 uppercase tracking-widest">Zmena prihlasovacích údajov</p>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Prihlasovacie ID</label>
                    <input value={loginId} onChange={e => setLoginId(e.target.value)} className={fieldCls} autoComplete="off" />
                  </div>
                  <div>
                    <label className={labelCls}>E-mail</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="váš@email.sk" className={fieldCls} autoComplete="off" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Aktuálne heslo</label>
                  <PasswordInput value={currentPassData} onChange={setCurrentPassData}
                    show={showCurrentData} onToggle={() => setShowCurrentData(v => !v)} autoComplete="off" />
                </div>
                <MathCheck captcha={captchaData} input={captchaDataInput} setInput={setCaptchaDataInput}
                  onRefresh={() => { setCaptchaData(generateCaptcha()); setCaptchaDataInput(""); }} />
                <div>
                  <button type="button" onClick={handleSaveData} disabled={savingData} className={btnCls + " w-full"}>
                    {savingData ? "Ukladám..." : "Zmeniť údaje"}
                  </button>
                  <Msg msg={msgData} />
                </div>
              </div>
            </div>

            {/* ── Zmena hesla ── */}
            <div className="bg-secondary rounded-xl border border-white/10 shadow-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/8 bg-white/5">
                <Lock className="w-4 h-4 text-primary shrink-0" />
                <p className="text-[11px] font-black text-white/80 uppercase tracking-widest">Zmena hesla</p>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <label className={labelCls}>Aktuálne heslo</label>
                  <PasswordInput value={currentPassPwd} onChange={setCurrentPassPwd}
                    show={showCurrentPwd} onToggle={() => setShowCurrentPwd(v => !v)} autoComplete="off" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nové heslo</label>
                    <PasswordInput value={newPass} onChange={setNewPass} placeholder="min. 6 znakov"
                      show={showNewPass} onToggle={() => setShowNewPass(v => !v)} autoComplete="off" />
                  </div>
                  <div>
                    <label className={labelCls}>Zopakovať</label>
                    <PasswordInput value={confirmPass} onChange={setConfirmPass}
                      show={showConfirmPass} onToggle={() => setShowConfirmPass(v => !v)} autoComplete="off" />
                    {newPass && confirmPass && newPass !== confirmPass && (
                      <p className="text-red-400 text-[11px] mt-1.5 font-semibold">Heslá sa nezhodujú</p>
                    )}
                  </div>
                </div>
                <MathCheck captcha={captchaPwd} input={captchaPwdInput} setInput={setCaptchaPwdInput}
                  onRefresh={() => { setCaptchaPwd(generateCaptcha()); setCaptchaPwdInput(""); }} />
                <div>
                  <button type="button" onClick={handleChangePassword} disabled={savingPwd} className={btnCls + " w-full"}>
                    {savingPwd ? "Mením..." : "Zmeniť heslo"}
                  </button>
                  <Msg msg={msgPwd} />
                </div>
                {/* Reset hesla emailom */}
                {client.email && (
                  <div className="border-t border-white/8 pt-3">
                    {resetMsg ? (
                      <div className={`flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2.5 ${resetMsg.ok ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                        {resetMsg.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{resetMsg.text}</span>
                        {resetMsg.ok && <span className="text-white/30 font-normal ml-1">· Skontrolujte aj spam</span>}
                      </div>
                    ) : (
                      <button type="button" onClick={handleEmailReset} disabled={resetSending}
                        className="flex items-center gap-2 text-white/45 hover:text-primary/80 transition-colors text-xs disabled:opacity-40 cursor-pointer group">
                        <Mail className="w-3.5 h-3.5 shrink-0 group-hover:text-primary/70 transition-colors" />
                        <span>{resetSending ? "Odosiela sa…" : "Zabudnuté heslo? Poslať reset odkaz na email"}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Biometria ── */}
          {bioAvailable && (
            <div className="mt-5 bg-secondary rounded-xl border border-white/10 shadow-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/8 bg-white/5">
                <Fingerprint className="w-4 h-4 text-primary shrink-0" />
                <p className="text-[11px] font-black text-white/80 uppercase tracking-widest">Biometrické prihlásenie</p>
                {bioActive
                  ? <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full"><ShieldCheck className="w-3 h-3" /> Aktívna</span>
                  : <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-white/35 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full"><ShieldOff className="w-3 h-3" /> Neaktívna</span>
                }
              </div>
              <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-xs text-white/50 max-w-sm">
                  {bioActive
                    ? "Toto zariadenie má aktivované biometrické prihlásenie (Face ID / odtlačok). Heslo sa pri ďalšom prihlásení nevyžaduje."
                    : "Aktivujte Face ID alebo odtlačok prsta pre rýchle prihlásenie bez hesla — rovnako ako v bankovej aplikácii."}
                </p>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {bioActive ? (
                    <button type="button" onClick={handleBioForget} disabled={bioLoading}
                      className="flex items-center gap-1.5 text-xs font-bold text-red-400/80 hover:text-red-400 border border-red-500/25 hover:border-red-500/50 px-3 py-2 rounded-sm transition-colors disabled:opacity-40 cursor-pointer">
                      <ShieldOff className="w-3.5 h-3.5" />
                      {bioLoading ? "Odstraňujem..." : "Zabudnúť toto zariadenie"}
                    </button>
                  ) : (
                    <button type="button" onClick={handleBioActivate} disabled={bioLoading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-secondary font-black text-xs uppercase tracking-wider hover:bg-primary/85 transition-colors disabled:opacity-50 rounded-sm cursor-pointer">
                      <Fingerprint className="w-3.5 h-3.5" />
                      {bioLoading ? "Aktivujem..." : "Aktivovať biometriu"}
                    </button>
                  )}
                  <Msg msg={bioMsg} />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-secondary/30">
            <div className="flex items-center gap-2 text-secondary/60 text-xs">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Zmeny vyžadujú aktuálne heslo</span>
            </div>
            <a href="/#calculator" className="text-secondary/50 hover:text-secondary/80 text-xs transition-colors font-medium">← Kalkulačka</a>
          </div>
        </div>
      </main>
    </>
  );
}
