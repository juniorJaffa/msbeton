import { Helmet } from "react-helmet-async";

const SITE_URL = "https://msbeton.sk";
const SITE_NAME = "MS-BETON, spol. s r.o.";
const DEFAULT_DESCRIPTION =
  "Doprava a čerpanie betónu v Žiline a okolí. Betónová pumpa 28 m, domiešavač 9 m³. Rýchly rozvoz betónu, spoľahlivý servis. Kontaktujte nás pre cenovú ponuku.";
const OG_IMAGE = `${SITE_URL}/ms-beton-spol-sro-zilina-beton-pumpa-domiesavac.jpg`;

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  image?: string;
}

export function SEOHead({ title, description, canonical, noindex = false, image }: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Žilina – betón, pumpa, domiešavač`;
  const metaDesc = description ?? DEFAULT_DESCRIPTION;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL;
  const ogImage = image ? `${SITE_URL}${image}` : OG_IMAGE;

  return (
    <Helmet>
      <html lang="sk" />
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      <meta name="keywords" content="betón Žilina, betón pumpa, domiešavač, doprava betónu, MS-BETON, čerpanie betónu, betón cena" />
      <meta name="author" content={SITE_NAME} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="sk_SK" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={OG_IMAGE} />
    </Helmet>
  );
}

export function AdminPWAMeta() {
  return (
    <Helmet>
      <link rel="manifest" href="/admin-manifest.json" />
      <meta name="apple-mobile-web-app-title" content="MS-BETON Admin" />
    </Helmet>
  );
}

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "alternateName": "MS-BETON",
    "url": SITE_URL,
    "description": DEFAULT_DESCRIPTION,
    "inLanguage": "sk",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  const navSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Hlavná navigácia MS-BETON",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Kalkulačka betónu",
        "description": "Okamžitá kalkulácia ceny betónu vrátane dopravy a služieb – pumpa, domiešavač, vlastná doprava",
        "url": `${SITE_URL}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Cenník betónu",
        "description": "Aktuálny cenník betónu podľa triedy: C16/20, C20/25, C25/30, C30/37, C35/45 a ďalšie",
        "url": `${SITE_URL}/cennik`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Vozový park",
        "description": "Betónová pumpa s dosahom 28 m a domiešavače s kapacitou 9 m³",
        "url": `${SITE_URL}/vozovy-park`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": "Prihlásenie klienta",
        "description": "Prihlásenie pre firemných klientov – osobné ceny a zľavy automaticky v kalkulačke",
        "url": `${SITE_URL}/prihlasenie`
      },
      {
        "@type": "ListItem",
        "position": 5,
        "name": "Objednávka betónu",
        "description": "Záväzná objednávka betónu priamo z kalkulačky – rýchla a bez telefonátu",
        "url": `${SITE_URL}/#objednavka`
      }
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <script type="application/ld+json">{JSON.stringify(navSchema)}</script>
    </Helmet>
  );
}

