import { useState, useEffect } from "react";
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

const HERO_SLIDES = [
  { src: "ms-beton-pumpa-cerpanie-priemyselny-objekt.jpg", pos: "28% 36%" },
  { src: "ms-beton-pumpa-mixer-sumrak.jpg", pos: "46% 32%" },
  { src: "ms-beton-pumpa-scania-zilinsky-kraj.jpg", pos: "25% 34%", flip: true },
  { src: "ms-beton-pumpa-scania-rodinny-dom.jpg", pos: "50% 40%" },
  { src: "ms-beton-pumpa-man-mixer-jarne-zakazky.jpg", pos: "25% 33%", flip: true },
  { src: "ms-beton-pumpa-mixer-hruba-stavba.jpg", pos: "42% 37%" },
];

const MARQUEE_PHOTOS = [
  { src: "/images/vozovy-park/ms-beton-pumpa-man-tga-reprezentativna.jpg",                   pos: "center 40%" },
  { src: "/images/vozovy-park/ms-beton-scania-mixer-betonaz-zakladovych-pasov.jpg",        pos: "center 38%" },
  { src: "/images/vozovy-park/ms-beton-man-pumpa-logo-cesta-lesny-teren-zilina.jpg",         pos: "center 42%" },
  { src: "/images/vozovy-park/ms-beton-domiesavac-beton-krajina.jpg",                        pos: "center 32%" },
  { src: "/images/vozovy-park/ms-beton-man-pumpa-zrubovy-dom-betonaz.jpg",                    pos: "center 40%" },
  { src: "/images/vozovy-park/ms-beton-man-pumpa-horsky-teren-zakazka.jpg",          pos: "center 38%" },
  { src: "/images/vozovy-park/ms-beton-pumpa-mixer-zakazka-z-vysky.jpg",                     pos: "center 38%" },
  { src: "/images/vozovy-park/ms-beton-2-pumpy-mixer-kompletna-zakazka.jpg",                 pos: "center 30%" },
];

type GalleryCat = "vsetko" | "pumpa" | "mix" | "spolu" | "hadice";

interface GalleryPhoto {
  src: string;
  cat: GalleryCat;
  label: string;
  sub: string;
  top?: boolean;
  pos?: string;
}

