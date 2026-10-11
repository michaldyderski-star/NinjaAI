// Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../js/calc.js");

const withShares = (shares, rois = []) =>
  C.emptyPlan().allocations.map((a, i) => ({
    ...a,
    sharePercent: shares[i] ?? 0,
    expectedRoiPercent: rois[i] ?? 0,
  }));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);
const nbsp = (s) => s.replace(/[  ]/g, " ");

test("amount per channel (PRD §12)", () => {
  assert.equal(C.calculatePlan(10000000, withShares([25])).channels[0].amount, 2500000);
});

test("return and final value (return − invested) for ROI 200% (PRD §12)", () => {
  const c = C.calculatePlan(10000000, withShares([25], [200])).channels[0];
  assert.equal(c.returnAmount, 5000000);
  assert.equal(c.finalValue, 2500000);
});

test("PRD §8 example: weighted ROI 111%", () => {
  const p = C.examplePlan();
  const r = C.calculatePlan(p.annualBudget, p.allocations);
  assert.equal(r.sumState, "exact");
  assert.equal(r.totalAmount, 12000000);
  assert.equal(r.totalReturn, 13320000);
  assert.equal(r.totalFinalValue, 1320000);
  close(r.weightedRoiPercent, 111);
  assert.equal(r.bestChannel, "social_media");
  assert.equal(r.worstChannel, "newspaper");
});

test("99.99% is under with 0.01% missing", () => {
  const r = C.calculatePlan(10000000, withShares([50, 49.99]));
  assert.equal(r.sumState, "under");
  close(r.remainingPercent, 0.01);
  assert.equal(r.remainingAmount, 1000);
});

test("over 100% reports the excess", () => {
  const r = C.calculatePlan(10000000, withShares([60, 50]));
  assert.equal(r.sumState, "over");
  close(r.remainingPercent, -10);
  assert.equal(r.remainingAmount, -1000000);
});

test("no floating point drift with 33.33/33.33/33.34", () => {
  const r = C.calculatePlan(100, withShares([33.33, 33.33, 33.34]));
  assert.equal(r.sumState, "exact");
  assert.equal(r.totalAmount, 100);
});

test("return below 100% gives a negative final value", () => {
  const r = C.calculatePlan(1000000, withShares([100], [40]));
  assert.equal(r.totalReturn, 400000);
  assert.equal(r.totalFinalValue, -600000);
  assert.equal(r.channels[0].finalValue, -600000);
});

test("0% return loses the whole spend", () => {
  const r = C.calculatePlan(1000000, withShares([100], [0]));
  assert.equal(r.totalReturn, 0);
  assert.equal(r.totalFinalValue, -1000000);
  assert.equal(r.weightedRoiPercent, 0);
});

test("null weighted ROI when nothing is spent", () => {
  const r = C.calculatePlan(0, withShares([100], [50]));
  assert.equal(r.weightedRoiPercent, null);
  assert.equal(r.channels[0].returnSharePercent, null);
});

test("share of total return", () => {
  const r = C.calculatePlan(10000, withShares([50, 50], [100, 300]));
  assert.equal(r.channels[0].returnSharePercent, 25);
  assert.equal(r.channels[1].returnSharePercent, 75);
});

test("no best/worst when ROI is equal", () => {
  const r = C.calculatePlan(10000, withShares([50, 50], [10, 10]));
  assert.equal(r.bestChannel, null);
  assert.equal(r.worstChannel, null);
});

test("splitBudget sums exactly and skips 0% channels", () => {
  assert.equal(C.splitBudget(100, [3333, 3333, 3334]).reduce((s, x) => s + x, 0), 100);
  const a = C.splitBudget(1, [0, 5000, 5000]);
  assert.equal(a[0], 0);
  assert.equal(a.reduce((s, x) => s + x, 0), 1);
});

test("distributeRemainder fills empty channels equally", () => {
  const next = C.distributeRemainder(withShares([40, 20]));
  assert.deepEqual(next.map((a) => a.sharePercent), [40, 20, 10, 10, 10, 10]);
});

test("distributeRemainder lands on exactly 100% with uneven split", () => {
  const next = C.distributeRemainder(withShares([]));
  assert.equal(next.reduce((s, a) => s + Math.round(a.sharePercent * 100), 0), 10000);
  assert.equal(next[0].sharePercent, 16.67);
  assert.equal(next[5].sharePercent, 16.66);
  const all = C.distributeRemainder(withShares([10, 10, 10, 10, 10, 10]));
  assert.equal(all.reduce((s, a) => s + Math.round(a.sharePercent * 100), 0), 10000);
});

test("distributeRemainder is a no-op at 100%", () => {
  const a = withShares([100]);
  assert.equal(C.distributeRemainder(a), a);
});

test("resetShares keeps ROI", () => {
  const next = C.resetShares(withShares([50], [120]));
  assert.equal(next[0].sharePercent, 0);
  assert.equal(next[0].expectedRoiPercent, 120);
});

test("amountToPercent", () => {
  assert.equal(C.amountToPercent(4200000, 12000000), 35);
  assert.equal(C.amountToPercent(100, 300), 33.33);
  assert.equal(C.amountToPercent(100, 0), 0);
});

test("parseDecimal accepts Polish formats", () => {
  for (const [raw, n] of [
    ["120000", 120000], ["120 000,50", 120000.5], ["120000.5", 120000.5],
    ["1 000 zł", 1000], ["35%", 35], ["-20", -20], ["12,", 12],
  ]) assert.equal(C.parseDecimal(raw), n, raw);
});

test("parseDecimal rejects garbage and >2 decimals", () => {
  for (const raw of ["", "-", "abc", "1,234", "1.2.3"]) assert.equal(C.parseDecimal(raw), null, raw);
});

test("formatMoney", () => {
  assert.equal(nbsp(C.formatMoney(12000000)), "120 000,00 zł");
});

test("CSV has 6 channels and a correct total row (PRD §12)", () => {
  const p = C.examplePlan();
  const lines = C.planToCsv(p, C.calculatePlan(p.annualBudget, p.allocations)).split("\r\n");
  const h = lines.findIndex((l) => l.startsWith("Kanał;"));
  assert.equal(lines[h + 1], "Social media;35,00;42000,00;180,00;75600,00;33600,00");
  assert.equal(lines[h + 7], "SUMA;100,00;120000,00;111,00;133200,00;13200,00");
});

test("safeFilename", () => {
  assert.equal(C.safeFilename("Budżet 2027 / wariant A"), "Budżet_2027_wariant_A");
  assert.equal(C.safeFilename("  "), "plan");
});
