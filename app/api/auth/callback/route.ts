/**
 * /api/auth/callback
 * Post-login callback for 36Blocks (and a dummy path for local prototyping).
 *
 * ── 36BLOCKS INTEGRATION ────────────────────────────────────────────────
 * After a user logs in, 36Blocks redirects the browser to this URL with a
 * JSON payload:
 *   {
 *     "ip": "...",
 *     "user":    { "id", "name", "email", "mobile" },
 *     "company": { "id", "name", "email", "mobile", "timezone" }
 *   }
 * We key each restaurant by `user.id` (stored in restaurants.auth_user_id),
 * which links every downstream row (menu, orders, riders, …). `company.id`
 * is stored alongside for tenant context, and name/email/mobile prefill the
 * restaurant on first login only.
 *
 * SECURITY: this endpoint trusts whoever can POST to it. Set BLOCKS_AUTH_SECRET
 * and have 36Blocks send it (header `x-36blocks-secret` or `?secret=`) so we
 * can reject forged callbacks. Confirm the exact signing mechanism with
 * 36Blocks and tighten verifyBlocksSecret() accordingly.
 * ────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createSession } from "@/lib/auth/session";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const runtime = "nodejs";

interface Identity {
  authUserId: string;
  email: string;
  name?: string;
  phone?: string;
  companyId?: string;
}

interface BlocksPayload {
  user?: { id?: string | number; name?: string; email?: string; mobile?: string };
  company?: {
    id?: string | number;
    name?: string;
    email?: string;
    mobile?: string;
    timezone?: string;
  };
  email?: string; // dummy-login body
}

/** Verify the shared secret when BLOCKS_AUTH_SECRET is configured. */
function verifyBlocksSecret(req: NextRequest): boolean {
  const secret = process.env.BLOCKS_AUTH_SECRET;
  if (!secret) return true; // not configured — see SECURITY note above
  const provided =
    req.headers.get("x-36blocks-secret") ??
    new URL(req.url).searchParams.get("secret");
  return provided === secret;
}

/** Build a URL-safe restaurant slug from the company name (or email local part). */
function slugFrom(name: string | undefined, email: string): string {
  const source = name && name.trim() ? name : email.split("@")[0] || "restaurant";
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "restaurant"}-${Math.random().toString(36).slice(2, 6)}`;
}

async function dummyIdentity(email: string): Promise<Identity> {
  const { createHash } = await import("crypto");
  return {
    authUserId: createHash("sha256").update(email).digest("hex").slice(0, 36),
    email,
  };
}

/**
 * Upsert the restaurant keyed by 36Blocks user id, start a session, and
 * redirect the browser to onboarding or the dashboard. Prefill fields are
 * only applied when the restaurant row is first created, so re-logins never
 * clobber values the restaurant has since edited.
 */
async function establishSessionAndRedirect(req: NextRequest, id: Identity) {
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
      console.error("[auth/callback] insert error:", error);
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

/** Parse the request body as JSON, or from a form (`payload` field or flat fields). */
async function readBody(req: NextRequest): Promise<BlocksPayload> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as BlocksPayload;
  }
  const form = await req.formData().catch(() => null);
  if (!form) return {};
  const raw = form.get("payload");
  if (raw) {
    try {
      return JSON.parse(String(raw)) as BlocksPayload;
    } catch {
      return {};
    }
  }
  return Object.fromEntries(form.entries()) as BlocksPayload;
}

export async function POST(req: NextRequest) {
  const isDummy = process.env.DUMMY_AUTH_ENABLED === "true";
  const body = await readBody(req);

  // ── 36Blocks payload ────────────────────────────────────────────────
  if (body?.user?.id != null) {
    if (!verifyBlocksSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = body.user;
    const company = body.company ?? {};
    const email = user.email ?? company.email;
    if (!email) {
      return NextResponse.redirect(new URL("/login?error=no_email", req.url));
    }
    return establishSessionAndRedirect(req, {
      authUserId: String(user.id),
      email,
      name: company.name ?? user.name,
      phone: user.mobile ?? company.mobile,
      companyId: company.id != null ? String(company.id) : undefined,
    });
  }

  // ── Dummy login (prototype) ─────────────────────────────────────────
  if (isDummy) {
    const email = body?.email ?? "demo@orderza.ae";
    return establishSessionAndRedirect(req, await dummyIdentity(email));
  }

  return NextResponse.redirect(new URL("/login?error=invalid_payload", req.url));
}

/** Dummy convenience: GET /api/auth/callback?email=... (only when dummy auth is on). */
export async function GET(req: NextRequest) {
  if (process.env.DUMMY_AUTH_ENABLED !== "true") {
    return NextResponse.redirect(new URL("/login?error=use_post", req.url));
  }
  const email = new URL(req.url).searchParams.get("email") ?? "demo@orderza.ae";
  return establishSessionAndRedirect(req, await dummyIdentity(email));
}
