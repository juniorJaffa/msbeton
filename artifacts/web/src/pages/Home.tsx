import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ContactSection } from "@/components/ContactSection";
import { SEOHead, LocalBusinessSchema, WebSiteSchema } from "@/components/SEOHead";
import {
  ArrowRight,
  CheckCircle2,
  Calculator,
  Truck,
  Hammer,
  ShieldCheck,
  Send,
  MapPin,
  Phone,
  Mail,
  Clock,
  ChevronDown
} from "lucide-react";
import { lazy, Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PhoneInput } from "@/components/PhoneInput";
const ConcreteCalculator = lazy(() => import("@/components/Calculator").then(m => ({ default: m.ConcreteCalculator })));
const PARTNERS: { name: string; logo?: string; hasText?: boolean; imgClass?: string }[] = [
  { name: "ZAPA Beton SK",       logo: "/images/partners/zapa-beton.png", hasText: true, imgClass: "max-h-9 max-w-[110px]" },
  { name: "STRABAG s.r.o.",      logo: "/images/partners/strabag.png",    hasText: true },
  { name: "Eurovia SK a.s.",     logo: "/images/partners/eurovia.svg",    hasText: true },
  { name: "VÁHOSTAV – SK a.s.",  logo: "/images/partners/vahostav.jpg" },
  { name: "SKANSKA SK a.s.",     logo: "/images/partners/skanska.svg",    hasText: true },
  { name: "2BH s.r.o.",          logo: "/images/partners/2bh.png" },
  { name: "RENOME REAL s.r.o.",  logo: "/images/partners/renome-real.png" },
  { name: "AUSTAV",              logo: "/images/partners/austav.png" },
  { name: "Benneb s.r.o.",       logo: "/images/partners/benneb.png" },
  { name: "MELO-SK s.r.o.",      logo: "/images/partners/melo.png" },
  { name: "VDL",                 logo: "/images/partners/vdl.png" },
  { name: "ERPOS",               logo: "/images/partners/erpos.png" },
  { name: "Pro×Bet",             logo: "/images/partners/pro-bet.png" },
  { name: "PROMA",               logo: "/images/partners/proma.png" },
  { name: "ALPESTAV",            logo: "/images/partners/alpestav.png" },
  { name: "PP COMPANY",          logo: "/images/partners/pb-company.png", hasText: true },
  { name: "P&P STAVBY",          logo: "/images/partners/pp-stavby.svg",  hasText: true },
];
const P_COLORS = ["#3b82f6","#10b981","#ef4444","#8b5cf6","#f59e0b","#06b6d4","#ec4899","#84cc16","#f97316","#14b8a6","#6366f1","#e11d48","#0ea5e9","#22c55e","#a855f7","#f43f5e","#fb923c"];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Preload hero poster only on Home route — avoids unused preload warning on /admin
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = `${import.meta.env.BASE_URL}images/hero-bg.webp`;
    (link as HTMLLinkElement & { fetchPriority: string }).fetchPriority = "high";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const scrollToEl = (el: Element) => {
      // scrollIntoView uses scroll-margin-top (96px) set on #calculator — immune to NAVBAR_H drift
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const scrollToHash = (delay = 0) => {
      const hash = window.location.hash;
      if (!hash) return;
      const run = () => {
        const el = document.querySelector(hash);
        if (el) { scrollToEl(el); return; }
        // Element not yet in DOM (lazy render) — single retry
        setTimeout(() => {
          const delayed = document.querySelector(hash);
          if (delayed) scrollToEl(delayed);
        }, 150);
      };
      if (delay > 0) setTimeout(run, delay); else run();
    };
    // Cross-page SPA navigation: hero image above calculator causes layout shift.
    // Delay 350ms lets hero paint before measuring — scroll lands on correct position.
    scrollToHash(350);
    const onHashChange = () => scrollToHash(0);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {
      const retry = () => { video.play().catch(() => {}); };
      video.addEventListener("canplaythrough", retry, { once: true });
    });
  }, []);

  // Contact Form State


  return (
    <div className="min-h-screen">
      <SEOHead />
      <LocalBusinessSchema />
      <WebSiteSchema />
      <Navbar />

      {/* HERO SECTION */}
      <section id="home" className="relative h-[80vh] min-h-[480px] max-h-[750px] flex items-center justify-center overflow-hidden">
        {/* Video background with overlay */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            className="w-full h-full object-cover object-center"
            poster={`${import.meta.env.BASE_URL}images/hero-bg.webp`}
          >
            <source src={`${import.meta.env.BASE_URL}videos/hero-video.mp4`} type="video/mp4" />
            <source src={`${import.meta.env.BASE_URL}videos/hero-video.webm`} type="video/webm" />
          </video>
          <div className="absolute inset-0 bg-secondary/45"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 via-secondary/30 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 mb-5">
              <span className="h-[2px] w-8 bg-primary block"></span>
              <span className="font-semibold text-xs tracking-[0.2em] text-white/70 uppercase">Žilina betón, na ktorý sa môžete spoľahnúť</span>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-xl md:text-2xl font-bold text-white/90 mb-2 uppercase tracking-wide">
              Staviame na pevných základoch, volíme
            </motion.p>

            <motion.h1 variants={fadeInUp} className="text-6xl md:text-8xl font-black text-primary leading-none mb-6 drop-shadow-lg tracking-tight">
              MS-BETON
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-base md:text-lg text-white/70 max-w-xl leading-relaxed">
              Sme váš spoľahlivý dopravca betónu v Žiline a okolí. Základ každej kvalitnej stavby je v pevnosti a spoľahlivosti betónu, ktorý používate – a práve ten vám dodávame my.
            </motion.p>
          </motion.div>
        </div>

        {/* Scroll arrow */}
        <motion.a
          href="#about"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
          aria-label="Zobraziť viac"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          >
            <ChevronDown className="w-7 h-7" />
          </motion.div>
        </motion.a>
      </section>


      {/* ABOUT SECTION */}
      <section id="about" className="py-8 lg:py-14 concrete-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeInUp} className="text-sm font-bold text-primary tracking-widest mb-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">O SPOLOČNOSTI</motion.h2>
              <motion.h3 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-gray-900 mb-6" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.12)" }}>
                KVALITA, NA KTORÚ SA MÔŽETE <span className="text-gradient">SPOĽAHNÚŤ</span>
              </motion.h3>
              <motion.p variants={fadeInUp} className="text-gray-700 text-lg mb-6 leading-relaxed">
                Spoločnosť MS-BETON, spol. s r.o. patrí medzi popredných poskytovateľov riešení pre dovoz betónu v Žiline. Vďaka modernému vozovému parku – od betónových mixérov až po pumpy – zvládame projekty všetkých veľkostí. Zabezpečujeme kvalitný betón presne tam, kde a kedy ho potrebujete.
              </motion.p>
              <motion.ul variants={staggerContainer} className="space-y-2.5 mb-5">
                {[
                  "Moderný dispečing a riadenie dopravy",
                  "Vlastný rozvoz a flotila domiešavačov",
                  "Certifikované a laboratórne testované zmesi",
                  "Flexibilita a presnosť dodávok na čas"
                ].map((item, i) => (
                  <motion.li key={i} variants={fadeInUp} className="flex items-center gap-3">
                    <CheckCircle2 className="text-primary w-6 h-6 shrink-0 [filter:drop-shadow(0_1px_4px_rgba(0,0,0,0.65))]" />
                    <span className="text-gray-800 font-medium text-lg">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div variants={fadeInUp}>
                <a href="#contact" className="text-primary font-bold hover:underline underline-offset-4 flex items-center gap-1 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
                  Zistiť viac o nás <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-2 relative">
                <div className="absolute -inset-3 bg-primary/6 rounded-xl -rotate-1 pointer-events-none" />
                {[
                  { src: "/images/vozovy-park/ms-beton-pumpa-man-tga-reprezentativna.jpg", label: "Betónová pumpa", pos: "center 50%" },
                  { src: "/images/vozovy-park/ms-beton-pumpa-man-tga-na-stavbe.jpg", label: "Pumpa na stavbe", pos: "center 35%" },
                  { src: "/images/vozovy-park/ms-beton-domiesavac-beton-krajina.jpg", label: "Domiešavač", pos: "center 40%" },
                  { src: "/images/vozovy-park/ms-beton-2-pumpy-mixer-kompletna-zakazka.jpg", label: "2 pumpy + 1 mixer", pos: "center 50%" },
                ].map((p, i) => (
                  <div key={i} className="relative overflow-hidden rounded-lg h-[110px] sm:h-[150px] md:h-[190px] group">
                    <img
                      src={p.src}
                      alt={p.label}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      style={{ objectPosition: p.pos, filter: "brightness(0.88) contrast(1.18) saturate(1.12)" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
                      <span className="text-[10px] font-bold text-white/70">{p.label}</span>
                    </div>
                  </div>
                ))}
                <div className="hidden sm:block sm:absolute sm:-bottom-5 sm:-left-5 bg-secondary text-white p-4 rounded-lg shadow-xl border-l-4 border-primary z-10">
                  <span className="block text-3xl font-bold text-primary mb-0.5">15+</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Rokov skúseností</span>
                </div>
              </div>
              <a
                href="/vozovy-park"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-primary hover:text-secondary transition-colors duration-150 shadow-md shadow-secondary/20"
              >
                Zobraziť vozový park <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TRUST SIGNALS — compact 1-row strip */}
      <div className="concrete-navy border-y border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/8">
            {[
              { icon: Truck,       count: "10K+", label: "Doručených zásielok" },
              { icon: Calculator,  count: "30K+", label: "Kubíkov betónu" },
              { icon: ShieldCheck, count: "100%", label: "Certifikovaná kvalita" },
              { icon: Hammer,      count: "2K+",  label: "Spokojných klientov" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1], delay: i * 0.06 }}
                className="flex flex-col items-center justify-center gap-1 py-5 px-3 text-center"
              >
                <div className="flex items-center gap-1.5">
                  <s.icon className="w-4 h-4 text-primary/75 shrink-0" />
                  <span className="font-black text-2xl text-white leading-none tracking-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>{s.count}</span>
                </div>
                <div className="text-white/40 text-[10px] uppercase tracking-[0.18em] font-bold leading-tight">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCTS SECTION — skryté pre skrátenie stránky ku kalkulačke */}
      <section id="products" className="py-24 concrete-light hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-primary tracking-widest mb-2">NAŠE PRODUKTY</h2>
            <h3 className="text-4xl md:text-5xl font-bold text-secondary mb-6 uppercase">
              Kompletný Sortiment <br/>Materiálov
            </h3>
            <p className="text-muted-foreground text-lg">
              Poskytujeme široké spektrum stavebných materiálov pre akúkoľvek fázu vašej výstavby.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {[
              { title: "Transportbetón", img: "prod-concrete.png", desc: "Základové, podlahové, konštrukčné a špeciálne betóny najvyššej kvality." },
              { title: "Pieskový Kameň", img: "prod-sand.png", desc: "Kvalitný preosiaty piesok ideálny pre murovacie malty a omietky." },
              { title: "Štrk a Kamenivo", img: "prod-gravel.png", desc: "Rôzne frakcie drveného a ťaženého kameniva pre drenáže a podklady." },
              { title: "Murovacie Prvky", img: "prod-masonry.png", desc: "Šalovacie a debniace tvárnice pre rýchlu a presnú výstavbu." }
            ].map((prod, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group bg-white rounded-2xl overflow-hidden shadow-lg shadow-black/5 border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="relative h-56 overflow-hidden">
                  <div className="absolute inset-0 bg-secondary/20 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                  <img
                    src={`${import.meta.env.BASE_URL}images/${prod.img}`}
                    alt={prod.title}
                    loading="lazy"
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="p-6">
                  <h4 className="text-2xl font-display font-bold text-secondary mb-3">{prod.title}</h4>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {prod.desc}
                  </p>
                  <a href="#contact" className="inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:text-secondary transition-colors">
                    Mám záujem <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULATOR SECTION */}
      <section id="calculator" className="py-12 concrete-light relative overflow-hidden" style={{ scrollMarginTop: "96px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="h-64" />}>
            <ConcreteCalculator />
          </Suspense>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <ContactSection />

      {/* PARTNERS SECTION */}
      <section className="py-6 bg-white border-t border-gray-100 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-5 px-4"
        >
          <p className="text-[10px] font-bold text-gray-400 tracking-[0.28em] uppercase mb-1">Naši partneri</p>
          <h2 className="text-xl font-black text-secondary uppercase tracking-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Spolupracujeme s
          </h2>
        </motion.div>
        <div
          style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)", overflow: "hidden" }}
        >
        <div
          className="partner-track flex gap-3"
          style={{ width: "max-content", animation: "partner-scroll 65s linear infinite" }}
        >
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shrink-0 hover:border-primary/40 hover:shadow-md transition-all duration-200 h-[52px] min-w-[110px] group"
            >
              {p.logo ? (
                <img
                  src={p.logo}
                  alt={p.name}
                  className={`${p.imgClass ?? "max-h-7 max-w-[80px]"} object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300 shrink-0`}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <span
                  className="w-5 h-5 rounded-full text-white text-[9px] font-black flex items-center justify-center shrink-0 leading-none"
                  style={{ background: P_COLORS[i % P_COLORS.length] }}
                >
                  {p.name.charAt(0)}
                </span>
              )}
              {!p.hasText && (
                <span className="text-[10px] font-semibold text-gray-500 group-hover:text-gray-700 uppercase tracking-wide whitespace-nowrap transition-colors duration-200 leading-tight">{p.name}</span>
              )}
            </div>
          ))}
        </div>
        </div>
        <style>{`
          @keyframes partner-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .partner-track:hover { animation-play-state: paused; }
        `}</style>
      </section>

      {/* Kde nás nájdete — NAP + mapa (lokálne SEO; mapa lazy, dole → bez LCP penalizácie) */}
      <section id="kontakt" className="py-14 concrete-light border-t border-gray-100" style={{ scrollMarginTop: "96px" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold text-gray-400 tracking-[0.28em] uppercase mb-1">Kontakt &amp; prevádzka</p>
            <h2 className="text-2xl sm:text-3xl font-black text-secondary uppercase tracking-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>Kde nás nájdete</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-xl mx-auto">Betón a doprava pre <strong className="text-secondary">Žilinu a okolie</strong> — Bytča, Kysucké Nové Mesto, Rajec a okolie do 50 km.</p>
          </div>
          <div className="grid lg:grid-cols-5 gap-6 items-stretch">
            {/* NAP — viditeľný text = lokálny SEO signál */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
              <div>
                <div className="text-lg font-black text-secondary">MS-BETON, spol. s r.o.</div>
                <div className="text-[11px] text-gray-400 mt-0.5">IČO 55747591 · IČ DPH SK2122074603</div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-secondary">Prevádzka</div>
                  <div className="text-sm text-gray-600">Kamenná 3, 010 01 Žilina</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-secondary">Sídlo</div>
                  <div className="text-sm text-gray-600">Turie 468, 013 12 Turie</div>
                </div>
              </div>
              <a href="tel:+421909205205" className="flex items-center gap-3 group">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-bold text-secondary group-hover:text-primary transition-colors">+421 909 205 205</span>
              </a>
              <a href="mailto:info@msbeton.sk" className="flex items-center gap-3 group">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-primary transition-colors">info@msbeton.sk</span>
              </a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=49.2232,18.7394" target="_blank" rel="noopener noreferrer"
                className="mt-1 inline-flex items-center justify-center gap-2 bg-secondary text-white font-bold text-sm py-3 rounded-xl hover:bg-secondary/90 transition-colors">
                <MapPin className="w-4 h-4" /> Navigovať na prevádzku
              </a>
            </div>
            {/* Mapa — embed iframe, lazy (načíta sa až pri scrolle k pätičke) */}
            <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-gray-200 shadow-sm min-h-[340px]">
              <iframe
                title="MS-BETON na mape — Kamenná 3, Žilina"
                src="https://www.google.com/maps?q=MS-BETON%2C%20Kamenn%C3%A1%203%2C%20010%2001%20%C5%BDilina&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full min-h-[340px]"
                style={{ border: 0 }}
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
