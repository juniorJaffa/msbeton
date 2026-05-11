import { adminApi } from "./api";
export { adminApi };

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
  truckCapacity: number;             // kapacita mixéra (m³), default 9
  pumpTruckCapacity?: number;        // kapacita pumpy (m³), default 7
  pumpHourlyRate: number;
  waitingRatePer15min: number;       // čakačka mix (€/15 min)
  waitingRatePer15minPumpa?: number; // čakačka pumpa (€/15 min), fallback na waitingRatePer15min
  pricingType?: "standard" | "km" | "auto"; // typ výpočtu dopravy
  ratePerTruck?: number;             // pre "auto" typ – paušál za vozidlo
  minKm?: number;           // km/auto: min. km obsluhy (km: zaokrúhlená fakturácia; auto: info)
  maxKm?: number;           // km/auto: max. polomer obsluhy (info)
  minimumFeeKm?: number;    // km typ: min. finančná doprava (€/auto)
  minimumFeeAuto?: number;  // auto typ: min. finančná doprava (€/auto)
}

export interface Service {
  id: string;
  name: string;
  unit: string;
  price: number;
  description: string;
  active: boolean;
  activePeriodFrom?: string;
  activePeriodTo?: string;
  maxMeters?: number;             // max bm pre hadice
  serviceMode?: "pumpa" | "mix";  // iba pre daný režim kalkulačky
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  loginId: string;
  password: string;
  discountBeton: number;
  discountDoprava: number;
  discountSluzby: number;
  discountCelkovo: number;
  canHotovost: boolean;
  canPridatBeton: boolean;
  active: boolean;
  deliveryZoneId?: string;     // ID zóny dopravy (z adminData.getDelivery()), default = prvá zóna
  canZimneOpatrenia?: boolean; // zobrazí a auto-zahrnie zimné opatrenia
  hotovostDph?: number;        // vlastná DPH pre hotovosť (napr. 0.20), default 0.20
  manualPrices?: Record<string, number>; // manuálne ceny per položka (ID → €), override zľavovej ceny
  isOwner?: boolean; // vlastník / hlavný účet — nedá sa vymazať
  sharedLink?: string; // zdieľaný odkaz (Google Sheet, PDF, prezentácia...)
}

export interface Order {
  id: string;
  createdAt: string;
  status: "nova" | "potvrdena" | "odoslana" | "vyuctovana" | "vyplatena" | "zrusena" | "vybavena";
  clientName: string;
  clientId?: string;
  company?: string;
  phone?: string;
  email?: string;
  note?: string;
  tab: "pumpa" | "mix" | "vlastnadoprava";
  concreteType: string;
  quantity: number;
  totalQty: number;
  address?: string;
  km?: number;
  priceMode: "faktura" | "hotovost";
  totalBezDph: number;
  totalSDph: number;
  breakdown: string;
  fillupM3?: number;
  fillupTarget?: number;
  deliveryZoneType?: string;   // "standard" | "km" | "auto"
  deliveryZoneName?: string;
  discountBeton?: number;
  discountDoprava?: number;
  discountSluzby?: number;
  discountCelkovo?: number;
}

export interface ClientAccount {
  id: string;
  clientId: string;
  password: string;
  name: string;
  discountPct: number;
  discountGroup: string;
  active: boolean;
}

export interface TransportPricingZone {
  id: string;
  fromKm: number;
  toKm: number;
  ratePerM3: number;
}

export interface TransportSettings {
  minimumFee: number;
  winterSurcharge: number;
  waitingRatePer15min: number;
  minimumLoadM3: number;
  dph?: number;
  defaultHotovostDph?: number;  // default DPH hotovosť pre klientov, default 0.20
}

