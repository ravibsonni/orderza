"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  data: { name: string; value: number; pct: string }[];
}

const COLORS = ["#1B4332", "#F59E0B", "#EAB308"];

export function OrderTypePie({ data }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Order Type Split</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string, entry) => [`${v} orders (${entry.payload.pct})`, name]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
