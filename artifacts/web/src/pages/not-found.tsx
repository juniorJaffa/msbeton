import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <SEOHead title="Stránka nenájdená (404) – MS-BETON" noindex />
      <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center border-t-4 border-primary">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <h1 className="text-4xl font-display font-bold text-secondary mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Stránka, ktorú hľadáte, neexistuje alebo bola presunutá.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors w-full shadow-lg shadow-primary/20"
        >
          Návrat na domovskú stránku
        </Link>
      </div>
    </div>
  );
}
