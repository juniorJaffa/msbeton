import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function OchranaOsobnychUdajov() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <SEOHead
        title="Ochrana osobných údajov | MS-BETON"
        description="Zásady ochrany osobných údajov spoločnosti MS-BETON, spol. s r.o."
      />
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-black text-secondary mb-2">Ochrana osobných údajov</h1>
        <p className="text-sm text-gray-400 mb-8">Platné od: 25. 5. 2025</p>

        <section className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">1. Prevádzkovateľ</h2>
            <p>
              <strong>MS-BETON, spol. s r.o.</strong><br />
              Turie 468, 013 12 Turie, Slovenská republika<br />
              IČO: 55747591 | DIČ: 2122074603 | IČ DPH: SK2122074603<br />
              Kontakt: <a href="mailto:peter@msbeton.sk" className="text-primary underline">peter@msbeton.sk</a> | 0944 069 305
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">2. Aké údaje spracúvame</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Meno, telefónne číslo, e-mail — pri záväznej objednávke</li>
              <li>Adresa dodania (zadaná manuálne alebo cez mapu)</li>
              <li>Údaje o objednávke (typ betónu, množstvo, cena)</li>
              <li>Prihlasovacie údaje klientov (hashované heslá, nie uložené v čistom texte)</li>
              <li>Anonymizované štatistiky návštevnosti (Google Analytics 4 — len so súhlasom)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">3. Účel a právny základ spracúvania</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Plnenie zmluvy (čl. 6 ods. 1 písm. b GDPR)</strong> — vybavenie objednávky betónu</li>
              <li><strong>Oprávnený záujem (čl. 6 ods. 1 písm. f GDPR)</strong> — ochrana pred podvodmi, bezpečnosť systému</li>
              <li><strong>Súhlas (čl. 6 ods. 1 písm. a GDPR)</strong> — analytické cookies (GA4), len ak ste udelili súhlas</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">4. Doba uchovávania</h2>
            <p>Objednávky a kontaktné údaje uchovávame po dobu 5 rokov (daňová povinnosť). Analytické dáta v GA4 sú uchované 14 mesiacov.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">5. Príjemcovia údajov</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Google LLC — analytika (GA4), len so súhlasom; Google Search Console</li>
              <li>Cloudflare Inc. — ochrana pred botmi (Turnstile), bez uloženia osobných údajov</li>
              <li>Poskytovateľ hostingu — VPS server v EÚ</li>
            </ul>
            <p className="mt-2">Údaje nepredávame tretím stranám na marketingové účely.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">6. Vaše práva</h2>
            <p>Máte právo na prístup, opravu, vymazanie, obmedzenie spracúvania a prenosnosť údajov. Máte právo podať sťažnosť na <strong>Úrad na ochranu osobných údajov SR</strong> (dataprotection.gov.sk).</p>
            <p className="mt-2">Žiadosti zasielajte na: <a href="mailto:peter@msbeton.sk" className="text-primary underline">peter@msbeton.sk</a></p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">7. Cookies</h2>
            <p>Funkčné cookies (prihlásenie, nastavenia) sú nevyhnutné pre chod webu — nevyžadujú súhlas. Analytické cookies (GA4) aktivujeme až po Vašom súhlase v banneri. Súhlas môžete kedykoľvek odvolať vymazaním údajov prehliadača.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
