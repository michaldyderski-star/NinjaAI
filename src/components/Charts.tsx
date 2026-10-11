import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlanResult } from "../lib/calc";
import { CHANNEL_HEX, channelLabel } from "../lib/channels";
import { formatMoney, formatMoneyShort, formatPercent } from "../lib/format";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
};

function useNarrow(query = "(max-width: 700px)"): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

export function Charts({ result }: { result: PlanResult }) {
  const narrow = useNarrow();
  const funded = result.channels.filter((c) => c.amount > 0);
  const pieData = funded.map((c) => ({
    name: channelLabel(c.channel),
    value: c.amount,
    share: c.sharePercent,
    color: CHANNEL_HEX[c.channel],
  }));
  const barData = result.channels.map((c) => ({
    name: channelLabel(c.channel),
    Wydatek: c.amount,
    Zwrot: c.profit,
  }));

  return (
    <div className="charts">
      <figure className="card chart">
        <figcaption>Podział budżetu</figcaption>
        {pieData.length === 0 ? (
          <p className="chart-empty">Wpisz budżet i udziały kanałów, aby zobaczyć wykres.</p>
        ) : (
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={1}
                  stroke="var(--surface)"
                  isAnimationActive={false}
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, _n, item) => [
                    `${formatMoney(v)} (${formatPercent(item.payload.share)})`,
                    item.payload.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="legend">
              {pieData.map((d) => (
                <li key={d.name}>
                  <span className="dot" style={{ background: d.color }} aria-hidden="true" />
                  {d.name} <span className="muted">{formatPercent(d.share)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </figure>

      <figure className="card chart">
        <figcaption>Wydatek vs. oczekiwany zwrot</figcaption>
        {funded.length === 0 ? (
          <p className="chart-empty">Brak danych do porównania.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                interval={0}
                angle={narrow ? -35 : 0}
                textAnchor={narrow ? "end" : "middle"}
                height={narrow ? 60 : 30}
              />
              <YAxis
                tickFormatter={(v: number) => formatMoneyShort(v)}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                width={72}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--hover)" }}
                formatter={(v: number, name) => [formatMoney(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="Wydatek" fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Zwrot" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </figure>
    </div>
  );
}
