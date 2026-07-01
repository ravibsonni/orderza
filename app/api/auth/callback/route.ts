/**
 * /api/auth/callback
 * Dummy login path for local prototyping, plus a raw (unencrypted) 36Blocks
 * JSON path. The live encrypted 36Blocks / MSG91 redirect is handled by
 * /authenticate (see app/authenticate/route.ts); shared session logic lives in
 * lib/auth/blocks-session.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  establishSessionAndRedirect,
  dummyIdentity,
  type Identity,
} from "@/lib/auth/blocks-session";

export const runtime = "nodejs";

interface Body {
  user?: { id?: string | number; name?: string; email?: string; mobile?: string };
  company?: { id?: string | number; name?: string; email?: string; mobile?: string };
  email?: string; // dummy-login body
}

export async function POST(req: NextRequest) {
  const isDummy = process.env.DUMMY_AUTH_ENABLED === "true";
  const body = (await req.json().catch(() => ({}))) as Body;

  // Raw (already-decrypted) 36Blocks JSON payload.
  if (body?.user?.id != null) {
    const user = body.user;
    const company = body.company ?? {};
    const email = user.email ?? company.email;
    if (!email) {
      return NextResponse.redirect(new URL("/login?error=no_email", req.url));
    }
    const identity: Identity = {
      authUserId: String(user.id),
      email,
      name: company.name ?? user.name,
      phone: user.mobile ?? company.mobile,
      companyId: company.id != null ? String(company.id) : undefined,
    };
    return establishSessionAndRedirect(req, identity);
  }

  // Dummy login (prototype).
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
