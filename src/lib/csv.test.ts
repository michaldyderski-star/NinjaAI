import { describe, expect, it } from "vitest";
import { calculatePlan } from "./calc";
import { planToCsv, safeFilename } from "./csv";
import { examplePlan } from "./model";

describe("planToCsv", () => {
  it("contains 6 channels and a correct total row (PRD §12)", () => {
    const plan = examplePlan();
    const lines = planToCsv(plan, calculatePlan(plan.annualBudget, plan.allocations)).split("\r\n");
    const header = lines.findIndex((l) => l.startsWith("Kanał;"));
    expect(lines.slice(header + 1, header + 7)).toHaveLength(6);
    expect(lines[header + 1]).toBe("Social media;35,00;42000,00;180,00;75600,00;117600,00");
    expect(lines[header + 7]).toBe("SUMA;100,00;120000,00;111,00;133200,00;253200,00");
  });
});

describe("safeFilename", () => {
  it("keeps Polish letters and replaces separators", () => {
    expect(safeFilename("Budżet 2027 / wariant A")).toBe("Budżet_2027_wariant_A");
    expect(safeFilename("  ")).toBe("plan");
  });
});
