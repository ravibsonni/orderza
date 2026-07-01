/**
 * /lib/auth/blocks-crypto.ts
 * Decrypts the payload 36Blocks / MSG91 proxy-auth delivers to /authenticate.
 *
 * MSG91's widget bundles CryptoJS, so the payload is almost certainly produced
 * with `CryptoJS.AES.encrypt(JSON.stringify(payload), SECRET).toString()` — the
 * OpenSSL "Salted__" passphrase format. We try that first, then a couple of
 * plain AES-CBC fallbacks, and accept whichever yields the expected JSON.
 *
 * If none match, decryptBlocksPayload() returns null and the caller logs the
 * raw ciphertext so the exact scheme can be confirmed from the MSG91 side.
 */

import CryptoJS from "crypto-js";
import { createHash, createDecipheriv } from "crypto";
import type { Identity } from "@/lib/auth/blocks-session";

export interface BlocksPayload {
  ip?: string;
  user?: { id?: string | number; name?: string; email?: string; mobile?: string };
  company?: {
    id?: string | number;
    name?: string;
    email?: string;
    mobile?: string;
    timezone?: string;
  };
}

/** A plaintext string looks like the payload we expect if it parses and has a user. */
function parseIfValid(plaintext: string): BlocksPayload | null {
  if (!plaintext) return null;
  try {
    const obj = JSON.parse(plaintext) as BlocksPayload;
    if (obj && typeof obj === "object" && obj.user) return obj;
  } catch {
    /* not JSON — wrong key/scheme */
  }
  return null;
}

/** CryptoJS passphrase (OpenSSL "Salted__") format — the most likely scheme. */
function tryCryptoJsPassphrase(cipher: string, secret: string): BlocksPayload | null {
  try {
    const plaintext = CryptoJS.AES.decrypt(cipher, secret).toString(CryptoJS.enc.Utf8);
    return parseIfValid(plaintext);
  } catch {
    return null;
  }
}

/** Plain AES-CBC with a derived key and zero IV (fallback guesses). */
function tryAesCbc(cipher: string, secret: string): BlocksPayload | null {
  const attempts: Array<{ algo: string; key: Buffer }> = [
    { algo: "aes-256-cbc", key: createHash("sha256").update(secret).digest() },
    { algo: "aes-128-cbc", key: createHash("md5").update(secret).digest() },
  ];
  for (const enc of ["base64", "hex"] as const) {
    let data: Buffer;
    try {
      data = Buffer.from(cipher, enc);
    } catch {
      continue;
    }
    for (const { algo, key } of attempts) {
      const ivLen = 16;
      for (const iv of [Buffer.alloc(ivLen, 0), data.subarray(0, ivLen)]) {
        const body = iv === data.subarray(0, ivLen) ? data.subarray(ivLen) : data;
        try {
          const d = createDecipheriv(algo, key, iv);
          const out = Buffer.concat([d.update(body), d.final()]).toString("utf8");
          const parsed = parseIfValid(out);
          if (parsed) return parsed;
        } catch {
          /* wrong combination — keep trying */
        }
      }
    }
  }
  return null;
}

/**
 * Decrypt and parse the 36Blocks payload. Tries the raw ciphertext and a
 * `+`-restored variant (query-string decoding can turn base64 `+` into spaces).
 */
export function decryptBlocksPayload(
  cipher: string,
  secret: string
): BlocksPayload | null {
  const candidates = [cipher.trim(), cipher.trim().replace(/ /g, "+")];
  for (const c of candidates) {
    const viaCryptoJs = tryCryptoJsPassphrase(c, secret);
    if (viaCryptoJs) return viaCryptoJs;
    const viaCbc = tryAesCbc(c, secret);
    if (viaCbc) return viaCbc;
  }
  return null;
}

/** Map a decrypted 36Blocks payload to the internal login Identity. */
export function blocksPayloadToIdentity(payload: BlocksPayload): Identity | null {
  const user = payload.user;
  if (!user?.id) return null;
  const company = payload.company ?? {};
  const email = user.email ?? company.email;
  if (!email) return null;
  return {
    authUserId: String(user.id),
    email,
    name: company.name ?? user.name,
    phone: user.mobile ?? company.mobile,
    companyId: company.id != null ? String(company.id) : undefined,
  };
}
