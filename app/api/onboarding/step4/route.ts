import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { hasTax, taxName, taxRate, taxInclusive, hasDeliveryFee, deliveryFee, hasDeliveryMarkup, deliveryMarkupType, deliveryMarkupValue } = body;
  const admin = createSupabaseAdminClient();

  if (hasTax) {
    await admin.from("restaurant_tax_config").upsert({ restaurant_id: session.restaurantId, tax_name: taxName, tax_rate: taxRate, is_inclusive: taxInclusive, applies_to: "all" }, { onConflict: "restaurant_id" });
  }

  // Update delivery prices on all menu_item_prices
  if (hasDeliveryMarkup || hasDeliveryFee) {
    const { data: prices } = await admin.from("menu_item_prices").select("id, base_price").eq("is_active", true);
    for (const price of prices ?? []) {
      let deliveryPrice = Number(price.base_price);
      if (hasDeliveryMarkup) {
        deliveryPrice = deliveryMarkupType === "percentage" ? deliveryPrice * (1 + deliveryMarkupValue / 100) : deliveryPrice + deliveryMarkupValue;
      }
      await admin.from("menu_item_prices").update({ delivery_price: Math.round(deliveryPrice * 100) / 100 }).eq("id", price.id);
    }
  }

  await writeAuditLog({ restaurantId: session.restaurantId, actorType: "restaurant", actorId: session.authUserId, action: "onboarding.step4.saved", newValue: { hasTax, taxRate, hasDeliveryFee, deliveryFee, hasDeliveryMarkup }, ...requestMeta(req) });
  return NextResponse.json({ success: true });
}
