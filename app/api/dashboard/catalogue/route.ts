import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const { data: cats } = await admin
    .from("menu_categories")
    .select("id, name, menu_items(id, name, name_ar, description, description_ar, image_url, is_available, category_id, menu_item_prices(id, label, base_price, delivery_price, takeaway_price, dine_in_price, is_active, is_default, meta_variant_id))")
    .eq("restaurant_id", session.restaurantId)
    .eq("is_active", true)
    .order("display_order");

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("msg91_bot_prompt, msg91_bot_setup_method, meta_connected_at")
    .eq("id", session.restaurantId)
    .single();

  return NextResponse.json({
    categories: cats ?? [],
    botPrompt: restaurant?.msg91_bot_prompt,
    botMethod: restaurant?.msg91_bot_setup_method,
    lastSynced: restaurant?.meta_connected_at,
  });
}
