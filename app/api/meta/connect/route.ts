import { NextRequest, NextResponse } from "next/server";
import { requireSession, updateSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { createMetaClient, aedToFils, MetaProduct } from "@/lib/meta/client";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { accessToken, phoneNumberId, wabaId, catalogId } = body as {
    accessToken: string;
    phoneNumberId: string;
    wabaId: string;
    catalogId: string;
  };

  if (!accessToken || !phoneNumberId || !wabaId || !catalogId) {
    return NextResponse.json(
      { error: "All four Meta credentials are required." },
      { status: 400 }
    );
  }

  const metaClient = createMetaClient({
    accessToken,
    catalogId,
    phoneNumberId,
    wabaId,
  });

  // Step 1: Validate access token
  let tokenInfo: { id: string; name: string };
  try {
    tokenInfo = await metaClient.validateToken();
  } catch (err) {
    return NextResponse.json(
      {
        error: `Invalid Meta access token: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      { status: 400 }
    );
  }

  // Step 2: Verify phone number ID
  try {
    await metaClient.verifyPhoneNumber();
  } catch (err) {
    return NextResponse.json(
      {
        error: `Invalid Phone Number ID: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  // Step 3: Encrypt token and store credentials
  const encryptedToken = encrypt(accessToken);

  await admin
    .from("restaurants")
    .update({
      meta_access_token_enc: encryptedToken,
      meta_phone_number_id: phoneNumberId,
      meta_waba_id: wabaId,
      meta_catalog_id: catalogId,
      meta_connected_at: new Date().toISOString(),
    })
    .eq("id", session.restaurantId);

  // Step 4: Fetch all menu items + prices for this restaurant
  const { data: items } = await admin
    .from("menu_items")
    .select(
      `
      id, name, description, image_url, is_available,
      menu_item_prices!inner(id, label, delivery_price, base_price, is_active)
    `
    )
    .eq("restaurant_id", session.restaurantId);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://orderza.app";
  const restaurantSlug =
    (
      await admin
        .from("restaurants")
        .select("slug")
        .eq("id", session.restaurantId)
        .single()
    ).data?.slug ?? "";

  let productCount = 0;
  const errors: string[] = [];

  // Step 5: Create products in Meta catalogue
  for (const item of items ?? []) {
    const prices = Array.isArray(item.menu_item_prices)
      ? item.menu_item_prices
      : [item.menu_item_prices];

    for (const price of prices) {
      if (!price.is_active) continue;

      const productPayload: MetaProduct = {
        retailer_id: price.id,
        name: prices.length > 1 ? `${item.name} — ${price.label}` : item.name,
        description: item.description ?? item.name,
        price: aedToFils(Number(price.delivery_price ?? price.base_price)),
        currency: "AED",
        availability: item.is_available ? "in stock" : "out of stock",
        image_url:
          item.image_url ?? `${appUrl}/placeholder-food.jpg`,
        url: `${appUrl}/r/${restaurantSlug}`,
        category: "FOOD_BEVERAGES",
      };

      try {
        const result = await metaClient.createProduct(productPayload);
        // Store the Meta product retailer_id back into our DB
        await admin
          .from("menu_item_prices")
          .update({ meta_variant_id: result.retailer_id })
          .eq("id", price.id);

        productCount++;
      } catch (err) {
        errors.push(
          `${item.name} (${price.label}): ${err instanceof Error ? err.message : "Failed"}`
        );
      }
    }
  }

  await writeAuditLog({
    restaurantId: session.restaurantId,
    actorType: "restaurant",
    actorId: session.authUserId,
    action: "meta.catalogue.created",
    newValue: {
      metaUserId: tokenInfo.id,
      productCount,
      errorCount: errors.length,
    },
    ...requestMeta(req),
  });

  return NextResponse.json({
    success: true,
    productCount,
    metaUser: tokenInfo.name,
    errors: errors.length > 0 ? errors : undefined,
  });
}
