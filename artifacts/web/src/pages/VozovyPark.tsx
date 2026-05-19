import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const MARQUEE_PHOTOS = [
  { src: "/images/vozovy-park/pumpa-hero.jpg",      pos: "center 30%" },
  { src: "/images/vozovy-park/pumpa-scania.jpg",     pos: "center 45%" },
  { src: "/images/vozovy-park/pumpa-site.jpg",       pos: "center 35%" },
  { src: "/images/vozovy-park/akcia-podlaha-1.jpg",  pos: "center 35%" },
  { src: "/images/vozovy-park/pumpa-krajina.jpg",    pos: "center 40%" },
  { src: "/images/vozovy-park/pumpa-mixer-site.jpg", pos: "center 40%" },
  { src: "/images/vozovy-park/mixer-krajina.jpg",    pos: "center 40%" },
  { src: "/images/vozovy-park/akcia-podlaha-2.jpg",  pos: "center 60%" },
];

type GalleryCat = "vsetko" | "pumpa" | "mix" | "spolu" | "hadice";

interface GalleryPhoto {
  src: string;
  cat: GalleryCat;
  label: string;
  sub: string;
}

const GALLERY_PHOTOS: GalleryPhoto[] = [
  { src: "p03.jpg", cat: "pumpa", label: "Reprezentatívna pumpa MS-BETON", sub: "Pumpa · MAN TGA" },
  { src: "pumpa-hero.jpg", cat: "pumpa", label: "Dosah 28 m — čerpanie výšok", sub: "Pumpa v akcii" },
  { src: "p09.jpg", cat: "pumpa", label: "Rameno pumpuje do ďalšej pumpy", sub: "Špeciálna zákazka" },
  { src: "p08.jpg", cat: "pumpa", label: "Vozový park — pohľad zhora", sub: "Pumpa" },
  { src: "p10.jpg", cat: "pumpa", label: "Betonáž haly — čerpanie pumpa", sub: "Hala" },
  { src: "p21.jpg", cat: "pumpa", label: "Betonáž priemyselnej haly", sub: "Hala" },
  { src: "p26.jpg", cat: "pumpa", label: "Pohľad z výšky na vozový park", sub: "Pumpa" },
  { src: "pumpa-scania.jpg", cat: "pumpa", label: "Scania betónová pumpa", sub: "Pumpa" },
  { src: "pumpa-site.jpg", cat: "pumpa", label: "Betónová pumpa MAN TGA na stavbe", sub: "Stavba" },
  { src: "pumpa-krajina.jpg", cat: "pumpa", label: "Pumpa v krajine Žilinského kraja", sub: "Žilinský kraj" },
  { src: "p01.jpg", cat: "pumpa", label: "Pumpa MS-BETON v akcii", sub: "Pumpa" },
  { src: "p04.jpg", cat: "pumpa", label: "Pumpa na zákazke", sub: "Pumpa" },
  { src: "p05.jpg", cat: "pumpa", label: "Betónovanie objektu", sub: "Pumpa" },
  { src: "p32.jpg", cat: "pumpa", label: "MS-BETON pumpa v akcii na zákazke", sub: "Pumpa v akcii" },
  { src: "mixer-krajina.jpg", cat: "mix", label: "Domiešavač betónu v krajine", sub: "Mix · IVECO MAGIRUS" },
  { src: "p12.jpg", cat: "mix", label: "Domiešavač na zákazke", sub: "Mix" },
  { src: "p16.jpg", cat: "mix", label: "Mixer v akcii", sub: "Mix" },
  { src: "p17.jpg", cat: "mix", label: "Domiešavač betónu", sub: "Mix" },
  { src: "p19.jpg", cat: "mix", label: "Mixer na stavbe", sub: "Mix" },
  { src: "p20.jpg", cat: "mix", label: "Domiešavač v plnej zákazke", sub: "Mix" },
  { src: "p27.jpg", cat: "spolu", label: "2 pumpy + 1 mixer — kompletná zákazka", sub: "Pumpa + Mix" },
  { src: "pumpa-mixer-site.jpg", cat: "spolu", label: "Pumpa + mixer na jednej zákazke", sub: "Kompletná zákazka" },
  { src: "p02.jpg", cat: "spolu", label: "Vozidlá MS-BETON — vozový park", sub: "Fleet" },
  { src: "p06.jpg", cat: "spolu", label: "Pumpa a mixer v akcii", sub: "Spolu" },
  { src: "p07.jpg", cat: "spolu", label: "Kompletná zákazka betónu", sub: "Spolu" },
  { src: "p11.jpg", cat: "spolu", label: "Zákazka pumpa + mixer", sub: "Spolu" },
  { src: "akcia-podlaha-1.jpg", cat: "spolu", label: "Betonáž podlahy — presnosť na cm", sub: "Pumpa v akcii" },
  { src: "akcia-podlaha-2.jpg", cat: "spolu", label: "Čerpanie betónu — priemyselná podlaha", sub: "Pumpa v akcii" },
  { src: "p28.jpg", cat: "spolu", label: "MS-BETON zákazka", sub: "Spolu" },
  { src: "p30.jpg", cat: "spolu", label: "Betónovanie s celým tímom", sub: "Spolu" },
  { src: "p31.jpg", cat: "spolu", label: "Zákazka — pumpa a mixer", sub: "Spolu" },
  { src: "p22.jpg", cat: "hadice", label: "Prídavné hadice — rozšírenie dosahu pumpy", sub: "Prídavné hadice" },
  { src: "p29.jpg", cat: "hadice", label: "Hadice pre ťažko dostupné miesta", sub: "Prídavné hadice" },
  { src: "p13.jpg", cat: "hadice", label: "Čerpanie cez prídavné hadice", sub: "Hadice" },
  { src: "p14.jpg", cat: "hadice", label: "Prídavné hadice na zákazke", sub: "Hadice" },
  { src: "p23.jpg", cat: "hadice", label: "Betonáž s hadicami", sub: "Hadice" },
  { src: "p24.jpg", cat: "hadice", label: "Hadice — rozšírený dosah", sub: "Hadice" },
  { src: "p25.jpg", cat: "hadice", label: "Prídavné hadice v akcii", sub: "Hadice" },
];

