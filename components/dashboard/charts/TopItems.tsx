"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatAED } from "@/lib/utils";

interface TopItem {
  name: string;
  orderCount: number;
  revenue: number;
}

interface Props { data: TopItem[] }

export function TopItems({ data }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Top Menu Items</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <Tooltip
            formatter={(v: number, name) =>
              name === "revenue" ? [formatAED(v), "Revenue"] : [v, "Orders"]
            }
          />
          <Bar dataKey="orderCount" name="Orders" fill="#1B4332" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
