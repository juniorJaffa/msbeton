import { HardHat, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-secondary text-white/80 pt-16 pb-8 border-t-[8px] border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
                <span className="font-display font-bold text-white text-2xl">M</span>
              </div>
              <span className="font-display font-bold text-3xl tracking-wide text-white">
                MSBETON
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed">
              Váš spoľahlivý partner pre výrobu, dovoz a čerpanie betónových zmesí a predaj sypkých materiálov na Slovensku.
            </p>
            <div className="flex gap-4 pt-2">
              {/* Social placeholders */}
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                <HardHat className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold text-white mb-6">Rýchle Odkazy</h3>
            <ul className="space-y-3">
              <li><a href="#home" className="hover:text-primary transition-colors">Domov</a></li>
              <li><a href="#about" className="hover:text-primary transition-colors">O Spoločnosti</a></li>
              <li><a href="#products" className="hover:text-primary transition-colors">Naše Produkty</a></li>
              <li><a href="#calculator" className="hover:text-primary transition-colors">Kalkulačka Betónu</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-bold text-white mb-6">Kontakt</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Priemyselná 1234/5<br />821 09 Bratislava<br />Slovensko</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>+421 900 111 222</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>info@msbeton.sk</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-white/50">
          <p>© {new Date().getFullYear()} MSBETON s.r.o. Všetky práva vyhradené.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Ochrana osobných údajov</a>
            <a href="#" className="hover:text-white transition-colors">Obchodné podmienky</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
