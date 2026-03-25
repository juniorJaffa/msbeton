import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Layers, Square, Circle, TrendingUp, Info, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "slab" | "wall" | "column" | "stairs";
type ColShape = "round" | "square";

const CONCRETE_CLASSES = [
  { value: "C12/15", label: "C12/15", density: 2300 },
  { value: "C16/20", label: "C16/20", density: 2350 },
  { value: "C20/25", label: "C20/25", density: 2400 },
  { value: "C25/30", label: "C25/30", density: 2400 },
  { value: "C30/37", label: "C30/37", density: 2450 },
];

const WASTE_OPTIONS = [
  { value: 0, label: "Bez príplatku" },
  { value: 0.05, label: "+5% strata" },
  { value: 0.10, label: "+10% strata" },
  { value: 0.15, label: "+15% strata" },
];

const TABS: { id: TabId; label: string; sublabel: string; icon: React.ElementType }[] = [
  { id: "slab", label: "Doska / Plocha", sublabel: "Základy, terasa, podlaha", icon: Layers },
  { id: "wall", label: "Stena / Múr", sublabel: "Nosné steny, ploty", icon: Square },
  { id: "column", label: "Stĺp / Pilier", sublabel: "Kruhový alebo hranatý", icon: Circle },
  { id: "stairs", label: "Schodisko", sublabel: "Betónové schody", icon: TrendingUp },
];

function NumInput({
  label, unit, value, onChange, step = "0.01", min = "0", placeholder = "0",
}: {
  label: string; unit: string; value: string; onChange: (v: string) => void;
  step?: string; min?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-secondary/70 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex items-stretch">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-l-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-semibold text-secondary text-base"
        />
        <span className="px-3 py-3 bg-primary/10 border-2 border-l-0 border-primary/20 rounded-r-xl text-primary font-bold text-sm flex items-center whitespace-nowrap">
          {unit}
        </span>
      </div>
    </div>
  );
}

function SlabDiagram() {
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-[240px] mx-auto" fill="none">
      <g>
        <path d="M20 80 L100 40 L180 80 L100 100 Z" fill="#f97316" fillOpacity="0.18" stroke="#f97316" strokeWidth="2"/>
        <path d="M20 80 L20 95 L100 115 L100 100 Z" fill="#1e293b" fillOpacity="0.35" stroke="#1e293b" strokeWidth="1.5"/>
        <path d="M100 100 L100 115 L180 95 L180 80 Z" fill="#1e293b" fillOpacity="0.2" stroke="#1e293b" strokeWidth="1.5"/>
        <line x1="20" y1="40" x2="20" y2="80" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3"/>
        <line x1="20" y1="40" x2="100" y2="0" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3"/>
        <line x1="100" y1="0" x2="180" y2="40" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3"/>
        <line x1="180" y1="40" x2="180" y2="80" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3"/>
        <text x="100" y="74" textAnchor="middle" fontSize="9" fill="#f97316" fontWeight="bold">Dĺžka × Šírka</text>
        <text x="11" y="90" textAnchor="middle" fontSize="8" fill="#64748b" transform="rotate(-90,11,90)">Hrúbka</text>
      </g>
    </svg>
  );
}

function WallDiagram() {
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-[240px] mx-auto" fill="none">
      <g>
        <rect x="30" y="20" width="140" height="75" fill="#f97316" fillOpacity="0.18" stroke="#f97316" strokeWidth="2" rx="2"/>
        <rect x="30" y="85" width="140" height="12" fill="#1e293b" fillOpacity="0.25" stroke="#1e293b" strokeWidth="1.5" rx="2"/>
        <line x1="30" y1="20" x2="18" y2="20" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,2"/>
        <line x1="30" y1="85" x2="18" y2="85" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,2"/>
        <line x1="18" y1="20" x2="18" y2="85" stroke="#f97316" strokeWidth="1.5" markerEnd="url(#arr)"/>
        <text x="26" y="56" textAnchor="end" fontSize="8" fill="#f97316" fontWeight="bold">Výška</text>
        <text x="100" y="58" textAnchor="middle" fontSize="9" fill="#f97316" fontWeight="bold">Dĺžka</text>
        <text x="100" y="94" textAnchor="middle" fontSize="8" fill="#64748b">Hrúbka</text>
      </g>
    </svg>
  );
}

