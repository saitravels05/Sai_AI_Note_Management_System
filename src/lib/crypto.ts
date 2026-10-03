import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;

  if (process.env.NODE_ENV === "production") {
    if (!hexKey || hexKey.length < 64) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: ENCRYPTION_KEY must be a 64-character hex string (32 bytes) in production."
      );
    }
    return Buffer.from(hexKey.slice(0, 64), "hex");
  }

  // Development/Test fallback with warning
  const fallback = hexKey && hexKey.length >= 64
    ? hexKey
    : "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  return Buffer.from(fallback.slice(0, 64), "hex");
}

/**
 * Encrypt a sensitive string (Passport, Aadhaar, Bank Account) using AES-256-GCM
 */
export function encryptField(plainText: string | null | undefined): string | null {
  if (!plainText || plainText.trim() === "") return null;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all in hex)
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (err) {
    console.error("Field encryption failed:", err);
    return null;
  }
}

/**
 * Decrypt an AES-256-GCM encrypted field
 */
export function decryptField(encryptedPayload: string | null | undefined): string | null {
  if (!encryptedPayload) return null;

  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) {
      // Not encrypted or legacy raw text
      return encryptedPayload;
    }

    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const encryptedData = Buffer.from(dataHex, "hex");
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    // If decryption fails, safely fallback
    return null;
  }
}

/**
 * Mask sensitive data for visitors or non-privileged staff
 */
export function maskSensitive(text: string | null | undefined, visiblePrefix = 2, visibleSuffix = 2): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= visiblePrefix + visibleSuffix) {
    return "*".repeat(trimmed.length);
  }
  const prefix = trimmed.slice(0, visiblePrefix);
  const suffix = trimmed.slice(-visibleSuffix);
  const mask = "*".repeat(trimmed.length - (visiblePrefix + visibleSuffix));
  return `${prefix}${mask}${suffix}`;
}
