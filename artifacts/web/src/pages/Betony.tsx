import { Helmet } from "react-helmet-async";
import { ArrowRight, Calculator, Mountain, Waves } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SITE_URL = "https://msbeton.sk";

const TRIEDY = [
  { t: "C16/20", use: "Podkladové betóny, výplne, menej namáhané konštrukcie, vyrovnávacie vrstvy." },
  { t: "C20/25", use: "Základy a základové pásy rodinných domov, podkladové dosky." },
  { t: "C25/30", use: "Základové dosky, stropy, schody, vence — najčastejšia trieda pre bežné stavby." },
  { t: "C30/37", use: "Viac namáhané konštrukcie — stĺpy, prievlaky, vodostavebný betón." },
  { t: "C35/45", use: "Vysoko namáhané a priemyselné konštrukcie, podlahy, špeciálne prvky." },
];

// SEO stránka — keyword „triedy betónu / druhy betónu / betón C25/30 Žilina".
export default function Betony() {
  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="Triedy a druhy betónu — C16/20 až C35/45"
        description="Prehľad tried betónu (C16/20, C20/25, C25/30, C30/37, C35/45) a na čo sa hodia. Drvené aj riečne kamenivo. Doprava a čerpanie betónu Žilina — cenu spočíta online kalkulačka."
        canonical="/betony"
        image="/images/vozovy-park/ms-beton-domiesavac-beton-krajina.jpg"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Domov", "item": SITE_URL },
          { "@type": "ListItem", "position": 2, "name": "Druhy betónu", "item": `${SITE_URL}/betony` },
        ] })}</script>
      </Helmet>
      <Navbar />

      {/* HERO */}
      <section className="concrete-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 via-secondary/45 to-secondary/5 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-14">
          <div className="flex items-center gap-3 mb-2 md:mb-4">
            <span className="block w-7 h-[2px] bg-primary" />
            <span className="text-primary font-bold text-[10px] tracking-[0.3em] uppercase">Druhy betónu</span>
          </div>
          <h1 className="font-display font-black text-2xl md:text-5xl text-white leading-tight tracking-tight max-w-2xl" style={{ fontFamily: "Montserrat, sans-serif" }}>
            TRIEDY A DRUHY <span className="text-primary">BETÓNU</span>
          </h1>
          <p className="hidden sm:block text-white/60 text-base leading-relaxed max-w-xl mt-3">
            Aký betón na základy, dosku či stĺpy? Prehľad tried C16/20 až C35/45 a na čo sa hodia — drvené aj riečne kamenivo.
          </p>
          <a href="/kalkulacka-beton" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm">
            <Calculator className="w-4 h-4" /> Vypočítať cenu betónu
          </a>
        </div>
      </section>

      {/* OBSAH */}
      <section className="bg-white py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-black text-2xl text-secondary mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Triedy pevnosti betónu
          </h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Trieda betónu udáva jeho pevnosť v tlaku — vyššie číslo znamená pevnejší betón. Pre bežné stavby (základy, dosky, stropy) sa najčastejšie používa <strong>C25/30</strong>.
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-2.5 font-bold">Trieda</th>
                  <th className="px-4 py-2.5 font-bold">Na čo sa hodí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TRIEDY.map((c, i) => (
                  <tr key={i} className={i % 2 ? "bg-gray-50/50" : "bg-white"}>
                    <td className="px-4 py-3 font-black text-primary whitespace-nowrap align-top">{c.t}</td>
                    <td className="px-4 py-3 text-gray-600">{c.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="font-display font-black text-2xl text-secondary mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Drvené vs. riečne kamenivo
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 font-bold text-secondary"><Mountain className="w-5 h-5 text-primary" /> Drvené (lomové)</div>
              <p className="text-gray-600 text-sm leading-relaxed">Ostrohranné zrná z drveného kameňa — vyššia pevnosť a súdržnosť. Vhodné pre namáhané konštrukcie.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 font-bold text-secondary"><Waves className="w-5 h-5 text-primary" /> Riečne (okrúhle)</div>
              <p className="text-gray-600 text-sm leading-relaxed">Hladké okrúhle zrná — lepšia spracovateľnosť a čerpateľnosť. Vhodné pre štandardné betonáže.</p>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">
            Nie ste si istí akú triedu zvoliť? Zavolajte nám — poradíme. Cenu betónu vrátane dopravy a čerpania spočíta <strong>online kalkulačka</strong>.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/kalkulacka-beton" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm">
              Kalkulačka betónu <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/cennik" className="inline-flex items-center gap-2 px-5 py-2.5 border border-secondary/20 text-secondary font-black text-xs uppercase tracking-widest hover:bg-secondary/5 transition-colors rounded-sm">
              Cenník betónu
            </a>
            <a href="/kolko-betonu" className="inline-flex items-center gap-2 px-5 py-2.5 border border-secondary/20 text-secondary font-black text-xs uppercase tracking-widest hover:bg-secondary/5 transition-colors rounded-sm">
              Koľko betónu?
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
