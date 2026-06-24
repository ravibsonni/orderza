import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("restaurants").select("stripe_customer_id").eq("id", session.restaurantId).single();

  if (!data?.stripe_customer_id) return NextResponse.json({ error: "No Stripe customer found." }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = await createPortalSession(data.stripe_customer_id, `${appUrl}/dashboard`);
  return NextResponse.json({ url });
}
