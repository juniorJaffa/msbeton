import { Helmet } from "react-helmet-async";

const SITE_URL = "https://msbeton.sk";
const SITE_NAME = "MS-BETON s.r.o.";
const DEFAULT_DESCRIPTION =
  "Výroba a doprava betónu v Žiline a okolí. Betón pumpa 28 m, domiešavač 9 m³. Rýchla doprava, spoľahlivý servis. Kontaktujte nás pre cenovú ponuku.";
const OG_IMAGE = `${SITE_URL}/opengraph.jpg`;

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

export function SEOHead({ title, description, canonical, noindex = false }: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Žilina – betón, pumpa, domiešavač`;
  const metaDesc = description ?? DEFAULT_DESCRIPTION;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL;

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
      <meta property="og:image" content={OG_IMAGE} />
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

export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": SITE_NAME,
    "description": DEFAULT_DESCRIPTION,
    "url": SITE_URL,
    "telephone": "+421909205205",
    "email": "info@msbeton.sk",
    "image": OG_IMAGE,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Žilina",
      "addressRegion": "Žilinský kraj",
      "addressCountry": "SK"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 49.2232,
      "longitude": 18.7394
    },
    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": 49.2232,
        "longitude": 18.7394
      },
      "geoRadius": "50000"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "07:00",
        "closes": "17:00"
      }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Služby MS-BETON",
      "itemListElement": [
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Betón pumpa 28 m" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Domiešavač betónu 9 m³" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Doprava betónu Žilina a okolie" } }
      ]
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