const DEFAULT_CATEGORIES: ConcreteCategory[] = [
  {
    id: "dmax16d", name: "DRVENÉ KAMENIVO Dmax16",
    types: [
      { id: "c1", label: "Betón CBGM, C8/10", price: 66.67 },
      { id: "c2", label: "Betón C12/15D", price: 81.25 },
      { id: "c3", label: "Betón C16/20D", price: 85.42 },
      { id: "c4", label: "Betón C20/25D", price: 89.58 },
      { id: "c5", label: "Betón C25/30D", price: 93.75 },
      { id: "c6", label: "Betón C30/37D", price: 97.92 },
    ]
  },
  {
    id: "dmax8d", name: "DRVENÉ KAMENIVO Dmax8",
    types: [
      { id: "c7", label: "Betón C16/20D", price: 88.54 },
      { id: "c8", label: "Betón C20/25D", price: 93.75 },
      { id: "c9", label: "Betón C25/30D", price: 98.96 },
    ]
  },
  {
    id: "dmax4d", name: "DRVENÉ KAMENIVO Dmax4",
    types: [
      { id: "c10", label: "Betón C16/20D", price: 90.63 },
      { id: "c11", label: "Betón C20/25D", price: 95.63 },
      { id: "c12", label: "Betón C25/30D", price: 100.63 },
    ]
  },
  {
    id: "dmax16r", name: "RIEČNE KAMENIVO Dmax16",
    types: [
      { id: "c13", label: "Betón C12/15R", price: 95.83 },
      { id: "c14", label: "Betón C16/20R", price: 98.96 },
      { id: "c15", label: "Betón C20/25R", price: 102.08 },
      { id: "c16", label: "Betón C25/30R", price: 107.29 },
      { id: "c17", label: "Betón C25/30R vodostavebný", price: 109.38 },
      { id: "c18", label: "Betón C25/30R podlahový", price: 110.42 },
      { id: "c19", label: "Betón C30/37R", price: 111.46 },
      { id: "c20", label: "Betón C30/37R vodostavebný", price: 114.58 },
      { id: "c21", label: "Betón C30/37R podlahový", price: 116.67 },
      { id: "c22", label: "Betón C30/37R XF4", price: 120.83 },
      { id: "c23", label: "Betón C37/45R", price: 129.17 },
      { id: "c24", label: "Betón C45/55R", price: 143.75 },
      { id: "c25", label: "Betón CB3", price: 116.67 },
    ]
  },
  {
    id: "dmax8r", name: "RIEČNE KAMENIVO Dmax8",
    types: [
      { id: "c26", label: "Betón C16/20R", price: 100.00 },
      { id: "c27", label: "Betón C20/25R", price: 105.21 },
      { id: "c28", label: "Betón C25/30R", price: 110.42 },
    ]
  },
  {
    id: "dmax4r", name: "RIEČNE KAMENIVO Dmax4",
    types: [
      { id: "c29", label: "Betón C16/20R", price: 102.08 },
      { id: "c30", label: "Betón C20/25R", price: 107.29 },
      { id: "c31", label: "Betón C25/30R", price: 112.50 },
    ]
  },
  {
    id: "anhydrit", name: "Anhydrit",
    types: [
      { id: "c32", label: "Anhydrit 20", price: 234.38 },
      { id: "c33", label: "Anhydrit 25", price: 244.80 },
    ]
  },
  {
    id: "prisady", name: "Dodatočné prísady",
    types: [
      { id: "c34", label: "Vlákna 0,8–1 kg", price: 9.38 },
      { id: "c35", label: "Drôtiky 1 Bal – 20 kg/m³", price: 32.50 },
    ]
  },
];

const DEFAULT_DELIVERY: DeliveryZone[] = [
  { id: "z1", name: "Štandardná zóna", ratePerKm: 1.8, truckCapacity: 7, pumpHourlyRate: 112.50, waitingRatePer15min: 8 },
];

