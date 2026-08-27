/**
 * Tests for patchClientPriceHistory — audit log pre zmeny cien a zliav klientov.
 * Spusti: pnpm --filter @workspace/web test
 */
import { describe, it, expect } from "vitest";
import { patchClientPriceHistory } from "./clientPriceAudit";
import type { ClientForAudit } from "./clientPriceAudit";

// Minimal audit client factory
const mkClient = (overrides: Partial<ClientForAudit> = {}): ClientForAudit => ({
  id: "c1",
  discountBeton: 0,
  discountDoprava: 0,
  discountSluzby: 0,
  discountCelkovo: 0,
  ...overrides,
});

describe("patchClientPriceHistory", () => {
  it("nový klient (bez oc) — žiadne priceHistory záznamy", () => {
    const nc = mkClient({ id: "new1" });
    const result = patchClientPriceHistory([nc], [], "Peter Iphone");
    expect(result[0].priceHistory).toBeUndefined();
  });

  it("žiadna zmena cien — priceHistory sa nepridá", () => {
    const c = mkClient({ discountBeton: 10, manualPrices: { s1: 100 } });
    const result = patchClientPriceHistory([c], [c], "Peter Iphone");
    expect(result[0].priceHistory).toBeUndefined();
  });

  it("zmena discountBeton — logguje type=discount, správne old/newValue", () => {
    const oc = mkClient({ discountBeton: 10 });
    const nc = mkClient({ discountBeton: 20 });
    const result = patchClientPriceHistory([nc], [oc], "Peter Iphone");
    const entries = result[0].priceHistory ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("discount");
    expect(entries[0].field).toBe("discountBeton");
    expect(entries[0].oldValue).toBe(10);
    expect(entries[0].newValue).toBe(20);
    expect(entries[0].by).toBe("Peter Iphone");
  });

  it("zmena viacerých zliav — každá má vlastný záznam", () => {
    const oc = mkClient({ discountBeton: 0, discountCelkovo: 0 });
    const nc = mkClient({ discountBeton: 15, discountCelkovo: 20 });
    const result = patchClientPriceHistory([nc], [oc], "Admin");
    const entries = result[0].priceHistory ?? [];
    expect(entries).toHaveLength(2);
    const fields = entries.map(e => e.field);
    expect(fields).toContain("discountBeton");
    expect(fields).toContain("discountCelkovo");
  });

  it("zmena manualPrices (s1) — logguje type=manualPrice", () => {
    const oc = mkClient({ manualPrices: { s1: 80 } });
    const nc = mkClient({ manualPrices: { s1: 100 } });
    const result = patchClientPriceHistory([nc], [oc], "Klára iPad");
    const entries = result[0].priceHistory ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("manualPrice");
    expect(entries[0].field).toBe("s1");
    expect(entries[0].oldValue).toBe(80);
    expect(entries[0].newValue).toBe(100);
  });

  it("nový manualPrices kľúč — oldValue=null", () => {
    const oc = mkClient({ manualPrices: {} });
    const nc = mkClient({ manualPrices: { km_rate_z1: 1.5 } });
    const result = patchClientPriceHistory([nc], [oc], "Admin");
    const entries = result[0].priceHistory ?? [];
    expect(entries[0].oldValue).toBeNull();
    expect(entries[0].newValue).toBe(1.5);
  });

  it("odstránený manualPrices kľúč — newValue=null", () => {
    const oc = mkClient({ manualPrices: { s2: 25 } });
    const nc = mkClient({ manualPrices: {} });
    const result = patchClientPriceHistory([nc], [oc], "Admin");
    const entries = result[0].priceHistory ?? [];
    expect(entries[0].field).toBe("s2");
    expect(entries[0].oldValue).toBe(25);
    expect(entries[0].newValue).toBeNull();
  });

  it("append do existujúceho priceHistory — nie replace", () => {
    const existing = [{ type: "discount" as const, at: "2026-01-01T00:00:00Z", by: "Admin", field: "discountBeton", oldValue: 0, newValue: 5 }];
    const oc = mkClient({ discountBeton: 5, priceHistory: existing });
    const nc = mkClient({ discountBeton: 10, priceHistory: existing });
    const result = patchClientPriceHistory([nc], [oc], "Admin");
    const entries = result[0].priceHistory ?? [];
    // Pôvodný + nový
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(existing[0]);
    expect(entries[1].newValue).toBe(10);
  });

  it("viac klientov — diff iba zmenených", () => {
    const c1old = mkClient({ id: "c1", discountBeton: 0 });
    const c2old = mkClient({ id: "c2", discountBeton: 10 });
    const c1new = mkClient({ id: "c1", discountBeton: 20 }); // zmenený
    const c2new = mkClient({ id: "c2", discountBeton: 10 }); // bez zmeny
    const result = patchClientPriceHistory([c1new, c2new], [c1old, c2old], "Admin");
    expect(result[0].priceHistory).toHaveLength(1);
    expect(result[1].priceHistory).toBeUndefined();
  });

  it("floating point tolerancia — zmena < 0.001 sa neloguje", () => {
    const oc = mkClient({ discountBeton: 10.0001 });
    const nc = mkClient({ discountBeton: 10.0002 });
    const result = patchClientPriceHistory([nc], [oc], "Admin");
    expect(result[0].priceHistory).toBeUndefined();
  });
});
