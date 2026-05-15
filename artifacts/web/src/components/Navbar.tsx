import { useState, useEffect } from "react";
import { Menu, X, Phone, Mail, LogIn, LogOut, Calculator, UserCog } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { clientAuth, type LoggedClient } from "@/lib/clientAuth";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggedClient, setLoggedClient] = useState<LoggedClient | null>(() => clientAuth.getLoggedClient());

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
    { name: "Kalkulačka", href: "/#calculator" },
    { name: "Vozový park", href: "/vozovy-park" },
    { name: "Cenník", href: "/cennik" },
    { name: "Kontakt", href: "/#contact" },
  ];

  return (
    <>
    <div className="fixed top-0 left-0 right-0 z-[60]">
      {/* ── Top info bar ── */}
      <div className="bg-secondary border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9">
            <span className="hidden md:block text-white/50 text-xs truncate mr-4">
              Žilina betón, na ktorý sa môžete spoľahnúť
            </span>
            <div className="flex items-center gap-4 sm:gap-5 ml-auto min-w-0">
              <a
                href="mailto:info@msbeton.sk"
                className="flex items-center gap-1.5 text-white/55 hover:text-white transition-colors text-xs shrink-0"
              >
                <Mail className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">info@msbeton.sk</span>
              </a>
              <a
                href="tel:+421909205205"
                className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-xs font-bold tracking-wide shrink-0"
              >
                <Phone className="w-3 h-3 shrink-0" />
                +421 909 205 205
              </a>
              <span className="text-white/20">|</span>
              <a
                href="/#calculator"
                className="relative flex items-center gap-1.5 text-white/55 hover:text-primary transition-colors text-xs font-bold tracking-wide group shrink-0"
                title="Kalkulačka betónu"
              >
                <span className="relative inline-flex">
                  <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: "#EDC531" }} />
                  <Calculator className="relative w-3.5 h-3.5 group-hover:text-primary" />
                </span>
                <span className="hidden sm:inline">Kalkulačka</span>
              </a>
              {loggedClient ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-white/60 text-xs hidden sm:block">{loggedClient.name}</span>
                  {(loggedClient.discountBeton > 0 || loggedClient.discountDoprava > 0 || loggedClient.discountSluzby > 0 || loggedClient.discountCelkovo > 0) && (
                    <span className="px-1.5 py-0.5 bg-primary text-secondary text-[10px] font-black rounded-sm">
                      Zľava aktívna
                    </span>
                  )}
                  {loggedClient.id !== "admin" && (
                    <a
                      href="/klient-profil"
                      className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-xs ml-1"
                      title="Môj profil"
                    >
                      <UserCog className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:block">Profil</span>
                    </a>
                  )}
                  <button
                    onClick={() => { clientAuth.logout(); setLoggedClient(null); }}
                    className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-xs cursor-pointer ml-1"
                  >
                    <LogOut className="w-3 h-3 shrink-0" />
                    <span className="hidden sm:block">Odhlásiť</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="/prihlasenie"
                    className="flex items-center gap-1.5 text-white/60 hover:text-primary transition-colors text-xs font-bold shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Prihlásenie</span>
                  </a>
                  <a
                    href="/admin/login"
                    className="flex items-center text-white/20 hover:text-white/40 transition-colors shrink-0 p-1 -m-1"
                    title="Administrácia"
                  >
                    <UserCog className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              )}
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
                <motion.span
                  className="font-display font-black text-[2.1rem] leading-none tracking-tighter text-primary relative"
                  style={{ display: "inline-block" }}
                >
                  MS
                  <span className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.span
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.65) 50%, transparent 70%)",
                        display: "block",
                      }}
                      animate={{ x: ["-150%", "250%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3.8, ease: "easeInOut" }}
                    />
                  </span>
                </motion.span>
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

        {/* ── Mobile Menu ── */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-secondary border-t border-white/10 overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
    {/* Spacer — pushes page content below fixed navbar (topbar 36px + main nav ~60px) */}
    <div className="h-[96px]" aria-hidden="true" />
    </>
  );
}
