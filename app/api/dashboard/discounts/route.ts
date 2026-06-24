import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("menu_item_discounts").select("*").eq("restaurant_id", session.restaurantId).order("created_at", { ascending: false });
  return NextResponse.json({ discounts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const admin = createSupabaseAdminClient();

  await admin.from("menu_item_discounts").insert({
    restaurant_id: session.restaurantId,
    menu_item_price_id: body.priceVariantId,
    label: body.label || null,
    discount_type: body.discountType,
    discount_value: body.discountValue,
    days_of_week: body.daysOfWeek.length ? body.daysOfWeek : null,
    start_time: body.startTime || null,
    end_time: body.endTime || null,
    valid_from: body.validFrom || null,
    valid_until: body.validUntil || null,
    is_active: true,
  });

  return NextResponse.json({ success: true });
}
