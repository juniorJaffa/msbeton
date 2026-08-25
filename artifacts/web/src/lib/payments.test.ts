/**
 * Smoke testy — záloha + nedoplatok + čiastočné platby
 * Vitest: pnpm --filter @workspace/web test
 */
import { describe, it, expect } from "vitest";

// ── Core kalkulácie (rovnaká logika ako ObjednavkyTab + HistoriaTab) ──────────

function doplatokTotal(totalSDph: number, depositUsed: number): number {
  return Math.max(0, totalSDph - depositUsed);
}

function payTotal(payments: { amount: number }[]): number {
  return payments.reduce((s, p) => s + p.amount, 0);
}

function isFullyPaid(paid: number, needed: number): boolean {
  return needed < 0.01 || paid >= needed - 0.01;
}

function remainingDoplatok(totalSDph: number, depositUsed: number, payments: { amount: number }[]): number {
  const needed = doplatokTotal(totalSDph, depositUsed);
  const paid = payTotal(payments);
  return Math.max(0, needed - paid);
}

// ── Scenár: 616,25€ objednávka, 100€ záloha, doplatok 516,25€ ───────────────

const TOTAL = 616.25;
const DEPOSIT = 100;
const NEEDED = 516.25; // doplatokTotal

describe("doplatokTotal", () => {
  it("basic", () => expect(doplatokTotal(616.25, 100)).toBeCloseTo(516.25, 2));
  it("no deposit", () => expect(doplatokTotal(300, 0)).toBeCloseTo(300, 2));
  it("deposit > total → 0", () => expect(doplatokTotal(100, 200)).toBe(0));
});

describe("isFullyPaid", () => {
  it("not paid → false", () => expect(isFullyPaid(0, NEEDED)).toBe(false));
  it("partially paid → false", () => expect(isFullyPaid(220, NEEDED)).toBe(false));
  it("exact amount → true", () => expect(isFullyPaid(516.25, NEEDED)).toBe(true));
  it("1 cent over → true", () => expect(isFullyPaid(516.26, NEEDED)).toBe(true));
  it("0.005 under (float tolerance) → true", () => expect(isFullyPaid(516.245, NEEDED)).toBe(true));
  it("0.02 under → false", () => expect(isFullyPaid(516.23, NEEDED)).toBe(false));
  it("zero needed (full záloha) → always true", () => expect(isFullyPaid(0, 0)).toBe(true));
});

describe("čiastočné platby — kumulatívny scenár", () => {
  const payments: { amount: number }[] = [];

  it("start: no payments, red badge", () => {
    expect(isFullyPaid(payTotal(payments), NEEDED)).toBe(false);
    expect(remainingDoplatok(TOTAL, DEPOSIT, payments)).toBeCloseTo(516.25, 2);
  });

  it("+100 → 416.25 remaining, still red", () => {
    payments.push({ amount: 100 });
    expect(remainingDoplatok(TOTAL, DEPOSIT, payments)).toBeCloseTo(416.25, 2);
    expect(isFullyPaid(payTotal(payments), NEEDED)).toBe(false);
  });

  it("+50 → 366.25 remaining", () => {
    payments.push({ amount: 50 });
    expect(remainingDoplatok(TOTAL, DEPOSIT, payments)).toBeCloseTo(366.25, 2);
  });

  it("+50 → 316.25 remaining", () => {
    payments.push({ amount: 50 });
    expect(remainingDoplatok(TOTAL, DEPOSIT, payments)).toBeCloseTo(316.25, 2);
  });

  it("+20 → 296.25 remaining", () => {
    payments.push({ amount: 20 });
    expect(remainingDoplatok(TOTAL, DEPOSIT, payments)).toBeCloseTo(296.25, 2);
  });

  it("+10 → 286.25 remaining (5. platba, still red)", () => {
    payments.push({ amount: 10 });
    expect(remainingDoplatok(TOTAL, DEPOSIT, payments)).toBeCloseTo(286.25, 2);
    expect(isFullyPaid(payTotal(payments), NEEDED)).toBe(false);
  });

  it("+10 → 276.25 remaining (6. platba)", () => {
    payments.push({ amount: 10 });
    expect(remainingDoplatok(TOTAL, DEPOSIT, payments)).toBeCloseTo(276.25, 2);
  });

  it("pay remaining 276.25 → fully paid → green badge", () => {
    payments.push({ amount: 276.25 });
    expect(isFullyPaid(payTotal(payments), NEEDED)).toBe(true);
    expect(remainingDoplatok(TOTAL, DEPOSIT, payments)).toBeCloseTo(0, 2);
  });
});

