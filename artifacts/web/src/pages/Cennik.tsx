import { useState } from "react";
import { ChevronDown, ChevronUp, Phone, Info } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { adminData } from "@/lib/adminData";

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}

function CategoryAccordion() {
  const cats = adminData.getCategories();
  const [open, setOpen] = useState<string | null>(cats[0]?.id ?? null);

  return (
    <div className="space-y-2">
      {cats.map((cat) => (
        <div key={cat.id} className="border border-white/20 overflow-hidden shadow-sm">
          <button
            className="w-full flex items-center justify-between px-5 py-4 bg-secondary/80 hover:bg-secondary transition-colors text-left"
            onClick={() => setOpen(open === cat.id ? null : cat.id)}
          >
            <span className="font-display font-bold text-sm tracking-widest uppercase text-primary">
              {cat.name}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">{cat.types.length} typov</span>
              {open === cat.id
                ? <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                : <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />}
            </div>
          </button>

          {open === cat.id && (
            <div className="bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Typ betónu</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Množstvo</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Cena bez DPH</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.types.filter(t => t.price > 0 && t.label.trim()).map((t, i) => (
                    <tr key={t.id} className={`border-b border-gray-50 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                      <td className="px-5 py-3 font-medium text-secondary">{t.label}</td>
                      <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">1 m³</td>
                      <td className="px-5 py-3 text-right font-bold text-secondary">{fmt(t.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Cennik() {
  const services = adminData.getServices().filter((s) => s.active);
  const zones = adminData.getTransportZones();
  const ts = adminData.getTransportSettings();

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="Cenník betónu"
        description="Aktuálny cenník betónu MS-BETON s.r.o. – drvené a okrúhle kamenivo, všetky triedy pevnosti. Ceny dopravy a čerpania betónu pumpa Žilina."
        canonical="/cennik"
      />
      <Navbar />

      {/* ── HERO ── */}
      <section className="concrete-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/75 to-secondary/20 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-10 h-[3px] bg-primary" />
              <span className="text-primary font-bold text-xs tracking-[0.25em] uppercase">CENNÍK</span>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl text-white mb-3 leading-tight">
              STAVIAME NA PEVNÝCH<br />ZÁKLADOCH, VOLÍME
            </h1>
            <h2 className="font-display font-black text-5xl md:text-6xl text-primary mb-6 leading-none">
              MS-BETON
            </h2>
            <p className="text-white/65 text-base md:text-lg max-w-xl leading-relaxed mb-8">
              MS-BETON, váš spoľahlivý dopravca. Rozumieme tomu, že základ každej veľkej stavby je v pevnosti a kvalite betónu, ktorý používate.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="tel:+421909205205"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-secondary font-bold text-sm hover:bg-primary/85 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
              >
                <Phone className="w-4 h-4" />
                ZAVOLAŤ
              </a>
              <a
                href="/#calculator"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/30 text-white font-bold text-sm hover:border-primary hover:text-primary transition-all"
              >
                VÝPOČET CENY →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── DISCOUNT NOTICE ── */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <p className="text-secondary text-sm font-medium">
            <strong>Pri registrácii získate automaticky zľavu 10 %.</strong>{" "}
            <span className="text-gray-600 font-normal">Ceny platia pre rok 2025. Ceny sú uvedené BEZ DPH.</span>
          </p>
        </div>
      </div>

      {/* ── CENNÍK BETÓNOV ── */}
      <section className="concrete-light py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display font-black text-4xl md:text-5xl text-secondary">
              CENNÍK <span className="text-primary">BETÓNOV</span>
            </h2>
            <p className="text-gray-600 mt-3 text-sm">Kliknutím rozbalíte jednotlivé kategórie kameniva</p>
          </div>

          <CategoryAccordion />

          <div className="mt-6 p-4 bg-secondary/5 border border-secondary/10 flex items-start gap-3">
            <span className="text-primary font-black text-xl mt-0.5">*</span>
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong className="text-secondary">ZIMNÉ OPATRENIA (15.11. – 15.3.):</strong>{" "}
              Na 1 m³ betónu príplatok <strong>{fmt(ts.winterSurcharge)}</strong> bez DPH.
            </p>
          </div>
        </div>
      </section>

      {/* ── CENNÍK SLUŽIEB ── */}
      <section className="concrete-navy py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display font-black text-4xl md:text-5xl text-white">
              CENNÍK <span className="text-primary">SLUŽIEB</span>
            </h2>
          </div>

          <div className="overflow-hidden border border-white/10 shadow-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary/10 border-b border-primary/20">
                  <th className="text-left px-5 py-4 text-xs font-bold text-primary uppercase tracking-widest">Názov</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-primary uppercase tracking-widest hidden sm:table-cell">Množstvo</th>
                  <th className="text-right px-5 py-4 text-xs font-bold text-primary uppercase tracking-widest">Cena bez DPH</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, i) => (
                  <tr key={s.id} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/5" : "bg-white/3"} hover:bg-primary/5 transition-colors`}>
                    <td className="px-5 py-4 text-white font-medium">{s.name}</td>
                    <td className="px-4 py-4 text-center text-white/50 hidden sm:table-cell">{s.unit}</td>
                    <td className="px-5 py-4 text-right font-bold text-primary">{fmt(s.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-white/5 border border-white/10 p-5">
            <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-3">Podmienky účtovania betónpumpy:</p>
            <ul className="space-y-1.5">
              {[
                "Čerpanie sa účtuje od príjazdu na stavbu do odjazdu zo stavby.",
                "U všetkých čerpadiel je potrebné zaistiť bezproblémový príjazd k miestu určenia, priestor na rozloženie stroja a pomocné sily.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-white/60">
                  <span className="text-primary font-black mt-0.5">—</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CENNÍK DOPRAVY ── */}
      <section className="concrete-light py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display font-black text-4xl md:text-5xl text-secondary">
              CENNÍK <span className="text-primary">DOPRAVY</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Zone table */}
            <div className="overflow-hidden border border-gray-200 shadow-sm">
              <div className="bg-secondary px-5 py-3 flex items-center justify-between">
                <span className="text-primary font-bold text-xs uppercase tracking-widest">Vzdialenosť</span>
                <span className="text-primary font-bold text-xs uppercase tracking-widest">Cena bez DPH / m³</span>
              </div>
              {/* Min fee */}
              <div className="bg-primary/10 border-b border-primary/20 flex items-center justify-between px-5 py-3">
                <span className="text-secondary font-bold text-sm">Minimálna doprava na jedno auto</span>
                <span className="text-secondary font-black text-sm">{fmt(ts.minimumFee)}</span>
              </div>
              <div className="bg-white">
                {zones.map((z, i) => (
                  <div key={z.id} className={`flex items-center justify-between px-5 py-2.5 border-b border-gray-50 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                    <span className="text-secondary text-sm">
                      od <strong>{z.fromKm}</strong> km do <strong>{z.toKm}</strong> km
                    </span>
                    <span className="text-secondary font-bold text-sm">{fmt(z.ratePerM3)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <div className="bg-secondary p-6 border border-white/10 shadow-sm">
                <p className="text-primary font-bold text-xs uppercase tracking-widest mb-4">Za dopravu sa účtuje:</p>
                <ul className="space-y-3">
                  {[
                    "Doprava na miesto určenia a späť.",
                    "Vykládka sa počíta od príchodu autodomiešavača na stavbu.",
                    `Prvých 30 min vykládky je zadarmo, nad 30 min sa účtuje každých začatých 15 min za ${fmt(ts.waitingRatePer15min)} bez DPH.`,
                    `Dopravu účtujeme ako minimálne doťaženie vozidla, t.j. ${ts.minimumLoadM3} m³, a to aj pri dodávke menšieho množstva.`,
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-white/70">
                      <span className="text-primary font-black mt-0.5 shrink-0">—</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-primary/10 border border-primary/30 p-5">
                <p className="text-secondary font-bold text-sm mb-2">
                  Zimné opatrenia (15.11. – 15.3.)
                </p>
                <p className="text-gray-700 text-sm">
                  Na 1 m³ betónu príplatok <strong>{fmt(ts.winterSurcharge)}</strong> bez DPH.
                </p>
              </div>

              <div className="bg-secondary/5 border border-secondary/10 p-5">
                <p className="text-secondary font-bold text-sm mb-2">Potrebujete cenovú ponuku?</p>
                <p className="text-gray-600 text-sm mb-4">
                  Pre aktuálne informácie o cenách a individuálnych zľavách nás neváhajte kontaktovať.
                </p>
                <a
                  href="tel:+421909205205"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-primary font-bold text-sm hover:bg-secondary/80 transition-all"
                >
                  <Phone className="w-4 h-4" />
                  +421 909 205 205
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
