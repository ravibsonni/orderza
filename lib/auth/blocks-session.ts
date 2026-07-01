/**
 * /lib/auth/blocks-session.ts
 * Shared login logic for the 36Blocks / MSG91 proxy-auth flow.
 *
 * Both the encrypted redirect endpoint (/authenticate) and the dummy login
 * callback (/api/auth/callback) resolve an `Identity`, then call
 * establishSessionAndRedirect() to upsert the restaurant (keyed by the
 * 36Blocks user id), start a session, and redirect into the app.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createSession } from "@/lib/auth/session";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export interface Identity {
  authUserId: string; // 36Blocks user.id — the linking key
  email: string;
  name?: string;
  phone?: string;
  companyId?: string; // 36Blocks company.id
}

/** Build a URL-safe restaurant slug from the company name (or email local part). */
export function slugFrom(name: string | undefined, email: string): string {
  const source = name && name.trim() ? name : email.split("@")[0] || "restaurant";
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "restaurant"}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Deterministic dummy identity from an email (prototype login only). */
export async function dummyIdentity(email: string): Promise<Identity> {
  const { createHash } = await import("crypto");
  return {
    authUserId: createHash("sha256").update(email).digest("hex").slice(0, 36),
    email,
  };
}

/**
 * Upsert the restaurant keyed by the 36Blocks user id, start a session, and
 * redirect the browser to onboarding or the dashboard. Prefill fields are only
 * applied when the restaurant row is first created, so re-logins never clobber
 * values the restaurant has since edited.
 */
export async function establishSessionAndRedirect(
  req: NextRequest,
  id: Identity
): Promise<NextResponse> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("restaurants")
    .select("id, onboarding_step, is_active, email, auth_user_id")
    .eq("auth_user_id", id.authUserId)
    .maybeSingle();

  let restaurant = existing;

  if (!restaurant) {
    const { data: created, error } = await admin
      .from("restaurants")
      .insert({
        auth_user_id: id.authUserId,
        blocks_company_id: id.companyId ?? null,
        email: id.email,
        name: id.name ?? "",
        phone: id.phone ?? null,
        slug: slugFrom(id.name, id.email),
      })
      .select("id, onboarding_step, is_active, email, auth_user_id")
      .single();

    if (error || !created) {
      console.error("[auth] restaurant insert error:", error);
      return NextResponse.redirect(new URL("/login?error=db_error", req.url));
    }
    restaurant = created;
  }

  await createSession({
    restaurantId: restaurant.id,
    authUserId: restaurant.auth_user_id ?? id.authUserId,
    email: restaurant.email ?? id.email,
    onboardingStep: restaurant.onboarding_step,
    isActive: restaurant.is_active,
  });

  await writeAuditLog({
    restaurantId: restaurant.id,
    actorType: "restaurant",
    actorId: restaurant.auth_user_id ?? id.authUserId,
    action: "auth.login",
    ...requestMeta(req),
  });

  const dest = restaurant.onboarding_step >= 8 ? "/dashboard" : "/onboarding";
  // 303 so a POST callback lands on the destination as a GET.
  return NextResponse.redirect(new URL(dest, req.url), { status: 303 });
}