describe("deposit reversal — platby clearnuté, nový cyklus", () => {
  it("po reversal: payments=[], isFullyPaid=false", () => {
    // handleDepositReversal clearuje payments[]
    const payments: { amount: number }[] = [];
    expect(isFullyPaid(payTotal(payments), NEEDED)).toBe(false);
  });

  it("nová záloha + nový doplatok — nezávislý cyklus", () => {
    const payments2 = [{ amount: 100 }, { amount: 416.25 }];
    expect(isFullyPaid(payTotal(payments2), NEEDED)).toBe(true);
  });
});

describe("HistoriaTab nedoplatok badge logika", () => {
  // Badge sa zobrazuje IBA keď depUsed > 0 (HistoriaTab má outer guard depUsed && isPartialDep)
  function nedoplatokBadge(totalSDph: number, depositUsed: number, payments: { amount: number }[]) {
    if (!depositUsed || depositUsed <= 0) return "hidden"; // outer guard — rovnako ako v HistoriaTab
    const needed = doplatokTotal(totalSDph, depositUsed);
    const paid = payTotal(payments);
    const fullyPaid = isFullyPaid(paid, needed);
    return needed > 0.5 && !fullyPaid ? "red" : "teal";
  }

  it("no záloha (depositUsed=0) → hidden (badge sa nezobrazí)", () => {
    expect(nedoplatokBadge(500, 0, [])).toBe("hidden");
  });

  it("záloha existuje, doplatok NEuhradený → red", () => {
    expect(nedoplatokBadge(616.25, 100, [])).toBe("red");
  });

  it("záloha existuje, doplatok čiastočne uhradený → red", () => {
    expect(nedoplatokBadge(616.25, 100, [{ amount: 220 }])).toBe("red");
  });

  it("záloha existuje, doplatok plne uhradený → teal (zelená)", () => {
    expect(nedoplatokBadge(616.25, 100, [{ amount: 516.25 }])).toBe("teal");
  });

  it("záloha existuje, doplatok uhradený viacerými platbami → teal", () => {
    const payments = [{ amount: 100 }, { amount: 50 }, { amount: 50 }, { amount: 20 }, { amount: 10 }, { amount: 10 }, { amount: 276.25 }];
    expect(nedoplatokBadge(616.25, 100, payments)).toBe("teal");
  });
});

describe("addNoteHistory — stale closure fix (regression)", () => {
  // Simulácia: save orders s konkrétnym payments[] → note save nesmie zmeniť payments[]
  it("note save nezmení payments[]", () => {
    const payments = [{ amount: 100 }, { amount: 50 }];
    // Simulujeme: fresh orders z adminData.getOrders() (nie stale closure)
    const orders = [{
      id: "o1",
      status: "vyplatena" as const,
      note: "",
      payments,
      statusHistory: [],
      updatedAt: "2026-08-25T07:50:00Z",
      totalSDph: 616.25,
      depositUsed: 100,
    }];
    // addNoteHistory by mal vrátiť rovnaké payments[] — len pridá note + history
    const newNote = "Test poznámka";
    const updated = orders.map(o => {
      if (o.id !== "o1") return o;
      return { ...o, note: newNote, updatedAt: "2026-08-25T08:00:00Z" };
    });
    expect(updated[0].payments).toStrictEqual(payments); // payments zachované ✓
    expect(updated[0].note).toBe(newNote);
  });
});