const TABS: { id: GalleryCat | "videa"; label: string }[] = [
  { id: "vsetko", label: "VŠETKO" },
  { id: "pumpa", label: "PUMPA" },
  { id: "mix", label: "MIX" },
  { id: "spolu", label: "SPOLU" },
  { id: "hadice", label: "HADICE" },
  { id: "videa", label: "VIDEA" },
];

const catLabel: Record<GalleryCat, string> = {
  pumpa: "PUMPA",
  mix: "MIX",
  spolu: "SPOLU",
  hadice: "HADICE",
  vsetko: "VŠETKO",
};

function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 md:gap-2.5">
      {photos.map((p, i) => (
        <motion.div
          key={p.src + i}
          className="relative overflow-hidden rounded group cursor-default"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.4, ease, delay: Math.min(i * 0.03, 0.24) }}
        >
          <div className="h-28 sm:h-36 md:h-48">
            <img
              src={`/images/vozovy-park/${p.src}`}
              alt={p.label}
              loading="lazy"
              className="w-full h-full object-cover transition-[transform] duration-700 ease-out group-hover:scale-[1.06]"
              style={{ filter: "brightness(0.9) contrast(1.15) saturate(1.1)" }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-secondary/15 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 md:px-3 md:py-2.5">
            <div className="text-primary text-[7px] md:text-[8px] font-bold uppercase tracking-[0.22em] mb-0.5 opacity-80 hidden sm:block">
              {catLabel[p.cat]}
            </div>
            <div className="text-white font-bold text-[9px] md:text-[11px] leading-snug line-clamp-2">{p.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function VideasSection() {
  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: "url('/images/vozovy-park/anim-bg.gif')",
          filter: "brightness(0.08) saturate(0.3)",
        }}
      />
      <div className="relative px-2 py-4 md:py-6 space-y-4">
        <motion.div
          className="relative overflow-hidden rounded-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease }}
        >
          <video
            src="/images/vozovy-park/vid01.mp4"
            poster="/images/vozovy-park/vid01-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            className="w-full rounded-lg object-cover max-h-[400px]"
            style={{ filter: "brightness(0.92) contrast(1.1) saturate(1.05)" }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary/80 to-transparent px-4 py-3">
            <div className="text-primary text-[9px] font-bold uppercase tracking-[0.3em] mb-0.5">MS-BETON · Hlavné video</div>
            <div className="text-white font-bold text-sm">Betónová pumpa MS-BETON v akcii</div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { src: "/images/vozovy-park/p10.jpg", label: "Betonáž haly — čerpanie pumpa" },
            { src: "/images/vozovy-park/p21.jpg", label: "Betonáž priemyselnej haly" },
            { src: "/images/vozovy-park/p16.jpg", label: "Mixer v akcii" },
            { src: "/images/vozovy-park/p32.jpg", label: "Pumpa MS-BETON na zákazke" },
          ].map((ph, i) => (
            <motion.div
              key={i}
              className="relative overflow-hidden rounded group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease, delay: 0.1 + i * 0.06 }}
            >
              <div className="h-36 md:h-44 relative bg-secondary/80">
                <img
                  src={ph.src}
                  alt={ph.label}
                  loading="lazy"
                  className="w-full h-full object-cover transition-[transform] duration-700 ease-out group-hover:scale-[1.04]"
                  style={{ filter: "brightness(0.88) contrast(1.1) saturate(1.0)" }}
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary/80 to-transparent px-2.5 py-2">
                <div className="text-white font-bold text-[10px] leading-snug">{ph.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VozovyPark() {
  const [activeTab, setActiveTab] = useState<GalleryCat | "videa">("vsetko");

  const filteredPhotos =
    activeTab === "vsetko" || activeTab === "videa"
      ? GALLERY_PHOTOS
      : GALLERY_PHOTOS.filter(p => p.cat === activeTab);

  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="Vozový park"
        description="Vozový park MS-BETON s.r.o. – betón pumpa s dosahom 28 m a domiešavač 9 m³. Moderná technika pre spoľahlivú dopravu betónu v Žilinskom kraji."
        canonical="/vozovy-park"
      />
      <Navbar />

      {/* ── HERO (65 vh) ── */}
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
          <div className="grid grid-cols-5 divide-x divide-primary/10">
            {[
              { n: "2", u: "×", l: "PUMPA" },
              { n: "2", u: "×", l: "MIXER" },
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
            className="mb-8"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-3">
              <span className="block w-6 h-[2px] bg-primary" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-[0.3em]">Technika</span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="font-black text-3xl md:text-4xl text-white tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              NÁŠ VOZOVÝ PARK
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* PUMPA */}
            <motion.div
              className="relative overflow-hidden group h-[420px] md:h-[480px] cursor-default"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.65, ease }}
            >
              <img
                src="/images/vozovy-park/pumpa-site.jpg"
                alt="MS-BETON betónová pumpa MAN TGA"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
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
                    <div className="text-primary font-black text-xl leading-none">DN 125</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">hadice</div>
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed max-w-sm">
                  Stropy, suterény, podlahy — aj na miesta bez priameho prístupu.
                </p>
              </div>
            </motion.div>

            {/* MIXER */}
            <motion.div
              className="relative overflow-hidden group h-[420px] md:h-[480px] cursor-default"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.65, ease, delay: 0.12 }}
            >
              <img
                src="/images/vozovy-park/mixer-krajina.jpg"
                alt="MS-BETON domiešavač betónu"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
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
          </div>
        </div>
      </section>

      {/* ── FOTO MARQUEE STRIP ── */}
      <div className="overflow-hidden border-y border-white/6 py-2.5" aria-hidden="true" style={{ background: "rgba(0,29,61,0.6)" }}>
        <div
          className="flex gap-2.5"
          style={{
            width: "max-content",
            animation: "marquee-scroll 40s linear infinite",
          }}
        >
          {[...MARQUEE_PHOTOS, ...MARQUEE_PHOTOS].map((p, i) => (
            <div
              key={i}
              className="relative overflow-hidden flex-shrink-0"
              style={{ width: 220, height: 140 }}
            >
              <img
                src={p.src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: p.pos, filter: "brightness(0.75) contrast(1.1) saturate(0.9)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent" />
            </div>
          ))}
        </div>
        <style>{`
          @keyframes marquee-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* ── GALÉRIA ── */}
      <section className="py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="mb-8"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-3">
              <span className="block w-6 h-[2px] bg-primary" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-[0.3em]">Fotky a videá</span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="font-black text-3xl md:text-4xl text-white tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              GALÉRIA
            </motion.h2>
          </motion.div>

          {/* Tab navigation */}
          <div className="relative flex gap-0 mb-8 border-b border-white/10 overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] whitespace-nowrap transition-[color,opacity] duration-150 active:scale-[0.97] shrink-0 ${
                  activeTab === tab.id ? "text-primary" : "text-white/40 hover:text-white/70"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="gallery-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                    transition={{ duration: 0.22, ease }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            >
              {activeTab === "videa" ? (
                <VideasSection />
              ) : (
                <GalleryGrid photos={filteredPhotos} />
              )}
            </motion.div>
          </AnimatePresence>
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
