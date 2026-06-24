"use client";
import { useEffect, useState } from "react";
import { OrdersOverTime } from "./charts/OrdersOverTime";
import { RetentionChart } from "./charts/RetentionChart";
import { OrderTypePie } from "./charts/OrderTypePie";
import { TopItems } from "./charts/TopItems";
import { PeakHoursHeatmap } from "./charts/PeakHoursHeatmap";
import { formatAED } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Period = "7d" | "30d" | "90d";

interface AnalyticsData {
  kpis: { totalOrders: number; totalRevenue: number; newCustomers: number; returningCustomers: number };
  ordersOverTime: { date: string; orders: number; revenue: number; avgOrderValue: number }[];
  retention: { data: { date: string; newCustomers: number; returningCustomers: number }[]; returningCount: number; retentionRate: number };
  orderTypeSplit: { name: string; value: number; pct: string }[];
  topItems: { name: string; orderCount: number; revenue: number }[];
  peakHours: { day: number; hour: number; count: number }[];
}

export function AnalyticsTab() {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const KPI_LABELS = [
    { key: "totalOrders", label: "Total Orders", format: (v: number) => v.toLocaleString(), sub: "all time" },
    { key: "totalRevenue", label: "Total Revenue", format: (v: number) => formatAED(v), sub: "all time" },
    { key: "newCustomers", label: "New Customers", format: (v: number) => v.toLocaleString(), sub: "this month" },
    { key: "returningCustomers", label: "Returning Customers", format: (v: number) => v.toLocaleString(), sub: "this month" },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Period:</span>
        {([["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"]] as [Period, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${period === key ? "bg-brand-green text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_LABELS.map(({ key, label, format, sub }) => (
          <div key={key} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-brand-green">
              {data ? format(data.kpis[key] as number) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          {data && <OrdersOverTime data={data.ordersOverTime} />}
        </div>
        <div className="rounded-xl border bg-card p-4">
          {data && <RetentionChart data={data.retention.data} returningCount={data.retention.returningCount} retentionRate={data.retention.retentionRate} />}
        </div>
        <div className="rounded-xl border bg-card p-4">
          {data && <OrderTypePie data={data.orderTypeSplit} />}
        </div>
        <div className="rounded-xl border bg-card p-4">
          {data && <TopItems data={data.topItems} />}
        </div>
        <div className="rounded-xl border bg-card p-4 lg:col-span-2">
          {data && <PeakHoursHeatmap data={data.peakHours} />}
        </div>
      </div>
    </div>
  );
}
