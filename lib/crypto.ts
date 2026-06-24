/**
 * /lib/crypto.ts
 * AES-256-GCM encryption/decryption for secrets stored in DB.
 * Format: iv_hex:authTag_hex:ciphertext_hex
 * Key source: DB_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 *
 * ONLY this file may import Node.js `crypto`. Never call encrypt/decrypt
 * from client-side code — always go through a server Route Handler.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

function getKey(): Buffer {
  const hex = process.env.DB_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("DB_ENCRYPTION_KEY must be set to 64 hex characters (32 bytes).");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns "iv_hex:authTag_hex:ciphertext_hex"
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypt a value produced by encrypt().
 * Throws on tampered ciphertext (GCM auth tag mismatch).
 */
export function decrypt(stored: string): string {
  const key = getKey();
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format. Expected iv:authTag:ciphertext.");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * One-way hash for customer phone numbers stored in `customer_phone_hash`.
 * SHA-256, hex output. Used for analytics without exposing raw E.164 numbers.
 */
export function hashPhone(e164: string): string {
  return createHash("sha256").update(e164).digest("hex");
}
