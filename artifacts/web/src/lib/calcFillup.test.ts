import { describe, it, expect } from "vitest";
import { calcFillupNormal, calcFillupOverride } from "./calcFillup";

// Default hodnoty z prod (fillupMin=5, pumpCap=7, mixCap=9)
const FM = 5;
const PC = 7;
const MC = 9;

describe("calcFillupNormal — floating point edge cases", () => {
  // === REGRESSION: tieto prípady spôsobili bugy v produkcii ===

  it("5 - 4.2 = 0.8 (nie 0.7999999999999998)", () => {
    // Commit 0f0ff68: Math.round(*10)/10 opravil 0.9000...004 ale nie tento prípad
    // Commit bddd7b4: parseFloat(toFixed(2)) fixuje oba
    const { fillupM3 } = calcFillupNormal(4.2, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(0.8);
    expect(String(fillupM3)).not.toContain("9999");
  });

  it("5 - 4.1 = 0.9 (nie 0.9000000000000004)", () => {
    // Prvý float bug — opravený commit 0f0ff68 (qty=4.1, nie 3.1!)
    const { fillupM3 } = calcFillupNormal(4.1, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(0.9);
  });

  it("5 - 3.75 = 1.25 (nie 1.3 — Math.round(12.5)=13 trap)", () => {
    // Math.round(1.25 * 10) = Math.round(12.5) = 13 → 1.3 ← zakázaný vzorec
    const { fillupM3 } = calcFillupNormal(3.75, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(1.25);
  });

  it("5 - 4.5 = 0.5 (nie float drift)", () => {
    const { fillupM3 } = calcFillupNormal(4.5, FM, PC, MC, "mix");
    expect(fillupM3).toBe(0.5);
  });

  it("10 - 8.3 = 1.7 (pumpa druhé pásmo)", () => {
    // qty=8.3 > pumpCap=7, qty < 2*fillupMin=10 → fillup na 10
    const { fillupM3, fillupTarget } = calcFillupNormal(8.3, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(1.7);
    expect(fillupTarget).toBe(10);
  });

  it("10 - 9.1 = 0.9 (mix druhé pásmo)", () => {
    // qty=9.1 > mixCap=9, qty < 10 → fillup na 10
    const { fillupM3, fillupTarget } = calcFillupNormal(9.1, FM, PC, MC, "mix");
    expect(fillupM3).toBe(0.9);
    expect(fillupTarget).toBe(10);
  });
});

describe("calcFillupNormal — fillupTarget je vždy čisté celé číslo", () => {
  it("qty=4.2 → fillupTarget=5 (nie 5.0...)", () => {
    const { fillupTarget } = calcFillupNormal(4.2, FM, PC, MC, "pumpa");
    expect(fillupTarget).toBe(5);
    expect(Number.isInteger(fillupTarget)).toBe(true);
  });

  it("qty=8.3 pumpa → fillupTarget=10", () => {
    const { fillupTarget } = calcFillupNormal(8.3, FM, PC, MC, "pumpa");
    expect(fillupTarget).toBe(10);
    expect(Number.isInteger(fillupTarget)).toBe(true);
  });
});

describe("calcFillupNormal — žiadny fillup mimo pásma", () => {
  it("qty=5 (=fillupMin) → fillupM3=0", () => {
    const { fillupM3 } = calcFillupNormal(5, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(0);
  });

  it("qty=7 (=pumpCap) → fillupM3=0 (nie v pásme 7<qty<10)", () => {
    const { fillupM3 } = calcFillupNormal(7, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(0);
  });

  it("qty=15 (>2*fillupMin) → žiadny fillup", () => {
    const { fillupM3 } = calcFillupNormal(15, FM, PC, MC, "pumpa");
    expect(fillupM3).toBe(0);
  });
});

describe("calcFillupOverride — podmienky panel", () => {
  it("3m³ / 1 auto → fillup 2m³ (podnaplnené)", () => {
    const { fillupM3, fillupTarget } = calcFillupOverride(3, FM, MC, 1);
    expect(fillupM3).toBe(2);
    expect(fillupTarget).toBe(5);
  });

  it("20m³ / 5 áut → 5m³ fillup (každé podnaplnené 1m³)", () => {
    const { fillupM3 } = calcFillupOverride(20, FM, MC, 5);
    expect(fillupM3).toBe(5);
  });

  it("28m³ / 3 autá (RISK 9.33m³/auto) → 0 fillup", () => {
    // overloaded → no fill-up (admin chose fewer trucks intentionally)
    const { fillupM3 } = calcFillupOverride(28, FM, MC, 3);
    expect(fillupM3).toBe(0);
  });

  it("8m³ / 1 auto → 0 fillup (8 >= fillupMin=5)", () => {
    const { fillupM3 } = calcFillupOverride(8, FM, MC, 1);
    expect(fillupM3).toBe(0);
  });

  it("float precision: 4.2m³ / 1 auto → 0.8 (nie 0.7999...)", () => {
    const { fillupM3 } = calcFillupOverride(4.2, FM, MC, 1);
    expect(fillupM3).toBe(0.8);
    expect(String(fillupM3)).not.toContain("9999");
  });
});
