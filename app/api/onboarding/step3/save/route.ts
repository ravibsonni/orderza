import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Auto-save draft — full save happens in /step3
  return NextResponse.json({ success: true });
}