const DEFAULT_SERVICES: Service[] = [
  { id: "s1", name: "Čerpanie betónu", unit: "1 hod.", price: 112.50, description: "Čerpanie betónu pumpou, od príjazdu do odjazdu zo stavby", active: true },
  { id: "s2", name: "Rozbehová chémia", unit: "1 ks", price: 31.25, description: "Chemická prísada pre spustenie betónpumpy", active: true },
  { id: "s3", name: "Umývanie mimo stavby", unit: "1 x", price: 56.25, description: "Umytie betónpumpy mimo miesta prevádzky", active: true },
  { id: "s4", name: "Čakačka mixéra", unit: "15 min.", price: 8.00, description: "Čakanie nad 30 min sa účtuje každých začatých 15 min", active: true, serviceMode: "mix" as const },
  { id: "s7", name: "Čakačka pumpy", unit: "15 min. / ks", price: 8.00, description: "Čakanie pumpy, účtuje sa za každý kus (15 min)", active: true, serviceMode: "pumpa" as const },
  { id: "s5", name: "Prídavné hadice", unit: "1 m", price: 10.00, description: "Príplatok za každý meter predĺženia výložníkovej hadice", active: true, maxMeters: 100 },
  { id: "s6", name: "Zimné opatrenia", unit: "m³", price: 5.00, description: "Príplatok za zimné opatrenia betónu (15.11.–15.3.), účtuje sa za každý m³ betónu", active: true, activePeriodFrom: "11-15", activePeriodTo: "03-15" },
];

const DEFAULT_TRANSPORT_ZONES: TransportPricingZone[] = [
  { id: "tz1",  fromKm: 0,  toKm: 6,  ratePerM3: 7.50 },
  { id: "tz2",  fromKm: 6,  toKm: 8,  ratePerM3: 8.13 },
  { id: "tz3",  fromKm: 8,  toKm: 10, ratePerM3: 9.38 },
  { id: "tz4",  fromKm: 10, toKm: 12, ratePerM3: 10.00 },
  { id: "tz5",  fromKm: 12, toKm: 14, ratePerM3: 10.63 },
  { id: "tz6",  fromKm: 14, toKm: 16, ratePerM3: 11.25 },
  { id: "tz7",  fromKm: 16, toKm: 18, ratePerM3: 11.88 },
  { id: "tz8",  fromKm: 18, toKm: 20, ratePerM3: 12.50 },
  { id: "tz9",  fromKm: 20, toKm: 22, ratePerM3: 13.75 },
  { id: "tz10", fromKm: 22, toKm: 24, ratePerM3: 15.00 },
  { id: "tz11", fromKm: 24, toKm: 26, ratePerM3: 15.63 },
  { id: "tz12", fromKm: 26, toKm: 28, ratePerM3: 16.25 },
  { id: "tz13", fromKm: 28, toKm: 30, ratePerM3: 16.88 },
  { id: "tz14", fromKm: 30, toKm: 32, ratePerM3: 17.50 },
  { id: "tz15", fromKm: 32, toKm: 34, ratePerM3: 18.75 },
  { id: "tz16", fromKm: 34, toKm: 36, ratePerM3: 20.00 },
  { id: "tz17", fromKm: 36, toKm: 38, ratePerM3: 21.25 },
  { id: "tz18", fromKm: 38, toKm: 40, ratePerM3: 22.50 },
  { id: "tz19", fromKm: 40, toKm: 44, ratePerM3: 23.75 },
  { id: "tz20", fromKm: 44, toKm: 48, ratePerM3: 25.00 },
  { id: "tz21", fromKm: 48, toKm: 52, ratePerM3: 27.50 },
  { id: "tz22", fromKm: 52, toKm: 56, ratePerM3: 30.00 },
  { id: "tz23", fromKm: 56, toKm: 60, ratePerM3: 32.50 },
  { id: "tz24", fromKm: 60, toKm: 70, ratePerM3: 35.00 },
  { id: "kmv4rtdr", fromKm: 70, toKm: 100, ratePerM3: 40.00 },
];

const DEFAULT_TRANSPORT_SETTINGS: TransportSettings = {
  minimumFee: 62.50,
  winterSurcharge: 5.00,
  waitingRatePer15min: 8.33,
  minimumLoadM3: 5,
  dph: 0.23,
};

