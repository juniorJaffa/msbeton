import { Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-secondary text-white/80 pt-16 pb-8 border-t-[4px] border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center select-none">
              <span className="font-display font-black text-3xl tracking-tighter text-primary">MS</span>
              <span className="font-display font-black text-3xl tracking-tighter text-primary/40">-</span>
              <span className="font-display font-black text-3xl tracking-tighter text-white">BETON</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              Váš spoľahlivý dopravca betónu v Žiline a okolí. Základ každej kvalitnej stavby je v pevnosti a spoľahlivosti betónu, ktorý používate.
            </p>
            <p className="text-xs text-white/40 font-semibold tracking-wider uppercase">
              Žilina betón
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-base font-bold text-white mb-6 tracking-widest uppercase">Rýchle Odkazy</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="#home" className="hover:text-primary transition-colors">Domov</a></li>
              <li><a href="#about" className="hover:text-primary transition-colors">O Spoločnosti</a></li>
              <li><a href="#products" className="hover:text-primary transition-colors">Naše Produkty</a></li>
              <li><a href="#calculator" className="hover:text-primary transition-colors">Výpočet Ceny</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">Kontakt</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-base font-bold text-white mb-6 tracking-widest uppercase">Kontakt</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white/80 mb-0.5">Prevádzka</div>
                  <span className="text-white/55">Kamenná 3, 010 01 Žilina</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white/80 mb-0.5">Sídlo</div>
                  <span className="text-white/55">Turie 468, 013 12 Turie</span>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href="tel:+421909205205" className="hover:text-primary transition-colors font-semibold">
                  +421 909 205 205
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href="mailto:info@msbeton.sk" className="hover:text-primary transition-colors">
                  info@msbeton.sk
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-white/40">
          <p>© {new Date().getFullYear()} MS-BETON s.r.o. Všetky práva vyhradené.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Ochrana osobných údajov</a>
            <a href="#" className="hover:text-white transition-colors">Obchodné podmienky</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
