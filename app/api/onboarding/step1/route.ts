import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, whatsappNumber, address, city, email, slug } = body;
  if (!name?.trim() || !whatsappNumber?.trim()) return NextResponse.json({ error: "Name and WhatsApp number required." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const finalSlug = slug?.trim() || slugify(name);

  await admin.from("restaurants").update({ name, whatsapp_number: whatsappNumber, address, city, email, slug: finalSlug, updated_at: new Date().toISOString() }).eq("id", session.restaurantId);
  await writeAuditLog({ restaurantId: session.restaurantId, actorType: "restaurant", actorId: session.authUserId, action: "onboarding.step1.saved", newValue: { name, city }, ...requestMeta(req) });
  return NextResponse.json({ success: true });
}
