/**
 * Audit log pre zmeny cien a zliav klientov.
 * Pure utility — bez UI závislostí, testovateľné cez Vitest.
 *
 * Používa sa v adminData.saveClients() a exportuje sa pre testy.
 * Server-side: priceHistory je appendOnlyField v mergeItems → pri concurrent PUT sa unionuje, nestráca.
 */

export interface PriceHistoryEntry {
  type: "discount" | "manualPrice" | "reset";
  at: string;        // ISO timestamp
  by: string;        // device label admina
  field: string;     // napr. "discountBeton", "s1", "km_rate_nixd83u6"
  oldValue: number | null;  // null = kľúč neexistoval
  newValue: number | null;  // null = kľúč bol odstránený
}

// Subset Client polí potrebných pre diff — bez UI/hook závislostí
export interface ClientForAudit {
  id: string;
  discountBeton?: number;
  discountDoprava?: number;
  discountSluzby?: number;
  discountCelkovo?: number;
  manualPrices?: Record<string, number>;
  priceHistory?: PriceHistoryEntry[];
}

const DISC_FIELDS = ["discountBeton", "discountDoprava", "discountSluzby", "discountCelkovo"] as const;

/**
 * Porovná incoming vs current klientov, vráti incoming s doplnenými priceHistory zápismi.
 * Každá zmena discountBeton/Doprava/Sluzby/Celkovo alebo manualPrices = vlastný záznam.
 * Žiadna zmena = klient vrátený nezmenený (bez priceHistory injekcie).
 */
export function patchClientPriceHistory<T extends ClientForAudit>(
  incoming: T[],
  current: T[],
  by: string,
): T[] {
  const now = new Date().toISOString();
  return incoming.map(nc => {
    const oc = current.find(c => c.id === nc.id);
    if (!oc) return nc; // nový klient — žiadne diff

    const entries: PriceHistoryEntry[] = [];

    // Zľavy (discountBeton, discountDoprava, discountSluzby, discountCelkovo)
    for (const field of DISC_FIELDS) {
      const oldVal = (oc[field] as number | undefined) ?? 0;
      const newVal = (nc[field] as number | undefined) ?? 0;
      if (Math.abs(oldVal - newVal) > 0.001) {
        entries.push({ type: "discount", at: now, by, field, oldValue: oldVal, newValue: newVal });
      }
    }

    // manualPrices — každý zmenený kľúč vlastný záznam
    const oldMp = oc.manualPrices ?? {};
    const newMp = nc.manualPrices ?? {};
    const allKeys = new Set([...Object.keys(oldMp), ...Object.keys(newMp)]);
    for (const k of allKeys) {
      const oldVal = oldMp[k] ?? null;
      const newVal = newMp[k] ?? null;
      if (oldVal !== newVal) {
        entries.push({ type: "manualPrice", at: now, by, field: k, oldValue: oldVal, newValue: newVal });
      }
    }

    if (!entries.length) return nc;
    // append do existujúcich — server appendOnlyField unionuje pri concurrent PUT
    return { ...nc, priceHistory: [...(nc.priceHistory ?? []), ...entries] };
  });
}
