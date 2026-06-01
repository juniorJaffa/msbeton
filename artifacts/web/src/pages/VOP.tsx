import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function VOP() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <SEOHead
        title="Všeobecné obchodné podmienky | MS-BETON"
        description="Všeobecné obchodné podmienky spoločnosti MS-BETON, spol. s r.o."
        canonical="/vop"
      />
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-black text-secondary mb-2">Všeobecné obchodné podmienky</h1>
        <p className="text-sm text-gray-400 mb-8">Platné od: 25. 5. 2025</p>

        <section className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">1. Predávajúci</h2>
            <p>
              <strong>MS-BETON, spol. s r.o.</strong><br />
              Turie 468, 013 12 Turie, Slovenská republika<br />
              IČO: 55747591 | DIČ: 2122074603 | IČ DPH: SK2122074603<br />
              Kontakt: <a href="mailto:peter@msbeton.sk" className="text-primary underline">peter@msbeton.sk</a> | 0944 069 305
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">2. Objednávka a uzavretie zmluvy</h2>
            <p>Záväzná objednávka sa považuje za uzavretú doručením potvrdenia zo strany MS-BETON (telefonicky alebo e-mailom). Kalkulácia na webe je orientačná a nezaväzuje predávajúceho.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">3. Ceny a platba</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ceny sú uvádzané bez DPH aj s DPH (20 %) podľa výberu</li>
              <li>Platba faktúrou so splatnosťou alebo v hotovosti pri dodávke</li>
              <li>Individuálne zľavy sa uplatňujú podľa dohody a prihlásenia klienta</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">4. Dodanie</h2>
            <p>Termín a čas dodávky je dohodnutý individuálne. MS-BETON nezodpovedá za meškanie spôsobené dopravnými komplikáciami, počasím alebo stavom prístupovej cesty.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">5. Reklamácie</h2>
            <p>Reklamácie kvality betónu je nutné uplatniť bezodkladne pri dodávke, najneskôr do 24 hodín. Neskoršie reklamácie nie je možné uznať z dôvodu vlastností čerstvého betónu.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">6. Ochrana osobných údajov</h2>
            <p>Spracúvanie osobných údajov sa riadi samostatným dokumentom <a href="/ochrana-osobnych-udajov" className="text-primary underline">Ochrana osobných údajov</a>.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">7. Rozhodné právo</h2>
            <p>Tieto podmienky sa riadia právnym poriadkom Slovenskej republiky. Spory budú riešené príslušným súdom v SR.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
