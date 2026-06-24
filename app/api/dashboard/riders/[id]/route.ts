import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const updates = await req.json();
  const admin = createSupabaseAdminClient();
  await admin.from("delivery_riders").update(updates).eq("id", id).eq("restaurant_id", session.restaurantId);
  return NextResponse.json({ success: true });
}
