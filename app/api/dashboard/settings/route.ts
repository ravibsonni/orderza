import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("restaurants")
    .select("name, email, phone, address, city, logo_url, whatsapp_number, meta_phone_number_id, meta_waba_id, meta_connected_at, msg91_connected_at, msg91_bot_setup_method, msg91_bot_prompt, stripe_subscription_id, plan, plan_status, slug")
    .eq("id", session.restaurantId)
    .single();

  return NextResponse.json({ settings: data });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates = await req.json();
  const allowed = ["name", "phone", "address", "city"];
  const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));

  const admin = createSupabaseAdminClient();
  await admin.from("restaurants").update({ ...safe, updated_at: new Date().toISOString() }).eq("id", session.restaurantId);
  await writeAuditLog({ restaurantId: session.restaurantId, actorType: "restaurant", actorId: session.authUserId, action: "settings.updated", newValue: safe, ...requestMeta(req) });
  return NextResponse.json({ success: true });
}
