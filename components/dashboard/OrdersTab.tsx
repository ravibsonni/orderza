"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatAED, formatRelativeTime } from "@/lib/utils";
import { Loader2, ChevronRight, X } from "lucide-react";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
type OrderType = "delivery" | "takeaway" | "dine_in";
type Filter = "all" | "pending" | "active" | "completed" | "cancelled";

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  order_type: OrderType;
  status: OrderStatus;
  total: number;
  created_at: string;
  item_count: number;
  delivery_address: string | null;
  notes: string | null;
  items?: { name: string; quantity: number; unit_price: number }[];
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "warning",
  confirmed: "default",
  preparing: "amber",
  ready: "success",
  out_for_delivery: "default",
  delivered: "success",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ACTIVE_STATUSES: OrderStatus[] = ["confirmed", "preparing", "ready", "out_for_delivery"];

export function OrdersTab() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/orders?filter=${filter}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      toast({ title: "Failed to load orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setActionLoading(orderId + status);
    try {
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `Order updated to ${STATUS_LABELS[status]}`, variant: "default" });
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const FILTER_LABELS: [Filter, string][] = [["all", "All"], ["pending", "Pending"], ["active", "Active"], ["completed", "Completed"], ["cancelled", "Cancelled"]];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_LABELS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors tap-target ${filter === key ? "bg-brand-green text-white" : "bg-secondary text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No orders found.</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-secondary/50 transition-colors text-left tap-target"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-sm">#{order.order_number}</span>
                  <Badge variant={STATUS_COLORS[order.status] as "default"}>{STATUS_LABELS[order.status]}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">{order.order_type.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                  <span>{order.customer_name ?? "Unknown"}</span>
                  <span>·</span>
                  <span>{order.item_count} item{order.item_count !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(order.created_at)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold">{formatAED(order.total)}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Order detail slide-over */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="w-full max-w-md bg-card border-l shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg">Order #{selectedOrder.order_number}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-muted-foreground hover:text-foreground tap-target"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant={STATUS_COLORS[selectedOrder.status] as "default"}>{STATUS_LABELS[selectedOrder.status]}</Badge>
                <Badge variant="outline" className="capitalize">{selectedOrder.order_type.replace("_", " ")}</Badge>
              </div>
              {selectedOrder.customer_name && <p className="text-sm"><span className="text-muted-foreground">Customer: </span>{selectedOrder.customer_name}</p>}
              {selectedOrder.delivery_address && <p className="text-sm"><span className="text-muted-foreground">Address: </span>{selectedOrder.delivery_address}</p>}
              {selectedOrder.notes && <p className="text-sm"><span className="text-muted-foreground">Notes: </span>{selectedOrder.notes}</p>}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Items</p>
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.quantity}× {item.name}</span>
                    <span>{formatAED(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatAED(selectedOrder.total)}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t space-y-2">
              {selectedOrder.status === "pending" && (
                <Button className="w-full" onClick={() => updateStatus(selectedOrder.id, "confirmed")} disabled={!!actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "✅ Confirm Order"}
                </Button>
              )}
              {selectedOrder.status === "confirmed" && (
                <Button className="w-full" onClick={() => updateStatus(selectedOrder.id, "preparing")} disabled={!!actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "👨‍🍳 Start Preparing"}
                </Button>
              )}
              {selectedOrder.status === "preparing" && (
                <Button className="w-full" onClick={() => updateStatus(selectedOrder.id, "ready")} disabled={!!actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "📦 Mark Ready"}
                </Button>
              )}
              {["pending", "confirmed", "preparing"].includes(selectedOrder.status) && (
                <Button variant="destructive" className="w-full" onClick={() => updateStatus(selectedOrder.id, "cancelled")} disabled={!!actionLoading}>
                  Cancel Order
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