const DEFAULT_CLIENT_ACCOUNTS: ClientAccount[] = [
  { id: "ca1", clientId: "20", password: "1234", name: "Testovací klient", discountPct: 20, discountGroup: "B", active: true },
];

// Systémový vlastník — vždy prvý, nedá sa zmazať ani presunúť isOwner inam
export const SYSTEM_OWNER_ID = "system-owner";
const SYSTEM_OWNER_CLIENT: Client = {
  id: SYSTEM_OWNER_ID,
  isOwner: true,
  firstName: "Peter",
  lastName: "Staňo",
  company: "MS-BETON",
  email: "peter@msbeton.sk",
  phone: "0909205205",
  loginId: "",
  password: "",
  discountBeton: 0,
  discountDoprava: 0,
  discountSluzby: 0,
  discountCelkovo: 0,
  canHotovost: true,
  canPridatBeton: true,
  active: true,
};

function ensureOwner(clients: Client[]): Client[] {
  const stripped = clients.map(c => c.id !== SYSTEM_OWNER_ID ? { ...c, isOwner: false } : c);
  if (stripped.some(c => c.id === SYSTEM_OWNER_ID)) return stripped;

  // Skúsi nájsť existujúceho klienta, ktorý je MS-BETON vlastníkom, a povýšiť ho
  const matchIdx = stripped.findIndex(c =>
    c.email === SYSTEM_OWNER_CLIENT.email ||
    (c.firstName === SYSTEM_OWNER_CLIENT.firstName &&
     c.lastName  === SYSTEM_OWNER_CLIENT.lastName &&
     c.company   === SYSTEM_OWNER_CLIENT.company)
  );
  if (matchIdx >= 0) {
    const promoted = { ...stripped[matchIdx], id: SYSTEM_OWNER_ID, isOwner: true };
    return [promoted, ...stripped.filter((_, i) => i !== matchIdx)];
  }

  return [SYSTEM_OWNER_CLIENT, ...stripped];
}

// Klienti s prístupom do kalkulačky (login + zľava) – nie partnerské spoločnosti
const DEFAULT_CLIENTS: Client[] = [SYSTEM_OWNER_CLIENT];

const ARRAY_KEYS = new Set(["msbeton_categories", "msbeton_delivery", "msbeton_services", "msbeton_clients", "msbeton_transport_zones", "msbeton_client_accounts", "msbeton_orders"]);

function loadData<T>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as T;
    // Ak očakávame pole ale dostaneme niečo iné, použi defaults
    if (ARRAY_KEYS.has(key) && !Array.isArray(parsed)) return defaults;
    // Migrácia: ak transport_zones nemá zónu pokrývajúcu 70+ km, doplníme ju
    if (key === "msbeton_transport_zones" && Array.isArray(parsed)) {
      const zones = parsed as TransportPricingZone[];
      const hasHigh = zones.some(z => z.toKm >= 100);
      if (!hasHigh) {
        const updated = [...zones, { id: "kmv4rtdr", fromKm: 70, toKm: 100, ratePerM3: 40.00 }]
          .sort((a, b) => a.fromKm - b.fromKm);
        localStorage.setItem(key, JSON.stringify(updated));
        return updated as unknown as T;
      }
    }
    // Pre objekty (nie polia): merge defaults + parsed, aby nové polia mali fallback hodnotu
    if (!Array.isArray(parsed) && typeof parsed === "object" && parsed !== null && typeof defaults === "object" && defaults !== null) {
      return { ...(defaults as object), ...(parsed as object) } as T;
    }
    return parsed;
  } catch {
    return defaults;
  }
}

