import { useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { SEOHead } from "@/components/SEOHead";
import { clientAuth } from "@/lib/clientAuth";
import { clientApi } from "@/lib/api";
import { Eye, EyeOff, Check, AlertCircle, User, Mail, Lock } from "lucide-react";

export default function ClientProfile() {
  const [, navigate] = useLocation();
  const client = clientAuth.getLoggedClient();

  const [loginId, setLoginId] = useState(client?.clientId ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [currentPass, setCurrentPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [resetSending, setResetSending] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!client || client.id === "admin") {
    navigate("/prihlasenie");
    return null;
  }

  async function handleSaveProfile() {
    if (!currentPass) { setSaveMsg({ ok: false, text: "Zadajte aktuálne heslo" }); return; }
    setSaving(true);
    setSaveMsg(null);
    const changedLoginId = loginId.trim() !== client!.clientId ? loginId.trim() : undefined;
    const changedEmail = email.trim() !== (client!.email ?? "") ? email.trim() : undefined;
    if (!changedLoginId && changedEmail === undefined) {
      setSaving(false);
      setSaveMsg({ ok: false, text: "Žiadne zmeny na uloženie" });
      return;
    }
    const res = await clientApi.updateProfile(client!.id, currentPass, changedLoginId, changedEmail);
    setSaving(false);
    if (res?.ok && res.client) {
      clientAuth.updateSession(res.client);
      setSaveMsg({ ok: true, text: "Údaje boli uložené" });
      setCurrentPass("");
    } else {
      setSaveMsg({ ok: false, text: res?.error ?? "Chyba pri ukladaní" });
    }
  }

  async function handleRequestReset() {
    setResetSending(true);
    setResetMsg(null);
    const res = await clientApi.requestPasswordReset(client!.id);
    setResetSending(false);
    if (res?.ok) {
      setResetMsg({ ok: true, text: "Odkaz na reset hesla bol odoslaný na váš email" });
    } else {
      setResetMsg({ ok: false, text: res?.error ?? "Chyba pri odosielaní" });
    }
  }

  const hasDiscount = client.discountBeton > 0 || client.discountDoprava > 0 || client.discountSluzby > 0 || client.discountCelkovo > 0;

  return (
    <>
      <SEOHead title="Môj profil – MS-BETON" noindex />
      <Navbar />
      <main className="min-h-screen concrete-light pt-28 pb-16">
        <div className="max-w-xl mx-auto px-4">
          <h1 className="text-3xl font-black text-secondary mb-8 uppercase tracking-wide">Môj profil</h1>

          {/* Info */}
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-5 mb-4">
            <p className="text-[10px] font-black text-secondary/50 uppercase tracking-widest mb-3">Informácie o účte</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 shrink-0">Meno</span>
                <span className="font-bold text-secondary">{client.name}</span>
              </div>
              {client.company && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Firma</span>
                  <span className="font-semibold">{client.company}</span>
                </div>
              )}
              {hasDiscount && (
                <div className="flex gap-2 items-start">
                  <span className="text-gray-400 w-20 shrink-0 pt-0.5">Zľavy</span>
                  <div className="flex flex-wrap gap-1">
                    {client.discountBeton > 0 && <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-black rounded">Betón −{client.discountBeton}%</span>}
                    {client.discountDoprava > 0 && <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-black rounded">Doprava −{client.discountDoprava}%</span>}
                    {client.discountSluzby > 0 && <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-black rounded">Služby −{client.discountSluzby}%</span>}
                    {client.discountCelkovo > 0 && <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-black rounded">Celkovo −{client.discountCelkovo}%</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Edit form */}
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-5 mb-4">
            <p className="text-[10px] font-black text-secondary/50 uppercase tracking-widest mb-4">Prihlasovacie údaje</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Prihlasovacie ID
                </label>
                <input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="váš@email.sk"
                  className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Aktuálne heslo <span className="text-gray-400 font-normal">(povinné pre uloženie)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                    placeholder="Zadajte aktuálne heslo"
                    className="w-full border border-gray-300 rounded-sm px-3 py-2 pr-10 text-sm focus:outline-none focus:border-secondary"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {saveMsg && (
                <div className={`flex items-center gap-2 text-xs font-bold ${saveMsg.ok ? "text-green-700" : "text-red-600"}`}>
                  {saveMsg.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {saveMsg.text}
                </div>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-primary text-secondary font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Ukladám..." : "Uložiť zmeny"}
              </button>
            </div>
          </div>

          {/* Password reset */}
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-5">
            <p className="text-[10px] font-black text-secondary/50 uppercase tracking-widest mb-2">Reset hesla</p>
            {client.email ? (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Na váš email <strong>{client.email}</strong> bude odoslaný odkaz na nastavenie nového hesla. Platný 1 hodinu.
                </p>
                {resetMsg && (
                  <div className={`flex items-center gap-2 text-xs font-bold mb-3 ${resetMsg.ok ? "text-green-700" : "text-red-600"}`}>
                    {resetMsg.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {resetMsg.text}
                  </div>
                )}
                <button
                  onClick={handleRequestReset}
                  disabled={resetSending || !!resetMsg?.ok}
                  className="border border-secondary text-secondary font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-sm hover:bg-secondary hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {resetSending ? "Odosielam..." : "Zaslať odkaz na reset hesla"}
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400">Email nie je zaregistrovaný. Kontaktujte administrátora.</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
