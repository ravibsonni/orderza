import { notFound } from "next/navigation";
import { verifyTrackingToken } from "@/lib/tracking/token";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { TrackingMap } from "@/components/tracking/TrackingMap";
import { StatusTimeline } from "@/components/tracking/StatusTimeline";
import { OrderSummaryCard } from "@/components/tracking/OrderSummaryCard";
import { TrackingRealtimeWrapper } from "./TrackingRealtimeWrapper";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function TrackingPage({ params }: Props) {
  const { token } = await params;

  // Verify token
  let payload: { orderId: string; restaurantId: string; sessionId: string };
  try {
    payload = await verifyTrackingToken(token);
  } catch {
    notFound();
  }

  const admin = createSupabaseAdminClient();

  // Verify token is stored and matches
  const { data: session } = await admin
    .from("rider_tracking_sessions")
    .select("id, last_lat, last_lng, last_location_at, status, rider_id, customer_tokens")
    .eq("id", payload.sessionId)
    .single();

  if (!session) notFound();

  const storedToken = (session.customer_tokens as Record<string, string>)?.[payload.orderId];
  if (storedToken !== token) notFound();

  // Fetch order details (no customer PII exposed)
  const { data: order } = await admin
    .from("orders")
    .select(`
      id, order_number, status,
      order_items(item_name, price_label, quantity, unit_price)
    `)
    .eq("id", payload.orderId)
    .single();

  if (!order) notFound();

  // Fetch restaurant details
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name, logo_url")
    .eq("id", payload.restaurantId)
    .single();

  // Fetch rider first name only (privacy — no last name)
  const { data: rider } = await admin
    .from("delivery_riders")
    .select("name")
    .eq("id", session.rider_id ?? "")
    .single();

  const riderFirstName = rider?.name?.split(" ")[0] ?? "Your rider";

  const hasLocation = session.last_lat !== null && session.last_lng !== null;

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <div className="bg-brand-green text-white px-4 py-3 flex items-center gap-3">
        {restaurant?.logo_url && (
          <img src={restaurant.logo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
        )}
        <div>
          <p className="font-bold">{restaurant?.name}</p>
          <p className="text-xs text-white/70">Live order tracking</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Status */}
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🛵</span>
            <div>
              <p className="font-semibold">{riderFirstName} is on the way</p>
              <p className="text-sm text-muted-foreground">
                {session.last_location_at
                  ? `Last updated ${new Date(session.last_location_at).toLocaleTimeString()}`
                  : "Waiting for rider location…"}
              </p>
            </div>
          </div>
          <StatusTimeline status={order.status as "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered"} />
        </div>

        {/* Map */}
        {hasLocation ? (
          <TrackingRealtimeWrapper
            sessionId={session.id}
            initialLat={Number(session.last_lat)}
            initialLng={Number(session.last_lng)}
            restaurantName={restaurant?.name ?? ""}
          />
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
            <p className="text-3xl mb-2">📍</p>
            <p>Waiting for rider to share their location…</p>
          </div>
        )}

        {/* Order summary — items only, no prices */}
        <OrderSummaryCard
          orderNumber={order.order_number}
          restaurantName={restaurant?.name ?? ""}
          restaurantLogoUrl={restaurant?.logo_url ?? null}
          items={(order.order_items as { item_name: string; price_label: string; quantity: number }[]).map((i) => ({
            name: i.item_name,
            quantity: i.quantity,
            price_label: i.price_label,
          }))}
        />

        <p className="text-center text-xs text-muted-foreground">
          This link is private and works only for your order. It expires 4 hours after dispatch.
        </p>
      </div>
    </div>
  );
}
