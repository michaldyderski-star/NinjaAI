import type { PlanResult } from "./calc";
import { channelLabel } from "./channels";
import type { BudgetPlan } from "./model";

const zl = (grosze: number): string => (grosze / 100).toFixed(2).replace(".", ",");
const pct = (p: number | null): string => (p === null ? "" : p.toFixed(2).replace(".", ","));

const escape = (v: string): string => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Semicolon-separated with comma decimals, so Polish Excel opens it as columns. */
export function planToCsv(plan: BudgetPlan, result: PlanResult): string {
  const rows: string[][] = [
    ["Plan", plan.name],
    ["Rok", String(plan.year)],
    ["Roczny budżet (zł)", zl(plan.annualBudget)],
    [],
    ["Kanał", "% budżetu", "Kwota (zł)", "ROI %", "Zwrot (zł)", "Wartość końcowa (zł)"],
    ...result.channels.map((c) => [
      channelLabel(c.channel),
      pct(c.sharePercent),
      zl(c.amount),
      pct(c.roiPercent),
      zl(c.profit),
      zl(c.finalValue),
    ]),
    [
      "SUMA",
      pct(result.allocatedPercent),
      zl(result.totalAmount),
      pct(result.weightedRoiPercent),
      zl(result.totalProfit),
      zl(result.totalFinalValue),
    ],
  ];
  return "﻿" + rows.map((r) => r.map(escape).join(";")).join("\r\n");
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const safeFilename = (name: string): string =>
  name.trim().replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "") || "plan";
