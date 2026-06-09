import { Helmet } from "react-helmet-async";
import { Calculator, ArrowRight, Ruler, Info } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SITE_URL = "https://msbeton.sk";

const EXAMPLES = [
  { t: "Základová doska", f: "dĺžka × šírka × hrúbka", ex: "8 × 10 × 0,15 m", res: "12 m³" },
  { t: "Pásové základy", f: "dĺžka pásu × šírka × hĺbka", ex: "40 × 0,4 × 0,6 m", res: "9,6 m³" },
  { t: "Stĺp (kruhový)", f: "π × r² × výška", ex: "r 0,15 m, výška 3 m", res: "0,21 m³" },
  { t: "Pätka (hranatá)", f: "dĺžka × šírka × výška", ex: "0,8 × 0,8 × 0,8 m", res: "0,51 m³" },
  { t: "Schody (1 stupeň)", f: "(šírka × výška / 2) × dĺžka", ex: "0,3 × 0,17 / 2 × 1 m", res: "0,026 m³" },
];

// SEO guide stránka — keyword „koľko betónu na dosku / výpočet množstva betónu".
export default function KolkoBetonu() {
  const howto = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Ako vypočítať množstvo betónu (m³)",
    "description": "Návod na výpočet potrebného množstva betónu v kubíkoch pre základovú dosku, pásové základy, stĺpy a pätky.",
    "step": [
      { "@type": "HowToStep", "name": "Zmerajte rozmery", "text": "Odmerajte dĺžku, šírku a hrúbku (alebo hĺbku) konštrukcie v metroch." },
      { "@type": "HowToStep", "name": "Vynásobte rozmery", "text": "Objem betónu (m³) = dĺžka × šírka × hrúbka. Pri kruhovom stĺpe: π × polomer² × výška." },
      { "@type": "HowToStep", "name": "Pripočítajte rezervu", "text": "K výsledku pripočítajte 5–10 % rezervu na nerovnosti podkladu." },
      { "@type": "HowToStep", "name": "Vypočítajte cenu", "text": "Zadajte množstvo do online kalkulačky betónu a získajte cenu vrátane dopravy a čerpania." },
    ],
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Koľko betónu na základovú dosku?", "acceptedAnswer": { "@type": "Answer", "text": "Množstvo betónu na dosku = dĺžka × šírka × hrúbka. Napríklad doska 8 × 10 m s hrúbkou 0,15 m = 12 m³ betónu." } },
      { "@type": "Question", "name": "Ako vypočítam objem betónu v m³?", "acceptedAnswer": { "@type": "Answer", "text": "Objem v m³ = plocha × hrúbka, všetko v metroch. Odporúčame pripočítať 5–10 % rezervu na nerovnosti podkladu." } },
      { "@type": "Question", "name": "Koľko betónu na pásové základy?", "acceptedAnswer": { "@type": "Answer", "text": "Množstvo = dĺžka pásu × šírka × hĺbka. Napríklad 40 bm pásu so šírkou 0,4 m a hĺbkou 0,6 m = 9,6 m³." } },
    ],
  };
  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="Koľko betónu potrebujem? Výpočet množstva m³"
        description="Návod ako vypočítať množstvo betónu v m³ — základová doska, pásové základy, stĺp aj pätka. Vzorce, príklady a rýchla tabuľka. Cenu spočíta online kalkulačka betónu MS-BETON."
        canonical="/kolko-betonu"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(howto)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
        <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Domov", "item": SITE_URL },
          { "@type": "ListItem", "position": 2, "name": "Koľko betónu potrebujem", "item": `${SITE_URL}/kolko-betonu` },
        ] })}</script>
      </Helmet>
      <Navbar />

      {/* HERO */}
      <section className="concrete-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 via-secondary/45 to-secondary/5 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-14">
          <div className="flex items-center gap-3 mb-2 md:mb-4">
            <span className="block w-7 h-[2px] bg-primary" />
            <span className="text-primary font-bold text-[10px] tracking-[0.3em] uppercase">Návod</span>
          </div>
          <h1 className="font-display font-black text-2xl md:text-5xl text-white leading-tight tracking-tight max-w-2xl" style={{ fontFamily: "Montserrat, sans-serif" }}>
            KOĽKO BETÓNU <span className="text-primary">POTREBUJEM?</span>
          </h1>
          <p className="hidden sm:block text-white/60 text-base leading-relaxed max-w-xl mt-3">
            Jednoduchý návod ako vypočítať množstvo betónu v m³ — doska, základy, stĺp aj pätka. Vzorce, príklady a tabuľka. Cenu potom spočíta kalkulačka.
          </p>
          <a href="/kalkulacka-beton" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm">
            <Calculator className="w-4 h-4" /> Vypočítať cenu betónu
          </a>
        </div>
      </section>

      {/* OBSAH */}
      <section className="bg-white py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-black text-2xl text-secondary mb-3 flex items-center gap-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
            <Ruler className="w-6 h-6 text-primary" /> Základný vzorec
          </h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            Množstvo betónu sa počíta jednoducho — <strong>objem = plocha × hrúbka</strong>, všetko v metroch. Výsledok je v <strong>m³ (kubíkoch)</strong>.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 my-4 text-center">
            <span className="text-secondary font-black text-lg">m³ = dĺžka (m) × šírka (m) × hrúbka (m)</span>
          </div>

          <h2 className="font-display font-black text-2xl text-secondary mt-8 mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Príklady výpočtu
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-2.5 font-bold">Konštrukcia</th>
                  <th className="px-4 py-2.5 font-bold hidden sm:table-cell">Vzorec</th>
                  <th className="px-4 py-2.5 font-bold">Príklad</th>
                  <th className="px-4 py-2.5 font-bold text-right">Betón</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {EXAMPLES.map((e, i) => (
                  <tr key={i} className={i % 2 ? "bg-gray-50/50" : "bg-white"}>
                    <td className="px-4 py-3 font-bold text-secondary">{e.t}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{e.f}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.ex}</td>
                    <td className="px-4 py-3 text-right font-black text-primary whitespace-nowrap">{e.res}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2.5 bg-secondary/[0.04] border border-secondary/10 rounded-lg px-4 py-3 mt-5">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-gray-600 text-sm leading-relaxed">
              <strong>Tip:</strong> k vypočítanému množstvu pripočítajte <strong>5–10 % rezervu</strong> na nerovnosti podkladu a straty. Pri väčších odberoch (nad 7 m³) je výhodnejšia betónová pumpa.
            </p>
          </div>

          <h2 className="font-display font-black text-2xl text-secondary mt-8 mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Koľko to bude stáť?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Keď poznáte množstvo v m³, <strong>online kalkulačka betónu</strong> vám okamžite spočíta cenu vrátane dopravy, čerpania a doplnkov — pre pumpu, domiešavač aj vlastnú dopravu.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/kalkulacka-beton" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm">
              Kalkulačka betónu <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/cennik" className="inline-flex items-center gap-2 px-5 py-2.5 border border-secondary/20 text-secondary font-black text-xs uppercase tracking-widest hover:bg-secondary/5 transition-colors rounded-sm">
              Cenník betónu
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
