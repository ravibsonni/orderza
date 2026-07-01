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

export const SESSION_COOKIE_NAME = "mc_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

/** Sign a session JWT (30 day expiry). */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

/** Cookie attributes for the session cookie. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

/**
 * Set the session cookie via next/headers. Works for handlers that return a
 * JSON response; for handlers that return a custom NextResponse (e.g. a
 * redirect), set the cookie on that response instead — see
 * lib/auth/blocks-session.ts.
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
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
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}
