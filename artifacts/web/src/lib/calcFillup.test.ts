import { describe, it, expect, test } from "vitest";
import { calcFillupNormal, calcFillupOverride } from "./calcFillup";

// Default hodnoty z prod (fillupMin=5, pumpCap=7, mixCap=9)
const FM = 5;
const PC = 7;
const MC = 9;

// ─── Pomocná kontrola čistého float výstupu ───────────────────────────────────
function assertCleanFloat(val: number) {
  const s = String(val);
  expect(s).not.toMatch(/9{6,}|0{6,}/); // žiadne 0.7999999... ani 1.0000001...
  expect(s.replace(/^\d+\./, "").length).toBeLessThanOrEqual(2); // max 2 des. miesta
}

// ─── REGRESSION: float edge cases ktoré spôsobili bugy v produkcii ────────────
describe("REGRESSION — float edge cases (každý tu = raz bol v produkcii bug)", () => {
  it("5 - 4.2 = 0.8 (nie 0.7999999999999998) [bug jul 2026, fix bddd7b4]", () => {
    const { fillupM3 } = calcFillupNormal(4.2, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(0.8);
    assertCleanFloat(fillupM3);
  });

  it("5 - 4.1 = 0.9 (nie 0.9000000000000004) [bug jun 2026, fix 0f0ff68]", () => {
    const { fillupM3 } = calcFillupNormal(4.1, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(0.9);
    assertCleanFloat(fillupM3);
  });

  it("5 - 3.75 = 1.25 (nie 1.3 — Math.round(12.5)=13 pasca) [fix bddd7b4]", () => {
    const { fillupM3 } = calcFillupNormal(3.75, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(1.25);
    assertCleanFloat(fillupM3);
  });
});

// ─── SMOKE: pumpa normálny výpočet — tabuľka vstup→výstup ────────────────────
describe("calcFillupNormal pumpa — smoke tabuľka", () => {
  // [qty, expectedFillupM3, expectedFillupTarget]
  const pumpaTable: [number, number, number][] = [
    // pásmo 1: qty < fillupMin=5 → doplní na 5
    [1,    4,    5],
    [2,    3,    5],
    [3,    2,    5],
    [3.1,  1.9,  5],
    [3.75, 1.25, 5],
    [4,    1,    5],
    [4.1,  0.9,  5],
    [4.2,  0.8,  5],  // REGRESSION
    [4.5,  0.5,  5],
    [4.9,  0.1,  5],
    // hranica: qty=5 → žiadny fillup
    [5,    0,    0],
    [6,    0,    0],
    // qty=pumpCap=7 → žiadny fillup (nie v pásme)
    [7,    0,    0],
    // pásmo 2: pumpCap < qty < 2*fillupMin → doplní na 10
    [7.1,  2.9,  10],
    [7.5,  2.5,  10],
    [8,    2,    10],
    [8.3,  1.7,  10],
    [9,    1,    10],
    [9.5,  0.5,  10],
    [9.9,  0.1,  10],
    // hranica: qty=10 → žiadny fillup
    [10,   0,    0],
    [12,   0,    0],
    [15,   0,    0],
  ];

  test.each(pumpaTable)(
    "qty=%s → fillupM3=%s, fillupTarget=%s",
    (qty, expectedM3, expectedTarget) => {
      const { fillupM3, fillupTarget } = calcFillupNormal(qty, FM, PC, MC, "pumpa");
      expect(fillupM3).toBe(expectedM3);
      expect(fillupTarget).toBe(expectedTarget);
      if (fillupM3 > 0) assertCleanFloat(fillupM3);
      if (fillupTarget > 0) expect(Number.isInteger(fillupTarget)).toBe(true);
    }
  );
});

// ─── SMOKE: mix normálny výpočet ─────────────────────────────────────────────
describe("calcFillupNormal mix — smoke tabuľka", () => {
  // [qty, expectedFillupM3, expectedFillupTarget]
  const mixTable: [number, number, number][] = [
    // pásmo 1: qty < 5
    [1,   4,   5],
    [3,   2,   5],
    [4.2, 0.8, 5],   // REGRESSION — mix aj pumpa
    [4.9, 0.1, 5],
    // hranica
    [5,   0,   0],
    [8,   0,   0],
    // qty=mixCap=9 → žiadny fillup (nie v pásme)
    [9,   0,   0],
    // pásmo 2: mixCap < qty < 2*fillupMin → doplní na 10
    [9.1, 0.9, 10],
    [9.5, 0.5, 10],
    [9.9, 0.1, 10],
    // hranica
    [10,  0,   0],
    [14,  0,   0],
  ];

  test.each(mixTable)(
    "qty=%s → fillupM3=%s, fillupTarget=%s",
    (qty, expectedM3, expectedTarget) => {
      const { fillupM3, fillupTarget } = calcFillupNormal(qty, FM, PC, MC, "mix");
      expect(fillupM3).toBe(expectedM3);
      expect(fillupTarget).toBe(expectedTarget);
      if (fillupM3 > 0) assertCleanFloat(fillupM3);
    }
  );
});

// ─── SMOKE: podmienky (override trucks) ──────────────────────────────────────
describe("calcFillupOverride — smoke tabuľka", () => {
  // [qty, trucks, expectedFillupM3, expectedFillupTarget]
  const overrideTable: [number, number, number, number][] = [
    // podnaplnené (qPT < fillupMin=5)
    [3,  1, 2,  5],   // 3/1=3 → 5-3=2, target=1×5=5
    [4,  1, 1,  5],
    [4.2, 1, 0.8, 5], // REGRESSION float
    [8,  2, 2,  10],  // 8/2=4 → 5-4=1, 1×2=2 trucks, target=2×5=10
    [20, 5, 5,  25],  // 20/5=4 → 5-4=1, 1×5=5, target=5×5=25
    // plné (qPT >= fillupMin) → žiadny fillup
    [5,  1, 0,  0],
    [8,  1, 0,  0],   // 8/1=8 >= 5
    [18, 2, 0,  0],   // 18/2=9 >= 5
    // pretažené (qPT > mixCap=9) → žiadny fillup
    [28, 3, 0,  0],   // 28/3=9.33 > 9
    [50, 5, 0,  0],   // 50/5=10 > 9
  ];

  test.each(overrideTable)(
    "qty=%s / %s áut → fillupM3=%s, fillupTarget=%s",
    (qty, trucks, expectedM3, expectedTarget) => {
      const { fillupM3, fillupTarget } = calcFillupOverride(qty, FM, MC, trucks);
      expect(fillupM3).toBe(expectedM3);
      expect(fillupTarget).toBe(expectedTarget);
      if (fillupM3 > 0) assertCleanFloat(fillupM3);
    }
  );
});
