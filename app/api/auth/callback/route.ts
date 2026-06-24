/**
 * /api/auth/callback
 * Receives the token from 36blocks auth (or dummy login) and creates a session.
 *
 * ── 36BLOCKS INTEGRATION NOTE ───────────────────────────────────────────
 * 36blocks redirects to this URL after login with ?token=<jwt>.
 * When DUMMY_AUTH_ENABLED=true, the login page POSTs here directly
 * with a synthetic payload — no token validation is performed.
 * When DUMMY_AUTH_ENABLED=false, validate the token against the
 * 36blocks public key before trusting the payload.
 * ────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createSession } from "@/lib/auth/session";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const dummyEmail = searchParams.get("email"); // dummy auth only

  const isDummy = process.env.DUMMY_AUTH_ENABLED === "true";

  let authUserId: string;
  let email: string;

  if (isDummy) {
    // ── DUMMY AUTH PATH (prototype) ──────────────────────────────────────
    // Accept any email; generate a stable authUserId from it.
    const { createHash } = await import("crypto");
    email = dummyEmail ?? "demo@orderza.ae";
    authUserId = createHash("sha256").update(email).digest("hex").slice(0, 36);
  } else {
    // ── REAL 36BLOCKS PATH ───────────────────────────────────────────────
    if (!token) {
      return NextResponse.redirect(new URL("/login?error=no_token", req.url));
    }
    // Validate the 36blocks JWT using their public key.
    // Replace this placeholder with the actual 36blocks SDK validation call.
    // const claims = await validate36BlocksToken(token);
    // authUserId = claims.sub;
    // email = claims.email;
    return NextResponse.redirect(
      new URL("/login?error=36blocks_not_configured", req.url)
    );
  }

  const admin = createSupabaseAdminClient();

  // Upsert restaurant row keyed by auth_user_id
  const { data: restaurant, error } = await admin
    .from("restaurants")
    .upsert(
      { auth_user_id: authUserId, email, slug: slugFromEmail(email) },
      { onConflict: "auth_user_id", ignoreDuplicates: false }
    )
    .select(
      "id, onboarding_step, is_active, email, auth_user_id, onboarding_xp"
    )
    .single();

  if (error || !restaurant) {
    console.error("[auth/callback] Upsert error:", error);
    return NextResponse.redirect(new URL("/login?error=db_error", req.url));
  }

  await createSession({
    restaurantId: restaurant.id,
    // auth_user_id is nullable in the schema, but we just upserted it with the
    // local `authUserId`, so fall back to that to keep the type non-null.
    authUserId: restaurant.auth_user_id ?? authUserId,
    email: restaurant.email ?? email,
    onboardingStep: restaurant.onboarding_step,
    isActive: restaurant.is_active,
  });

  await writeAuditLog({
    restaurantId: restaurant.id,
    actorType: "restaurant",
    actorId: restaurant.auth_user_id ?? authUserId,
    action: "auth.login",
    ...requestMeta(req),
  });

  const redirectTo =
    restaurant.onboarding_step >= 8 ? "/dashboard" : "/onboarding";

  return NextResponse.redirect(new URL(redirectTo, req.url));
}

/** POST version used by dummy login form */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = body.email ?? "demo@orderza.ae";
  const url = new URL(req.url);
  url.pathname = "/api/auth/callback";
  url.searchParams.set("email", email);
  return GET(new NextRequest(url.toString(), { method: "GET" }));
}

function slugFromEmail(email: string): string {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
