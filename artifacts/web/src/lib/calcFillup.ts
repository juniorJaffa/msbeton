/**
 * Čistá fillup logika extrahovaná z calcTransport() v Calculator.tsx.
 * Testovaná v calcFillup.test.ts — pri každej zmene overiť testy.
 *
 * POZOR na floating point: 5 - 4.2 = 0.7999999999999998 v JS.
 * Math.round(0.7999... * 100) / 100 nie je spoľahlivé → použiť parseFloat+toFixed(2).
 * Math.round(0.7999... * 10) / 10 = 8/10 = 0.8 funguje, ale 1.25 → 1.3 (Math.round(12.5)=13).
 * Jediné spoľahlivé riešenie: parseFloat(x.toFixed(2)).
 */

export interface FillupResult {
  fillupM3: number;
  fillupTarget: number;
}

/**
 * Normálny výpočet (bez podmienok).
 * Vracia { fillupM3, fillupTarget }.
 * fillupTarget = čisté celé číslo (fillupMin alebo 2*fillupMin) — NIKDY desatinné.
 */
export function calcFillupNormal(
  qty: number,
  fillupMin: number,
  pumpCap: number,
  mixCap: number,
  tabType: "pumpa" | "mix"
): FillupResult {
  let fillupM3 = 0;
  let fillupTarget = 0;
  const cap = tabType === "pumpa" ? pumpCap : mixCap;
  if (qty < fillupMin) {
    fillupM3 = fillupMin - qty;
    fillupTarget = fillupMin;
  } else if (qty > cap && qty < 2 * fillupMin) {
    fillupM3 = 2 * fillupMin - qty;
    fillupTarget = 2 * fillupMin;
  }
  return { fillupM3: parseFloat(fillupM3.toFixed(2)), fillupTarget };
}

/**
 * Podmienky výpočet (overrideTrucks definované — admin podmienky panel).
 */
export function calcFillupOverride(
  qty: number,
  fillupMin: number,
  mixCap: number,
  overrideTrucks: number
): FillupResult {
  const qtyPerTruck = qty / overrideTrucks;
  let fillupPerTruck = 0;
  let fillupTarget = 0;
  if (qtyPerTruck < fillupMin) {
    fillupPerTruck = fillupMin - qtyPerTruck;
    fillupTarget = overrideTrucks * fillupMin;
  }
  // qtyPerTruck > mixCap → overloaded, no fill-up (admin chose fewer trucks intentionally)
  const fillupM3 = parseFloat((Math.max(0, fillupPerTruck) * overrideTrucks).toFixed(2));
  return { fillupM3, fillupTarget };
}
