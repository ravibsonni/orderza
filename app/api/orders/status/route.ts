import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, status } = await req.json();
  const admin = createSupabaseAdminClient();

  const { data: order } = await admin.from("orders").select("id, status").eq("id", orderId).eq("restaurant_id", session.restaurantId).single();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  await admin.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId);

  await writeAuditLog({ restaurantId: session.restaurantId, actorType: "restaurant", actorId: session.authUserId, action: "order.status.updated", entityType: "order", entityId: orderId, oldValue: { status: order.status }, newValue: { status }, ...requestMeta(req) });

  return NextResponse.json({ success: true });
}