// Schéma pre dedikovanú stránku kalkulačky betónu — WebApplication + FAQ (SEO #1 priorita)
export function CalculatorSchema() {
  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Kalkulačka betónu MS-BETON",
    "url": `${SITE_URL}/kalkulacka-beton`,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires JavaScript",
    "inLanguage": "sk",
    "description": "Online kalkulačka betónu zadarmo – presný výpočet množstva m³ aj ceny pre pumpu, mixér a vlastnú dopravu. Flexibilné čerpanie, doplnky (hadice, čakačky), klientske zľavy na betón, služby aj dopravu. Žilina a okolie.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
    "featureList": [
      "Presný výpočet množstva betónu v m³ (doska, základy, stĺp)",
      "Plánovanie ceny vrátane doplnkov – prídavné hadice, čakačky, umývanie, doťaženie",
      "Flexibilný výpočet čerpania betónu podľa hodín a minút",
      "Kategórie a typy betónu (C16/20 – C35/45, drvené aj riečne kamenivo)",
      "Vzdialenosť na mape alebo výpočet km",
      "Presný výpočet pre pumpu 28 m, domiešavač 9 m³ aj vlastnú dopravu",
      "Klientske zľavové ceny na betón, služby aj dopravu",
      "Objednanie cez PDF, SMS alebo záväzná objednávka v systéme"
    ],
    "provider": { "@type": "Organization", "name": SITE_NAME, "url": SITE_URL }
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Ako vypočítam cenu betónu?", "acceptedAnswer": { "@type": "Answer", "text": "Zadajte triedu betónu, množstvo v m³ a typ dopravy (pumpa, domiešavač alebo vlastná doprava). Kalkulačka okamžite vypočíta cenu betónu vrátane dopravy a čerpania, prehľadne a s cenou vrátane DPH." } },
      { "@type": "Question", "name": "Koľko stojí doprava betónu?", "acceptedAnswer": { "@type": "Answer", "text": "Cena dopravy závisí od vzdialenosti a typu vozidla. Kalkulačka počíta presnú cenu pre betónovú pumpu s dosahom 28 m aj domiešavač 9 m³ v Žiline a okolí do 50 km." } },
      { "@type": "Question", "name": "Je kalkulačka betónu zadarmo?", "acceptedAnswer": { "@type": "Answer", "text": "Áno, online kalkulačka betónu MS-BETON je úplne zadarmo a bez registrácie. Firemní klienti po prihlásení vidia svoje individuálne zľavy automaticky." } }
    ]
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Domov", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "Kalkulačka betónu", "item": `${SITE_URL}/kalkulacka-beton` }
    ]
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(app)}</script>
      <script type="application/ld+json">{JSON.stringify(faq)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
    </Helmet>
  );
}

export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ConcreteContractor"],
    "name": "MS-BETON",
    "alternateName": ["MS BETON", "MS-BETON s.r.o.", "MS-BETON Žilina"],
    "description": DEFAULT_DESCRIPTION,
    "url": SITE_URL,
    "telephone": "+421909205205",
    "email": "info@msbeton.sk",
    "image": OG_IMAGE,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Kamenná 3",
      "postalCode": "010 01",
      "addressLocality": "Žilina",
      "addressRegion": "Žilinský kraj",
      "addressCountry": "SK"
    },
    "location": {
      "@type": "PostalAddress",
      "streetAddress": "Turie 468",
      "postalCode": "013 12",
      "addressLocality": "Turie",
      "addressRegion": "Žilinský kraj",
      "addressCountry": "SK"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 49.2232,
      "longitude": 18.7394
    },
    "areaServed": [
      { "@type": "City", "name": "Žilina" },
      { "@type": "City", "name": "Bytča" },
      { "@type": "City", "name": "Kysucké Nové Mesto" },
      { "@type": "City", "name": "Rajec" },
      { "@type": "GeoCircle", "geoMidpoint": { "@type": "GeoCoordinates", "latitude": 49.2232, "longitude": 18.7394 }, "geoRadius": "50000" }
    ],
    "foundingDate": "2020",
    "legalName": "MS-BETON, spol. s r.o.",
    "vatID": "SK2122074603",
    "priceRange": "€€",
    "currenciesAccepted": "EUR",
    "paymentAccepted": "Faktúra, Hotovosť",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "07:00",
        "closes": "17:00"
      }
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+421944069305",
      "contactType": "customer service",
      "areaServed": "SK",
      "availableLanguage": "Slovak"
    },
    "sameAs": [],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Služby MS-BETON",
      "itemListElement": [
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Betón pumpa 28 m", "description": "Čerpanie betónu betónovou pumpou s dosahom 28 m" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Domiešavač betónu 9 m³", "description": "Doprava betónu domiešavačom s kapacitou 9 m³" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Doprava betónu Žilina a okolie", "description": "Čerstvý betón C16/20 až C35/45 s dopravou v okruhu 50 km od Žiliny" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Dodávka betónu rôznych tried", "description": "Rozvoz čerstvého betónu rôznych tried podľa projektu a požiadaviek zákazníka" } }
      ]
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
