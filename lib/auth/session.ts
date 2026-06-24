/**
 * /lib/auth/session.ts
 * Session management via signed HTTP-only cookie `mc_session`.
 *
 * ── 36BLOCKS AUTH NOTE ──────────────────────────────────────────────────
 * This module is the bridge between 36blocks authentication and Orderza's
 * session model. When 36blocks calls back to /api/auth/callback with a
 * token, that route validates the token, upserts the restaurant row, then
 * calls createSession() below.
 *
 * When DUMMY_AUTH_ENABLED=true (prototype default), the login page creates
 * a synthetic session without a real 36blocks token. Remove the dummy path
 * when the 36blocks JS embed is live.
 * ────────────────────────────────────────────────────────────────────────
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  restaurantId: string;
  authUserId: string;
  email: string;
  onboardingStep: number;
  isActive: boolean;
}

const COOKIE_NAME = "mc_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function updateSession(
  updates: Partial<SessionPayload>
): Promise<void> {
  const existing = await getSession();
  if (!existing) throw new Error("No active session to update.");
  await createSession({ ...existing, ...updates });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}
