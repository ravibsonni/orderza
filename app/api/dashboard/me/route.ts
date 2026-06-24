import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ redirect: "/login" });

  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("restaurants").select("name, is_active, onboarding_step").eq("id", session.restaurantId).single();

  if (!data?.is_active || data.onboarding_step < 8) return NextResponse.json({ redirect: "/onboarding" });
  return NextResponse.json({ restaurantName: data.name });
}
