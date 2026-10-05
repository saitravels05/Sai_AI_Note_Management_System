import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Server secret used for HMAC-SHA256 OTP hashing
function getOtpSecret(): string {
  return (
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "sai-books-otp-hmac-secure-fallback-key-2026"
  );
}

/**
 * 1. Cryptographically secure 6-digit OTP generator
 * Strictly avoids Math.random() in favor of crypto.randomInt
 */
export function generateSecureOtp(): string {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * 2. HMAC-SHA256 OTP Hashing
 * Never store plaintext OTPs in the database
 */
export function hashOtp(otp: string): string {
  const hmac = crypto.createHmac("sha256", getOtpSecret());
  hmac.update(otp);
  return hmac.digest("hex");
}

/**
 * 3. Constant-time OTP comparison
 * Protects against timing attacks that leak character matches
 */
export function verifyOtpConstantTime(plainOtp: string, expectedHash: string): boolean {
  if (!plainOtp || !expectedHash) return false;
  const computedHash = hashOtp(plainOtp);

  const computedBuffer = Buffer.from(computedHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (computedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, expectedBuffer);
}

/**
 * 4. Generate Single-Use 10-Minute Reset Token
 * Returns raw token (to give to client) and SHA-256 hash (to store in DB)
 */
export function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/**
 * Hash raw reset token for database lookup
 */
export function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Common breached or easily guessed passwords
 */
const COMMON_PASSWORDS = new Set([
  "password123",
  "password1234",
  "password12345",
  "admin12345",
  "admin123456",
  "saitours123",
  "saitravels123",
  "saipassport123",
  "123456789012",
  "qwertyuiop12",
  "welcome12345",
  "changeme1234",
  "saibooks1234",
]);

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  errorsTamil: string[];
  score: number; // 0 to 4
}

/**
 * 5. Password Security & History Policy Validator
 * - Minimum 12 characters
 * - Uppercase, lowercase, number, symbol
 * - Offline breached password check
 * - Reject reuse of last 5 passwords (checked against historical bcrypt hashes)
 */
export async function validatePasswordStrength(
  password: string,
  historicalHashes: string[] = []
): Promise<PasswordValidationResult> {
  const errors: string[] = [];
  const errorsTamil: string[] = [];
  let score = 0;

  if (!password || password.length < 12) {
    errors.push("Password must be at least 12 characters long.");
    errorsTamil.push("கடவுச்சொல் குறைந்தது 12 எழுத்துக்கள் நீளமாக இருக்க வேண்டும்.");
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter (A-Z).");
    errorsTamil.push("குறைந்தது ஒரு பெரிய எழுத்து (A-Z) இருக்க வேண்டும்.");
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter (a-z).");
    errorsTamil.push("குறைந்தது ஒரு சிறிய எழுத்து (a-z) இருக்க வேண்டும்.");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must include at least one number (0-9).");
    errorsTamil.push("குறைந்தது ஒரு எண் (0-9) இருக்க வேண்டும்.");
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must include at least one special symbol (e.g. !@#$%^&*).");
    errorsTamil.push("குறைந்தது ஒரு சிறப்பு குறியீடு (e.g. !@#$%^&*) இருக்க வேண்டும்.");
  } else {
    score += 1;
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("This password is too common and easily guessed. Choose a more unique passphrase.");
    errorsTamil.push("இந்த கடவுச்சொல் மிகவும் எளிதானது. தனித்துவமான கடவுச்சொல்லைத் தேர்ந்தெடுக்கவும்.");
    score = Math.max(0, score - 2);
  }

  // Check against last 5 historical passwords
  for (const oldHash of historicalHashes) {
    if (!oldHash) continue;
    const matches = await bcrypt.compare(password, oldHash);
    if (matches) {
      errors.push("You cannot reuse any of your last 5 passwords. Please choose a new password.");
      errorsTamil.push("உங்கள் முந்தைய 5 கடவுச்சொற்களை மீண்டும் பயன்படுத்த முடியாது. புதியதை உள்ளிடவும்.");
      score = 0;
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    errorsTamil,
    score: Math.min(4, Math.max(0, score)),
  };
}

/**
 * 6. Database-backed Rate Limiter for OTP Requests (Serverless Safe)
 * - Maximum 3 requests per email per hour
 * - Maximum 10 requests per IP per hour
 * - 60-second cooldown between consecutive requests
 */
export async function checkOtpRateLimit({
  userId,
  ipAddress,
}: {
  userId: string;
  ipAddress: string;
}): Promise<{
  allowed: boolean;
  reason?: string;
  reasonTamil?: string;
  cooldownRemainingSeconds?: number;
}> {
  const isDev = process.env.NODE_ENV === "development";
  const cooldownThresholdSeconds = isDev ? 5 : 60;
  const maxUserHourly = isDev ? 50 : 3;
  const maxIpHourly = isDev ? 100 : 10;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const cooldownAgo = new Date(Date.now() - cooldownThresholdSeconds * 1000);

  // Check cooldown for user
  const recentOtp = await prisma.passwordResetOtp.findFirst({
    where: {
      userId,
      createdAt: { gte: cooldownAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentOtp) {
    const elapsedSeconds = Math.floor((Date.now() - recentOtp.createdAt.getTime()) / 1000);
    const cooldownRemainingSeconds = Math.max(1, cooldownThresholdSeconds - elapsedSeconds);
    return {
      allowed: false,
      reason: `Please wait ${cooldownRemainingSeconds} second(s) before requesting another OTP.`,
      reasonTamil: `புதிய OTP கோருவதற்கு முன் ${cooldownRemainingSeconds} வினாடிகள் காத்திருக்கவும்.`,
      cooldownRemainingSeconds,
    };
  }

  // Check user hourly limit
  const userCountLastHour = await prisma.passwordResetOtp.count({
    where: {
      userId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (userCountLastHour >= maxUserHourly) {
    return {
      allowed: false,
      reason: `Maximum OTP request limit reached (${maxUserHourly} per hour). Please try again in an hour.`,
      reasonTamil: `அதிகபட்ச OTP வரம்பு எட்டப்பட்டது (ஒரு மணி நேரத்திற்கு ${maxUserHourly}). ஒரு மணி நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.`,
    };
  }

  // Check IP hourly limit
  if (ipAddress && ipAddress !== "unknown" && ipAddress !== "127.0.0.1" && ipAddress !== "::1") {
    const ipCountLastHour = await prisma.passwordResetOtp.count({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (ipCountLastHour >= maxIpHourly) {
      return {
        allowed: false,
        reason: "Too many OTP requests from this network. Please try again in an hour.",
        reasonTamil: "இந்த நெட்வொர்க்கிலிருந்து அதிக கோரிக்கைகள் வந்துள்ளன. ஒரு மணி நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
      };
    }
  }

  return { allowed: true };
}
