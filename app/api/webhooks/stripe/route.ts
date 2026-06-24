import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import type Stripe from "stripe";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, sig);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  // Store raw event
  await admin.from("billing_events").upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    raw_event: event as unknown as Record<string, unknown>,
    status: "received",
  }, { onConflict: "stripe_event_id", ignoreDuplicates: true });

  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const restaurantId = checkoutSession.metadata?.restaurantId;
      if (!restaurantId) break;

      const subscriptionId =
        typeof checkoutSession.subscription === "string"
          ? checkoutSession.subscription
          : checkoutSession.subscription?.id;

      const plan =
        checkoutSession.metadata?.plan ?? "monthly";

      await admin
        .from("restaurants")
        .update({
          stripe_subscription_id: subscriptionId,
          plan,
          plan_status: "active",
          is_active: true,
          onboarding_step: 8,
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurantId);

      await admin.from("billing_events").update({
        restaurant_id: restaurantId,
        amount: (checkoutSession.amount_total ?? 0) / 100,
        currency: checkoutSession.currency ?? "aed",
        status: "completed",
      }).eq("stripe_event_id", event.id);

      await writeAuditLog({
        restaurantId,
        actorType: "webhook",
        actorId: "stripe",
        action: "billing.subscription.activated",
        newValue: { subscriptionId, plan },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        const { data: restaurant } = await admin
          .from("restaurants")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (restaurant) {
          await admin
            .from("restaurants")
            .update({
              plan_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", restaurant.id);

          await writeAuditLog({
            restaurantId: restaurant.id,
            actorType: "webhook",
            actorId: "stripe",
            action: "billing.payment.failed",
            newValue: { invoiceId: invoice.id },
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (customerId) {
        const { data: restaurant } = await admin
          .from("restaurants")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (restaurant) {
          await admin
            .from("restaurants")
            .update({
              plan_status: "canceled",
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", restaurant.id);

          await writeAuditLog({
            restaurantId: restaurant.id,
            actorType: "webhook",
            actorId: "stripe",
            action: "billing.subscription.canceled",
            newValue: { subscriptionId: subscription.id },
          });
        }
      }
      break;
    }

    default:
      // Unhandled event — acknowledged but not processed
      break;
  }

  return NextResponse.json({ received: true });
}
