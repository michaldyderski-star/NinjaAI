import type { BudgetPlan } from "./model";

const KEY = "ninjaai.plans.v1";

function isPlan(x: unknown): x is BudgetPlan {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Partial<BudgetPlan>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.annualBudget === "number" &&
    Array.isArray(p.allocations)
  );
}

export function loadPlans(): BudgetPlan[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPlan) : [];
  } catch {
    return [];
  }
}

/** Returns false when storage is unavailable (private mode, quota, blocked). */
export function savePlans(plans: BudgetPlan[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(plans));
    return true;
  } catch {
    return false;
  }
}
