import { useState } from "react";
import { motion } from "framer-motion";
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
  // Calculator State
  const [calcLength, setCalcLength] = useState<number | "">("");
  const [calcWidth, setCalcWidth] = useState<number | "">("");
  const [calcDepth, setCalcDepth] = useState<number | "">("");

  // Volume in cubic meters (L * W * D)
  const volume = 
    typeof calcLength === "number" && typeof calcWidth === "number" && typeof calcDepth === "number"
      ? (calcLength * calcWidth * calcDepth).toFixed(2)
      : 0;

  // Assuming 2000kg per m³, and 25kg bags: (Volume * 2000) / 25 = Volume * 80 bags
  const bags = volume !== 0 ? Math.ceil(Number(volume) * 80) : 0;

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
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO SECTION */}
      <section id="home" className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="MSBETON Construction" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-secondary/80 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/50 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-20">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-primary mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-semibold text-sm tracking-wider text-white">LÍDER NA TRHU S BETÓNOM</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-bold text-white leading-[1.1] mb-6 drop-shadow-lg">
              PEVNÉ ZÁKLADY PRE VAŠE <span className="text-primary">PROJEKTY</span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl leading-relaxed">
              Výroba, transport a čerpanie certifikovaných betónových zmesí špičkovej kvality. 
              Garantujeme spoľahlivosť, rýchlosť a profesionálny prístup pre stavby každého rozsahu.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <a 
                href="#products" 
                className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-primary text-white font-bold text-lg rounded-md hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 hover:-translate-y-1"
              >
                Naše Produkty
                <ArrowRight className="w-5 h-5" />
              </a>
              <a 
                href="#calculator" 
                className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-lg rounded-md hover:bg-white/20 transition-all hover:-translate-y-1"
              >
                Kalkulačka objemu
              </a>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Decorative architectural shapes */}
        <div className="absolute bottom-0 right-0 w-1/3 h-32 bg-primary/20 backdrop-blur-2xl" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-24 bg-white">
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
                Spoločnosť MSBETON s.r.o. pôsobí na slovenskom trhu už viac ako 15 rokov. Našou hlavnou činnosťou je <strong>výroba, doprava a ukladanie betónových zmesí</strong> pre všetky typy stavebných projektov - od rodinných domov až po rozsiahle priemyselné haly.
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
                alt="MSBETON domiešavače" 
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
      <section className="py-16 bg-secondary text-white">
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
      <section id="products" className="py-24 bg-gray-50">
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
      <section id="calculator" className="py-24 bg-white relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gray-50 rounded-l-[100px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Form Side */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-panel p-8 md:p-12 rounded-3xl relative z-10"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Calculator className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-3xl font-display font-bold text-secondary mb-2">Kalkulačka Objemu Betónu</h3>
              <p className="text-muted-foreground mb-8">
                Zadajte rozmery vašej plochy (v metroch) pre odhad potrebného množstva betónu a zmesí v suchom stave (25kg vrecia).
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wide">Dĺžka (m)</label>
                  <input 
                    type="number" 
                    min="0" step="0.1"
                    value={calcLength}
                    onChange={(e) => setCalcLength(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-lg"
                    placeholder="Napr. 5.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wide">Šírka (m)</label>
                  <input 
                    type="number" 
                    min="0" step="0.1"
                    value={calcWidth}
                    onChange={(e) => setCalcWidth(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-lg"
                    placeholder="Napr. 3.2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wide">Hĺbka / Hrúbka (m)</label>
                  <input 
                    type="number" 
                    min="0" step="0.01"
                    value={calcDepth}
                    onChange={(e) => setCalcDepth(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-lg"
                    placeholder="Napr. 0.15"
                  />
                </div>
              </div>
            </motion.div>

            {/* Result Side */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-secondary rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
            >
              {/* abstract graphic */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
              
              <h4 className="text-xl font-bold mb-8 text-white/80">Odhadovaný Výsledok</h4>
              
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">Celkový objem</p>
                  <div className="flex items-end gap-2 border-b border-white/20 pb-4">
                    <span className="text-6xl font-display font-bold leading-none">{volume}</span>
                    <span className="text-2xl text-white/60 font-semibold mb-1">m³</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">Ekvivalent v suchom stave (Suchý betón)</p>
                  <div className="flex items-end gap-2 border-b border-white/20 pb-4">
                    <span className="text-6xl font-display font-bold leading-none">{bags}</span>
                    <span className="text-2xl text-white/60 font-semibold mb-1">vriec (25kg)</span>
                  </div>
                  <p className="text-xs text-white/40 mt-2">* Výpočet je len orientačný (počítané pre 2000kg/m³). Pre presnú cenovú ponuku nás kontaktujte.</p>
                </div>
                
                <a 
                  href="#contact"
                  className="block w-full text-center px-6 py-4 bg-primary text-white font-bold text-lg rounded-xl hover:bg-white hover:text-secondary transition-colors duration-300"
                >
                  Vyžiadať presnú cenovú ponuku
                </a>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-24 bg-gray-50">
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
                      <h5 className="font-bold text-lg mb-1">Sídlo a Výroba</h5>
                      <p className="text-white/70 leading-relaxed">
                        Priemyselná zóna 1234/5<br />
                        821 09 Bratislava<br />
                        Slovensko
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-1">Telefón (Dispečing)</h5>
                      <p className="text-white/70 leading-relaxed text-xl">
                        +421 900 111 222
                      </p>
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
                        objednavky@msbeton.sk
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

      <Footer />
    </div>
  );
}
