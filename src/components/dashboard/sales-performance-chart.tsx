"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function SalesPerformanceChart({ data }: { data: { month: string; revenue: number; profit: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B8C82" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#1B8C82" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B77F" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10B77F" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts' Formatter type is broader than we need here
          formatter={(value: any) => `$${Number(value).toLocaleString()}`}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#1B8C82" strokeWidth={2} fill="url(#revenueGradient)" name="Revenue" />
        <Area type="monotone" dataKey="profit" stroke="#10B77F" strokeWidth={2} fill="url(#profitGradient)" name="Profit" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
