import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, ChevronDown, CheckCircle2, Send } from "lucide-react";
import { PhoneInput } from "@/components/PhoneInput";

// Kontaktná sekcia — zdieľaná medzi homepage (#contact) a samostatnou /kontakt stránkou.
// Self-contained (vlastný stav + odoslanie formulára).
export function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: contactName, phone: contactPhone, email: contactEmail, message: contactMessage }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubmitted(true);
        setContactName(""); setContactPhone(""); setContactEmail(""); setContactMessage("");
        setTimeout(() => setSubmitted(false), 6000);
      }
    } catch { /* silent */ } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-14 concrete-light" style={{ scrollMarginTop: "96px" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* Contact Info */}
          <div className="lg:col-span-2 bg-secondary p-10 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary/20 via-secondary to-secondary"></div>
            <div className="relative z-10">
              <h4 className="text-3xl font-display font-bold mb-8">Kontaktné Údaje</h4>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <a href="https://maps.google.com/?q=Kamenná+3,+010+01+Žilina" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 hover:bg-white/20 transition-colors">
                    <MapPin className="w-6 h-6 text-primary" />
                  </a>
                  <div>
                    <h5 className="font-bold text-lg mb-1">Prevádzka spoločnosti</h5>
                    <p className="text-white/70 leading-relaxed">Kamenná 3<br />010 01 Žilina</p>
                    <h5 className="font-bold text-lg mt-4 mb-1">Sídlo spoločnosti</h5>
                    <p className="text-white/70 leading-relaxed">Turie 468<br />013 12 Turie</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <a href="tel:+421909205205" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 hover:bg-white/20 transition-colors">
                    <Phone className="w-6 h-6 text-primary" />
                  </a>
                  <div>
                    <h5 className="font-bold text-lg mb-1">Telefón (Dispečing)</h5>
                    <a href="tel:+421909205205" className="text-primary font-bold text-xl hover:underline">+421 909 205 205</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <a href="mailto:info@msbeton.sk" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 hover:bg-white/20 transition-colors">
                    <Mail className="w-6 h-6 text-primary" />
                  </a>
                  <div>
                    <h5 className="font-bold text-lg mb-1">Email</h5>
                    <p className="text-white/70 leading-relaxed">
                      <a href="mailto:info@msbeton.sk" className="hover:text-white transition-colors">info@msbeton.sk</a><br />
                      <a href="https://msbeton.sk" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">www.msbeton.sk</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3 p-6 sm:p-10 lg:p-16">
            <button
              className="sm:hidden w-full flex items-center justify-between px-5 py-4 bg-secondary text-white font-bold rounded-xl mb-2 active:scale-[0.98] transition-transform"
              onClick={() => setMobileFormOpen(v => !v)}
            >
              <span>Napísať správu</span>
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${mobileFormOpen ? "rotate-180" : ""}`} />
            </button>
            <h4 className="hidden sm:block text-2xl font-bold text-secondary mb-8">Rýchly formulár</h4>
            <div className={`${mobileFormOpen ? "block" : "hidden"} sm:block`}>
              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
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
                      <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-[border-color,box-shadow]"
                        placeholder="Jozef Novák" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-2">Telefónne číslo</label>
                      <PhoneInput value={contactPhone} onChange={v => setContactPhone(v)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-[border-color,box-shadow]"
                        placeholder="0944 xxx xxx" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2">E-mail</label>
                    <input type="email" required value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-[border-color,box-shadow]"
                      placeholder="jozef@priklad.sk" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2">Vaša správa / Požiadavka</label>
                    <textarea required rows={4} value={contactMessage} onChange={e => setContactMessage(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-[border-color,box-shadow] resize-none"
                      placeholder="Mám záujem o cenovú ponuku na betón pre základovú dosku..."></textarea>
                  </div>
                  <button type="submit" disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 bg-secondary text-white font-bold text-lg rounded-xl hover:bg-primary transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.97] shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSubmitting ? "Odosielam..." : "Odoslať správu"}
                    {!isSubmitting && <Send className="w-5 h-5" />}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