function ColumnDiagram({ shape }: { shape: ColShape }) {
  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-[240px] mx-auto" fill="none">
      {shape === "round" ? (
        <g>
          <rect x="75" y="20" width="50" height="80" fill="#f97316" fillOpacity="0.18" stroke="#f97316" strokeWidth="2" rx="25"/>
          <ellipse cx="100" cy="20" rx="25" ry="8" fill="#f97316" fillOpacity="0.35" stroke="#f97316" strokeWidth="2"/>
          <ellipse cx="100" cy="100" rx="25" ry="8" fill="#1e293b" fillOpacity="0.3" stroke="#1e293b" strokeWidth="1.5"/>
          <line x1="128" y1="20" x2="145" y2="20" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2"/>
          <line x1="128" y1="100" x2="145" y2="100" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2"/>
          <line x1="145" y1="20" x2="145" y2="100" stroke="#f97316" strokeWidth="1.5"/>
          <text x="152" y="63" fontSize="8" fill="#f97316" fontWeight="bold">Výška</text>
          <line x1="100" y1="20" x2="125" y2="20" stroke="#1e293b" strokeWidth="1.5"/>
          <text x="108" y="17" fontSize="8" fill="#1e293b" fontWeight="bold">⌀</text>
        </g>
      ) : (
        <g>
          <rect x="65" y="20" width="70" height="80" fill="#f97316" fillOpacity="0.18" stroke="#f97316" strokeWidth="2" rx="3"/>
          <path d="M65 20 L55 12 L125 12 L135 20" fill="#f97316" fillOpacity="0.3" stroke="#f97316" strokeWidth="1.5"/>
          <path d="M135 20 L135 100 L125 108 L125 12" fill="#1e293b" fillOpacity="0.2" stroke="#1e293b" strokeWidth="1.5"/>
          <line x1="140" y1="20" x2="155" y2="20" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2"/>
          <line x1="140" y1="100" x2="155" y2="100" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2"/>
          <line x1="155" y1="20" x2="155" y2="100" stroke="#f97316" strokeWidth="1.5"/>
          <text x="162" y="63" fontSize="8" fill="#f97316" fontWeight="bold">Výška</text>
          <text x="95" y="63" textAnchor="middle" fontSize="8" fill="#f97316" fontWeight="bold">Š × H</text>
        </g>
      )}
    </svg>
  );
}

function StairsDiagram() {
  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-[240px] mx-auto" fill="none">
      <g>
        <rect x="20" y="90" width="50" height="25" fill="#f97316" fillOpacity="0.2" stroke="#f97316" strokeWidth="2"/>
        <rect x="70" y="68" width="50" height="47" fill="#f97316" fillOpacity="0.18" stroke="#f97316" strokeWidth="2"/>
        <rect x="120" y="45" width="60" height="70" fill="#f97316" fillOpacity="0.15" stroke="#f97316" strokeWidth="2"/>
        <line x1="20" y1="108" x2="10" y2="108" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2"/>
        <line x1="20" y1="115" x2="10" y2="115" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2"/>
        <text x="100" y="125" textAnchor="middle" fontSize="8" fill="#64748b">Šírka schodiska</text>
        <text x="14" y="112" textAnchor="middle" fontSize="8" fill="#f97316" fontWeight="bold">v</text>
        <text x="48" y="83" textAnchor="middle" fontSize="8" fill="#64748b">h</text>
      </g>
    </svg>
  );
}

