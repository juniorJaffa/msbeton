import { lazy, Suspense } from "react";
import { Calculator, Truck, Banknote, Zap, ArrowRight } from "lucide-react";
import { SEOHead, CalculatorSchema } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const ConcreteCalculator = lazy(() => import("@/components/Calculator").then(m => ({ default: m.ConcreteCalculator })));

// Dedikovaná SEO landing stránka kalkulačky betónu — #1 priorita pre Google.
// Jedinečná online kalkulačka betónu (konkurencia RBR/ZAPA/CEMMAC takú nemá).
export default function KalkulackaBeton() {
  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="Kalkulačka betónu – okamžitý výpočet ceny online"
        description="Jedinečná online kalkulačka betónu. Vypočítajte cenu betónu vrátane dopravy, betónovej pumpy a čerpania – pumpa, domiešavač aj vlastná doprava. Žilina a okolie, zadarmo a bez registrácie."
        canonical="/kalkulacka-beton"
        image="/images/vozovy-park/ms-beton-man-pumpa-logo-cesta-lesny-teren-zilina.jpg"
      />
      <CalculatorSchema />
      <Navbar />

      {/* ── HERO ── */}
      <section className="concrete-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 via-secondary/45 to-secondary/5 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="block w-7 h-[2px] bg-primary" />
              <span className="text-primary font-bold text-[10px] tracking-[0.3em] uppercase">Online nástroj zadarmo</span>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl text-white leading-tight tracking-tight mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
              KALKULAČKA <span className="text-primary">BETÓNU</span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl mb-6">
              Okamžitý výpočet ceny betónu vrátane dopravy, pumpy a čerpania. Zadajte triedu betónu, množstvo a typ dopravy — cenu uvidíte ihneď, s DPH aj bez DPH.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {[
                { icon: Calculator, t: "Cena betónu C16/20 – C35/45" },
                { icon: Truck, t: "Doprava pumpa 28 m / domiešavač" },
                { icon: Banknote, t: "S DPH aj bez DPH" },
                { icon: Zap, t: "Okamžitý výsledok" },
              ].map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/8 border border-white/10 rounded-sm text-white/70 text-xs font-semibold">
                  <f.icon className="w-3.5 h-3.5 text-primary" /> {f.t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── KALKULAČKA ── */}
      <section id="calculator" className="py-10 concrete-light relative overflow-hidden" style={{ scrollMarginTop: "96px" }}>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-20 text-secondary/40">Načítavam kalkulačku…</div>}>
            <ConcreteCalculator />
          </Suspense>
        </div>
      </section>

      {/* ── SEO obsah ── */}
      <section className="bg-white py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose-sm">
          <h2 className="font-display font-black text-2xl text-secondary mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Prečo kalkulačka betónu MS-BETON?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Sme jediná betonáreň v regióne Žilina, ktorá ponúka <strong>plnohodnotnú online kalkulačku betónu</strong> — vypočítate si presnú cenu betónu aj dopravy bez telefonátu, kedykoľvek a zadarmo. Zákazník vidí cenu betónu, dopravy domiešavačom či betónovou pumpou, čerpania aj doplnkových služieb okamžite a transparentne.
          </p>
          <h3 className="font-bold text-lg text-secondary mt-6 mb-2">Čo kalkulačka počíta</h3>
          <ul className="text-gray-600 leading-relaxed space-y-1.5 list-disc pl-5 mb-4">
            <li><strong>Cena betónu</strong> podľa triedy pevnosti (C16/20, C20/25, C25/30, C30/37, C35/45) a kameniva</li>
            <li><strong>Doprava betónu</strong> — betónová pumpa s dosahom 28 m, domiešavač 9 m³ alebo vlastná doprava</li>
            <li><strong>Čerpanie betónu</strong>, doťaženie, hadice, umývanie a čakačky</li>
            <li><strong>Cena s DPH aj bez DPH</strong>, individuálne zľavy pre firemných klientov po prihlásení</li>
          </ul>
          <h3 className="font-bold text-lg text-secondary mt-6 mb-2">Ako vypočítať cenu betónu</h3>
          <p className="text-gray-600 leading-relaxed mb-4">
            Vyberte triedu betónu, zadajte množstvo v m³ a zvoľte typ dopravy. Kalkulačka okamžite zobrazí kompletný rozpis ceny. Z výsledku viete rovno <strong>objednať betón online</strong> — rýchlo, bez čakania na telefóne.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/cennik" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm">
              Cenník betónu <ArrowRight className="w-4 h-4" />
            </a>
            <a href="tel:+421909205205" className="inline-flex items-center gap-2 px-5 py-2.5 border border-secondary/20 text-secondary font-black text-xs uppercase tracking-widest hover:bg-secondary/5 transition-colors rounded-sm">
              +421 909 205 205
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
