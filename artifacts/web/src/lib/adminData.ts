export interface ConcreteType {
  id: string;
  label: string;
  price: number;
}

export interface ConcreteCategory {
  id: string;
  name: string;
  types: ConcreteType[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  ratePerKm: number;
  truckCapacity: number;
  pumpHourlyRate: number;
  waitingRatePer15min: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  logo: string;
  contact: string;
  phone: string;
  email: string;
  note: string;
}

const DEFAULT_CATEGORIES: ConcreteCategory[] = [
  {
    id: "dmax8", name: "DRVENÉ KAMENIVO Dmax8",
    types: [
      { id: "c1", label: "Betón C12/15", price: 76.5 },
      { id: "c2", label: "Betón C16/20D", price: 80.0 },
      { id: "c3", label: "Betón C20/25", price: 85.0 },
    ]
  },
  {
    id: "dmax16", name: "DRVENÉ KAMENIVO Dmax16",
    types: [
      { id: "c4", label: "Betón C12/15", price: 78.0 },
      { id: "c5", label: "Betón C16/20D", price: 83.33 },
      { id: "c6", label: "Betón C20/25", price: 88.5 },
      { id: "c7", label: "Betón C25/30", price: 94.0 },
      { id: "c8", label: "Betón C30/37", price: 102.0 },
    ]
  },
  {
    id: "dmax22", name: "DRVENÉ KAMENIVO Dmax22",
    types: [
      { id: "c9", label: "Betón C16/20D", price: 82.0 },
      { id: "c10", label: "Betón C20/25", price: 88.0 },
      { id: "c11", label: "Betón C25/30", price: 92.0 },
    ]
  },
  {
    id: "dmax32", name: "DRVENÉ KAMENIVO Dmax32",
    types: [
      { id: "c12", label: "Betón C16/20D", price: 80.0 },
      { id: "c13", label: "Betón C20/25", price: 85.0 },
      { id: "c14", label: "Betón C25/30", price: 92.0 },
    ]
  },
  {
    id: "okr16", name: "OKRÚHLE KAMENIVO Dmax16",
    types: [
      { id: "c15", label: "Betón C12/15", price: 79.0 },
      { id: "c16", label: "Betón C20/25", price: 89.0 },
      { id: "c17", label: "Betón C25/30", price: 95.0 },
    ]
  },
  {
    id: "okr32", name: "OKRÚHLE KAMENIVO Dmax32",
    types: [
      { id: "c18", label: "Betón C16/20D", price: 81.0 },
      { id: "c19", label: "Betón C20/25", price: 87.0 },
      { id: "c20", label: "Betón C30/37", price: 104.0 },
    ]
  },
];

const DEFAULT_DELIVERY: DeliveryZone[] = [
  { id: "z1", name: "Štandardná zóna", ratePerKm: 1.8, truckCapacity: 7, pumpHourlyRate: 180, waitingRatePer15min: 8 },
];

const DEFAULT_SERVICES: Service[] = [
  { id: "s1", name: "PUMPA – Čerpanie betónu", description: "Čerpanie betónu pumpou s nastaviteľným časom", active: true },
  { id: "s2", name: "MIX – Mixér (autodomiesavač)", description: "Dodávka betónu autodomiesavačom (7m³/ks)", active: true },
  { id: "s3", name: "Hadica – predĺženie hadice", description: "Príplatok za predĺženie hadice (+15 €)", active: true },
  { id: "s4", name: "Vonkajšie umytie pumpy", description: "Umytie pumpy mimo prevádzky (+45 €)", active: true },
];

const DEFAULT_CLIENTS: Client[] = [
  { id: "cl1", name: "ZAPA Beton SK", logo: "", contact: "Peter Novák", phone: "+421 900 111 222", email: "info@zapa.sk", note: "Dlhodobý partner" },
  { id: "cl2", name: "2BH s.r.o.", logo: "", contact: "Martin Kováč", phone: "+421 911 222 333", email: "info@2bh.sk", note: "" },
  { id: "cl3", name: "STRABAG s.r.o.", logo: "", contact: "", phone: "", email: "", note: "" },
  { id: "cl4", name: "VÁHOSTAV – SK a.s.", logo: "", contact: "", phone: "", email: "", note: "" },
  { id: "cl5", name: "Eurovia SK a.s.", logo: "", contact: "", phone: "", email: "", note: "" },
  { id: "cl6", name: "SKANSKA SK a.s.", logo: "", contact: "", phone: "", email: "", note: "" },
];

function loadData<T>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaults;
  } catch {
    return defaults;
  }
}

function saveData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export const adminData = {
  getCategories: (): ConcreteCategory[] => loadData("msbeton_categories", DEFAULT_CATEGORIES),
  saveCategories: (data: ConcreteCategory[]) => saveData("msbeton_categories", data),

  getDelivery: (): DeliveryZone[] => loadData("msbeton_delivery", DEFAULT_DELIVERY),
  saveDelivery: (data: DeliveryZone[]) => saveData("msbeton_delivery", data),

  getServices: (): Service[] => loadData("msbeton_services", DEFAULT_SERVICES),
  saveServices: (data: Service[]) => saveData("msbeton_services", data),

  getClients: (): Client[] => loadData("msbeton_clients", DEFAULT_CLIENTS),
  saveClients: (data: Client[]) => saveData("msbeton_clients", data),

  generateId: () => Math.random().toString(36).slice(2, 10),
};
