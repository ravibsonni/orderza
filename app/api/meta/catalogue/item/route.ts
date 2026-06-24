import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { createMetaClient, aedToFils } from "@/lib/meta/client";
import { writeAuditLog, requestMeta } from "@/lib/audit";

/** Create or update a single catalogue item and sync to Meta */
export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { menuItemId, action } = body as {
    menuItemId: string;
    action: "upsert" | "delete" | "toggle_availability";
  };

  const admin = createSupabaseAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select(
      "meta_access_token_enc, meta_catalog_id, meta_phone_number_id, meta_waba_id, slug"
    )
    .eq("id", session.restaurantId)
    .single();

  const hasMetaConfig =
    restaurant?.meta_access_token_enc && restaurant?.meta_catalog_id;

  // Helper to get meta client
  const getMetaClient = () => {
    if (!hasMetaConfig) throw new Error("Meta not connected");
    const accessToken = decrypt(restaurant!.meta_access_token_enc!);
    return createMetaClient({
      accessToken,
      catalogId: restaurant!.meta_catalog_id!,
      phoneNumberId: restaurant!.meta_phone_number_id ?? "",
      wabaId: restaurant!.meta_waba_id ?? "",
    });
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orderza.app";

  if (action === "delete") {
    // Fetch price variant IDs before deletion
    const { data: prices } = await admin
      .from("menu_item_prices")
      .select("id, meta_variant_id")
      .eq("menu_item_id", menuItemId);

    // Delete from Supabase
    await admin.from("menu_items").delete().eq("id", menuItemId);

    // Delete from Meta
    if (hasMetaConfig && prices) {
      const metaClient = getMetaClient();
      for (const price of prices) {
        try {
          await metaClient.deleteProduct(price.meta_variant_id ?? price.id);
        } catch (err) {
          console.error("[meta/item] Delete failed:", err);
        }
      }
    }

    await writeAuditLog({
      restaurantId: session.restaurantId,
      actorType: "restaurant",
      actorId: session.authUserId,
      action: "catalogue.item.deleted",
      entityType: "menu_item",
      entityId: menuItemId,
      ...requestMeta(req),
    });

    return NextResponse.json({ success: true });
  }

  if (action === "toggle_availability") {
    const { isAvailable } = body as { isAvailable: boolean };

    await admin
      .from("menu_items")
      .update({ is_available: isAvailable })
      .eq("id", menuItemId)
      .eq("restaurant_id", session.restaurantId);

    // Sync availability to Meta
    if (hasMetaConfig) {
      const { data: prices } = await admin
        .from("menu_item_prices")
        .select("id, meta_variant_id")
        .eq("menu_item_id", menuItemId)
        .eq("is_active", true);

      if (prices) {
        const metaClient = getMetaClient();
        for (const price of prices) {
          try {
            await metaClient.updateProduct(price.meta_variant_id ?? price.id, {
              availability: isAvailable ? "in stock" : "out of stock",
            });
          } catch (err) {
            console.error("[meta/item] Availability sync failed:", err);
          }
        }
      }
    }

    await writeAuditLog({
      restaurantId: session.restaurantId,
      actorType: "restaurant",
      actorId: session.authUserId,
      action: "catalogue.item.availability_toggled",
      entityType: "menu_item",
      entityId: menuItemId,
      newValue: { isAvailable },
      ...requestMeta(req),
    });

    return NextResponse.json({ success: true });
  }

  // action === 'upsert'
  const {
    name,
    nameAr,
    description,
    descriptionAr,
    categoryId,
    isAvailable,
    imageUrl,
    prices,
  } = body;

  const { data: updatedItem } = await admin
    .from("menu_items")
    .update({
      name,
      name_ar: nameAr,
      description,
      description_ar: descriptionAr,
      category_id: categoryId,
      is_available: isAvailable,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuItemId)
    .eq("restaurant_id", session.restaurantId)
    .select("id, name, description, image_url, is_available")
    .single();

  if (!updatedItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Upsert prices
  let metaSyncError: string | undefined;
  if (prices && Array.isArray(prices)) {
    for (const price of prices) {
      await admin.from("menu_item_prices").upsert(
        {
          id: price.id,
          menu_item_id: menuItemId,
          label: price.label,
          base_price: price.basePrice,
          delivery_price: price.deliveryPrice,
          takeaway_price: price.takeawayPrice,
          dine_in_price: price.dineInPrice,
          is_active: price.isActive !== false,
          is_default: price.isDefault ?? false,
        },
        { onConflict: "id" }
      );

      // Sync to Meta
      if (hasMetaConfig) {
        try {
          const metaClient = getMetaClient();
          const productPayload = {
            name:
              prices.filter((p: { isActive: boolean }) => p.isActive !== false)
                .length > 1
                ? `${name} — ${price.label}`
                : name,
            description: description ?? name,
            price: aedToFils(Number(price.deliveryPrice ?? price.basePrice)),
            currency: "AED" as const,
            availability: (isAvailable
              ? "in stock"
              : "out of stock") as "in stock" | "out of stock",
            image_url: imageUrl ?? `${appUrl}/placeholder-food.jpg`,
            url: `${appUrl}/r/${restaurant!.slug}`,
            category: "FOOD_BEVERAGES" as const,
          };

          if (price.metaVariantId) {
            await metaClient.updateProduct(price.metaVariantId, productPayload);
          } else {
            const result = await metaClient.createProduct({
              retailer_id: price.id,
              ...productPayload,
            });
            await admin
              .from("menu_item_prices")
              .update({ meta_variant_id: result.retailer_id })
              .eq("id", price.id);
          }
        } catch (err) {
          metaSyncError =
            err instanceof Error ? err.message : "Meta sync failed";
        }
      }
    }
  }

  await writeAuditLog({
    restaurantId: session.restaurantId,
    actorType: "restaurant",
    actorId: session.authUserId,
    action: "catalogue.item.updated",
    entityType: "menu_item",
    entityId: menuItemId,
    newValue: { name, isAvailable, priceCount: prices?.length },
    ...requestMeta(req),
  });

  return NextResponse.json({
    success: true,
    metaSyncError,
  });
}
