import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  // The Database types declare no relationships (regenerate with
  // `supabase gen types` once the DB is live to drop this override), so the
  // embedded `menu_items` join is typed explicitly here.
  const { data } = await admin
    .from("menu_item_prices")
    .select("id, label, base_price, menu_items!inner(name, restaurant_id)")
    .eq("menu_items.restaurant_id", session.restaurantId)
    .eq("is_active", true)
    .returns<
      {
        id: string;
        label: string;
        base_price: number;
        menu_items:
          | { name: string; restaurant_id: string }
          | { name: string; restaurant_id: string }[];
      }[]
    >();

  const variants = (data ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    basePrice: Number(p.base_price),
    itemName: Array.isArray(p.menu_items) ? p.menu_items[0]?.name : (p.menu_items as { name: string })?.name,
  }));

  return NextResponse.json({ variants });
}
