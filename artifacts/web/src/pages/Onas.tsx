import { Helmet } from "react-helmet-async";
import { CheckCircle2, ArrowRight, Truck, ShieldCheck, Hammer, Calculator } from "lucide-react";
import { SEOHead, LocalBusinessSchema } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SITE_URL = "https://msbeton.sk";

const USP = [
  "Moderný dispečing a riadenie dopravy",
  "Vlastná flotila domiešavačov a betónových púmp",
  "Certifikovaný betón od overených výrobcov",
  "Flexibilita a presnosť dodávok na čas",
];

const STATS = [
  { icon: Truck, count: "10K+", label: "Doručených zásielok" },
  { icon: Calculator, count: "30K+", label: "Kubíkov betónu" },
  { icon: ShieldCheck, count: "100%", label: "Certifikovaná kvalita" },
  { icon: Hammer, count: "2K+", label: "Spokojných klientov" },
];

// Samostatná SEO stránka „O nás" — keyword „doprava betónu Žilina".
export default function Onas() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Domov", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "O nás", "item": `${SITE_URL}/o-nas` },
    ],
  };
  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="O nás – doprava a čerpanie betónu Žilina"
        description="MS-BETON, spol. s r.o. — spoľahlivý rozvoz betónu a čerpanie betónovou pumpou v Žiline a okolí. Vlastná flotila domiešavačov a púmp, rýchla doprava betónu priamo na stavbu, 15+ rokov skúseností."
        canonical="/o-nas"
        image="/images/vozovy-park/ms-beton-pumpa-man-tga-reprezentativna.jpg"
      />
      <LocalBusinessSchema />
      <Helmet><script type="application/ld+json">{JSON.stringify(breadcrumb)}</script></Helmet>
      <Navbar />

      {/* HERO */}
      <section className="concrete-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 via-secondary/45 to-secondary/5 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14">
          <div className="flex items-center gap-3 mb-4">
            <span className="block w-7 h-[2px] bg-primary" />
            <span className="text-primary font-bold text-[10px] tracking-[0.3em] uppercase">O spoločnosti</span>
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl text-white leading-tight tracking-tight max-w-2xl" style={{ fontFamily: "Montserrat, sans-serif" }}>
            DOPRAVA BETÓNU <span className="text-primary">ŽILINA</span> — MS-BETON
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-2xl mt-3">
            Patríme medzi popredných <strong className="text-white/80">dopravcov betónu</strong> v Žiline a okolí. Vlastná flotila domiešavačov a betónových púmp — rozvoz a čerpanie betónu flexibilne a presne na čas, priamo na vašu stavbu.
          </p>
        </div>
      </section>

      {/* OBSAH */}
      <section className="bg-white py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-black text-2xl text-secondary mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Kvalita, na ktorú sa môžete spoľahnúť
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Spoločnosť <strong>MS-BETON, spol. s r.o.</strong> patrí medzi popredných poskytovateľov riešení pre dovoz betónu v Žiline. Vďaka modernému vozovému parku — od betónových mixérov až po pumpy — zvládame projekty všetkých veľkostí. Zabezpečujeme kvalitný betón presne tam, kde a kedy ho potrebujete.
          </p>
          <p className="text-gray-600 leading-relaxed mb-6">
            S <strong>15+ rokmi skúseností</strong> dodávame betón pre rodinné domy, firmy aj veľké stavby v Žiline, Bytči, Kysuckom Novom Meste, Rajci a okolí do 50 km.
          </p>

          <ul className="space-y-2.5 mb-8">
            {USP.map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 shrink-0" />
                <span className="text-gray-700 font-medium">{item}</span>
              </li>
            ))}
          </ul>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 border border-gray-100 rounded-lg overflow-hidden mb-8">
            {STATS.map((s, i) => (
              <div key={i} className="bg-white px-3 py-4 text-center">
                <s.icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <div className="text-2xl font-black text-secondary leading-none">{s.count}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/kalkulacka-beton" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm">
              Kalkulačka betónu <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/vozovy-park" className="inline-flex items-center gap-2 px-5 py-2.5 border border-secondary/20 text-secondary font-black text-xs uppercase tracking-widest hover:bg-secondary/5 transition-colors rounded-sm">
              Vozový park
            </a>
            <a href="/kontakt" className="inline-flex items-center gap-2 px-5 py-2.5 border border-secondary/20 text-secondary font-black text-xs uppercase tracking-widest hover:bg-secondary/5 transition-colors rounded-sm">
              Kontakt
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
