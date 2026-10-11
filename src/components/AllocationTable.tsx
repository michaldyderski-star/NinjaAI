import { amountToPercent, type PlanResult } from "../lib/calc";
import { CHANNEL_HEX, channelLabel } from "../lib/channels";
import { formatMoney, formatPercent, zlToGrosze } from "../lib/format";
import { ROI_MAX, ROI_MIN, ROI_WARN, type ChannelAllocation } from "../lib/model";
import { NumberField } from "./NumberField";

interface Props {
  budget: number;
  allocations: ChannelAllocation[];
  result: PlanResult;
  onChange: (index: number, patch: Partial<ChannelAllocation>) => void;
}

const moneyInput = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });
const showMoney = (zl: number) => moneyInput.format(zl);

export function AllocationTable({ budget, allocations, result, onChange }: Props) {
  return (
    <div className="alloc">
      <table className="alloc-table">
        <caption className="sr-only">Podział budżetu i spodziewany zwrot według kanałów</caption>
        <thead>
          <tr>
            <th scope="col">Kanał</th>
            <th scope="col">% budżetu</th>
            <th scope="col">Kwota</th>
            <th scope="col">
              <abbr title="Zysk netto ÷ wydana kwota × 100%. ROI 150% przy 10 000 zł to 15 000 zł zysku.">
                Spodziewany ROI
              </abbr>
            </th>
            <th scope="col" className="num">Zwrot</th>
            <th scope="col" className="num">Wartość końcowa</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((a, i) => {
            const r = result.channels[i];
            const label = channelLabel(a.channel);
            const tag =
              result.bestChannel === a.channel ? "best" : result.worstChannel === a.channel ? "worst" : null;
            return (
              <tr key={a.channel}>
                <th scope="row" className="alloc-channel">
                  <span className="dot" style={{ background: CHANNEL_HEX[a.channel] }} aria-hidden="true" />
                  {label}
                  {tag === "best" && <span className="tag tag-best">najwyższy ROI</span>}
                  {tag === "worst" && <span className="tag tag-worst">najniższy ROI</span>}
                </th>
                <td data-label="% budżetu">
                  <NumberField
                    label={`${label}: % budżetu`}
                    hideLabel
                    value={a.sharePercent}
                    min={0}
                    max={100}
                    suffix="%"
                    rangeMessage="Udział musi mieścić się w zakresie 0–100%."
                    onCommit={(v) => onChange(i, { sharePercent: v })}
                  />
                </td>
                <td data-label="Kwota">
                  <NumberField
                    label={`${label}: kwota w zł`}
                    hideLabel
                    value={r.amount / 100}
                    min={0}
                    max={budget / 100}
                    suffix="zł"
                    disabled={budget <= 0}
                    display={showMoney}
                    rangeMessage="Kwota nie może przekraczać rocznego budżetu."
                    onCommit={(v) => onChange(i, { sharePercent: amountToPercent(zlToGrosze(v), budget) })}
                  />
                </td>
                <td data-label="Spodziewany ROI">
                  <NumberField
                    label={`${label}: spodziewany % zwrotu`}
                    hideLabel
                    value={a.expectedRoiPercent}
                    min={ROI_MIN}
                    max={ROI_MAX}
                    suffix="%"
                    rangeMessage={`ROI musi mieścić się w zakresie ${ROI_MIN}% – ${ROI_MAX.toLocaleString("pl-PL")}%.`}
                    onCommit={(v) => onChange(i, { expectedRoiPercent: v })}
                  />
                  {a.expectedRoiPercent > ROI_WARN && (
                    <p className="field-warn">Bardzo wysoki ROI — sprawdź to założenie.</p>
                  )}
                </td>
                <td data-label="Zwrot" className={`num${r.profit < 0 ? " neg" : ""}`}>
                  {formatMoney(r.profit)}
                </td>
                <td data-label="Wartość końcowa" className="num">
                  {formatMoney(r.finalValue)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Suma</th>
            <td data-label="% budżetu" className={`num is-${result.sumState}`}>
              {formatPercent(result.allocatedPercent)}
            </td>
            <td data-label="Kwota" className="num">{formatMoney(result.totalAmount)}</td>
            <td data-label="Ważony ROI" className="num">
              {result.weightedRoiPercent === null ? "—" : formatPercent(result.weightedRoiPercent, true)}
            </td>
            <td data-label="Zwrot" className={`num${result.totalProfit < 0 ? " neg" : ""}`}>
              {formatMoney(result.totalProfit)}
            </td>
            <td data-label="Wartość końcowa" className="num">{formatMoney(result.totalFinalValue)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
