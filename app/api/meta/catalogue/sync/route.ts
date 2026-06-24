import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { createMetaClient, aedToFils, MetaProduct } from "@/lib/meta/client";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select(
      "meta_access_token_enc, meta_catalog_id, meta_phone_number_id, meta_waba_id, slug"
    )
    .eq("id", session.restaurantId)
    .single();

  if (
    !restaurant?.meta_access_token_enc ||
    !restaurant.meta_catalog_id
  ) {
    return NextResponse.json(
      { error: "Meta credentials not configured. Complete Step 5 first." },
      { status: 400 }
    );
  }

  const accessToken = decrypt(restaurant.meta_access_token_enc);
  const metaClient = createMetaClient({
    accessToken,
    catalogId: restaurant.meta_catalog_id,
    phoneNumberId: restaurant.meta_phone_number_id ?? "",
    wabaId: restaurant.meta_waba_id ?? "",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orderza.app";

  // Fetch our DB state
  const { data: items } = await admin
    .from("menu_items")
    .select(
      `id, name, description, image_url, is_available,
       menu_item_prices(id, label, delivery_price, base_price, is_active, meta_variant_id)`
    )
    .eq("restaurant_id", session.restaurantId);

  // Fetch Meta catalogue state
  const metaProducts = await metaClient.listProducts();
  const metaRetailerIds = new Set(metaProducts.map((p) => p.retailer_id));

  let created = 0;
  let updated = 0;
  let deleted = 0;
  const errors: string[] = [];

  const dbRetailerIds = new Set<string>();

  for (const item of items ?? []) {
    const prices = Array.isArray(item.menu_item_prices)
      ? item.menu_item_prices
      : [];

    for (const price of prices) {
      if (!price.is_active) continue;
      dbRetailerIds.add(price.id);

      const productPayload: Omit<MetaProduct, "retailer_id"> = {
        name:
          prices.filter((p) => p.is_active).length > 1
            ? `${item.name} — ${price.label}`
            : item.name,
        description: item.description ?? item.name,
        price: aedToFils(Number(price.delivery_price ?? price.base_price)),
        currency: "AED",
        availability: item.is_available ? "in stock" : "out of stock",
        image_url: item.image_url ?? `${appUrl}/placeholder-food.jpg`,
        url: `${appUrl}/r/${restaurant.slug}`,
        category: "FOOD_BEVERAGES",
      };

      try {
        if (metaRetailerIds.has(price.id)) {
          await metaClient.updateProduct(price.id, productPayload);
          updated++;
        } else {
          await metaClient.createProduct({
            retailer_id: price.id,
            ...productPayload,
          });
          await admin
            .from("menu_item_prices")
            .update({ meta_variant_id: price.id })
            .eq("id", price.id);
          created++;
        }
      } catch (err) {
        errors.push(
          `${item.name}: ${err instanceof Error ? err.message : "Failed"}`
        );
      }
    }
  }

  // Delete from Meta products that no longer exist in DB
  for (const metaProduct of metaProducts) {
    if (!dbRetailerIds.has(metaProduct.retailer_id)) {
      try {
        await metaClient.deleteProduct(metaProduct.retailer_id);
        deleted++;
      } catch (err) {
        errors.push(
          `Delete ${metaProduct.retailer_id}: ${err instanceof Error ? err.message : "Failed"}`
        );
      }
    }
  }

  await writeAuditLog({
    restaurantId: session.restaurantId,
    actorType: "restaurant",
    actorId: session.authUserId,
    action: "meta.catalogue.synced",
    newValue: { created, updated, deleted, errors: errors.length },
    ...requestMeta(req),
  });

  return NextResponse.json({ success: true, created, updated, deleted, errors });
}
