import { useState, useEffect } from "react";
import { Menu, X, Phone, Mail, LogIn, LogOut, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { clientAuth, type LoggedClient } from "@/lib/clientAuth";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggedClient, setLoggedClient] = useState<LoggedClient | null>(() => clientAuth.getLoggedClient());

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const onSessionChange = () => setLoggedClient(clientAuth.getLoggedClient());
    window.addEventListener("client-session-changed", onSessionChange);
    return () => window.removeEventListener("client-session-changed", onSessionChange);
  }, []);

  const navLinks = [
    { name: "O nás", href: "/#about" },
    { name: "Produkty", href: "/#products" },
    { name: "Kalkulačka", href: "/#calculator" },
    { name: "Vozový park", href: "/vozovy-park" },
    { name: "Cenník", href: "/cennik" },
    { name: "Kontakt", href: "/#contact" },
  ];

  return (
    <>
      {/* ── Top info bar ── */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-secondary border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9">
            <span className="hidden md:block text-white/50 text-xs">
              Žilina betón, na ktorý sa môžete spoľahnúť
            </span>
            <div className="flex items-center gap-5 ml-auto">
              <a
                href="mailto:info@msbeton.sk"
                className="hidden sm:flex items-center gap-1.5 text-white/55 hover:text-white transition-colors text-xs"
              >
                <Mail className="w-3 h-3" />
                info@msbeton.sk
              </a>
              <a
                href="/#calculator"
                className="flex items-center gap-1.5 text-white/55 hover:text-primary transition-colors text-xs font-bold tracking-wide"
                title="Kalkulačka betónu"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kalkulačka</span>
              </a>
              <a
                href="tel:+421909205205"
                className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-xs font-bold tracking-wide"
              >
                <Phone className="w-3 h-3" />
                +421 909 205 205
              </a>
              <span className="text-white/20">|</span>
              {loggedClient ? (
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-xs hidden sm:block">{loggedClient.name}</span>
                  <span className="px-1.5 py-0.5 bg-primary text-secondary text-[10px] font-black rounded-sm">
                    Zľava aktívna
                  </span>
                  <button
                    onClick={() => { clientAuth.logout(); setLoggedClient(null); }}
                    className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-xs cursor-pointer ml-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span className="hidden sm:block">Odhlásiť</span>
                  </button>
                </div>
              ) : (
                <a
                  href="/admin/login"
                  className="flex items-center gap-1 text-white/40 hover:text-white/80 transition-colors text-xs"
                >
                  <LogIn className="w-3 h-3" />
                  Prihlásiť sa
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main navbar ── */}
      <header
        className={cn(
          "fixed top-9 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-secondary/98 backdrop-blur-md shadow-lg shadow-black/40 py-2"
            : "bg-secondary/85 backdrop-blur-sm py-3"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">

            {/* ── Logo: MS-BETON with shimmer ── */}
            <a href="/" className="flex items-center select-none" aria-label="MS-BETON">
              <span className="relative inline-flex items-center">
                {/* MS — gold with shimmer sweep */}
                <motion.span
                  className="font-display font-black text-[2.1rem] leading-none tracking-tighter text-primary relative overflow-hidden"
                  style={{ display: "inline-block" }}
                >
                  MS
                  {/* Shimmer overlay */}
                  <motion.span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.65) 50%, transparent 70%)",
                      display: "block",
                    }}
                    animate={{ x: ["-150%", "250%"] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      repeatDelay: 3.8,
                      ease: "easeInOut",
                    }}
                  />
                </motion.span>

                {/* Dash */}
                <span className="font-display font-black text-[2.1rem] leading-none text-primary/40 mx-[2px]">-</span>

                {/* BETON — white with engraved concrete shadow */}
                <span
                  className="font-display font-black text-[2.1rem] leading-none tracking-tighter text-white"
                  style={{
                    textShadow:
                      "0 2px 4px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.5)",
                  }}
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

      {/* Spacer for fixed header */}
      <div className="h-[100px]" />
    </>
  );
}
