/**
 * /lib/tracking/token.ts
 * JWT-based tracking tokens for privacy-safe rider location sharing.
 *
 * Each customer gets a unique token that maps to exactly one order.
 * Tokens expire in 4 hours (delivery window).
 * The rider never receives customer tokens.
 */

import { SignJWT, jwtVerify } from "jose";

export interface TrackingTokenPayload {
  orderId: string;
  restaurantId: string;
  sessionId: string;
}

const TOKEN_EXPIRY = "4h";

function getSecret(): Uint8Array {
  const secret = process.env.TRACKING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("TRACKING_SECRET must be at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signTrackingToken(
  payload: TrackingTokenPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret());
}

export async function verifyTrackingToken(
  token: string
): Promise<TrackingTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as TrackingTokenPayload;
}
