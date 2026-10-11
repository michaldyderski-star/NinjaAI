import type { PlanResult } from "../lib/calc";
import { formatMoney, formatPercent } from "../lib/format";

const ICON = { under: "!", exact: "✓", over: "✕" } as const;

export function SumBar({ result }: { result: PlanResult }) {
  const { sumState, allocatedPercent, remainingPercent, remainingAmount } = result;
  const fill = Math.min(allocatedPercent, 100);

  let message: string;
  if (sumState === "exact") {
    message = "Cały budżet jest rozdzielony.";
  } else if (sumState === "under") {
    message = `Pozostało do rozdzielenia: ${formatPercent(remainingPercent)} (${formatMoney(remainingAmount)}). Plan zapiszesz jako szkic.`;
  } else {
    message = `Przekroczono 100% o ${formatPercent(-remainingPercent)} (${formatMoney(-remainingAmount)}). Zmniejsz udziały, aby zapisać plan jako gotowy i go wyeksportować.`;
  }

  return (
    <div className={`sumbar is-${sumState}`}>
      <div className="sumbar-head">
        <span className="sumbar-title">
          Rozdzielono: <strong>{formatPercent(allocatedPercent)}</strong> / 100%
        </span>
        <span className="sumbar-badge" aria-hidden="true">{ICON[sumState]}</span>
      </div>
      <div
        className="sumbar-track"
        role="progressbar"
        aria-label="Rozdzielona część budżetu"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(allocatedPercent)}
      >
        <div className="sumbar-fill" style={{ width: `${fill}%` }} />
      </div>
      <p className="sumbar-msg" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
