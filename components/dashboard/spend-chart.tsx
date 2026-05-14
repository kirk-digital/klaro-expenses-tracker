"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartRow = { name: string; amount: number };

export function SpendByCategoryChart({ data, currency }: { data: ChartRow[]; currency: string }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No approved spend in this category this month.</p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) =>
              new Intl.NumberFormat(undefined, {
                style: "currency",
                currency,
                notation: "compact",
              }).format(Number(v))
            }
          />
          <Tooltip
            formatter={(value) =>
              new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
                Number(value ?? 0)
              )
            }
          />
          <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