const GALLERY_PHOTOS: GalleryPhoto[] = [
  { src: "ms-beton-pumpa-man-tga-reprezentativna.jpg",    cat: "pumpa",  label: "MS-BETON pumpa MAN TGA",          sub: "Pumpa · MAN TGA",      top: true, pos: "center 40%" },
  { src: "ms-beton-pumpa-dosah-28m-cerpanie.jpg",         cat: "pumpa",  label: "Čerpanie betónu do výšky — dosah 28 m",              sub: "Pumpa",             pos: "center 35%" },
  { src: "ms-beton-pumpa-rameno-do-dalsej-pumpy.jpg",     cat: "pumpa",  label: "Pumpa čerpá cez druhú pumpu — špeciálna zákazka",            sub: "Špeciálna zákazka",    top: true, pos: "center 40%" },
  { src: "ms-beton-pumpa-rameno-zakazka.jpg",             cat: "spolu",  label: "Predĺžená trasa čerpania — pumpa + mixer", sub: "Pumpa v akcii",        top: true, pos: "center 42%" },
  { src: "ms-beton-betonaz-priemyselna-hala.jpg",         cat: "pumpa",  label: "Betonáž priemyselnej haly",                 sub: "Hala",                 pos: "center 45%" },
  { src: "ms-beton-pumpa-man-tga-na-stavbe.jpg",          cat: "pumpa",  label: "Betónová pumpa MAN TGA na stavbe",          sub: "Stavba",                           pos: "center 35%" },
  { src: "ms-beton-pumpa-zilinsky-kraj.jpg",              cat: "pumpa",  label: "Betónová pumpa — zákazka v Žilinskom kraji",          sub: "Pumpa",                    pos: "center 40%" },
  { src: "ms-beton-pumpa-v-akcii-zakazka-2.jpg",          cat: "pumpa",  label: "Čerpanie betónu — pumpa MS-BETON",         sub: "Pumpa",                    pos: "center 45%" },
  { src: "ms-beton-pumpa-v-akcii.jpg",                    cat: "pumpa",  label: "MS-BETON pumpa počas zákazky",                    sub: "Pumpa",                            pos: "center 40%" },
  { src: "ms-beton-pumpa-na-zakazke.jpg",                 cat: "pumpa",  label: "Pumpa na zákazke",                          sub: "Pumpa",                            pos: "center 45%" },
  { src: "ms-beton-betonovanie-objektu.jpg",              cat: "pumpa",  label: "Betónovanie objektu",                       sub: "Pumpa",                            pos: "center 45%" },
  { src: "ms-beton-vozovy-park-pohlad-zhora.jpg",         cat: "pumpa",  label: "Vozový park MS-BETON — pohľad zhora",                sub: "Pumpa",                            pos: "center 50%" },
  { src: "ms-beton-vozovy-park-pohlad-z-vysky.jpg",       cat: "pumpa",  label: "Vozový park MS-BETON — celkový pohľad",             sub: "Pumpa",                            pos: "center 50%" },
  { src: "ms-beton-domiesavac-beton-krajina.jpg",         cat: "mix",    label: "Domiešavač IVECO MAGIRUS — zákazka",               sub: "Mix · IVECO MAGIRUS",  top: true, pos: "center 30%" },
  { src: "ms-beton-mixer-v-akcii.jpg",                    cat: "mix",    label: "Domiešavač betónu — čerstvý betón na stavbu",                             sub: "Mix",                  pos: "center 40%" },
  { src: "ms-beton-domiesavac-na-zakazke.jpg",            cat: "mix",    label: "Domiešavač na zákazke",                     sub: "Mix",                              pos: "center 60%" },
  { src: "ms-beton-domiesavac-betonu.jpg",                cat: "mix",    label: "Domiešavač betónu",                         sub: "Mix",                              pos: "center 45%" },
  { src: "ms-beton-mixer-na-stavbe.jpg",                  cat: "mix",    label: "Mixer na stavbe",                           sub: "Mix",                              pos: "center 50%" },
  { src: "ms-beton-domiesavac-plna-zakazka.jpg",          cat: "mix",    label: "Domiešavač — plná zákazka",                sub: "Mix",                              pos: "center 40%" },
  { src: "ms-beton-2-pumpy-mixer-kompletna-zakazka.jpg",  cat: "spolu",  label: "Dve pumpy + domiešavač — väčšia zákazka",    sub: "Pumpa + Mix",          top: true, pos: "center 50%" },
  { src: "ms-beton-betonaz-podlahy-presnost.jpg",         cat: "spolu",  label: "Betonáž podlahy — pumpa MS-BETON",         sub: "Pumpa",        top: true, pos: "center 55%" },
  { src: "ms-beton-vozovy-park-vozidla-fleet.jpg",        cat: "spolu",  label: "Vozidlá MS-BETON",            sub: "Fleet" },
  { src: "ms-beton-kompletna-zakazka-betonu.jpg",         cat: "spolu",  label: "Kompletná zákazka betónu",                  sub: "Pumpa + Mix" },
  { src: "ms-beton-pumpa-mixer-zakazka-2.jpg",            cat: "spolu",  label: "Čerpanie betónu — pumpa a domiešavač",                     sub: "Pumpa + Mix" },
  { src: "ms-beton-pumpa-mix-zakazka.jpg",                cat: "spolu",  label: "MS-BETON — betón pumpa a mix",                          sub: "Pumpa + Mix" },
  { src: "ms-beton-betonovanie-s-celym-timom.jpg",        cat: "spolu",  label: "Betonáž — pumpa, domiešavač, celý tím",                 sub: "Pumpa + Mix" },
  { src: "ms-beton-pridavne-hadice-dosah-pumpy.jpg",      cat: "hadice", label: "Prídavné hadice — dosah aj tam kde pumpa nestačí", sub: "Prídavné hadice",      top: true, pos: "center 50%" },
  { src: "ms-beton-hadice-tazko-dostupne-miesta.jpg",     cat: "hadice", label: "Hadice — betonáž ťažko dostupných miest",          sub: "Prídavné hadice" },
  { src: "ms-beton-hadice-rozsireny-dosah.jpg",           cat: "hadice", label: "Rozšírenie dosahu — prídavné hadice",                  sub: "Hadice" },
  { src: "ms-beton-pumpa-cerpanie-priemyselny-objekt.jpg", cat: "pumpa", label: "Pumpa MS-BETON — čerpanie pri priemyselnom objekte",  sub: "Pumpa",     pos: "center 40%" },
  { src: "ms-beton-pumpa-mixer-hruba-stavba.jpg",         cat: "spolu",  label: "Pumpa MAN + domiešavač — betonáž hrubej stavby",     sub: "Pumpa + Mix",       top: true, pos: "center 48%" },
  { src: "ms-beton-zakladova-doska-velka-zakazka.jpg",    cat: "spolu",  label: "Základová doska — väčšia zákazka",        sub: "Kompletná zákazka", pos: "center 45%" },
  { src: "ms-beton-pumpa-betonova-zakazka.jpg",           cat: "pumpa",  label: "Betónová pumpa na zákazke",                           sub: "Pumpa" },
  { src: "ms-beton-pumpa-mixer-sumrak.jpg",               cat: "spolu",  label: "Pumpa + domiešavač — zákazka za súmraku",           sub: "Pumpa + Mix",       pos: "center 58%" },
  { src: "ms-beton-pumpa-mestska-zastavba.jpg",           cat: "pumpa",  label: "Pumpa MS-BETON — zákazka v meste",                  sub: "Pumpa" },
  { src: "ms-beton-man-pumpa-detail-kabiny.jpg",          cat: "pumpa",  label: "MS-BETON MAN — detail betónovej pumpy",        sub: "Pumpa · MAN" },
  { src: "ms-beton-pumpa-mixer-zakazka-z-vysky.jpg",      cat: "spolu",  label: "Pumpa + domiešavač — pohľad z výšky na zákazku",            sub: "Mix",               top: true, pos: "center 45%" },
  { src: "ms-beton-pumpa-scania-zilinsky-kraj.jpg",       cat: "pumpa",  label: "Pumpa Scania — zákazka v Žilinskom kraji",            sub: "Pumpa · Scania",    top: true, pos: "center 35%" },
  { src: "ms-beton-pumpa-scania-priemyselna-hala.jpg",    cat: "pumpa",  label: "Pumpa Scania — čerpanie v priemyselnej hale",        sub: "Pumpa · Scania",    pos: "center 40%" },
  { src: "ms-beton-pumpa-man-mixer-jarne-zakazky.jpg",    cat: "spolu",  label: "Pumpa MAN + domiešavač — jarná zákazka",         sub: "Pumpa + Mix",       pos: "center 45%" },
  { src: "ms-beton-pumpa-pohladz-na-stavenisko.jpg",      cat: "pumpa",  label: "Pumpa MS-BETON — celé stavenisko v zákazke",       sub: "Pumpa",             pos: "center 45%" },
  { src: "ms-beton-pumpa-scania-rodinny-dom.jpg",         cat: "pumpa",  label: "Pumpa Scania — čerpanie pri rodinnom dome",          sub: "Pumpa · Scania",    top: true, pos: "center 48%" },
  { src: "ms-beton-man-tga-prijazd-na-zakazku.jpg",       cat: "pumpa",  label: "MS-BETON MAN TGA — príjazd na zákazku",             sub: "Pumpa · MAN",       pos: "center 45%" },
  { src: "ms-beton-scania-mixer-betonaz-zakladovych-pasov.jpg",  cat: "mix",    label: "Scania domiešavač — betonáž základových pásov",   sub: "Mix · Scania",    pos: "center 50%" },
  { src: "ms-beton-pumpa-scania-cerpanie-nad-domom.jpg",           cat: "pumpa",  label: "Pumpa Scania — čerpanie betónu nad rodinným domom",      sub: "Pumpa · Scania",  pos: "center 45%" },
  { src: "ms-beton-man-pumpa-zrubovy-dom-betonaz.jpg",             cat: "pumpa",  label: "MS-BETON MAN — betonáž zrubového domu, horská zákazka",  sub: "Pumpa · MAN",     top: true, pos: "center 40%" },
  { src: "ms-beton-man-pumpa-komercny-objekt-moderna-stavba.jpg",  cat: "pumpa",  label: "MS-BETON MAN — čerpanie betónu, moderná stavba",         sub: "Pumpa · MAN",     pos: "center 40%" },
  { src: "ms-beton-man-pumpa-horsky-teren-zakazka.jpg",    cat: "pumpa",  label: "MS-BETON MAN — zákazka v horskom teréne",              sub: "Pumpa · MAN",     top: true, pos: "center 45%" },
  { src: "ms-beton-man-cifa-betonaz-tehlovej-hruby-stavby.jpg",    cat: "spolu",  label: "MAN + 2× domiešavač — betonáž tehlovej hrubej stavby",   sub: "Pumpa + Mix",     pos: "center 48%" },
];

