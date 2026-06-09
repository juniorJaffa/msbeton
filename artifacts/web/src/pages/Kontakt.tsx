import { Helmet } from "react-helmet-async";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";

const SITE_URL = "https://msbeton.sk";

// Samostatná SEO stránka Kontakt (nahrádza /#contact hash anchor pre indexovanie).
export default function Kontakt() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Domov", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "Kontakt", "item": `${SITE_URL}/kontakt` }
    ]
  };
  return (
    <div className="min-h-screen bg-secondary">
      <SEOHead
        title="Kontakt – doprava betónu Žilina"
        description="Kontaktujte MS-BETON, spol. s r.o. – doprava a čerpanie betónu Žilina. Telefón +421 909 205 205, dispečing, cenová ponuka na rozvoz betónu, pumpu a domiešavač. Prevádzka Kamenná 3, Žilina."
        canonical="/kontakt"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
      </Helmet>
      <Navbar />

      <section className="concrete-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 via-secondary/45 to-secondary/5 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14">
          <div className="flex items-center gap-3 mb-4">
            <span className="block w-7 h-[2px] bg-primary" />
            <span className="text-primary font-bold text-[10px] tracking-[0.3em] uppercase">Sme tu pre vás</span>
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl text-white leading-tight tracking-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>
            KONTAKT
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-xl mt-3">
            MS-BETON Žilina — doprava a čerpanie betónu, dispečing a cenové ponuky. Zavolajte alebo napíšte, ozveme sa obratom.
          </p>
        </div>
      </section>

      <ContactSection />
      <Footer />
    </div>
  );
}
