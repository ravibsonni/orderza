/**
 * /authenticate
 * Redirect target configured in the 36Blocks / MSG91 proxy-auth widget.
 *
 * After a user logs in, MSG91 sends an encrypted payload here (browser redirect
 * with the ciphertext in a query param, or a POST body). We decrypt it with the
 * shared key (BLOCKS_AUTH_SECRET, e.g. "secret"), key the restaurant by the
 * 36Blocks user id, start a session, and redirect into the app.
 *
 * The decrypted payload shape:
 *   { ip, user: { id, name, email, mobile }, company: { id, name, email, mobile, timezone } }
 */

import { NextRequest, NextResponse } from "next/server";
import { establishSessionAndRedirect } from "@/lib/auth/blocks-session";
import {
  decryptBlocksPayload,
  blocksPayloadToIdentity,
  type BlocksPayload,
} from "@/lib/auth/blocks-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Param/field names MSG91 might use to carry the ciphertext.
const CIPHER_KEYS = [
  "message",
  "token",
  "authToken",
  "accessToken",
  "access-token",
  "access_token",
  "jwt",
  "data",
  "response",
  "payload",
  "auth",
  "enc",
];

function fromParams(params: URLSearchParams): string | null {
  for (const k of CIPHER_KEYS) {
    const v = params.get(k);
    if (v) return v;
  }
  // Fallback: a single unnamed-ish param, e.g. ?<cipher> or one key we didn't list.
  const entries = [...params.entries()];
  if (entries.length === 1) return entries[0][1] || entries[0][0];
  return null;
}

async function extractCipher(req: NextRequest): Promise<string | null> {
  const url = new URL(req.url);
  const fromQuery = fromParams(url.searchParams);
  if (fromQuery) return fromQuery;

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | string | null;
      if (typeof body === "string") return body;
      if (body && typeof body === "object") {
        for (const k of CIPHER_KEYS) {
          const v = body[k];
          if (typeof v === "string" && v) return v;
        }
        // Defensive: the body may already be the decrypted { user, company }.
        if ("user" in body) return JSON.stringify(body);
      }
      return null;
    }
    const form = await req.formData().catch(() => null);
    if (form) {
      for (const k of CIPHER_KEYS) {
        const v = form.get(k);
        if (typeof v === "string" && v) return v;
      }
      const entries = [...form.entries()];
      if (entries.length === 1 && typeof entries[0][1] === "string") {
        return entries[0][1] as string;
      }
    }
    const text = await req.text().catch(() => "");
    if (text) return text;
  }
  return null;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const cipher = await extractCipher(req);
  if (!cipher) {
    console.error("[authenticate] No ciphertext found in request", {
      method: req.method,
      url: req.url,
    });
    return NextResponse.redirect(new URL("/login?error=no_payload", req.url));
  }

  const secret = process.env.BLOCKS_AUTH_SECRET || "secret";

  // Defensive: accept an already-decrypted plaintext JSON payload, otherwise
  // decrypt. 36Blocks sends it encrypted, so decryption is the normal path.
  let payload: BlocksPayload | null = null;
  try {
    const maybe = JSON.parse(cipher) as BlocksPayload;
    if (maybe && typeof maybe === "object" && maybe.user) payload = maybe;
  } catch {
    /* not plaintext JSON — decrypt below */
  }
  if (!payload) payload = decryptBlocksPayload(cipher, secret);
  if (!payload) {
    // Log enough to finalize the exact scheme from the MSG91 side without
    // leaking a full secret. The cipher itself is not a long-lived secret.
    console.error("[authenticate] Failed to decrypt payload", {
      cipherPreview: cipher.slice(0, 24),
      cipherLength: cipher.length,
    });
    return NextResponse.redirect(new URL("/login?error=decrypt_failed", req.url));
  }

  const identity = blocksPayloadToIdentity(payload);
  if (!identity) {
    console.error("[authenticate] Decrypted payload missing user.id/email", payload);
    return NextResponse.redirect(new URL("/login?error=invalid_payload", req.url));
  }

  return establishSessionAndRedirect(req, identity);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