const TABS: { id: GalleryCat | "videa"; label: string }[] = [
  { id: "vsetko", label: "VŠETKO" },
  { id: "pumpa", label: "PUMPA" },
  { id: "mix", label: "MIX" },
  { id: "spolu", label: "PUMPA+MIXER" },
  { id: "hadice", label: "HADICE" },
  { id: "videa", label: "VIDEA" },
];

const catLabel: Record<GalleryCat, string> = {
  pumpa: "PUMPA",
  mix: "MIX",
  spolu: "PUMPA+MIXER",
  hadice: "HADICE",
  vsetko: "VŠETKO",
};

function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 md:gap-2.5">
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
              style={{ filter: "brightness(0.9) contrast(1.15) saturate(1.1)", objectPosition: p.pos ?? "center 50%" }}
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

        <div className="grid grid-cols-2 gap-2.5">
          {[
            { src: "/images/vozovy-park/ms-beton-betonaz-zruboveho-domu.jpg",    label: "Betonáž zrubového domu",        pos: "center 45%" },
            { src: "/images/vozovy-park/ms-beton-zrubovy-dom-cerpanie-betonu.jpg", label: "Zrubový dom — čerpanie betónu", pos: "center 50%" },
          ].map((ph, i) => (
            <motion.div
              key={i}
              className="relative overflow-hidden rounded group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease, delay: 0.1 + i * 0.06 }}
            >
              <div className="h-44 md:h-56 relative bg-secondary/80">
                <img
                  src={ph.src}
                  alt={ph.label}
                  loading="lazy"
                  className="w-full h-full object-cover transition-[transform] duration-700 ease-out group-hover:scale-[1.04]"
                  style={{ filter: "brightness(0.88) contrast(1.1) saturate(1.0)", objectPosition: ph.pos }}
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
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHeroSlide(s => (s + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const filteredPhotos =
    activeTab === "videa"
      ? GALLERY_PHOTOS
      : activeTab === "vsetko"
        ? GALLERY_PHOTOS.filter(p => p.top)
        : GALLERY_PHOTOS.filter(p => p.cat === activeTab);
  const trimmed = Math.floor(filteredPhotos.length / 3) * 3;
  const displayPhotos = trimmed > 0 ? filteredPhotos.slice(0, trimmed) : filteredPhotos;

  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="Vozový park"
        description="Vozový park MS-BETON, spol. s r.o. – betón pumpa s dosahom 28 m a domiešavač 9 m³. Moderná technika pre spoľahlivú dopravu betónu v Žilinskom kraji."
        canonical="/vozovy-park"
        image="/images/vozovy-park/ms-beton-pumpa-scania-zilinsky-kraj.jpg"
      />
      <Navbar />

      {/* ── HERO (65 vh) ── */}
      <section className="relative h-[65vh] min-h-[460px] flex items-end overflow-hidden">
        {HERO_SLIDES.map((sl, i) => (
          <div
            key={sl.src}
            className="absolute inset-0 bg-cover transition-opacity duration-[1400ms] ease-in-out"
            style={{
              backgroundImage: `url('/images/vozovy-park/${sl.src}')`,
              backgroundPosition: sl.pos,
              filter: "brightness(0.78) contrast(1.06) saturate(0.94)",
              transform: sl.flip ? "scaleX(-1)" : "none",
              opacity: i === heroSlide ? 1 : 0,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/42 via-secondary/12 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/28 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-l from-secondary/18 to-[60%] to-transparent" />

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
                src="/images/vozovy-park/ms-beton-pumpa-man-tga-na-stavbe.jpg"
                alt="MS-BETON betónová pumpa MAN TGA"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                style={{ objectPosition: "center 62%", filter: PF }}
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
                src="/images/vozovy-park/ms-beton-domiesavac-beton-krajina.jpg"
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
            animation: "marquee-scroll 80s linear infinite",
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
                loading="lazy"
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
                <>
                  <GalleryGrid photos={displayPhotos} />
                  {activeTab === "hadice" && (
                    <motion.div
                      className="mt-4 relative overflow-hidden rounded-lg"
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <video
                        src="/images/vozovy-park/ms-beton-hadice-cerpanie-betonu-video.mp4"
                        poster="/images/vozovy-park/ms-beton-hadice-cerpanie-betonu-poster.jpg"
                        controls
                        preload="none"
                        playsInline
                        className="w-full rounded-lg object-cover max-h-[420px]"
                        style={{ filter: "brightness(0.95) contrast(1.08)" }}
                      />
                      <div className="mt-1.5 px-1 flex items-center gap-2">
                        <span className="text-primary text-[9px] font-bold uppercase tracking-[0.25em]">Prídavné hadice</span>
                        <span className="text-white/40 text-[10px]">— betonáž cez hadice, rozšírenie dosahu pumpy</span>
                      </div>
                    </motion.div>
                  )}
                </>
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
