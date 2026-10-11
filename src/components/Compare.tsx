import { calculatePlan } from "../lib/calc";
import { CHANNELS, CHANNEL_HEX } from "../lib/channels";
import { formatMoney, formatPercent } from "../lib/format";
import type { BudgetPlan } from "../lib/model";

const diffMoney = (v: number) => (v === 0 ? "" : `${v > 0 ? "+" : "−"}${formatMoney(Math.abs(v))}`);
const diffPct = (v: number) =>
  Math.abs(v) < 0.005 ? "" : `${v > 0 ? "+" : "−"}${formatPercent(Math.abs(v))} pp`;

export function Compare({ plans, onBack }: { plans: BudgetPlan[]; onBack: () => void }) {
  if (plans.length < 2) {
    return (
      <section className="card">
        <h2>Porównanie scenariuszy</h2>
        <p className="muted">
          Zaznacz 2 lub 3 zapisane plany na liście „Zapisane plany”, aby porównać je obok siebie.
        </p>
        <button type="button" className="btn" onClick={onBack}>Wróć do planu</button>
      </section>
    );
  }

  const results = plans.map((p) => calculatePlan(p.annualBudget, p.allocations));
  const base = results[0];

  const Diff = ({ i, children }: { i: number; children: string }) =>
    i === 0 || !children ? null : <span className={`diff ${children.startsWith("+") ? "up" : "down"}`}>{children}</span>;

  return (
    <section className="card">
      <div className="section-head">
        <h2>Porównanie scenariuszy</h2>
        <button type="button" className="btn" onClick={onBack}>Wróć do planu</button>
      </div>
      <p className="muted small">Różnice liczone względem pierwszego scenariusza („{plans[0].name}”).</p>
      <div className="table-scroll">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">Wskaźnik</th>
              {plans.map((p) => (
                <th scope="col" key={p.id} className="num">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Budżet</th>
              {plans.map((p, i) => (
                <td key={p.id} className="num">
                  {formatMoney(p.annualBudget)}
                  <Diff i={i}>{diffMoney(p.annualBudget - plans[0].annualBudget)}</Diff>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Łączny zwrot</th>
              {results.map((r, i) => (
                <td key={plans[i].id} className="num">
                  {formatMoney(r.totalProfit)}
                  <Diff i={i}>{diffMoney(r.totalProfit - base.totalProfit)}</Diff>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Wartość końcowa</th>
              {results.map((r, i) => (
                <td key={plans[i].id} className="num">
                  {formatMoney(r.totalFinalValue)}
                  <Diff i={i}>{diffMoney(r.totalFinalValue - base.totalFinalValue)}</Diff>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Ważony ROI</th>
              {results.map((r, i) => (
                <td key={plans[i].id} className="num">
                  {r.weightedRoiPercent === null ? "—" : formatPercent(r.weightedRoiPercent, true)}
                  <Diff i={i}>
                    {r.weightedRoiPercent === null || base.weightedRoiPercent === null
                      ? ""
                      : diffPct(r.weightedRoiPercent - base.weightedRoiPercent)}
                  </Diff>
                </td>
              ))}
            </tr>
            <tr className="group">
              <th scope="colgroup" colSpan={plans.length + 1}>Kwota na kanał (udział · ROI)</th>
            </tr>
            {CHANNELS.map((c) => (
              <tr key={c.id}>
                <th scope="row">
                  <span className="dot" style={{ background: CHANNEL_HEX[c.id] }} aria-hidden="true" />
                  {c.label}
                </th>
                {results.map((r, i) => {
                  const ch = r.channels.find((x) => x.channel === c.id);
                  const b = base.channels.find((x) => x.channel === c.id);
                  if (!ch || !b) return <td key={plans[i].id} className="num">—</td>;
                  return (
                    <td key={plans[i].id} className="num">
                      {formatMoney(ch.amount)}
                      <span className="muted small block">
                        {formatPercent(ch.sharePercent)} · ROI {formatPercent(ch.roiPercent)}
                      </span>
                      <Diff i={i}>{diffMoney(ch.amount - b.amount)}</Diff>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
