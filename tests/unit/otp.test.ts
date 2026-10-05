import test from "node:test";
import assert from "node:assert";
import bcrypt from "bcryptjs";
import {
  generateSecureOtp,
  hashOtp,
  verifyOtpConstantTime,
  generateResetToken,
  hashResetToken,
  validatePasswordStrength,
} from "../../src/lib/auth/otp";

test("OTP Generator: produces cryptographically secure 6-digit numeric strings", () => {
  const codes = new Set<string>();

  for (let i = 0; i < 50; i++) {
    const otp = generateSecureOtp();
    assert.strictEqual(otp.length, 6, "OTP must be exactly 6 characters");
    assert.match(otp, /^\d{6}$/, "OTP must only contain digits");

    const num = parseInt(otp, 10);
    assert.ok(num >= 100000 && num <= 999999, "OTP must be within 100000 and 999999");
    codes.add(otp);
  }

  // 50 random OTPs should generate distinct values
  assert.ok(codes.size > 40, "Cryptographic generator must exhibit high entropy");
});

test("OTP Hashing & Constant-Time Verification", () => {
  const otp = "849201";
  const hash = hashOtp(otp);

  assert.strictEqual(hash.length, 64, "HMAC-SHA256 hash must be 64 hex chars");
  assert.strictEqual(hashOtp(otp), hash, "Hashing identical OTP must yield deterministic HMAC");

  // Constant-time verification
  assert.strictEqual(verifyOtpConstantTime(otp, hash), true, "Correct OTP must verify successfully");
  assert.strictEqual(verifyOtpConstantTime("123456", hash), false, "Wrong OTP must fail");
  assert.strictEqual(verifyOtpConstantTime("", hash), false, "Empty OTP must fail");
  assert.strictEqual(verifyOtpConstantTime("84920", hash), false, "Short OTP must fail");
});

test("Reset Token: generates single-use 32-byte hex token and SHA-256 hash", () => {
  const { rawToken, tokenHash } = generateResetToken();

  assert.strictEqual(rawToken.length, 64, "Raw token must be 64 hex chars (32 bytes)");
  assert.strictEqual(tokenHash.length, 64, "SHA-256 hash must be 64 hex chars");
  assert.strictEqual(hashResetToken(rawToken), tokenHash, "Hash must match SHA-256 of raw token");
});

test("Password Validation Policy: rejects passwords failing enterprise complexity rules", async () => {
  // Too short (<12 chars)
  const shortResult = await validatePasswordStrength("Short1!a");
  assert.strictEqual(shortResult.valid, false);
  assert.ok(shortResult.errors.some((e) => e.includes("12 characters")));

  // Missing uppercase
  const noUpper = await validatePasswordStrength("lowercase1234!@#");
  assert.strictEqual(noUpper.valid, false);
  assert.ok(noUpper.errors.some((e) => e.includes("uppercase")));

  // Missing lowercase
  const noLower = await validatePasswordStrength("UPPERCASE1234!@#");
  assert.strictEqual(noLower.valid, false);
  assert.ok(noLower.errors.some((e) => e.includes("lowercase")));

  // Missing digit
  const noDigit = await validatePasswordStrength("LettersOnly!@#$$%");
  assert.strictEqual(noDigit.valid, false);
  assert.ok(noDigit.errors.some((e) => e.includes("number")));

  // Missing symbol
  const noSymbol = await validatePasswordStrength("AlphanumericOnly1234");
  assert.strictEqual(noSymbol.valid, false);
  assert.ok(noSymbol.errors.some((e) => e.includes("special symbol")));

  // Breached / common password
  const common = await validatePasswordStrength("password12345");
  assert.strictEqual(common.valid, false);
  assert.ok(common.errors.some((e) => e.includes("too common")));
});

test("Password Validation Policy: rejects reuse of last 5 historical passwords", async () => {
  const previousPassword = "SaiTravels2025!OldSecret";
  const oldHash = await bcrypt.hash(previousPassword, 10);

  // Attempting to reuse the exact old password
  const reuseResult = await validatePasswordStrength(previousPassword, [oldHash]);
  assert.strictEqual(reuseResult.valid, false);
  assert.ok(reuseResult.errors.some((e) => e.includes("cannot reuse any of your last 5 passwords")));

  // Choosing a brand new strong password
  const freshPassword = "SaiTravels2026!BrandNewPassword";
  const validResult = await validatePasswordStrength(freshPassword, [oldHash]);
  assert.strictEqual(validResult.valid, true);
  assert.strictEqual(validResult.errors.length, 0);
  assert.ok(validResult.score >= 4, "Score must be high for strong password");
});
