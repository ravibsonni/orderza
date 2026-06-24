import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: riders } = await admin.from("delivery_riders").select("id, name, phone, is_active").eq("restaurant_id", session.restaurantId).order("created_at");
  return NextResponse.json({ riders: riders ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone } = await req.json();
  const admin = createSupabaseAdminClient();

  const { data } = await admin.from("delivery_riders").insert({ restaurant_id: session.restaurantId, name, phone }).select("id").single();
  await writeAuditLog({ restaurantId: session.restaurantId, actorType: "restaurant", actorId: session.authUserId, action: "rider.created", newValue: { name, phone }, ...requestMeta(req) });
  return NextResponse.json({ success: true, id: data?.id });
}
