import { useState, useEffect } from "react";
import { Menu, X, Phone, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Domov", href: "#home" },
    { name: "O Nás", href: "#about" },
    { name: "Produkty", href: "#products" },
    { name: "Kalkulačka", href: "#calculator" },
    { name: "Kontakt", href: "#contact" },
  ];

  return (
    <>
      {/* Top info bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-secondary border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9">
            <div className="hidden md:flex items-center gap-6 text-white/60 text-xs">
              <span>Váš spoľahlivý partner pre betón na Slovensku</span>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <a
                href="mailto:info@msbeton.sk"
                className="hidden sm:flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs"
              >
                <Mail className="w-3 h-3" />
                info@msbeton.sk
              </a>
              <a
                href="tel:+421909205205"
                className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-xs font-bold tracking-wide"
              >
                <Phone className="w-3 h-3" />
                +421 909 205 205
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main nav (pushed down by top bar) */}
      <header
        className={cn(
          "fixed top-9 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-secondary/98 backdrop-blur-md shadow-lg shadow-black/30 py-3"
            : "bg-secondary/75 backdrop-blur-sm py-4"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">

            {/* Logo: MS-BETON */}
            <a href="#home" className="flex items-center select-none" aria-label="MS-BETON">
              {/* MS — pulse + glow */}
              <motion.span
                className="font-display font-black text-4xl leading-none tracking-tighter text-primary"
                style={{ textShadow: "0 0 0px #f97316" }}
                animate={{
                  textShadow: [
                    "0 0 4px rgba(249,115,22,0.3)",
                    "0 0 18px rgba(249,115,22,0.8)",
                    "0 0 4px rgba(249,115,22,0.3)",
                  ],
                  scale: [1, 1.04, 1],
                }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
              >
                MS
              </motion.span>
              {/* dash */}
              <span className="font-display font-black text-4xl leading-none text-white/30 mx-0.5">-</span>
              {/* BETON — concrete engraved effect */}
              <span
                className="font-display font-black text-4xl leading-none tracking-tighter text-white"
                style={{
                  textShadow: "1px 1px 0px rgba(0,0,0,0.6), -1px -1px 0px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.4)",
                  letterSpacing: "-0.02em",
                }}
              >
                BETON
              </span>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-7">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="font-semibold text-sm tracking-wide uppercase text-white/70 hover:text-primary transition-colors duration-200 relative after:absolute after:bottom-[-3px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
                >
                  {link.name}
                </a>
              ))}
              <a
                href="tel:+421909205205"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5 whitespace-nowrap"
              >
                <Phone className="w-4 h-4" />
                <span>+421 909 205 205</span>
              </a>
            </nav>

            {/* Mobile button */}
            <button
              className="md:hidden p-2 text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
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

      {/* Spacer for fixed header (top bar 36px + nav ~64px) */}
      <div className="h-[100px]" />
    </>
  );
}
