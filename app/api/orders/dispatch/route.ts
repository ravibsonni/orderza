import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { createMSG91Client } from "@/lib/msg91/client";
import { signTrackingToken } from "@/lib/tracking/token";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orderIds, riderName, riderPhone } = body as {
    orderIds: string[];
    riderName: string;
    riderPhone: string; // E.164
  };

  if (!orderIds?.length || !riderName || !riderPhone) {
    return NextResponse.json(
      { error: "orderIds, riderName, and riderPhone are required." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, whatsapp_number, msg91_api_key_enc")
    .eq("id", session.restaurantId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  // Upsert rider
  const { data: rider } = await admin
    .from("delivery_riders")
    .upsert(
      {
        restaurant_id: session.restaurantId,
        name: riderName,
        phone: riderPhone,
        is_active: true,
      },
      { onConflict: "phone" }
    )
    .select("id")
    .single();

  if (!rider) {
    return NextResponse.json({ error: "Failed to create rider." }, { status: 500 });
  }

  // Fetch orders to get customer phones
  const { data: orders } = await admin
    .from("orders")
    .select("id, order_number, customer_phone, customer_name")
    .in("id", orderIds)
    .eq("restaurant_id", session.restaurantId);

  if (!orders?.length) {
    return NextResponse.json({ error: "Orders not found." }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orderza.app";

  // Create tracking session
  const { data: trackingSession } = await admin
    .from("rider_tracking_sessions")
    .insert({
      rider_id: rider.id,
      restaurant_id: session.restaurantId,
      order_ids: orderIds,
      customer_tokens: {},
      status: "active",
    })
    .select("id")
    .single();

  if (!trackingSession) {
    return NextResponse.json(
      { error: "Failed to create tracking session." },
      { status: 500 }
    );
  }

  // Generate per-customer tracking tokens
  const customerTokens: Record<string, string> = {};
  const customerTrackingLinks: Record<string, string> = {};

  for (const order of orders) {
    const token = await signTrackingToken({
      orderId: order.id,
      restaurantId: session.restaurantId,
      sessionId: trackingSession.id,
    });
    customerTokens[order.id] = token;
    customerTrackingLinks[order.id] = `${appUrl}/track/${token}`;
  }

  // Store tokens in tracking session
  await admin
    .from("rider_tracking_sessions")
    .update({ customer_tokens: customerTokens })
    .eq("id", trackingSession.id);

  // Update orders status to out_for_delivery
  await admin
    .from("orders")
    .update({
      status: "out_for_delivery",
      rider_id: rider.id,
      updated_at: new Date().toISOString(),
    })
    .in("id", orderIds);

  // Send notifications via MSG91 if configured
  if (restaurant.msg91_api_key_enc) {
    const apiKey = decrypt(restaurant.msg91_api_key_enc);
    const msg91 = createMSG91Client(apiKey);

    // Message rider (privacy-safe — no customer details)
    const orderNumbers = orders.map((o) => `#${o.order_number}`).join(", ");
    const riderMessage = `Hi ${riderName}, you have been assigned order(s): ${orderNumbers}.\n\nPlease share your live location in this chat so customers can track you.\n\nReply DONE when all deliveries are complete.`;

    await msg91
      .sendWhatsAppMessage(
        riderPhone,
        riderMessage,
        restaurant.whatsapp_number ?? ""
      )
      .catch((err) =>
        console.error("[dispatch] Rider notification failed:", err)
      );

    // Message each customer their private tracking link
    for (const order of orders) {
      const trackingLink = customerTrackingLinks[order.id];
      const customerMessage = `🛵 Your order #${order.order_number} from ${restaurant.name} is on the way!\n\nTrack your delivery here:\n${trackingLink}\n\nThis link is private and works only for your order.`;

      await msg91
        .sendWhatsAppMessage(
          order.customer_phone,
          customerMessage,
          restaurant.whatsapp_number ?? ""
        )
        .catch((err) =>
          console.error(
            `[dispatch] Customer notification failed for ${order.order_number}:`,
            err
          )
        );
    }
  }

  await writeAuditLog({
    restaurantId: session.restaurantId,
    actorType: "restaurant",
    actorId: session.authUserId,
    action: "order.dispatched",
    entityType: "rider_tracking_session",
    entityId: trackingSession.id,
    newValue: {
      riderName,
      orderIds,
      orderCount: orders.length,
    },
    ...requestMeta(req),
  });

  return NextResponse.json({
    success: true,
    trackingSessionId: trackingSession.id,
    orderCount: orders.length,
  });
}