function saveData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export async function syncFromServer(): Promise<void> {
  try {
    const [cats, delivery, services, clients, tzones, tsettings, orders] = await Promise.all([
      adminApi.getCategories(),
      adminApi.getDelivery(),
      adminApi.getServices(),
      adminApi.getClients(),
      adminApi.getTransportZones(),
      adminApi.getTransportSettings(),
      adminApi.getOrders(),
    ]);
    const hasData = (v: unknown) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);
    const hasDataOrEmpty = (v: unknown) => v !== null && v !== undefined && Array.isArray(v);
    let updated = false;
    if (hasData(cats?.data)) { saveData("msbeton_categories", cats!.data); updated = true; }
    else { const local = loadData<unknown>("msbeton_categories", null); if (local) adminApi.saveCategories(local); }
    if (hasData(delivery?.data)) { saveData("msbeton_delivery", delivery!.data); updated = true; }
    else { const local = loadData<unknown>("msbeton_delivery", null); if (local) adminApi.saveDelivery(local); }
    if (hasData(services?.data)) { saveData("msbeton_services", services!.data); updated = true; }
    else { const local = loadData<unknown>("msbeton_services", null); if (local) adminApi.saveServices(local); }
    if (hasDataOrEmpty(clients?.data)) { saveData("msbeton_clients", clients!.data); updated = true; }
    else { const local = loadData<Client[]>("msbeton_clients", []); if (local.length > 0) adminApi.saveClients(local); }
    if (hasData(tzones?.data)) { saveData("msbeton_transport_zones", tzones!.data); updated = true; }
    else { const local = loadData<unknown>("msbeton_transport_zones", null); if (local) adminApi.saveTransportZones(local); }
    if (hasData(tsettings?.data)) { saveData("msbeton_transport_settings", tsettings!.data); updated = true; }
    else { const local = loadData<unknown>("msbeton_transport_settings", null); if (local) adminApi.saveTransportSettings(local); }
    if (hasDataOrEmpty(orders?.data)) { saveData("msbeton_orders", orders!.data); updated = true; }
    if (updated) window.dispatchEvent(new Event("admin-data-synced"));
  } catch {
  }
}

export const adminData = {
  getCategories: (): ConcreteCategory[] => loadData("msbeton_categories", DEFAULT_CATEGORIES),
  saveCategories: (data: ConcreteCategory[]) => {
    saveData("msbeton_categories", data);
    adminApi.saveCategories(data);
  },

  getDelivery: (): DeliveryZone[] => loadData("msbeton_delivery", DEFAULT_DELIVERY),
  saveDelivery: (data: DeliveryZone[]) => {
    saveData("msbeton_delivery", data);
    adminApi.saveDelivery(data);
  },

  getServices: (): Service[] => loadData("msbeton_services", DEFAULT_SERVICES),
  saveServices: (data: Service[]) => {
    saveData("msbeton_services", data);
    adminApi.saveServices(data);
  },

  getClients: (): Client[] => ensureOwner(loadData("msbeton_clients", DEFAULT_CLIENTS)),
  saveClients: (data: Client[]) => {
    const safe = ensureOwner(data);
    saveData("msbeton_clients", safe);
    adminApi.saveClients(safe);
    window.dispatchEvent(new Event("admin-data-synced"));
  },

  getTransportZones: (): TransportPricingZone[] => loadData("msbeton_transport_zones", DEFAULT_TRANSPORT_ZONES),
  saveTransportZones: (data: TransportPricingZone[]) => {
    saveData("msbeton_transport_zones", data);
    adminApi.saveTransportZones(data);
  },

  getTransportSettings: (): TransportSettings => loadData("msbeton_transport_settings", DEFAULT_TRANSPORT_SETTINGS),
  saveTransportSettings: (data: TransportSettings) => {
    saveData("msbeton_transport_settings", data);
    adminApi.saveTransportSettings(data);
  },

  getClientAccounts: (): ClientAccount[] => loadData("msbeton_client_accounts", DEFAULT_CLIENT_ACCOUNTS),
  saveClientAccounts: (data: ClientAccount[]) => {
    saveData("msbeton_client_accounts", data);
    adminApi.saveClientAccounts(data);
  },

  getOrders: (): Order[] => loadData("msbeton_orders", []),
  saveOrders: (data: Order[]) => {
    saveData("msbeton_orders", data);
    adminApi.saveOrders(data);
  },

  generateId: () => Math.random().toString(36).slice(2, 10),
};
