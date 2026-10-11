import type { ChannelId } from "./channels";
import type { ChannelAllocation } from "./model";

/** Hundredths of a percent: 100% === 10_000. Keeps all arithmetic on integers. */
export const FULL_SHARE = 10_000;

export const toHundredths = (percent: number): number => Math.round(percent * 100);
export const fromHundredths = (h: number): number => h / 100;

export type SumState = "under" | "exact" | "over";

export interface ChannelResult {
  channel: ChannelId;
  sharePercent: number;
  roiPercent: number;
  /** grosze */
  amount: number;
  /** expected net profit, grosze */
  profit: number;
  /** amount + profit, grosze */
  finalValue: number;
  /** share of total profit in %, null when total profit is 0 */
  profitSharePercent: number | null;
}

export interface PlanResult {
  channels: ChannelResult[];
  /** sum of share, in hundredths of a percent */
  allocatedHundredths: number;
  allocatedPercent: number;
  remainingPercent: number;
  /** grosze still unallocated (negative when over budget) */
  remainingAmount: number;
  sumState: SumState;
  totalAmount: number;
  totalProfit: number;
  totalFinalValue: number;
  /** weighted ROI in %, null when nothing is spent */
  weightedRoiPercent: number | null;
  bestChannel: ChannelId | null;
  worstChannel: ChannelId | null;
}

/**
 * Splits `budget` grosze across shares (hundredths of a percent) with the
 * largest-remainder method, so the amounts add up exactly to the rounded
 * total instead of drifting by a grosz.
 */
export function splitBudget(budget: number, shares: number[]): number[] {
  const totalShare = shares.reduce((s, x) => s + x, 0);
  const target = Math.round((budget * totalShare) / FULL_SHARE);
  const exact = shares.map((s) => (budget * s) / FULL_SHARE);
  const floors = exact.map(Math.floor);
  let rest = target - floors.reduce((s, x) => s + x, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .filter(({ i }) => shares[i] > 0)
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0 && order.length > 0; k = (k + 1) % order.length, rest--) {
    floors[order[k].i] += 1;
  }
  return floors;
}

export function sumState(allocatedHundredths: number): SumState {
  if (allocatedHundredths === FULL_SHARE) return "exact";
  return allocatedHundredths < FULL_SHARE ? "under" : "over";
}

export function calculatePlan(budget: number, allocations: ChannelAllocation[]): PlanResult {
  const shares = allocations.map((a) => toHundredths(a.sharePercent));
  const amounts = splitBudget(budget, shares);
  const profits = allocations.map((a, i) =>
    Math.round((amounts[i] * toHundredths(a.expectedRoiPercent)) / FULL_SHARE),
  );

  const totalAmount = amounts.reduce((s, x) => s + x, 0);
  const totalProfit = profits.reduce((s, x) => s + x, 0);
  const allocatedHundredths = shares.reduce((s, x) => s + x, 0);

  const channels: ChannelResult[] = allocations.map((a, i) => ({
    channel: a.channel,
    sharePercent: fromHundredths(shares[i]),
    roiPercent: fromHundredths(toHundredths(a.expectedRoiPercent)),
    amount: amounts[i],
    profit: profits[i],
    finalValue: amounts[i] + profits[i],
    profitSharePercent: totalProfit !== 0 ? (profits[i] / totalProfit) * 100 : null,
  }));

  const funded = channels.filter((c) => c.sharePercent > 0);
  let bestChannel: ChannelId | null = null;
  let worstChannel: ChannelId | null = null;
  if (funded.length >= 2) {
    const best = funded.reduce((b, c) => (c.roiPercent > b.roiPercent ? c : b));
    const worst = funded.reduce((w, c) => (c.roiPercent < w.roiPercent ? c : w));
    if (best.roiPercent !== worst.roiPercent) {
      bestChannel = best.channel;
      worstChannel = worst.channel;
    }
  }

  return {
    channels,
    allocatedHundredths,
    allocatedPercent: fromHundredths(allocatedHundredths),
    remainingPercent: fromHundredths(FULL_SHARE - allocatedHundredths),
    remainingAmount: budget - totalAmount,
    sumState: sumState(allocatedHundredths),
    totalAmount,
    totalProfit,
    totalFinalValue: totalAmount + totalProfit,
    weightedRoiPercent: totalAmount > 0 ? (totalProfit / totalAmount) * 100 : null,
    bestChannel,
    worstChannel,
  };
}

/** Percent of `budget` that `amount` represents, rounded to 2 decimals. */
export function amountToPercent(amount: number, budget: number): number {
  if (budget <= 0) return 0;
  return fromHundredths(Math.round((amount * FULL_SHARE) / budget));
}

/**
 * FR-9: splits the unallocated share equally between channels that have 0%,
 * or between all channels if none is empty. Leftover hundredths go to the
 * first channels so the total lands exactly on 100%.
 */
export function distributeRemainder(allocations: ChannelAllocation[]): ChannelAllocation[] {
  const shares = allocations.map((a) => toHundredths(a.sharePercent));
  const remaining = FULL_SHARE - shares.reduce((s, x) => s + x, 0);
  if (remaining <= 0) return allocations;

  const empty = shares.map((s, i) => (s === 0 ? i : -1)).filter((i) => i >= 0);
  const targets = empty.length > 0 ? empty : allocations.map((_, i) => i);
  const base = Math.floor(remaining / targets.length);
  let extra = remaining - base * targets.length;

  const next = [...shares];
  for (const i of targets) {
    next[i] += base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
  }
  return allocations.map((a, i) => ({ ...a, sharePercent: fromHundredths(next[i]) }));
}

export function resetShares(allocations: ChannelAllocation[]): ChannelAllocation[] {
  return allocations.map((a) => ({ ...a, sharePercent: 0 }));
}
