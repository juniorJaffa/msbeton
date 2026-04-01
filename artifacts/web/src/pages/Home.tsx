import { useState } from "react";
import { motion } from "framer-motion";
import { SEOHead, LocalBusinessSchema } from "@/components/SEOHead";
import { 
  ArrowRight, 
  CheckCircle2, 
  Calculator, 
  Truck, 
  Hammer, 
  ShieldCheck,
  Send,
  MapPin,
  Phone,
  Mail,
  Clock
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ConcreteCalculator } from "@/components/Calculator";
// Spoločnosti, s ktorými spolupracujeme (partnerský zoznam – oddelené od klientov kalkulačky)
const PARTNERS = [
  { id: "p1", name: "ZAPA Beton SK", logo: "" },
  { id: "p2", name: "2BH s.r.o.", logo: "" },
  { id: "p3", name: "STRABAG s.r.o.", logo: "" },
  { id: "p4", name: "VÁHOSTAV – SK a.s.", logo: "" },
  { id: "p5", name: "Eurovia SK a.s.", logo: "" },
  { id: "p6", name: "SKANSKA SK a.s.", logo: "" },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

export default function Home() {
  // Contact Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);


  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate network request
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    }, 1500);
  };

  return (
    <div className="min-h-screen">
      <SEOHead />
      <LocalBusinessSchema />
      <Navbar />

      {/* HERO SECTION */}
      <section id="home" className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Video background with overlay */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover object-center"
            poster={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          >
            <source src={`${import.meta.env.BASE_URL}videos/hero-video.mp4`} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-secondary/70"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/85 via-secondary/50 to-secondary/20"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 mb-5">
              <span className="h-[2px] w-8 bg-primary block"></span>
              <span className="font-semibold text-xs tracking-[0.2em] text-white/70 uppercase">Žilina betón, na ktorý sa môžete spoľahnúť</span>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-xl md:text-2xl font-bold text-white/90 mb-2 uppercase tracking-wide">
              Staviame na pevných základoch, volíme
            </motion.p>

            <motion.h1 variants={fadeInUp} className="text-6xl md:text-8xl font-black text-primary leading-none mb-6 drop-shadow-lg tracking-tight">
              MS-BETON
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-base md:text-lg text-white/70 mb-10 max-w-xl leading-relaxed">
              Sme váš spoľahlivý dopravca betónu v Žiline a okolí. Základ každej kvalitnej stavby je v pevnosti a spoľahlivosti betónu, ktorý používate – a práve ten vám dodávame my.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <a 
                href="#about" 
                className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-secondary text-white font-bold text-sm tracking-widest uppercase hover:bg-secondary/80 transition-all hover:-translate-y-1"
              >
                Zistiť viac
                <ArrowRight className="w-4 h-4" />
              </a>
              <a 
                href="#calculator" 
                className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-primary text-secondary font-bold text-sm tracking-widest uppercase hover:bg-primary/90 transition-all hover:-translate-y-1 shadow-lg shadow-primary/30"
              >
                Výpočet ceny
              </a>
            </motion.div>
          </motion.div>
        </div>
        

      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-24 concrete-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeInUp} className="text-sm font-bold text-primary tracking-widest mb-2">O SPOLOČNOSTI</motion.h2>
              <motion.h3 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-secondary mb-6">
                KVALITA, NA KTORÚ SA MÔŽETE <span className="text-gradient">SPOĽAHNÚŤ</span>
              </motion.h3>
              <motion.p variants={fadeInUp} className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Spoločnosť MS-BETON s.r.o. patrí medzi popredných poskytovateľov riešení pre dovoz betónu v Žiline. Vďaka modernému vozovému parku – od betónových mixérov až po pumpy – zvládame projekty všetkých veľkostí. Zabezpečujeme kvalitný betón presne tam, kde a kedy ho potrebujete.
              </motion.p>
              <motion.ul variants={staggerContainer} className="space-y-4 mb-8">
                {[
                  "Moderná technológia riadenia výroby",
                  "Vlastný rozvoz a flotila domiešavačov",
                  "Certifikované a laboratórne testované zmesi",
                  "Flexibilita a presnosť dodávok na čas"
                ].map((item, i) => (
                  <motion.li key={i} variants={fadeInUp} className="flex items-center gap-3">
                    <CheckCircle2 className="text-primary w-6 h-6 shrink-0" />
                    <span className="text-secondary font-medium text-lg">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div variants={fadeInUp}>
                <a href="#contact" className="text-primary font-bold hover:underline underline-offset-4 flex items-center gap-1">
                  Zistiť viac o nás <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gray-100 rounded-xl transform rotate-3"></div>
              <div className="absolute -inset-4 bg-primary/10 rounded-xl transform -rotate-3 border border-primary/20"></div>
              <img 
                src={`${import.meta.env.BASE_URL}images/about-mixer.png`} 
                alt="MS-BETON domiešavače" 
                className="relative rounded-xl shadow-2xl object-cover w-full h-[500px]"
              />
              {/* Floating badge */}
              <div className="absolute -bottom-8 -left-8 bg-secondary text-white p-6 rounded-xl shadow-xl max-w-[200px] border-l-4 border-primary">
                <span className="block text-4xl font-display font-bold text-primary mb-1">15+</span>
                <span className="text-sm font-semibold uppercase tracking-wider">Rokov Skúseností v obore</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TRUST SIGNALS */}
      <section className="py-16 concrete-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: Truck, count: "5000+", label: "Doručených zásielok" },
              { icon: Calculator, count: "15M+", label: "Kubíkov betónu" },
              { icon: ShieldCheck, count: "100%", label: "Certifikovaná kvalita" },
              { icon: Hammer, count: "850+", label: "Spokojných klientov" }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center p-4">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 text-primary">
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="text-4xl font-display font-bold mb-2">{stat.count}</div>
                <div className="text-white/60 font-semibold uppercase tracking-wider text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS SECTION */}
      <section id="products" className="py-24 concrete-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-primary tracking-widest mb-2">NAŠE PRODUKTY</h2>
            <h3 className="text-4xl md:text-5xl font-bold text-secondary mb-6 uppercase">
              Kompletný Sortiment <br/>Materiálov
            </h3>
            <p className="text-muted-foreground text-lg">
              Poskytujeme široké spektrum stavebných materiálov pre akúkoľvek fázu vašej výstavby.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {[
              { title: "Transportbetón", img: "prod-concrete.png", desc: "Základové, podlahové, konštrukčné a špeciálne betóny najvyššej kvality." },
              { title: "Pieskový Kameň", img: "prod-sand.png", desc: "Kvalitný preosiaty piesok ideálny pre murovacie malty a omietky." },
              { title: "Štrk a Kamenivo", img: "prod-gravel.png", desc: "Rôzne frakcie drveného a ťaženého kameniva pre drenáže a podklady." },
              { title: "Murovacie Prvky", img: "prod-masonry.png", desc: "Šalovacie a debniace tvárnice pre rýchlu a presnú výstavbu." }
            ].map((prod, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group bg-white rounded-2xl overflow-hidden shadow-lg shadow-black/5 border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="relative h-56 overflow-hidden">
                  <div className="absolute inset-0 bg-secondary/20 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                  <img 
                    src={`${import.meta.env.BASE_URL}images/${prod.img}`} 
                    alt={prod.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="p-6">
                  <h4 className="text-2xl font-display font-bold text-secondary mb-3">{prod.title}</h4>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {prod.desc}
                  </p>
                  <a href="#contact" className="inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:text-secondary transition-colors">
                    Mám záujem <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULATOR SECTION */}
      <section id="calculator" className="py-24 concrete-light relative overflow-hidden">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-sm font-bold text-primary tracking-widest mb-2">KALKULAČKA</h2>
            <h3 className="text-4xl md:text-5xl font-bold text-secondary mb-4 uppercase">
              Kalkulačka Betónu
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Vyberte typ konštrukcie, zadajte rozmery a okamžite zistíte potrebný objem, hmotnosť, počet vozidiel aj vriec.
            </p>
          </motion.div>

          <ConcreteCalculator />
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-24 concrete-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-primary tracking-widest mb-2">KONTAKT</h2>
            <h3 className="text-4xl md:text-5xl font-bold text-secondary mb-6 uppercase">
              Máte Otázky? <br/>Napíšte Nám
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 bg-white rounded-3xl shadow-xl overflow-hidden">
            
            {/* Contact Info */}
            <div className="lg:col-span-2 bg-secondary p-10 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary/20 via-secondary to-secondary"></div>
              
              <div className="relative z-10">
                <h4 className="text-3xl font-display font-bold mb-8">Kontaktné Údaje</h4>
                
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-1">Prevádzka spoločnosti</h5>
                      <p className="text-white/70 leading-relaxed">
                        Kamenná 3<br />
                        010 01 Žilina
                      </p>
                      <h5 className="font-bold text-lg mt-4 mb-1">Sídlo spoločnosti</h5>
                      <p className="text-white/70 leading-relaxed">
                        Turie 468<br />
                        013 12 Turie
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-1">Telefón (Dispečing)</h5>
                      <a href="tel:+421909205205" className="text-primary font-bold text-xl hover:underline">
                        +421 909 205 205
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-1">Email</h5>
                      <p className="text-white/70 leading-relaxed">
                        info@msbeton.sk<br />
                        objednavky@msbeton.sk<br />
                        <span className="text-primary font-semibold">www.msbeton.sk</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3 p-10 lg:p-16">
              <h4 className="text-2xl font-bold text-secondary mb-8">Rýchly formulár</h4>
              
              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h5 className="text-xl font-bold text-green-800 mb-2">Správa bola odoslaná!</h5>
                  <p className="text-green-700">Ďakujeme za váš záujem. Budeme vás kontaktovať čo najskôr.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-2">Meno a Priezvisko</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="Jozef Novák"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-2">Telefónne číslo</label>
                      <input 
                        type="tel" 
                        required
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="+421 9XX XXX XXX"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2">E-mail</label>
                    <input 
                      type="email" 
                      required
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="jozef@priklad.sk"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2">Vaša správa / Požiadavka</label>
                    <textarea 
                      required
                      rows={4}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                      placeholder="Mám záujem o cenovú ponuku na betón pre základovú dosku..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 bg-secondary text-white font-bold text-lg rounded-xl hover:bg-primary transition-all shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Odosielam..." : "Odoslať správu"}
                    {!isSubmitting && <Send className="w-5 h-5" />}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* PARTNERS SECTION */}
      {PARTNERS.length > 0 && (
        <section className="py-14 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeInUp}
              className="text-center mb-10"
            >
              <p className="text-xs font-bold text-gray-400 tracking-[0.25em] uppercase mb-1">Naši partneri</p>
              <h2 className="text-2xl md:text-3xl font-bold text-secondary uppercase tracking-tight">
                Spoločnosti, s ktorými spolupracujeme
              </h2>
              <div className="mt-3 mx-auto w-16 h-1 bg-primary rounded-full" />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="flex flex-wrap justify-center items-center gap-4 md:gap-6"
            >
              {PARTNERS.map(client => (
                <motion.div
                  key={client.id}
                  variants={fadeInUp}
                  className="group relative flex items-center justify-center w-44 h-24 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden cursor-default transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
                >
                  {client.logo ? (
                    <img
                      src={client.logo}
                      alt={client.name}
                      className="w-full h-full object-contain p-4 filter grayscale opacity-60 transition-all duration-500 group-hover:grayscale-0 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full p-3 transition-all duration-300">
                      <div className="w-10 h-10 rounded-full bg-gray-200 group-hover:bg-primary/20 flex items-center justify-center mb-2 transition-colors duration-300">
                        <span className="text-lg font-black text-gray-400 group-hover:text-primary transition-colors duration-300">
                          {client.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-gray-400 group-hover:text-secondary text-center leading-tight transition-colors duration-300 uppercase tracking-wide">
                        {client.name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-transparent group-hover:ring-primary/20 transition-all duration-300 pointer-events-none" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
