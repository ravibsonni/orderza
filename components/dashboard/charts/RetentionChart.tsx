"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DataPoint {
  date: string;
  newCustomers: number;
  returningCustomers: number;
}

interface Props {
  data: DataPoint[];
  returningCount: number;
  retentionRate: number;
}

export function RetentionChart({ data, returningCount, retentionRate }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="font-semibold">Customer Retention</h3>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-green">{returningCount}</div>
            <div className="text-muted-foreground">returning customers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-amber">{retentionRate}%</div>
            <div className="text-muted-foreground">ordered again</div>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="newCustomers" name="New" fill="#1B4332" radius={[3, 3, 0, 0]} />
          <Bar dataKey="returningCustomers" name="Returning" fill="#F59E0B" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