export function ConcreteCalculator() {
  const [activeTab, setActiveTab] = useState<TabId>("slab");
  const [concreteClass, setConcreteClass] = useState("C20/25");
  const [waste, setWaste] = useState(0.05);
  const [showInfo, setShowInfo] = useState(false);

  const [slab, setSlab] = useState({ length: "", width: "", depth: "" });
  const [wall, setWall] = useState({ length: "", height: "", thickness: "" });
  const [col, setCol] = useState({ shape: "round" as ColShape, diameter: "", width: "", depth: "", height: "" });
  const [stairs, setStairs] = useState({ steps: "", riser: "", tread: "", width: "" });

  const density = CONCRETE_CLASSES.find((c) => c.value === concreteClass)?.density ?? 2400;

  const baseVolume = useMemo(() => {
    const n = (v: string) => parseFloat(v) || 0;
    switch (activeTab) {
      case "slab":
        return n(slab.length) * n(slab.width) * (n(slab.depth) / 100);
      case "wall":
        return n(wall.length) * n(wall.height) * (n(wall.thickness) / 100);
      case "column": {
        if (col.shape === "round") {
          const r = n(col.diameter) / 200;
          return Math.PI * r * r * n(col.height);
        }
        return (n(col.width) / 100) * (n(col.depth) / 100) * n(col.height);
      }
      case "stairs": {
        const steps = n(stairs.steps);
        const riser = n(stairs.riser) / 100;
        const tread = n(stairs.tread) / 100;
        const width = n(stairs.width);
        if (!steps || !riser || !tread || !width) return 0;
        return (steps * tread * width * riser) / 2 + steps * tread * width * riser / 2;
      }
      default: return 0;
    }
  }, [activeTab, slab, wall, col, stairs]);

  const volumeWithWaste = baseVolume * (1 + waste);
  const weightTonnes = (volumeWithWaste * density) / 1000;
  const mixerTrucks = Math.ceil(volumeWithWaste / 7);
  const bags25kg = Math.ceil(volumeWithWaste * (density / 25));
  const hasResult = volumeWithWaste > 0.001;

  const fmt = (n: number, dec = 2) => n.toFixed(dec);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">

        {/* LEFT: Inputs */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Tab Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-100">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-4 text-center transition-all border-b-2 cursor-pointer",
                    activeTab === tab.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-transparent text-secondary/50 hover:text-secondary hover:bg-gray-50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold leading-tight">{tab.label}</span>
                  <span className="text-[10px] text-current opacity-60 leading-tight hidden md:block">{tab.sublabel}</span>
                </button>
              );
            })}
          </div>

          <div className="p-7 space-y-6">
            {/* Shape Diagram */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + (activeTab === "column" ? col.shape : "")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "slab" && <SlabDiagram />}
                  {activeTab === "wall" && <WallDiagram />}
                  {activeTab === "column" && <ColumnDiagram shape={col.shape} />}
                  {activeTab === "stairs" && <StairsDiagram />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Inputs per tab */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {activeTab === "slab" && (
                  <>
                    <NumInput label="Dĺžka" unit="m" value={slab.length} onChange={(v) => setSlab({ ...slab, length: v })} step="0.1" placeholder="napr. 6.5" />
                    <NumInput label="Šírka" unit="m" value={slab.width} onChange={(v) => setSlab({ ...slab, width: v })} step="0.1" placeholder="napr. 4.0" />
                    <NumInput label="Hrúbka" unit="cm" value={slab.depth} onChange={(v) => setSlab({ ...slab, depth: v })} step="1" placeholder="napr. 15" />
                  </>
                )}
                {activeTab === "wall" && (
                  <>
                    <NumInput label="Dĺžka steny" unit="m" value={wall.length} onChange={(v) => setWall({ ...wall, length: v })} step="0.1" placeholder="napr. 8.0" />
                    <NumInput label="Výška steny" unit="m" value={wall.height} onChange={(v) => setWall({ ...wall, height: v })} step="0.1" placeholder="napr. 2.8" />
                    <NumInput label="Hrúbka steny" unit="cm" value={wall.thickness} onChange={(v) => setWall({ ...wall, thickness: v })} step="1" placeholder="napr. 20" />
                  </>
                )}
                {activeTab === "column" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-secondary/70 uppercase tracking-wider mb-1.5">Tvar stĺpa</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["round", "square"] as ColShape[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setCol({ ...col, shape: s })}
                            className={cn(
                              "py-2.5 px-4 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer",
                              col.shape === s ? "border-primary bg-primary text-white" : "border-gray-200 text-secondary/60 hover:border-primary/40"
                            )}
                          >
                            {s === "round" ? "⬤ Kruhový" : "■ Hranatý"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {col.shape === "round" ? (
                      <NumInput label="Priemer" unit="cm" value={col.diameter} onChange={(v) => setCol({ ...col, diameter: v })} step="1" placeholder="napr. 30" />
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <NumInput label="Šírka" unit="cm" value={col.width} onChange={(v) => setCol({ ...col, width: v })} step="1" placeholder="napr. 30" />
                        <NumInput label="Hĺbka" unit="cm" value={col.depth} onChange={(v) => setCol({ ...col, depth: v })} step="1" placeholder="napr. 30" />
                      </div>
                    )}
                    <NumInput label="Výška stĺpa" unit="m" value={col.height} onChange={(v) => setCol({ ...col, height: v })} step="0.1" placeholder="napr. 3.0" />
                  </>
                )}
                {activeTab === "stairs" && (
                  <>
                    <NumInput label="Počet schodov" unit="ks" value={stairs.steps} onChange={(v) => setStairs({ ...stairs, steps: v })} step="1" min="1" placeholder="napr. 12" />
                    <NumInput label="Výška schodu (riser)" unit="cm" value={stairs.riser} onChange={(v) => setStairs({ ...stairs, riser: v })} step="1" placeholder="napr. 18" />
                    <NumInput label="Hĺbka schodu (tread)" unit="cm" value={stairs.tread} onChange={(v) => setStairs({ ...stairs, tread: v })} step="1" placeholder="napr. 28" />
                    <NumInput label="Šírka schodiska" unit="m" value={stairs.width} onChange={(v) => setStairs({ ...stairs, width: v })} step="0.1" placeholder="napr. 1.2" />
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Options Row */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-bold text-secondary/70 uppercase tracking-wider mb-1.5">Trieda betónu</label>
                <div className="relative">
                  <select
                    value={concreteClass}
                    onChange={(e) => setConcreteClass(e.target.value)}
                    className="w-full appearance-none px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary text-sm font-bold text-secondary pr-8 cursor-pointer"
                  >
                    {CONCRETE_CLASSES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-secondary/40 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-secondary/70 uppercase tracking-wider mb-1.5">Strata materiálu</label>
                <div className="relative">
                  <select
                    value={waste}
                    onChange={(e) => setWaste(Number(e.target.value))}
                    className="w-full appearance-none px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary text-sm font-bold text-secondary pr-8 cursor-pointer"
                  >
                    {WASTE_OPTIONS.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-secondary/40 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4">
          <div className="bg-secondary rounded-3xl p-7 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-white/80 text-sm uppercase tracking-widest">Výsledok výpočtu</h4>
            </div>

            {hasResult ? (
              <motion.div
                key={fmt(volumeWithWaste)}
                initial={{ opacity: 0.7, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5"
              >
                {/* Main: Volume */}
                <div className="border-b border-white/15 pb-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Objem betónu</p>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-bold leading-none tabular-nums">{fmt(volumeWithWaste)}</span>
                    <span className="text-xl text-white/50 font-semibold mb-0.5">m³</span>
                  </div>
                  {waste > 0 && (
                    <p className="text-xs text-white/40 mt-1">
                      Základ: {fmt(baseVolume)} m³ + {(waste * 100).toFixed(0)}% strata
                    </p>
                  )}
                </div>

                {/* Grid of results */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/8 rounded-2xl p-4">
                    <p className="text-xs text-white/50 font-semibold uppercase tracking-wide mb-1">Hmotnosť</p>
                    <p className="text-2xl font-bold tabular-nums">{fmt(weightTonnes, 1)}</p>
                    <p className="text-xs text-white/40">ton</p>
                  </div>
                  <div className="bg-white/8 rounded-2xl p-4">
                    <p className="text-xs text-white/50 font-semibold uppercase tracking-wide mb-1">Domiešavače</p>
                    <p className="text-2xl font-bold tabular-nums">{mixerTrucks}</p>
                    <p className="text-xs text-white/40">vozidiel (7 m³)</p>
                  </div>
                  <div className="bg-white/8 rounded-2xl p-4">
                    <p className="text-xs text-white/50 font-semibold uppercase tracking-wide mb-1">Vrecia 25 kg</p>
                    <p className="text-2xl font-bold tabular-nums">{bags25kg}</p>
                    <p className="text-xs text-white/40">vriec suchej zmesi</p>
                  </div>
                  <div className="bg-primary/20 border border-primary/30 rounded-2xl p-4">
                    <p className="text-xs text-primary font-bold uppercase tracking-wide mb-1">Trieda</p>
                    <p className="text-2xl font-bold tabular-nums text-primary">{concreteClass}</p>
                    <p className="text-xs text-white/40">{density} kg/m³</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  {showInfo ? "Skryť poznámky" : "Zobraziť poznámky"}
                </button>
                {showInfo && (
                  <p className="text-xs text-white/40 leading-relaxed">
                    * Výpočet je orientačný. Hustota betónu závisí od triedy zmesi. Odporúčame konzultovať presnú objednávku s našim technológom. Domiešavač = 7 m³.
                  </p>
                )}
              </motion.div>
            ) : (
              <div className="text-center py-10 text-white/30">
                <Calculator className="w-14 h-14 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Zadajte rozmery pre výpočet</p>
              </div>
            )}
          </div>

          {/* CTA */}
          <a
            href="#contact"
            className="block w-full text-center px-6 py-4 bg-primary text-white font-bold text-base rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
          >
            Vyžiadať presnú cenovú ponuku →
          </a>

          {/* Comparison badge */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-green-800 mb-1">✓ Vylepšená kalkulačka oproti pôvodnej stránke</p>
            <p className="text-xs text-green-700 leading-relaxed">
              Pôvodná kalkulačka: len objem + počet vriec<br />
              Naša verzia: 4 typy konštrukcií, triedy betónu, strata materiálu, hmotnosť, počet vozidiel
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
