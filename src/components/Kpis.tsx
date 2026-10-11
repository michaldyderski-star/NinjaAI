import type { PlanResult } from "../lib/calc";
import { formatMoney, formatPercent } from "../lib/format";

export function Kpis({ budget, result }: { budget: number; result: PlanResult }) {
  const items = [
    { label: "Budżet", value: formatMoney(budget) },
    { label: "Łączny zwrot", value: formatMoney(result.totalProfit), neg: result.totalProfit < 0 },
    { label: "Wartość końcowa", value: formatMoney(result.totalFinalValue) },
    {
      label: "Ważony ROI",
      value: result.weightedRoiPercent === null ? "—" : formatPercent(result.weightedRoiPercent, true),
      neg: (result.weightedRoiPercent ?? 0) < 0,
    },
  ];
  return (
    <dl className="kpis">
      {items.map((k) => (
        <div key={k.label} className="kpi">
          <dt>{k.label}</dt>
          <dd className={k.neg ? "neg" : undefined}>{k.value}</dd>
        </div>
      ))}
    </dl>
  );
}
