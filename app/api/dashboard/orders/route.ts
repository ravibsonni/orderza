import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("orders")
    .select("id, order_number, customer_name, order_type, status, total, created_at, delivery_address, notes, order_items(item_name, quantity, unit_price)")
    .eq("restaurant_id", session.restaurantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "pending") query = query.eq("status", "pending");
  else if (filter === "active") query = query.in("status", ["confirmed", "preparing", "ready", "out_for_delivery"]);
  else if (filter === "completed") query = query.eq("status", "delivered");
  else if (filter === "cancelled") query = query.eq("status", "cancelled");

  const { data: orders } = await query;

  const formatted = (orders ?? []).map((o) => ({
    ...o,
    item_count: Array.isArray(o.order_items) ? o.order_items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0) : 0,
    items: o.order_items,
  }));

  return NextResponse.json({ orders: formatted });
}
