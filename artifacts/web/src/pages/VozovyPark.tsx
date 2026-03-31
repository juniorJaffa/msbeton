import { Phone, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const vehicles = [
  {
    model: "MAN TGA 41.440",
    type: "BETÓN PUMPA",
    typeColor: "bg-primary text-secondary",
    specs: [
      { label: "Dosah výložníka", value: "28 m" },
      { label: "Typ", value: "Stacionárna pumpa" },
    ],
    desc: "Doprava betónu potrubím priamo na ťažko dostupné miesta stavby.",
    img: "/images/pump-truck.jpg",
    imgAlt: "MAN TGA 41.440 – betónová pumpa MS-BETON",
  },
  {
    model: "IVECO MAGIRUS",
    type: "DOMIEŠAVAČ",
    typeColor: "bg-secondary text-white",
    specs: [
      { label: "Objem bubna", value: "9 m³" },
      { label: "Typ", value: "Autodomiešavač" },
    ],
    desc: "Rovnomerné premiešanie cementu, piesku, štrku a vody do homogénneho betónu.",
    img: "/images/mixer-truck.jpg",
    imgAlt: "IVECO MAGIRUS – domiešavač MS-BETON",
  },
];

export default function VozovyPark() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── HERO ── */}
      <section className="concrete-navy relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 via-secondary/50 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-10 h-[3px] bg-primary" />
              <span className="text-primary font-bold text-xs tracking-[0.25em] uppercase">VOZOVÝ PARK</span>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl text-white mb-3 leading-tight">
              NÁŠA TECHNIKA,<br />VÁŠ BETÓN
            </h1>
            <p className="text-white/65 text-base md:text-lg leading-relaxed">
              Moderné vozidlá, pravidelný servis, spoľahlivé dodávky po celom Žilinskom kraji.
            </p>
          </div>
        </div>
      </section>

      {/* ── VEHICLES ── */}
      <section className="concrete-light py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {vehicles.map((v) => (
              <div
                key={v.model}
                className="group bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Photo */}
                <div className="relative bg-secondary overflow-hidden">
                  <img
                    src={v.img}
                    alt={v.imgAlt}
                    className="w-full h-64 object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className={`absolute top-4 right-4 px-3 py-1.5 text-xs font-black uppercase tracking-widest ${v.typeColor}`}>
                    {v.type}
                  </span>
                </div>

                {/* Info */}
                <div className="p-6">
                  <h2 className="font-display font-black text-2xl text-secondary mb-1 tracking-tight">
                    {v.model}
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed mb-5">{v.desc}</p>

                  {/* Specs */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {v.specs.map((s) => (
                      <div key={s.label} className="bg-gray-50 border border-gray-100 px-4 py-3">
                        <div className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-0.5">{s.label}</div>
                        <div className="font-black text-secondary text-lg">{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section className="concrete-navy py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-1">Zaujíma vás cena?</p>
            <h3 className="font-display font-black text-2xl md:text-3xl text-white">
              Pozrite si <span className="text-primary">cenník</span> alebo vypočítajte cenu online.
            </h3>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <a
              href="/cennik"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-secondary font-bold text-sm hover:bg-primary/85 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
            >
              CENNÍK <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="tel:+421909205205"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/30 text-white font-bold text-sm hover:border-primary hover:text-primary transition-all"
            >
              <Phone className="w-4 h-4" />
              ZAVOLAŤ
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
