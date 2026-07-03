"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PulseDatum = { label: string; value: number; token: string };

/**
 * Operational pulse bars. Loaded via next/dynamic so recharts stays out
 * of the initial dashboard bundle. Colors come from chart tokens.
 */
export default function OperationalPulseChart({
  data,
}: {
  data: PulseDatum[];
}) {
  return (
    <div className="h-70 w-full" role="img" aria-label="Operational pulse chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -24, right: 8, top: 12 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 }}
            dy={8}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 }}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            contentStyle={{
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              fontSize: "12px",
              fontWeight: 600,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={`var(${entry.token})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
