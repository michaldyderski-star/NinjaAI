import { describe, expect, it } from "vitest";
import {
  amountToPercent,
  calculatePlan,
  distributeRemainder,
  resetShares,
  splitBudget,
} from "./calc";
import { emptyPlan, examplePlan, type ChannelAllocation } from "./model";

const withShares = (shares: number[], rois: number[] = []): ChannelAllocation[] =>
  emptyPlan().allocations.map((a, i) => ({
    ...a,
    sharePercent: shares[i] ?? 0,
    expectedRoiPercent: rois[i] ?? 0,
  }));

describe("calculatePlan", () => {
  it("computes amount per channel (PRD §12)", () => {
    const r = calculatePlan(100_000_00, withShares([25]));
    expect(r.channels[0].amount).toBe(25_000_00);
  });

  it("computes profit and final value for ROI 200% (PRD §12)", () => {
    const r = calculatePlan(100_000_00, withShares([25], [200]));
    expect(r.channels[0].profit).toBe(50_000_00);
    expect(r.channels[0].finalValue).toBe(75_000_00);
  });

  it("matches the PRD §8 example: weighted ROI 111%", () => {
    const p = examplePlan();
    const r = calculatePlan(p.annualBudget, p.allocations);
    expect(r.sumState).toBe("exact");
    expect(r.totalAmount).toBe(120_000_00);
    expect(r.totalProfit).toBe(133_200_00);
    expect(r.totalFinalValue).toBe(253_200_00);
    expect(r.weightedRoiPercent).toBeCloseTo(111, 10);
    expect(r.bestChannel).toBe("social_media");
    expect(r.worstChannel).toBe("newspaper");
  });

  it("flags 99.99% as under with 0.01% missing", () => {
    const r = calculatePlan(100_000_00, withShares([50, 49.99]));
    expect(r.sumState).toBe("under");
    expect(r.remainingPercent).toBeCloseTo(0.01, 10);
    expect(r.remainingAmount).toBe(10_00);
  });

  it("flags over 100% and reports the excess", () => {
    const r = calculatePlan(100_000_00, withShares([60, 50]));
    expect(r.sumState).toBe("over");
    expect(r.remainingPercent).toBeCloseTo(-10, 10);
    expect(r.remainingAmount).toBe(-10_000_00);
  });

  it("avoids floating point drift (0.1 + 0.2 style shares)", () => {
    const r = calculatePlan(1_00, withShares([33.33, 33.33, 33.34]));
    expect(r.sumState).toBe("exact");
    expect(r.totalAmount).toBe(1_00);
  });

  it("handles negative ROI down to -100%", () => {
    const r = calculatePlan(10_000_00, withShares([100], [-100]));
    expect(r.totalProfit).toBe(-10_000_00);
    expect(r.totalFinalValue).toBe(0);
    expect(r.weightedRoiPercent).toBe(-100);
  });

  it("returns null weighted ROI when nothing is spent", () => {
    const r = calculatePlan(0, withShares([100], [50]));
    expect(r.weightedRoiPercent).toBeNull();
    expect(r.channels[0].profitSharePercent).toBeNull();
  });

  it("computes each channel's share of total profit", () => {
    const r = calculatePlan(100_00, withShares([50, 50], [100, 300]));
    expect(r.channels[0].profitSharePercent).toBe(25);
    expect(r.channels[1].profitSharePercent).toBe(75);
  });

  it("does not mark best/worst when ROI is equal", () => {
    const r = calculatePlan(100_00, withShares([50, 50], [10, 10]));
    expect(r.bestChannel).toBeNull();
    expect(r.worstChannel).toBeNull();
  });
});

describe("splitBudget", () => {
  it("sums exactly to the budget when shares are 100%", () => {
    const amounts = splitBudget(100, [3333, 3333, 3334]);
    expect(amounts.reduce((s, x) => s + x, 0)).toBe(100);
  });

  it("never gives money to a 0% channel", () => {
    const amounts = splitBudget(1, [0, 5000, 5000]);
    expect(amounts[0]).toBe(0);
    expect(amounts.reduce((s, x) => s + x, 0)).toBe(1);
  });
});

describe("distributeRemainder", () => {
  it("splits the remainder equally between empty channels", () => {
    const next = distributeRemainder(withShares([40, 20]));
    expect(next.map((a) => a.sharePercent)).toEqual([40, 20, 10, 10, 10, 10]);
  });

  it("splits between all channels when none is empty and lands on 100%", () => {
    const next = distributeRemainder(withShares([10, 10, 10, 10, 10, 10]));
    const total = next.reduce((s, a) => s + Math.round(a.sharePercent * 100), 0);
    expect(total).toBe(10_000);
  });

  it("handles a remainder that does not divide evenly", () => {
    const next = distributeRemainder(withShares([]));
    const total = next.reduce((s, a) => s + Math.round(a.sharePercent * 100), 0);
    expect(total).toBe(10_000);
    expect(next[0].sharePercent).toBe(16.67);
    expect(next[5].sharePercent).toBe(16.66);
  });

  it("does nothing when already at or over 100%", () => {
    const a = withShares([100]);
    expect(distributeRemainder(a)).toBe(a);
  });

  it("resetShares zeroes shares but keeps ROI", () => {
    const next = resetShares(withShares([50], [120]));
    expect(next[0]).toMatchObject({ sharePercent: 0, expectedRoiPercent: 120 });
  });
});

describe("amountToPercent", () => {
  it("converts amount to percent rounded to 2 decimals", () => {
    expect(amountToPercent(42_000_00, 120_000_00)).toBe(35);
    expect(amountToPercent(1_00, 3_00)).toBe(33.33);
    expect(amountToPercent(1_00, 0)).toBe(0);
  });
});
