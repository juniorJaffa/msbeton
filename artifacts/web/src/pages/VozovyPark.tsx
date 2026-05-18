import { motion } from "framer-motion";
import { Phone, ArrowRight, ChevronDown } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const ease = [0.23, 1, 0.32, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } },
};
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

const PF = "brightness(0.88) contrast(1.18) saturate(1.12)";

interface PhotoCardProps {
  src: string;
  alt: string;
  label: string;
  sub: string;
  pos?: string;
  className?: string;
  imgFilter?: string;
}

function PhotoCard({ src, alt, label, sub, pos = "center 50%", className = "", imgFilter = PF }: PhotoCardProps) {
  return (
    <div className={`relative overflow-hidden group cursor-default ${className}`}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
        style={{ objectPosition: pos, filter: imgFilter }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-secondary/88 via-secondary/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
        <div className="text-primary text-[9px] font-bold uppercase tracking-[0.3em] mb-1 opacity-75">{sub}</div>
        <div className="text-white font-black text-sm leading-snug">{label}</div>
      </div>
    </div>
  );
}

export default function VozovyPark() {
  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="Vozový park"
        description="Vozový park MS-BETON s.r.o. – betón pumpa s dosahom 28 m a domiešavač 9 m³. Moderná technika pre spoľahlivú dopravu betónu v Žilinskom kraji."
        canonical="/vozovy-park"
      />
      <Navbar />

      {/* ── HERO (65 vh, kratší) ── */}
      <section className="relative h-[65vh] min-h-[460px] flex items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover scale-[1.05]"
          style={{
            backgroundImage: "url('/images/vozovy-park/pumpa-hero.jpg')",
            backgroundPosition: "center 30%",
            filter: "brightness(0.36) contrast(1.15) saturate(0.88)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/65 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 md:pb-20 w-full">
          <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-xl">
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
              <span className="block w-7 h-[2px] bg-primary" />
              <span className="text-primary font-bold text-[10px] tracking-[0.3em] uppercase">Vozový park MS-BETON</span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display font-black text-5xl md:text-6xl text-white leading-[0.9] tracking-tight mb-5"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              PUMPA.<br />
              <span className="text-primary">MIXER.</span><br />
              BETÓN.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/50 text-base leading-relaxed max-w-md mb-7">
              2 pumpy, 2 mixy — jedno číslo. Betón doručíme kdekoľvek v Žilinskom kraji.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <a
                href="/#calculator"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-[transform,opacity] duration-150 active:scale-[0.97]"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Kalkulačka ceny <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="tel:+421909205205"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white font-bold text-xs hover:border-primary hover:text-primary transition-[color,border-color] duration-150"
              >
                <Phone className="w-3.5 h-3.5" /> Zavolať
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* Funkčná scroll šípka */}
        <button
          type="button"
          onClick={() => document.getElementById("fleet")?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/25 hover:text-primary transition-colors duration-200 cursor-pointer"
          aria-label="Zobraziť vozový park"
        >
          <span className="text-[8px] uppercase tracking-[0.3em] font-bold">scroll</span>
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>
      </section>

      {/* ── STATS STRIP ── */}
      <div className="border-y border-primary/12" style={{ background: "rgba(237,197,49,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 divide-x divide-primary/10">
            {[
              { n: "4", u: "×", l: "Pumpy a Mixy" },
              { n: "28", u: "m", l: "Dosah pumpy" },
              { n: "9", u: "m³", l: "Objem mixeru" },
              { n: "30", u: "min", l: "Čakanie zdarma" },
            ].map(s => (
              <div key={s.l} className="px-3 py-4 text-center">
                <div className="flex items-end justify-center gap-0.5 leading-none mb-0.5">
                  <span className="font-black text-2xl text-primary">{s.n}</span>
                  <span className="font-bold text-sm text-primary/50 mb-0.5">{s.u}</span>
                </div>
                <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FLEET — 2 photo cards ── */}
      <section id="fleet" className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-4"
          >
            {/* PUMPA */}
            <motion.div variants={fadeUp} className="relative overflow-hidden group h-[420px] md:h-[480px] cursor-default">
              <img
                src="/images/vozovy-park/pumpa-site.jpg"
                alt="MS-BETON betónová pumpa MAN TGA"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                style={{ objectPosition: "center 35%", filter: PF }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/55 to-transparent" />
              <div className="absolute top-4 left-4 px-2.5 py-1 bg-primary text-secondary text-[10px] font-black uppercase tracking-widest">
                Betónová pumpa
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="text-primary text-[10px] font-bold uppercase tracking-[0.3em] mb-2">MAN TGA 41.440</div>
                <h2
                  className="font-black text-3xl md:text-4xl text-white mb-4 leading-tight tracking-tight"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  BETÓNOVÁ<br />PUMPA
                </h2>
                <div className="flex gap-5 mb-4 flex-wrap">
                  <div>
                    <div className="text-primary font-black text-xl leading-none">28 m</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">dosah výložníka</div>
                  </div>
                  <div className="w-px bg-white/10 hidden sm:block" />
                  <div>
                    <div className="text-primary font-black text-xl leading-none">7 m³</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">čerpacia kapacita</div>
                  </div>
                  <div className="w-px bg-white/10 hidden sm:block" />
                  <div>
                    <div className="text-primary font-black text-xl leading-none">5″</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">hadice</div>
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed max-w-sm">
                  Stropy, suterény, podlahy — aj na miesta bez priameho prístupu.
                </p>
              </div>
            </motion.div>

            {/* MIXER */}
            <motion.div variants={fadeUp} className="relative overflow-hidden group h-[420px] md:h-[480px] cursor-default">
              <img
                src="/images/vozovy-park/mixer-krajina.jpg"
                alt="MS-BETON domiešavač betónu"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                style={{ objectPosition: "center 40%", filter: PF }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/55 to-transparent" />
              <div className="absolute top-4 left-4 px-2.5 py-1 bg-secondary text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
                Domiešavač
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">IVECO MAGIRUS</div>
                <h2
                  className="font-black text-3xl md:text-4xl text-white mb-4 leading-tight tracking-tight"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  DOMIEŠAVAČ<br />BETÓNU
                </h2>
                <div className="flex gap-5 mb-4 flex-wrap">
                  <div>
                    <div className="text-white font-black text-xl leading-none">9 m³</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">objem bubna</div>
                  </div>
                  <div className="w-px bg-white/10 hidden sm:block" />
                  <div>
                    <div className="text-white font-black text-xl leading-none">C8–C35</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">triedy betónu</div>
                  </div>
                  <div className="w-px bg-white/10 hidden sm:block" />
                  <div>
                    <div className="text-white font-black text-xl leading-none">30 min</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">čakanie zdarma</div>
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed max-w-sm">
                  Čerstvý betón triedy C8–C35 priamo na stavbu. V spolupráci s pumpa vozidlom.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── V AKCII — bento photo grid ── */}
      <section className="pb-14 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
              <span className="block w-6 h-[2px] bg-primary" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-[0.3em]">Galéria</span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="font-black text-3xl md:text-4xl text-white tracking-tight mb-5"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              V AKCII
            </motion.h2>

            {/* Bento row 1: large (8/12) + tall-right (4/12) */}
            <motion.div variants={fadeUp} className="grid grid-cols-12 gap-3 mb-3">
              <PhotoCard
                src="/images/vozovy-park/pumpa-hero.jpg"
                alt="MS-BETON pumpa s výložníkom 28 m nad budovou"
                label="Dosah 28 m — čerpanie stropov a výšok"
                sub="Pumpa v akcii"
                pos="center 30%"
                className="col-span-12 md:col-span-8 h-[240px] md:h-[320px]"
              />
              <PhotoCard
                src="/images/vozovy-park/pumpa-scania.jpg"
                alt="MS-BETON Scania betónová pumpa"
                label="2 pumpy, 2 mixy — dostupní každý deň"
                sub="Vozový park"
                pos="center 45%"
                className="col-span-12 md:col-span-4 h-[200px] md:h-[320px]"
              />
            </motion.div>

            {/* Bento row 2: 3 equal */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <PhotoCard
                src="/images/vozovy-park/akcia-podlaha-1.jpg"
                alt="Betonáž podlahy haly pumpa MS-BETON"
                label="Betonáž podlahy haly — presnosť na cm"
                sub="Pumpa v akcii"
                pos="center 35%"
                className="h-[200px] md:h-[230px]"
              />
              <PhotoCard
                src="/images/vozovy-park/pumpa-krajina.jpg"
                alt="MS-BETON pumpa pri rodinnom dome v horách"
                label="Rodinné domy, chaty aj hory — dostupní pre každého"
                sub="Žilinský kraj"
                pos="center 40%"
                className="h-[200px] md:h-[230px]"
              />
              <PhotoCard
                src="/images/vozovy-park/pumpa-mixer-site.jpg"
                alt="MS-BETON pumpa a mixer na jednej zákazke"
                label="Pumpa + mixer — jedna firma, jedna zákazka"
                sub="Kompletná zákazka"
                pos="center 40%"
                className="h-[200px] md:h-[230px]"
              />
            </motion.div>

            {/* Full-width action banner */}
            <motion.div variants={fadeUp} className="relative overflow-hidden group h-[170px] md:h-[210px]">
              <img
                src="/images/vozovy-park/akcia-podlaha-2.jpg"
                alt="Pumpa v akcii — betonáž"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                style={{
                  objectPosition: "center 60%",
                  filter: "brightness(0.70) contrast(1.22) saturate(1.1)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/92 via-secondary/55 to-secondary/10" />
              <div className="absolute inset-0 flex items-center px-6 md:px-10">
                <div>
                  <div className="text-primary text-[9px] font-bold uppercase tracking-[0.35em] mb-2">MS-BETON s.r.o.</div>
                  <div
                    className="text-white font-black text-xl md:text-3xl uppercase tracking-tight leading-tight"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    Presné čerpanie.<br />
                    <span className="text-primary">Kdekoľvek v Žilinskom kraji.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="relative py-14 md:py-18 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #001D3D 0%, #00305f 60%, #001D3D 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mb-3">
              <span className="block w-5 h-[2px] bg-primary" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-[0.3em]">Záujem?</span>
              <span className="block w-5 h-[2px] bg-primary" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="font-black text-4xl md:text-5xl text-white tracking-tight mb-3"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              VYPOČÍTAJTE<br />
              <span className="text-primary">CENU ONLINE</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/40 max-w-sm mx-auto mb-8 text-sm">
              Kalkulačka spočíta betón, dopravu aj čerpanie — vrátane vašej zľavy.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center">
              <a
                href="/#calculator"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-[transform,opacity] duration-150 active:scale-[0.97] shadow-[0_0_40px_rgba(237,197,49,0.2)]"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Kalkulačka betónu <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="/cennik"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 text-white font-bold text-xs hover:border-primary hover:text-primary transition-[color,border-color] duration-150"
              >
                Cenník
              </a>
              <a
                href="tel:+421909205205"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 text-white font-bold text-xs hover:border-primary hover:text-primary transition-[color,border-color] duration-150"
              >
                <Phone className="w-3.5 h-3.5" /> +421 909 205 205
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
