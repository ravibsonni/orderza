import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categories, items } = await req.json();
  const admin = createSupabaseAdminClient();
  const restaurantId = session.restaurantId;

  // Upsert categories
  const categoryMap: Record<string, string> = {};
  for (let i = 0; i < categories.length; i++) {
    const name = categories[i];
    const { data: cat } = await admin.from("menu_categories").upsert({ restaurant_id: restaurantId, name, display_order: i }, { onConflict: "restaurant_id,name" }).select("id").single();
    if (cat) categoryMap[name] = cat.id;
  }

  // Insert items + prices
  for (const item of items ?? []) {
    const catId = categoryMap[item.category] ?? null;
    const { data: menuItem } = await admin.from("menu_items").insert({ restaurant_id: restaurantId, category_id: catId, name: item.name, name_ar: item.nameAr ?? null, description: item.description ?? null, is_available: item.isAvailable !== false }).select("id").single();
    if (!menuItem) continue;
    for (let vi = 0; vi < (item.variants ?? []).length; vi++) {
      const v = item.variants[vi];
      await admin.from("menu_item_prices").insert({ menu_item_id: menuItem.id, label: v.label || "Regular", base_price: v.price ?? 0, is_default: vi === 0, is_active: true });
    }
  }

  await writeAuditLog({ restaurantId, actorType: "restaurant", actorId: session.authUserId, action: "onboarding.step3.saved", newValue: { itemCount: items?.length, categoryCount: categories?.length }, ...requestMeta(req) });
  return NextResponse.json({ success: true });
}
