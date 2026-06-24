import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ redirect: "/login" });

  const admin = createSupabaseAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, auth_user_id, email, name, whatsapp_number, onboarding_step, onboarding_xp, is_active")
    .eq("id", session.restaurantId)
    .single();

  if (!restaurant) return NextResponse.json({ redirect: "/login" });
  if (restaurant.is_active && restaurant.onboarding_step >= 8) return NextResponse.json({ redirect: "/dashboard" });

  const step = restaurant.onboarding_step ?? 1;
  const completedSteps = Array.from({ length: step - 1 }, (_, i) => i + 1);

  return NextResponse.json({
    restaurantId: restaurant.id,
    authUserId: restaurant.auth_user_id,
    email: restaurant.email,
    restaurantName: restaurant.name,
    whatsappNumber: restaurant.whatsapp_number,
    currentStep: step,
    xp: restaurant.onboarding_xp ?? 0,
    completedSteps,
  });
}
