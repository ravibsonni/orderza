import { NextRequest, NextResponse } from "next/server";
import { requireSession, updateSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { step, xpEarned } = await req.json();
  const admin = createSupabaseAdminClient();

  const { data: current } = await admin.from("restaurants").select("onboarding_step, onboarding_xp").eq("id", session.restaurantId).single();
  const newStep = Math.max(step, current?.onboarding_step ?? 1);
  const newXP = (current?.onboarding_xp ?? 0) + (xpEarned ?? 0);

  await admin.from("restaurants").update({ onboarding_step: newStep, onboarding_xp: newXP, updated_at: new Date().toISOString() }).eq("id", session.restaurantId);
  await updateSession({ onboardingStep: newStep });
  await writeAuditLog({ restaurantId: session.restaurantId, actorType: "restaurant", actorId: session.authUserId, action: "onboarding.step.completed", newValue: { step: newStep - 1, xpEarned } });
  return NextResponse.json({ success: true });
}
