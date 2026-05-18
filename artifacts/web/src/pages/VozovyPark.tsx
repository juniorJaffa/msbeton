import { motion } from "framer-motion";
import { Phone, ArrowRight, Check, ChevronDown } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

function StatCard({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="border border-white/10 bg-white/5 px-5 py-4 text-center">
      <div className="flex items-end justify-center gap-1 leading-none mb-1">
        <span className="font-black text-4xl text-primary tracking-tight">{value}</span>
        {unit && <span className="font-bold text-lg text-primary/60 mb-0.5">{unit}</span>}
      </div>
      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <Check className="w-2.5 h-2.5 text-primary" />
      </span>
      <span className="text-white/70 text-sm">{text}</span>
    </div>
  );
}

export default function VozovyPark() {
  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="Vozový park"
        description="Vozový park MS-BETON s.r.o. – betón pumpa MAN s dosahom 28 m a domiešavač 9 m³. Moderná technika pre spoľahlivú dopravu betónu v Žilinskom kraji."
        canonical="/vozovy-park"
      />
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/vozovy-park/pumpa-hero.jpg')", filter: "brightness(0.42) saturate(0.85)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28 w-full">
          <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-2xl">
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
              <span className="block w-8 h-[2px] bg-primary" />
              <span className="text-primary font-bold text-xs tracking-[0.3em] uppercase">Vozový park</span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display font-black text-5xl md:text-7xl text-white leading-[0.9] tracking-tight mb-6"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              NAŠA<br />
              <span className="text-primary">TECHNIKA,</span><br />
              VÁŠ BETÓN.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/55 text-lg leading-relaxed max-w-lg mb-8">
              Moderné vozidlá, pravidelný servis a spoľahlivé dodávky betónu po celom Žilinskom kraji.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <a
                href="/#calculator"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-secondary font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-[transform,opacity] duration-150 active:scale-[0.98]"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Kalkulačka ceny <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="tel:+421909205205"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/25 text-white font-bold text-sm hover:border-primary hover:text-primary transition-[color,border-color] duration-150"
              >
                <Phone className="w-4 h-4" /> Zavolať
              </a>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 right-8 hidden md:flex flex-col items-center gap-2 text-white/20">
            <span className="text-[9px] uppercase tracking-widest font-bold writing-vertical">scroll</span>
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── OVERVIEW STRIP ── */}
      <section className="bg-primary/10 border-y border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-primary/10">
            {[
              { n: "2", u: "×", l: "Vozidlá vo flote" },
              { n: "28", u: "m", l: "Dosah výložníka" },
              { n: "9", u: "m³", l: "Objem bubna" },
              { n: "24", u: "h", l: "Pohotovosť / deň" },
            ].map(s => (
              <div key={s.l} className="px-6 py-5 text-center">
                <div className="flex items-end justify-center gap-0.5 leading-none mb-1">
                  <span className="font-black text-3xl text-primary">{s.n}</span>
                  <span className="font-bold text-base text-primary/50 mb-0.5">{s.u}</span>
                </div>
                <div className="text-[10px] text-white/35 font-bold uppercase tracking-widest">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PUMPA SECTION ── */}
      <section id="pumpa" className="bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Photo */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="relative"
            >
              <div className="relative overflow-hidden aspect-[4/3] bg-secondary/50">
                <img
                  src="/images/vozovy-park/pumpa-site.jpg"
                  alt="MAN TGA betónová pumpa MS-BETON v akcii"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent" />
                {/* Badge */}
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-primary text-secondary text-[10px] font-black uppercase tracking-widest">
                  Betónová pumpa
                </div>
              </div>
              {/* Accent bar */}
              <div className="absolute -bottom-3 -right-3 w-24 h-24 border-2 border-primary/30 -z-10" />
              <div className="absolute -top-3 -left-3 w-16 h-16 border border-primary/15 -z-10" />
            </motion.div>

            {/* Content */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
            >
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
                <span className="block w-6 h-[2px] bg-primary" />
                <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">MAN TGA 41.440</span>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="font-black text-4xl md:text-5xl text-white leading-tight mb-4 tracking-tight"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                BETÓNOVÁ<br />PUMPA
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/55 leading-relaxed mb-8 max-w-md">
                Doprava betónu potrubím priamo na ťažko dostupné miesta stavby. Výložník s dosahom 28&nbsp;m pokryje väčšinu rodinných aj komerčných projektov.
              </motion.p>

              {/* Stats */}
              <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 mb-8">
                <StatCard value="28" unit="m" label="Dosah výložníka" />
                <StatCard value="7" unit="m³" label="Čerpacia kapacita" />
                <StatCard value='5"' label="Priemer hadíc" />
              </motion.div>

              {/* Features */}
              <motion.div variants={stagger} className="space-y-2.5 mb-8">
                {[
                  "Ťažko dostupné miesta bez obmedzení",
                  "Pridávanie predlžovacích hadíc na požiadanie",
                  "Presná kontrola rýchlosti čerpania",
                  "Umývanie zariadenia po každej zákazke",
                  "Skúsený operátor s každým vozidlom",
                ].map(f => (
                  <motion.div key={f} variants={fadeUp}>
                    <FeatureItem text={f} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Accessories pills */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
                {["Výložník 28 m", "Hadice 5\"", "Pridávanie hadíc", "Umývanie pumpy"].map(tag => (
                  <span key={tag} className="px-3 py-1 border border-primary/30 text-primary text-[11px] font-bold uppercase tracking-wide">
                    {tag}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SEPARATOR ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* ── DOMIEŠAVAČ SECTION ── */}
      <section id="domiesavac" className="bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Content — left on desktop */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="order-2 lg:order-1"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
                <span className="block w-6 h-[2px] bg-primary" />
                <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">IVECO MAGIRUS</span>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="font-black text-4xl md:text-5xl text-white leading-tight mb-4 tracking-tight"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                DOMIEŠAVAČ<br />BETÓNU
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/55 leading-relaxed mb-8 max-w-md">
                Autodomiešavač zaručuje rovnomerné premiešanie cementu, piesku, štrku a vody do homogénneho betónu — priamo na miesto stavby.
              </motion.p>

              {/* Stats */}
              <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 mb-8">
                <StatCard value="9" unit="m³" label="Objem bubna" />
                <StatCard value="360°" label="Rotácia bubna" />
                <StatCard value="C8–C35" label="Triedy betónu" />
              </motion.div>

              {/* Features */}
              <motion.div variants={stagger} className="space-y-2.5 mb-8">
                {[
                  "Plynulá rotácia bubna počas dopravy",
                  "Dodávka čerstvého betónu priamo na stavbu",
                  "Všetky triedy betónu C8 až C35",
                  "Čakačky — prvých 30 minút zdarma",
                  "Spolupráca s pumpa vozidlom na jednej zákazke",
                ].map(f => (
                  <motion.div key={f} variants={fadeUp}>
                    <FeatureItem text={f} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pills */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
                {["Autodomiešavač", "9 m³ objem", "Čerstvý betón", "Spoľahlivosť"].map(tag => (
                  <span key={tag} className="px-3 py-1 border border-white/15 text-white/50 text-[11px] font-bold uppercase tracking-wide">
                    {tag}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Photo — right on desktop */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="relative order-1 lg:order-2"
            >
              <div className="relative overflow-hidden aspect-[4/3] bg-secondary/50">
                <img
                  src="/images/vozovy-park/mixer-krajina.jpg"
                  alt="Domiešavač betónu MS-BETON v Žilinskom kraji"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent" />
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-secondary text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
                  Domiešavač
                </div>
              </div>
              <div className="absolute -bottom-3 -left-3 w-24 h-24 border-2 border-white/10 -z-10" />
              <div className="absolute -top-3 -right-3 w-16 h-16 border border-white/5 -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-[#020e1f] border-y border-white/5 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="block w-6 h-[2px] bg-primary" />
                <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">Proces</span>
                <span className="block w-6 h-[2px] bg-primary" />
              </div>
              <h2 className="font-black text-3xl md:text-4xl text-white tracking-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>
                AKO TO FUNGUJE
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-0 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10" />

              {[
                { n: "01", title: "Objednávka", desc: "Zavoláte alebo vypočítate online cez kalkulačku. Dohodne termín a množstvo." },
                { n: "02", title: "Príprava betónu", desc: "Betón sa namieša presne podľa triedy a receptúry vo výrobni." },
                { n: "03", title: "Doprava na miesto", desc: "Domiešavač alebo pumpa príde priamo na vašu stavbu v dohodnutý čas." },
                { n: "04", title: "Čerpanie a odovzdanie", desc: "Betón sa spracuje, zariadenie sa vyumýva a zákazka je uzavretá." },
              ].map((step, i) => (
                <motion.div key={step.n} variants={fadeUp} className="relative flex flex-col items-center text-center px-6 py-6">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-primary/40 flex items-center justify-center mb-4 relative z-10"
                    style={{ background: "#020e1f" }}
                  >
                    <span className="font-black text-xs text-primary">{step.n}</span>
                  </div>
                  <h3 className="font-black text-sm text-white uppercase tracking-wide mb-2">{step.title}</h3>
                  <p className="text-white/40 text-xs leading-relaxed">{step.desc}</p>
                  {i < 3 && <div className="hidden sm:block md:hidden absolute right-0 top-1/2 w-px h-12 bg-white/5 -translate-y-1/2" />}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── V AKCII — Photo gallery ── */}
      <section className="bg-secondary py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-8">
              <span className="block w-6 h-[2px] bg-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">Galéria</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-black text-3xl md:text-4xl text-white tracking-tight mb-10" style={{ fontFamily: "Montserrat, sans-serif" }}>
              V AKCII
            </motion.h2>

            {/* Row 1: 2 landscape + 1 portrait */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Large left — indoor pour */}
              <div className="col-span-2 md:col-span-1 overflow-hidden relative aspect-[4/3] group">
                <img
                  src="/images/vozovy-park/akcia-podlaha-1.jpg"
                  alt="Betónová pumpa MS-BETON — betonáž podlahy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  style={{ objectPosition: "center 40%" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/75 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white font-black text-xs uppercase tracking-widest">Betonáž podlahy</div>
              </div>
              {/* Center — log cabin landscape */}
              <div className="overflow-hidden relative aspect-[4/3] group">
                <img
                  src="/images/vozovy-park/pumpa-krajina.jpg"
                  alt="MS-BETON pumpa pri rúbaninovom dome"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  style={{ objectPosition: "center 50%" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/75 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white font-black text-xs uppercase tracking-widest">Pumpa v krajine</div>
              </div>
              {/* Right — pump at site */}
              <div className="overflow-hidden relative aspect-[4/3] group">
                <img
                  src="/images/vozovy-park/pumpa-mixer-site.jpg"
                  alt="MS-BETON pumpa a domiešavač na stavenisku"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  style={{ objectPosition: "center 40%" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/75 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white font-black text-xs uppercase tracking-widest">Pumpa + Mix</div>
              </div>
            </motion.div>

            {/* Row 2: full-width banner */}
            <motion.div variants={fadeUp} className="mt-3 overflow-hidden relative aspect-[21/6] md:aspect-[21/5] group">
              <img
                src="/images/vozovy-park/akcia-podlaha-2.jpg"
                alt="MS-BETON — betonáž haly"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                style={{ objectPosition: "center 60%" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/80 via-secondary/40 to-secondary/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent" />
              <div className="absolute bottom-5 left-6 md:bottom-8 md:left-10">
                <div className="text-primary text-[10px] font-bold uppercase tracking-[0.3em] mb-1">V teréne</div>
                <div className="text-white font-black text-lg md:text-2xl uppercase tracking-tight leading-tight">Pracujeme tam, kam iní nedosiahnu</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="relative py-20 md:py-24 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #001D3D 0%, #00305f 60%, #001D3D 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mb-4">
              <span className="block w-6 h-[2px] bg-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">Záujem?</span>
              <span className="block w-6 h-[2px] bg-primary" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="font-black text-4xl md:text-5xl text-white tracking-tight mb-4"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              VYPOČÍTAJTE<br />
              <span className="text-primary">CENU ONLINE</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/45 max-w-md mx-auto mb-10">
              Kalkulačka spočíta cenu betónu, dopravy aj čerpania — vrátane vašej individuálnej zľavy.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center">
              <a
                href="/#calculator"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-secondary font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-[transform,opacity] duration-150 active:scale-[0.98] shadow-[0_0_40px_rgba(237,197,49,0.25)]"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Kalkulačka betónu <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/cennik"
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-bold text-sm hover:border-primary hover:text-primary transition-[color,border-color] duration-150"
              >
                Cenník
              </a>
              <a
                href="tel:+421909205205"
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-bold text-sm hover:border-primary hover:text-primary transition-[color,border-color] duration-150"
              >
                <Phone className="w-4 h-4" /> +421 909 205 205
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
