import { useState, useEffect } from "react";
import { Menu, X, Phone, Mail, LogIn, LogOut, Calculator, UserCog, ShieldCheck, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { clientAuth, type LoggedClient } from "@/lib/clientAuth";
import { hasStoredCredential, isBiometricAvailable, isLoggedIn as adminIsLoggedIn } from "@/lib/adminAuth";
import { hasClientBiometric, isBiometricAvailable as isClientBioAvailable } from "@/lib/clientAuth";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggedClient, setLoggedClient] = useState<LoggedClient | null>(() => clientAuth.getLoggedClient());
  const [adminBioActive, setAdminBioActive] = useState(() => isBiometricAvailable() && hasStoredCredential());
  const [clientBioActive, setClientBioActive] = useState(() => isClientBioAvailable() && hasClientBiometric());
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => adminIsLoggedIn());

  useEffect(() => {
    const onBioChange = () => {
      setAdminBioActive(isBiometricAvailable() && hasStoredCredential());
      setClientBioActive(isClientBioAvailable() && hasClientBiometric());
      setAdminLoggedIn(adminIsLoggedIn());
    };
    window.addEventListener("bio-status-changed", onBioChange);
    window.addEventListener("client-session-changed", onBioChange);
    window.addEventListener("admin-session-changed", onBioChange);
    return () => {
      window.removeEventListener("bio-status-changed", onBioChange);
      window.removeEventListener("client-session-changed", onBioChange);
      window.removeEventListener("admin-session-changed", onBioChange);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const onSessionChange = () => setLoggedClient(clientAuth.getLoggedClient());
    window.addEventListener("client-session-changed", onSessionChange);
    return () => window.removeEventListener("client-session-changed", onSessionChange);
  }, []);

  const navLinks = [
    { name: "O nás", href: "/#about" },
    { name: "Kalkulačka", href: "/kalkulacka-beton" },
    { name: "Vozový park", href: "/vozovy-park" },
    { name: "Cenník", href: "/cennik" },
    { name: "Kontakt", href: "/kontakt" },
  ];

  return (
    <>
    <div className="fixed top-0 left-0 right-0 z-[60]">
      {/* ── Top info bar ── */}
      <div className="bg-secondary border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9 w-full">
            {/* ── Group 1: Kontakt ── */}
            <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
              <a
                href="mailto:info@msbeton.sk"
                className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs"
                title="info@msbeton.sk"
              >
                <Mail className="w-3 h-3 shrink-0" />
                <span className="hidden lg:inline text-[11px]">info@msbeton.sk</span>
              </a>
              <a
                href="tel:+421909205205"
                className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-xs font-bold tracking-wide"
              >
                <Phone className="w-3 h-3 shrink-0" />
                <span>+421 909 205 205</span>
              </a>
            </div>

            {/* ── Group 2: Klient (centered) ── */}
            <div className="flex items-center gap-2">
              {loggedClient ? (
                <>
                  {loggedClient.id !== "admin" ? (
                    <a href="/klient-profil" className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-xs group" title="Môj profil">
                      <span className="relative inline-flex items-center justify-center">
                        <UserCog className="w-3.5 h-3.5 shrink-0 drop-shadow-[0_0_5px_rgba(237,197,49,0.7)]" />
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_4px_rgba(237,197,49,0.9)]" />
                      </span>
                      <span className="font-bold hidden sm:inline">{loggedClient.name}</span>
                    </a>
                  ) : (
                    <span className="text-white/60 text-xs hidden sm:block">{loggedClient.name}</span>
                  )}
                  {(loggedClient.discountBeton > 0 || loggedClient.discountDoprava > 0 || loggedClient.discountSluzby > 0 || loggedClient.discountCelkovo > 0) && (
                    <span className="px-1.5 py-0.5 bg-primary text-secondary text-[10px] font-black rounded-sm hidden sm:inline">
                      Zľava
                    </span>
                  )}
                  <span className="text-white/15 hidden sm:inline">|</span>
                  <button
                    onClick={() => {
                      clientAuth.logout();
                      setLoggedClient(null);
                      // Banking pattern: auto-redirect to login so biometric auto-triggers
                      if (isClientBioAvailable() && hasClientBiometric()) {
                        window.location.href = "/prihlasenie";
                      }
                    }}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-white/40 hover:text-white/80 transition-colors text-xs cursor-pointer"
                    title="Odhlásiť"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:block">Odhlásiť</span>
                  </button>
                </>
              ) : (
                <a
                  href="/prihlasenie"
                  className="flex items-center gap-1.5 px-3 py-1 border border-primary/40 hover:border-primary bg-primary/8 hover:bg-primary/15 text-primary transition-colors text-xs font-bold rounded-sm"
                >
                  <span className="relative inline-flex items-center justify-center w-3.5 h-3.5">
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    {clientBioActive && <Fingerprint className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-primary" />}
                  </span>
                  <span>Prihlásiť</span>
                </a>
              )}
            </div>

            {/* ── Group 3: Nástroje ── */}
            <div className="flex items-center gap-3 shrink-0">
              <a
                href="/kalkulacka-beton"
                className="relative flex items-center gap-1.5 text-white/55 hover:text-primary transition-colors text-xs font-bold tracking-wide group"
                title="Kalkulačka betónu"
              >
                <span className="relative inline-flex">
                  <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: "#EDC531" }} />
                  <Calculator className="relative w-3.5 h-3.5 group-hover:text-primary" />
                </span>
                <span className="hidden sm:inline">Kalkulačka</span>
              </a>
              <span className="text-white/15">|</span>
              <a
                href="/admin/login"
                className={cn(
                  "flex items-center gap-1 transition-colors py-1 px-1 relative",
                  adminLoggedIn
                    ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                    : "text-white/20 hover:text-amber-400/60"
                )}
                title={adminLoggedIn ? "Admin (prihlásený)" : "Admin"}
              >
                {adminBioActive ? (
                  <span className="relative inline-flex items-center justify-center w-3.5 h-3.5">
                    <ShieldCheck className={cn("w-3.5 h-3.5 shrink-0", adminLoggedIn ? "text-amber-400" : "text-primary/70")} />
                    <Fingerprint className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-primary" />
                  </span>
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                )}
                {adminLoggedIn && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.9)]" />
                )}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main navbar ── */}
      <header
        className={cn(
          "transition-all duration-300 bg-secondary",
          isScrolled ? "shadow-lg shadow-black/40 py-2" : "py-3"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">

            {/* ── Logo ── */}
            <a href="/" className="flex items-center select-none" aria-label="MS-BETON">
              <span className="relative inline-flex items-center">
                <span className="font-display font-black text-[2.1rem] leading-none tracking-tighter text-primary relative inline-block">
                  MS
                  <span className="absolute inset-0 overflow-hidden pointer-events-none">
                    <span
                      className="absolute inset-0 ms-logo-shimmer"
                      style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.65) 50%, transparent 70%)", display: "block" }}
                    />
                  </span>
                </span>
                <span className="font-display font-black text-[2.1rem] leading-none text-primary/40 mx-[2px]">-</span>
                <span
                  className="font-display font-black text-[2.1rem] leading-none tracking-tighter text-white"
                  style={{ textShadow: "0 2px 4px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.08)" }}
                >
                  BETON
                </span>
              </span>
            </a>

            {/* ── Desktop Nav ── */}
            <nav className="hidden md:flex items-center gap-5">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="font-semibold text-xs tracking-widest uppercase text-white/65 hover:text-primary transition-colors duration-200 relative after:absolute after:bottom-[-3px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
                >
                  {link.name}
                </a>
              ))}
              <a
                href="tel:+421909205205"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary font-bold text-sm rounded-none hover:bg-primary/85 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5 whitespace-nowrap"
              >
                <Phone className="w-4 h-4" />
                <span>ZAVOLAŤ</span>
              </a>
            </nav>

            {/* ── Mobile button ── */}
            <button
              className="md:hidden p-2 text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu (CSS max-height, bez framer-motion) ── */}
        <div className={`md:hidden bg-secondary border-t border-white/10 overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="flex flex-col px-4 py-5 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-display text-xl font-bold text-white/80 hover:text-primary transition-colors uppercase tracking-wide"
              >
                {link.name}
              </a>
            ))}
            <a
              href="tel:+421909205205"
              className="flex items-center gap-2 py-3 text-primary font-bold text-lg border-t border-white/10 pt-4"
            >
              <Phone className="w-5 h-5" />
              +421 909 205 205
            </a>
          </div>
        </div>
      </header>
    </div>
    {/* Spacer — pushes page content below fixed navbar (topbar 36px + main nav ~60px) */}
    <div className="h-[96px]" aria-hidden="true" />
    </>
  );
}
