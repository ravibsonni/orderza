import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { MSG91Client } from "@/lib/msg91/client";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-msg91-signature") ?? "";

  // Verify webhook signature
  const webhookSecret = process.env.MSG91_PLATFORM_API_KEY ?? "";
  if (webhookSecret && !MSG91Client.verifyWebhookSignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: {
    rider_phone?: string;
    from?: string;
    location?: { latitude: number; longitude: number };
    latitude?: number;
    longitude?: number;
  };

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const riderPhone = payload.rider_phone ?? payload.from;
  const lat =
    payload.location?.latitude ?? payload.latitude;
  const lng =
    payload.location?.longitude ?? payload.longitude;

  if (!riderPhone || lat === undefined || lng === undefined) {
    return NextResponse.json(
      { error: "rider_phone and location (lat/lng) are required." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  // Find active tracking session for this rider phone
  const { data: rider } = await admin
    .from("delivery_riders")
    .select("id, restaurant_id")
    .eq("phone", riderPhone)
    .eq("is_active", true)
    .single();

  if (!rider) {
    // Not a known rider — silently accept (don't expose data)
    return NextResponse.json({ received: true });
  }

  const { data: trackingSession } = await admin
    .from("rider_tracking_sessions")
    .select("id")
    .eq("rider_id", rider.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!trackingSession) {
    return NextResponse.json({ received: true });
  }

  // Update last known location
  await admin
    .from("rider_tracking_sessions")
    .update({
      last_lat: lat,
      last_lng: lng,
      last_location_at: new Date().toISOString(),
    })
    .eq("id", trackingSession.id);

  // Supabase Realtime will broadcast the row update to all subscribed tracking pages.
  // No manual broadcast needed — clients subscribe to the rider_tracking_sessions table.

  await writeAuditLog({
    restaurantId: rider.restaurant_id,
    actorType: "webhook",
    actorId: "msg91",
    action: "rider.location.updated",
    entityType: "rider_tracking_session",
    entityId: trackingSession.id,
    newValue: { lat, lng, riderPhone },
  });

  return NextResponse.json({ received: true });
}
