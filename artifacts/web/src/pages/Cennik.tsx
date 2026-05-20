import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Phone, ArrowRight } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { adminData } from "@/lib/adminData";

const ease = [0.23, 1, 0.32, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}

// ── Betóny tab ─────────────────────────────────────────────────────────────
function BetonovyTab() {
  const cats = adminData.getCategories();
  const [open, setOpen] = useState<string | null>(cats[0]?.id ?? null);
  const ts = adminData.getTransportSettings();

  return (
    <div>
      <div className="space-y-2">
        {cats.map((cat) => (
          <div key={cat.id} className="border border-white/10 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-3.5 bg-white/5 hover:bg-white/8 transition-colors text-left"
              onClick={() => setOpen(open === cat.id ? null : cat.id)}
            >
              <span className="font-bold text-sm tracking-widest uppercase text-primary">{cat.name}</span>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-white/30">{cat.types.filter(t => t.price > 0 && t.label.trim()).length} typov</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${open === cat.id ? "rotate-180 text-primary" : "text-white/40"}`}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {open === cat.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease }}
                  style={{ overflow: "hidden" }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8">
                        <th className="text-left px-5 py-2.5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Typ betónu</th>
                        <th className="text-center px-4 py-2.5 text-[10px] font-bold text-white/30 uppercase tracking-widest hidden sm:table-cell">Jednotka</th>
                        <th className="text-right px-5 py-2.5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Cena bez DPH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.types.filter(t => t.price > 0 && t.label.trim()).map((t, i) => (
                        <tr key={t.id} className={`border-b border-white/5 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white/3" : "bg-white/5"}`}>
                          <td className="px-5 py-3 text-white/85 font-medium">{t.label}</td>
                          <td className="px-4 py-3 text-center text-white/30 hidden sm:table-cell text-xs">1 m³</td>
                          <td className="px-5 py-3 text-right font-black text-primary">{fmt(t.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Winter surcharge note */}
      <div className="mt-4 flex items-start gap-3 px-4 py-3 border border-amber-400/20 bg-amber-400/5">
        <span className="text-primary font-black text-base mt-0.5">*</span>
        <p className="text-white/55 text-xs leading-relaxed">
          <strong className="text-white/80">ZIMNÉ OPATRENIA (15.11. – 15.3.):</strong>{" "}
          Príplatok <strong className="text-primary">{fmt(ts.winterSurcharge)}</strong> bez DPH na 1 m³ betónu.
        </p>
      </div>
    </div>
  );
}

// ── Služby tab ─────────────────────────────────────────────────────────────
function SluzbyTab() {
  const services = adminData.getServices().filter((s) => s.active);

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left px-5 py-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">Názov služby</th>
            <th className="text-center px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-widest hidden sm:table-cell">Jednotka</th>
            <th className="text-right px-5 py-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">Cena bez DPH</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s, i) => (
            <tr key={s.id} className={`border-b border-white/5 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white/3" : "bg-white/5"}`}>
              <td className="px-5 py-3.5 text-white/85 font-medium">{s.name}</td>
              <td className="px-4 py-3.5 text-center text-white/30 text-xs hidden sm:table-cell">{s.unit}</td>
              <td className="px-5 py-3.5 text-right font-black text-primary">{fmt(s.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 border border-white/8 p-4">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2">Podmienky čerpania</p>
        <ul className="space-y-1.5">
          {[
            "Čerpanie sa účtuje od príjazdu na stavbu do odjazdu.",
            "Je potrebný bezproblémový príjazd a priestor na rozloženie stroja.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 text-xs text-white/50">
              <span className="text-primary font-black shrink-0 mt-0.5">—</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Doprava tab ─────────────────────────────────────────────────────────────
function DopravTab() {
  const zones = adminData.getTransportZones();
  const ts = adminData.getTransportSettings();

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Zone table */}
      <div className="border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vzdialenosť</span>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cena / m³</span>
        </div>

        {/* Min fee row */}
        <div className="flex items-center justify-between px-5 py-3 bg-primary/8 border-b border-primary/15">
          <span className="text-white/80 text-sm font-medium">Minimálna doprava / auto</span>
          <span className="text-primary font-black text-sm">{fmt(ts.minimumFee)}</span>
        </div>

        {zones.map((z, i) => (
          <div
            key={z.id}
            className={`flex items-center justify-between px-5 py-2.5 border-b border-white/5 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white/3" : "bg-white/5"}`}
          >
            <span className="text-white/70 text-sm">
              od <strong className="text-white/90">{z.fromKm}</strong> km do <strong className="text-white/90">{z.toKm}</strong> km
            </span>
            <span className="text-primary font-black text-sm">{fmt(z.ratePerM3)}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-3">
        <div className="border border-white/8 p-4">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-3">Podmienky účtovania</p>
          <ul className="space-y-2">
            {[
              "Doprava = cesta tam + späť.",
              "Vykládka od príchodu autodomiešavača na stavbu.",
              `Prvých 30 min zdarma. Nad 30 min: každých 15 min = ${fmt(ts.waitingRatePer15min)}.`,
              `Minimálne doťaženie: ${ts.minimumLoadM3} m³, aj pri menšom množstve.`,
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-xs text-white/55">
                <span className="text-primary font-black shrink-0 mt-0.5">—</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-amber-400/20 bg-amber-400/5 p-4">
          <p className="text-white/80 font-bold text-sm mb-1">Zimné opatrenia (15.11. – 15.3.)</p>
          <p className="text-white/50 text-xs">
            Príplatok <strong className="text-primary">{fmt(ts.winterSurcharge)}</strong> bez DPH na 1 m³.
          </p>
        </div>

        <div className="border border-white/8 p-4">
          <p className="text-white/80 font-bold text-sm mb-2">Individuálna cenová ponuka</p>
          <p className="text-white/45 text-xs mb-3">Pre zákazky s väčším objemom alebo pravidelnou spoluprácou.</p>
          <a
            href="tel:+421909205205"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-[transform,opacity] duration-150 active:scale-[0.97]"
          >
            <Phone className="w-3 h-3" />
            +421 909 205 205
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "betony", label: "Betóny" },
  { id: "sluzby", label: "Služby" },
  { id: "doprava", label: "Doprava" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function Cennik() {
  const [activeTab, setActiveTab] = useState<TabId>("betony");

  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="Cenník betónu"
        description="Aktuálny cenník betónu MS-BETON s.r.o. – drvené a okrúhle kamenivo, všetky triedy pevnosti. Ceny dopravy a čerpania betónu pumpa Žilina."
        canonical="/cennik"
      />
      <Navbar />

      {/* ── HERO (compact) ── */}
      <section className="concrete-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/68 via-secondary/45 to-secondary/5 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-18">
          <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-xl">
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
              <span className="block w-7 h-[2px] bg-primary" />
              <span className="text-primary font-bold text-[10px] tracking-[0.3em] uppercase">Cenník 2026</span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display font-black text-4xl md:text-5xl text-white leading-tight tracking-tight mb-3"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              CENY BETÓNU,<br />
              <span className="text-primary">DOPRAVY A ČERPANIA</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/50 text-sm leading-relaxed max-w-md mb-6">
              Transparentné ceny bez skrytých poplatkov. Individuálne zľavy pre stálych zákazníkov.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <a
                href="/#calculator"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-[transform,opacity] duration-150 active:scale-[0.97]"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Kalkulačka ceny <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="tel:+421909205205"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/20 text-white font-bold text-xs hover:border-primary hover:text-primary transition-[color,border-color] duration-150"
              >
                <Phone className="w-3.5 h-3.5" /> Zavolať
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── NOTICE BAR ── */}
      <div className="border-b border-primary/15" style={{ background: "rgba(237,197,49,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <p className="text-white/50 text-xs">Ceny platia pre rok 2026. Všetky ceny sú uvedené <strong className="text-white/75">BEZ DPH</strong>.</p>
        </div>
      </div>

      {/* ── TABS + CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

        {/* Tab switcher */}
        <div className="flex gap-1 mb-8 border-b border-white/10 pb-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-3 text-sm font-bold uppercase tracking-widest transition-colors duration-150 -mb-px ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-white/35 hover:text-white/65"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                  transition={{ duration: 0.2, ease }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease }}
          >
            {activeTab === "betony" && <BetonovyTab />}
            {activeTab === "sluzby" && <SluzbyTab />}
            {activeTab === "doprava" && <DopravTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── CTA ── */}
      <div className="border-t border-white/8 py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold mb-1">Kalkulačka</p>
            <p className="text-white font-black text-xl md:text-2xl tracking-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Spočítajte cenu online —<br className="sm:hidden" />
              <span className="text-primary"> vrátane vašej zľavy</span>
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a
              href="/#calculator"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-[transform,opacity] duration-150 active:scale-[0.97] shadow-[0_0_30px_rgba(237,197,49,0.18)]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Kalkulačka <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="tel:+421909205205"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white font-bold text-xs hover:border-primary hover:text-primary transition-[color,border-color] duration-150"
            >
              <Phone className="w-3.5 h-3.5" /> Zavolať
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
