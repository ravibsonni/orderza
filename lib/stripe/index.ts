/**
 * /lib/stripe/index.ts
 * Stripe client and helpers for platform subscription billing.
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Lazily instantiate the Stripe client. Creating it at module scope would
 * require STRIPE_SECRET_KEY during `next build` (page-data collection imports
 * these route modules), so creation is deferred until the first request.
 */
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Must match the API version the installed stripe SDK (17.x) is pinned to.
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

export const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
    label: "Monthly",
    amount: 14900, // AED 149.00 in fils
    currency: "aed",
    interval: "month" as const,
  },
  annual: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID!,
    label: "Annual",
    amount: 149000, // AED 1,490.00 in fils
    currency: "aed",
    interval: "year" as const,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/**
 * Create or retrieve a Stripe customer for a restaurant.
 */
export async function getOrCreateStripeCustomer(
  restaurantId: string,
  email: string,
  name: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await getStripe().customers.create({
    email,
    name,
    metadata: { restaurantId },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout session for a subscription plan.
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  restaurantId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.create({
    customer: params.customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { restaurantId: params.restaurantId },
    subscription_data: { metadata: { restaurantId: params.restaurantId } },
    locale: "en",
    currency: "aed",
    allow_promotion_codes: true,
  });
}

/**
 * Construct and verify a Stripe webhook event.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

/**
 * Create a Stripe customer portal session for billing management.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}
