import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { SEOHead } from "@/components/SEOHead";
import { clientAuth } from "@/lib/clientAuth";
import { clientApi } from "@/lib/api";
import { Eye, EyeOff, Check, AlertCircle, RefreshCw, Mail } from "lucide-react";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

export default function ClientProfile() {
  const [, navigate] = useLocation();
  const client = clientAuth.getLoggedClient();

  // ── Zmena údajov ──
  const [loginId, setLoginId] = useState(client?.clientId ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [currentPassData, setCurrentPassData] = useState("");
  const [showCurrentData, setShowCurrentData] = useState(false);
  const [captchaData, setCaptchaData] = useState(generateCaptcha);
  const [captchaDataInput, setCaptchaDataInput] = useState("");
  const [savingData, setSavingData] = useState(false);
  const [msgData, setMsgData] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Zmena hesla ──
  const [currentPassPwd, setCurrentPassPwd] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [captchaPwd, setCaptchaPwd] = useState(generateCaptcha);
  const [captchaPwdInput, setCaptchaPwdInput] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [msgPwd, setMsgPwd] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Email reset ──
  const [resetSending, setResetSending] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!client || client.id === "admin") {
    navigate("/prihlasenie");
    return null;
  }

  const hasDiscount = client.discountBeton > 0 || client.discountDoprava > 0 || client.discountSluzby > 0 || client.discountCelkovo > 0;

  async function handleSaveData() {
    if (!currentPassData) { setMsgData({ ok: false, text: "Zadajte aktuálne heslo" }); return; }
    if (parseInt(captchaDataInput) !== captchaData.answer) {
      setMsgData({ ok: false, text: "Nesprávna odpoveď na overenie" });
      setCaptchaData(generateCaptcha()); setCaptchaDataInput("");
      return;
    }
    const changedLoginId = loginId.trim() !== client.clientId ? loginId.trim() : undefined;
    const changedEmail = email.trim() !== (client.email ?? "") ? email.trim() : undefined;
    if (!changedLoginId && changedEmail === undefined) {
      setMsgData({ ok: false, text: "Žiadne zmeny na uloženie" }); return;
    }
    setSavingData(true); setMsgData(null);
    const res = await clientApi.updateProfile(client.id, currentPassData, changedLoginId, changedEmail);
    setSavingData(false);
    if (res?.ok && res.client) {
      clientAuth.updateSession(res.client);
      setMsgData({ ok: true, text: "Údaje uložené" });
      setCurrentPassData("");
      setCaptchaData(generateCaptcha()); setCaptchaDataInput("");
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
      setCaptchaPwd(generateCaptcha()); setCaptchaPwdInput("");
      return;
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
    if (res?.ok) setResetMsg({ ok: true, text: "Odkaz bol odoslaný na váš email" });
    else setResetMsg({ ok: false, text: res?.error ?? "Chyba pri odosielaní" });
  }

  const fieldCls = "w-full bg-white/8 border-b-2 border-b-white/20 focus:border-b-primary text-white px-3 py-2.5 focus:outline-none placeholder:text-white/20 text-sm font-medium rounded-sm transition-colors";
  const labelCls = "block text-[10px] font-bold text-white/50 mb-1.5 tracking-widest uppercase";

  const MathCheck = ({ captcha, input, setInput, onRefresh }: { captcha: { a: number; b: number }; input: string; setInput: (v: string) => void; onRefresh: () => void }) => (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-3 py-2">
      <span className="text-white/40 text-xs shrink-0">
        Koľko je <span className="text-primary font-black">{captcha.a}</span> + <span className="text-primary font-black">{captcha.b}</span> ?
      </span>
      <input type="number" value={input} onChange={e => setInput(e.target.value)} inputMode="numeric" autoComplete="off"
        placeholder="?" className="w-12 bg-transparent border-b border-white/20 focus:border-primary text-white text-sm font-mono text-center focus:outline-none transition-colors" />
      <button type="button" onClick={onRefresh} className="text-white/20 hover:text-white/50 transition-colors ml-auto">
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <>
      <SEOHead title="Môj profil – MS-BETON" noIndex />
      <Navbar />
      <main className="min-h-screen concrete-navy">
        {/* Compact header */}
        <div className="bg-secondary border-b border-white/10 px-4 py-5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-wide">VÁŠ PROFIL</h1>
              <p className="text-white/40 text-sm mt-0.5">{client.name}{client.company ? ` · ${client.company}` : ""}</p>
            </div>
            {hasDiscount && (
              <div className="flex flex-wrap gap-1 justify-end">
                {client.discountBeton > 0 && <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-black rounded">Betón −{client.discountBeton}%</span>}
                {client.discountDoprava > 0 && <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-black rounded">Doprava −{client.discountDoprava}%</span>}
                {client.discountSluzby > 0 && <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-black rounded">Služby −{client.discountSluzby}%</span>}
                {client.discountCelkovo > 0 && <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-black rounded">Celkovo −{client.discountCelkovo}%</span>}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* ── Email reset ── */}
          {client.email && (
            <div className="bg-secondary/80 border border-white/10 rounded-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Odoslanie emailu</p>
                  <p className="text-white/60 text-sm">Na emailovú adresu bude odoslaný odkaz na reset hesla</p>
                  {resetMsg && (
                    <div className={`flex items-center gap-1.5 text-xs font-bold mt-2 ${resetMsg.ok ? "text-green-400" : "text-red-400"}`}>
                      {resetMsg.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {resetMsg.text}
                    </div>
                  )}
                </div>
                <button onClick={handleEmailReset} disabled={resetSending || !!resetMsg?.ok}
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-wider hover:bg-primary/85 transition-colors disabled:opacity-50 rounded-sm cursor-pointer">
                  <Mail className="w-3.5 h-3.5" /> Odoslať e-mail
                </button>
              </div>
            </div>
          )}

          {/* ── Zmena údajov ── */}
          <div className="bg-secondary/80 border border-white/10 rounded-sm p-5">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">Zmena údajov</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Prihlasovacie ID</label>
                <input value={loginId} onChange={e => setLoginId(e.target.value)} className={fieldCls} autoComplete="username" />
              </div>
              <div>
                <label className={labelCls}>E-Mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="váš@email.sk" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Aktuálne heslo</label>
                <div className="relative">
                  <input type={showCurrentData ? "text" : "password"} value={currentPassData} onChange={e => setCurrentPassData(e.target.value)}
                    placeholder="••••" className={fieldCls + " pr-10"} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowCurrentData(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showCurrentData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Overenie</label>
                <MathCheck captcha={captchaData} input={captchaDataInput} setInput={setCaptchaDataInput}
                  onRefresh={() => { setCaptchaData(generateCaptcha()); setCaptchaDataInput(""); }} />
              </div>
            </div>
            {msgData && (
              <div className={`flex items-center gap-1.5 text-xs font-bold mt-3 ${msgData.ok ? "text-green-400" : "text-red-400"}`}>
                {msgData.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />} {msgData.text}
              </div>
            )}
            <button onClick={handleSaveData} disabled={savingData}
              className="mt-4 px-6 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-wider hover:bg-primary/85 transition-colors disabled:opacity-50 rounded-sm cursor-pointer">
              {savingData ? "Ukladám..." : "ZMENIŤ ÚDAJE"}
            </button>
          </div>

          {/* ── Zmena hesla ── */}
          <div className="bg-secondary/80 border border-white/10 rounded-sm p-5">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">Zmena hesla</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Aktuálne heslo</label>
                <input type="password" value={currentPassPwd} onChange={e => setCurrentPassPwd(e.target.value)}
                  placeholder="••••" className={fieldCls} autoComplete="current-password" />
              </div>
              <div>
                <label className={labelCls}>Nové heslo</label>
                <div className="relative">
                  <input type={showNewPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)}
                    placeholder="min. 6 znakov" className={fieldCls + " pr-10"} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowNewPass(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Zopakovať heslo</label>
                <div className="relative">
                  <input type={showConfirmPass ? "text" : "password"} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Zopakovať heslo" className={fieldCls + " pr-10"} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirmPass(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPass && confirmPass && newPass !== confirmPass && (
                  <p className="text-red-400 text-[10px] mt-1">Heslá sa nezhodujú</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Overenie</label>
                <MathCheck captcha={captchaPwd} input={captchaPwdInput} setInput={setCaptchaPwdInput}
                  onRefresh={() => { setCaptchaPwd(generateCaptcha()); setCaptchaPwdInput(""); }} />
              </div>
            </div>
            {msgPwd && (
              <div className={`flex items-center gap-1.5 text-xs font-bold mt-3 ${msgPwd.ok ? "text-green-400" : "text-red-400"}`}>
                {msgPwd.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />} {msgPwd.text}
              </div>
            )}
            <button onClick={handleChangePassword} disabled={savingPwd}
              className="mt-4 px-6 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-wider hover:bg-primary/85 transition-colors disabled:opacity-50 rounded-sm cursor-pointer">
              {savingPwd ? "Mením..." : "ZMENIŤ HESLO"}
            </button>
          </div>

          <div className="text-center pt-2">
            <a href="/#calculator" className="text-white/30 hover:text-white/55 text-xs transition-colors">← Späť na kalkulačku</a>
          </div>
        </div>
      </main>
    </>
  );
}
