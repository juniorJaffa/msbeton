import { Mail, MapPin, Phone, Star } from "lucide-react";

const SOCIAL_LINKS = {
  facebook:  "https://www.facebook.com/msbetonzilina",
  instagram: "https://www.instagram.com/msbeton_sro",
  linkedin:  "#",      // TODO: https://linkedin.com/company/msbeton
};

const REVIEW_URL = "https://g.page/r/CeTg2gjXL3dWEBM/review";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}


export function Footer() {
  return (
    <footer className="concrete-navy text-white/80 pt-8 md:pt-16 pb-8 border-t-[4px] border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 mb-8 md:mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3 md:space-y-4">
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

            {/* Social icons */}
            <div className="flex items-center gap-2 pt-1">
              {[
                { href: SOCIAL_LINKS.facebook,  label: "Facebook",  Icon: FacebookIcon },
                { href: SOCIAL_LINKS.instagram, label: "Instagram", Icon: InstagramIcon },
                { href: SOCIAL_LINKS.linkedin,  label: "LinkedIn",  Icon: LinkedInIcon },
              ].map(({ href, label, Icon }) => (
                <a key={label} href={href} target={href !== "#" ? "_blank" : undefined} rel="noopener noreferrer"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${href !== "#" ? "bg-white/8 hover:bg-primary hover:text-secondary text-white/50" : "bg-white/8 text-white/30 cursor-default"}`}
                  aria-label={label}>
                  <Icon />
                </a>
              ))}
            </div>

            {/* Review CTA */}
            <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 pt-1 group">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-3.5 h-3.5 text-primary fill-primary" />
                ))}
              </div>
              <span className="text-xs text-white/50 group-hover:text-white transition-colors underline underline-offset-2 decoration-white/20 group-hover:decoration-white/60">Ohodnoťte nás na Google</span>
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-base font-bold text-white mb-6 tracking-widest uppercase">Rýchle Odkazy</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="#home" className="hover:text-primary transition-colors">Domov</a></li>
              <li><a href="/o-nas" className="hover:text-primary transition-colors">O Spoločnosti</a></li>
              <li><a href="/kolko-betonu" className="hover:text-primary transition-colors">Koľko betónu?</a></li>
              <li><a href="/betony" className="hover:text-primary transition-colors">Druhy betónu</a></li>
              <li><a href="/kalkulacka-beton" className="hover:text-primary transition-colors">Výpočet Ceny</a></li>
              <li><a href="/kontakt" className="hover:text-primary transition-colors">Kontakt</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="border-l border-white/10 pl-6 md:pl-12">
            <h3 className="text-base font-bold text-white mb-6 tracking-widest uppercase">Kontakt</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <a href="https://maps.google.com/?q=Kamenná+3,+010+01+Žilina" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group hover:opacity-80 transition-opacity cursor-pointer">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white/80 mb-0.5 group-hover:text-primary transition-colors">Prevádzka</div>
                    <span className="text-white/55">Kamenná 3, 010 01 Žilina</span>
                  </div>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <a href="https://maps.google.com/?q=Turie+468,+013+12+Turie" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group hover:opacity-80 transition-opacity cursor-pointer">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white/80 mb-0.5 group-hover:text-primary transition-colors">Sídlo</div>
                    <span className="text-white/55">Turie 468, 013 12 Turie</span>
                  </div>
                </a>
              </li>
              <li className="flex items-center gap-3">
                <a href="tel:+421909205205" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span className="hover:text-primary transition-colors font-semibold whitespace-nowrap">+421 909 205 205</span>
                </a>
              </li>
              <li className="flex items-center gap-3">
                <a href="mailto:info@msbeton.sk" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="hover:text-primary transition-colors">info@msbeton.sk</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-white/40">
          <p>© {new Date().getFullYear()} MS-BETON, spol. s r.o. Všetky práva vyhradené.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="/ochrana-osobnych-udajov" className="hover:text-white transition-colors">Ochrana osobných údajov</a>
            <a href="/vop" className="hover:text-white transition-colors">VOP</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
