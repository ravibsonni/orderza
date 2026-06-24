"use client";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatAED } from "@/lib/utils";

interface DataPoint {
  date: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

interface Props { data: DataPoint[] }

type Metric = "orders" | "revenue" | "avgOrderValue";

export function OrdersOverTime({ data }: Props) {
  const [metric, setMetric] = useState<Metric>("orders");

  const labels: Record<Metric, string> = {
    orders: "Orders",
    revenue: "Revenue (AED)",
    avgOrderValue: "Avg Order Value (AED)",
  };

  const formatter = (v: number) =>
    metric === "orders" ? v.toString() : formatAED(v);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Orders Over Time</h3>
        <div className="flex rounded-lg overflow-hidden border">
          {(["orders", "revenue", "avgOrderValue"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${metric === m ? "bg-brand-green text-white" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {labels[m]}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatter} width={60} />
          <Tooltip formatter={(v: number) => [formatter(v), labels[metric]]} />
          <Line type="monotone" dataKey={metric} stroke="#1B4332" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
