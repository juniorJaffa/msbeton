import { lazy, Suspense } from "react";
import { Calculator, Truck, MapPin, Layers, FileText, ArrowRight } from "lucide-react";
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
        description="Online kalkulačka betónu zadarmo — presný výpočet množstva m³ aj ceny pre pumpu, mixér a vlastnú dopravu. Flexibilné čerpanie, doplnky (hadice, čakačky), klientske zľavy na betón, služby aj dopravu. Žilina a okolie."
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
              Presný výpočet <strong className="text-white/80">množstva m³ aj ceny</strong> betónu pre <strong className="text-white/80">pumpu, domiešavač aj vlastnú dopravu</strong>. Naplánujte si cenu vrátane <strong className="text-white/80">doplnkov — prídavné hadice, čakačky</strong> a flexibilné čerpanie podľa hodín a minút. Prihlásení klienti vidia <strong className="text-white/80">zľavové ceny na betón, služby aj dopravu</strong>. Objednávku vytvoríte záväzne v systéme, ako SMS s objednávkou alebo celkové zhrnutie v PDF.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {[
                { icon: Layers, t: "Kategórie a typy betónu C16/20 – C35/45" },
                { icon: MapPin, t: "Vzdialenosť na mape / výpočet km" },
                { icon: Truck, t: "Pumpa 28 m · domiešavač · vlastná doprava" },
                { icon: FileText, t: "Objednávka cez PDF / SMS / systém" },
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
            Sme jediná betonáreň v regióne Žilina, ktorá ponúka <strong>plnohodnotnú online kalkulačku betónu</strong> — presný výpočet ceny betónu aj dopravy bez telefonátu, kedykoľvek. Vzdialenosť na stavbu si zvolíte priamo <strong>na mape alebo zadáte v km</strong>, vyberiete kategóriu a typ betónu, a kalkulačka okamžite spočíta betón, dopravu, čerpanie aj doťaženie — transparentne a s cenou vrátane DPH.
          </p>
          <h3 className="font-bold text-lg text-secondary mt-6 mb-2">Čo kalkulačka počíta</h3>
          <ul className="text-gray-600 leading-relaxed space-y-1.5 list-disc pl-5 mb-4">
            <li><strong>Presný výpočet množstva betónu v m³</strong> — pre základovú dosku, pásové základy, stĺpy aj pätky</li>
            <li><strong>Plánovanie ceny vrátane doplnkov</strong> — prídavné hadice, čakačky, umývanie a doťaženie</li>
            <li><strong>Flexibilný výpočet čerpania betónu</strong> — presne podľa hodín a minút na stavbe</li>
            <li><strong>Kategórie a typy betónu</strong> — drvené aj riečne kamenivo, triedy C16/20 až C35/45</li>
            <li><strong>Vzdialenosť na mape alebo výpočet km</strong> — presná cena dopravy podľa lokality</li>
            <li><strong>Presný výpočet pre pumpu, mixér aj vlastnú dopravu</strong> — pumpa 28 m, domiešavač 9 m³</li>
            <li><strong>Klientske zľavové ceny</strong> — individuálne zľavy na betón, služby aj dopravu po prihlásení</li>
            <li><strong>Objednanie</strong> — záväzne priamo v systéme, ako SMS s objednávkou alebo celkové zhrnutie objednávky v PDF</li>
            <li><strong>Cena vrátane DPH</strong></li>
          </ul>
          <h3 className="font-bold text-lg text-secondary mt-6 mb-2">Ako vypočítať cenu betónu</h3>
          <p className="text-gray-600 leading-relaxed mb-4">
            Vyberte triedu betónu, zadajte množstvo v m³ a zvoľte typ dopravy. Kalkulačka okamžite zobrazí kompletný rozpis ceny. Z výsledku viete rovno <strong>objednať betón online</strong> — rýchlo, bez čakania na telefóne.
          </p>
          <h2 className="font-display font-black text-2xl text-secondary mt-10 mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Ako vypočítať množstvo betónu (m³)
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Pred výpočtom ceny si určte potrebné množstvo betónu v kubíkoch (m³). Objem = plocha × hrúbka. Tu sú najčastejšie príklady zo stavby:
          </p>
          <div className="space-y-4 mb-4">
            <div className="border-l-4 border-primary bg-amber-50/50 pl-4 py-3 rounded-r">
              <h3 className="font-bold text-secondary mb-1">Základová doska</h3>
              <p className="text-gray-600 text-sm leading-relaxed"><strong>m³ = dĺžka × šírka × hrúbka.</strong> Príklad: doska 8 × 10 m, hrúbka 0,15 m → 8 × 10 × 0,15 = <strong>12 m³ betónu</strong>.</p>
            </div>
            <div className="border-l-4 border-primary bg-amber-50/50 pl-4 py-3 rounded-r">
              <h3 className="font-bold text-secondary mb-1">Pásové základy</h3>
              <p className="text-gray-600 text-sm leading-relaxed"><strong>m³ = dĺžka pásu × šírka × hĺbka.</strong> Príklad: pás 40 bm, šírka 0,4 m, hĺbka 0,6 m → 40 × 0,4 × 0,6 = <strong>9,6 m³</strong>.</p>
            </div>
            <div className="border-l-4 border-primary bg-amber-50/50 pl-4 py-3 rounded-r">
              <h3 className="font-bold text-secondary mb-1">Stĺp / pätka</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Stĺp: <strong>m³ = π × r² × výška</strong>. Hranatá pätka: <strong>dĺžka × šírka × výška</strong>. Príklad pätka 0,8 × 0,8 × 0,8 m → <strong>0,51 m³</strong>.</p>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            Keď poznáte m³, zadajte hodnotu do kalkulačky vyššie a vyberte triedu betónu a typ dopravy — okamžite uvidíte <strong>cenu betónu vrátane dopravy a čerpania</strong>. Odporúčame pripočítať ~5–10 % rezervu na nerovnosti podkladu.

          </p>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Tip: pri väčších odberoch (nad 7 m³) je výhodnejšia <strong>betónová pumpa</strong> — ušetrí čas aj ručnú prácu. Kalkulačka porovná cenu pumpy aj domiešavača.
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
