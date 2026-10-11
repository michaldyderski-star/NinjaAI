import { CHANNELS, type ChannelId } from "./channels";

export interface ChannelAllocation {
  channel: ChannelId;
  /** 0–100, max 2 decimal places */
  sharePercent: number;
  /** -100–10000, max 2 decimal places */
  expectedRoiPercent: number;
}

export type PlanStatus = "draft" | "final";

export interface BudgetPlan {
  id: string;
  name: string;
  year: number;
  currency: "PLN";
  /** in grosze (integer) */
  annualBudget: number;
  allocations: ChannelAllocation[];
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export const ROI_MIN = -100;
export const ROI_MAX = 10000;
export const ROI_WARN = 1000;

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function emptyPlan(now = new Date()): BudgetPlan {
  const iso = now.toISOString();
  return {
    id: newId(),
    name: `Marketing ${now.getFullYear() + 1}`,
    year: now.getFullYear() + 1,
    currency: "PLN",
    annualBudget: 0,
    allocations: CHANNELS.map((c) => ({ channel: c.id, sharePercent: 0, expectedRoiPercent: 0 })),
    status: "draft",
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Example from PRD §8. */
export function examplePlan(now = new Date()): BudgetPlan {
  const plan = emptyPlan(now);
  const example: Record<ChannelId, [number, number]> = {
    social_media: [35, 180],
    www: [20, 150],
    radio: [10, 60],
    tv: [20, 40],
    billboard: [10, 30],
    newspaper: [5, 20],
  };
  return {
    ...plan,
    annualBudget: 120_000_00,
    allocations: plan.allocations.map((a) => ({
      ...a,
      sharePercent: example[a.channel][0],
      expectedRoiPercent: example[a.channel][1],
    })),
  };
}

export function duplicatePlan(plan: BudgetPlan, now = new Date()): BudgetPlan {
  const iso = now.toISOString();
  return {
    ...plan,
    id: newId(),
    name: `${plan.name} (kopia)`,
    allocations: plan.allocations.map((a) => ({ ...a })),
    createdAt: iso,
    updatedAt: iso,
  };
}
