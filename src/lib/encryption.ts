/**
 * AES-256-GCM encryption for sensitive fields (payment tokens, etc).
 * Requires ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Falls back to passthrough in dev if key missing (with warning).
 */
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    return null;
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getKey();
  if (!key) {
    console.warn("[Encryption] ENCRYPTION_KEY missing — returning plaintext. Set a 64-hex-char key in production!");
    return `plain:${plaintext}`;
  }
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("plain:")) return value.slice(6);
  if (!value.startsWith("enc:")) return value;
  const key = getKey();
  if (!key) return null;
  try {
    const [ivB64, tagB64, dataB64] = value.slice(4).split(".");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("[Encryption] Decrypt failed:", err);
    return null;
  }
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function verifyCodeHash(code: string, hash: string): boolean {
  const computed = hashCode(code);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}
