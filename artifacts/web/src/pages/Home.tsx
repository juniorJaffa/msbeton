import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { SEOHead, LocalBusinessSchema } from "@/components/SEOHead";
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
const PARTNERS: { name: string; logo?: string }[] = [
  { name: "ZAPA Beton SK",       logo: "/images/partners/zapa-beton.png" },
  { name: "STRABAG s.r.o.",      logo: "/images/partners/strabag.png" },
  { name: "Eurovia SK a.s.",     logo: "/images/partners/eurovia.svg" },
  { name: "VÁHOSTAV – SK a.s.",  logo: "/images/partners/vahostav.jpg" },
  { name: "SKANSKA SK a.s.",     logo: "/images/partners/skanska.svg" },
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
  { name: "PP COMPANY",          logo: "/images/partners/pb-company.png" },
  { name: "P&P STAVBY",          logo: "/images/partners/pp-stavby.svg" },
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

  useEffect(() => {
    const NAVBAR_H = 96;
    const scrollToEl = (el: Element) => {
      const top = el.getBoundingClientRect().top + window.scrollY - NAVBAR_H;
      window.scrollTo({ top, behavior: "smooth" });
    };
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const el = document.querySelector(hash);
      if (el) { scrollToEl(el); return; }
      setTimeout(() => {
        const delayed = document.querySelector(hash);
        if (delayed) scrollToEl(delayed);
      }, 150);
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: contactName, phone: contactPhone, email: contactEmail, message: contactMessage }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubmitted(true);
        setContactName(""); setContactPhone(""); setContactEmail(""); setContactMessage("");
        setTimeout(() => setSubmitted(false), 6000);
      }
    } catch { /* silent */ } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SEOHead />
      <LocalBusinessSchema />
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
            poster={`${import.meta.env.BASE_URL}images/hero-bg.jpg`}
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
                Spoločnosť MS-BETON s.r.o. patrí medzi popredných poskytovateľov riešení pre dovoz betónu v Žiline. Vďaka modernému vozovému parku – od betónových mixérov až po pumpy – zvládame projekty všetkých veľkostí. Zabezpečujeme kvalitný betón presne tam, kde a kedy ho potrebujete.
              </motion.p>
              <motion.ul variants={staggerContainer} className="space-y-2.5 mb-5">
                {[
                  "Moderná technológia riadenia výroby",
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
                  { src: "/images/vozovy-park/p03.jpg", label: "Betónová pumpa", pos: "center 50%" },
                  { src: "/images/vozovy-park/pumpa-site.jpg", label: "Pumpa na stavbe", pos: "center 35%" },
                  { src: "/images/vozovy-park/mixer-krajina.jpg", label: "Domiešavač", pos: "center 40%" },
                  { src: "/images/vozovy-park/p27.jpg", label: "2 pumpy + 1 mixer", pos: "center 50%" },
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
                <div className="absolute bottom-3 left-3 sm:-bottom-5 sm:-left-5 bg-secondary text-white p-4 rounded-lg shadow-xl border-l-4 border-primary z-10">
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
      <section id="contact" className="py-14 concrete-light" style={{ scrollMarginTop: "96px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 bg-white rounded-3xl shadow-xl overflow-hidden">
            
            {/* Contact Info */}
            <div className="lg:col-span-2 bg-secondary p-10 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary/20 via-secondary to-secondary"></div>
              
              <div className="relative z-10">
                <h4 className="text-3xl font-display font-bold mb-8">Kontaktné Údaje</h4>
                
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-1">Prevádzka spoločnosti</h5>
                      <p className="text-white/70 leading-relaxed">
                        Kamenná 3<br />
                        010 01 Žilina
                      </p>
                      <h5 className="font-bold text-lg mt-4 mb-1">Sídlo spoločnosti</h5>
                      <p className="text-white/70 leading-relaxed">
                        Turie 468<br />
                        013 12 Turie
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-1">Telefón (Dispečing)</h5>
                      <a href="tel:+421909205205" className="text-primary font-bold text-xl hover:underline">
                        +421 909 205 205
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-1">Email</h5>
                      <p className="text-white/70 leading-relaxed">
                        info@msbeton.sk<br />
                        <span className="text-primary font-semibold">www.msbeton.sk</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3 p-10 lg:p-16">
              <h4 className="text-2xl font-bold text-secondary mb-8">Rýchly formulár</h4>
              
              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h5 className="text-xl font-bold text-green-800 mb-2">Správa bola odoslaná!</h5>
                  <p className="text-green-700">Ďakujeme za váš záujem. Budeme vás kontaktovať čo najskôr.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-2">Meno a Priezvisko</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-[border-color,box-shadow]"
                        placeholder="Jozef Novák"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-2">Telefónne číslo</label>
                      <PhoneInput
                        value={contactPhone}
                        onChange={v => setContactPhone(v)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-[border-color,box-shadow]"
                        placeholder="0944 xxx xxx"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2">E-mail</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-[border-color,box-shadow]"
                      placeholder="jozef@priklad.sk"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2">Vaša správa / Požiadavka</label>
                    <textarea
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={e => setContactMessage(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-[border-color,box-shadow] resize-none"
                      placeholder="Mám záujem o cenovú ponuku na betón pre základovú dosku..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 bg-secondary text-white font-bold text-lg rounded-xl hover:bg-primary transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.97] shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Odosielam..." : "Odoslať správu"}
                    {!isSubmitting && <Send className="w-5 h-5" />}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

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
          className="partner-track flex gap-3"
          style={{ width: "max-content", animation: "partner-scroll 65s linear infinite" }}
        >
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-gray-200 rounded-lg shrink-0 hover:border-primary/40 hover:shadow-md transition-all duration-200 h-[56px] group"
            >
              {p.logo ? (
                <img
                  src={p.logo}
                  alt={p.name}
                  className="max-h-8 max-w-[88px] object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                  loading="lazy"
                />
              ) : (
                <span
                  className="w-6 h-6 rounded-full text-white text-[9px] font-black flex items-center justify-center shrink-0 leading-none"
                  style={{ background: P_COLORS[i % P_COLORS.length] }}
                >
                  {p.name.charAt(0)}
                </span>
              )}
              <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-600 uppercase tracking-wide whitespace-nowrap transition-colors duration-200">{p.name}</span>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes partner-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .partner-track:hover { animation-play-state: paused; }
        `}</style>
      </section>

      <Footer />
    </div>
  );
}
