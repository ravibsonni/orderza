import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  PLANS,
  PlanKey,
  getOrCreateStripeCustomer,
  createCheckoutSession,
} from "@/lib/stripe";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { plan } = body as { plan: PlanKey };

  if (!PLANS[plan]) {
    return NextResponse.json(
      { error: "Invalid plan. Choose 'monthly' or 'annual'." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, email, stripe_customer_id")
    .eq("id", session.restaurantId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orderza.app";

  const customerId = await getOrCreateStripeCustomer(
    restaurant.id,
    restaurant.email ?? session.email,
    restaurant.name,
    restaurant.stripe_customer_id
  );

  if (!restaurant.stripe_customer_id) {
    await admin
      .from("restaurants")
      .update({ stripe_customer_id: customerId })
      .eq("id", session.restaurantId);
  }

  const checkoutSession = await createCheckoutSession({
    customerId,
    priceId: PLANS[plan].priceId,
    restaurantId: session.restaurantId,
    successUrl: `${appUrl}/onboarding?step=8&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/onboarding?step=7&canceled=true`,
  });

  await writeAuditLog({
    restaurantId: session.restaurantId,
    actorType: "restaurant",
    actorId: session.authUserId,
    action: "billing.checkout.created",
    newValue: { plan, checkoutSessionId: checkoutSession.id },
    ...requestMeta(req),
  });

  return NextResponse.json({ url: checkoutSession.url });
}
