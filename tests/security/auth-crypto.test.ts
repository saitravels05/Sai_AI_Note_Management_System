import test from "node:test";
import assert from "node:assert";
import { encryptField, decryptField, maskSensitive } from "../../src/lib/crypto";
import { hasPermission } from "../../src/lib/auth/session";
import { Role } from "@prisma/client";

test("Security & Privacy: AES-256 Field Encryption & Decryption", () => {
  const passportNumber = "Z9876543";
  const encrypted = encryptField(passportNumber);

  assert.notStrictEqual(encrypted, null);
  assert.notStrictEqual(encrypted, passportNumber);
  assert.match(encrypted!, /^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);

  const decrypted = decryptField(encrypted);
  assert.strictEqual(decrypted, passportNumber);
});

test("Security & Privacy: Sensitive Data Masking", () => {
  const passport = "A1234567";
  const maskedPassport = maskSensitive(passport, 2, 2);
  assert.strictEqual(maskedPassport, "A1****67");

  const phone = "9842100000";
  const maskedPhone = maskSensitive(phone, 2, 2);
  assert.strictEqual(maskedPhone, "98******00");
});

test("Security: Server-Side RBAC Role Hierarchy Enforcement", () => {
  // Owner has access to everything
  assert.strictEqual(hasPermission(Role.OWNER, Role.ADMIN), true);
  assert.strictEqual(hasPermission(Role.OWNER, Role.MANAGER), true);
  assert.strictEqual(hasPermission(Role.OWNER, Role.STAFF), true);

  // Admin cannot perform Owner-only tasks
  assert.strictEqual(hasPermission(Role.ADMIN, Role.OWNER), false);
  assert.strictEqual(hasPermission(Role.ADMIN, Role.MANAGER), true);

  // Staff cannot perform Admin or Manager tasks
  assert.strictEqual(hasPermission(Role.STAFF, Role.MANAGER), false);
  assert.strictEqual(hasPermission(Role.STAFF, Role.ADMIN), false);

  // Visitor has lowest privilege
  assert.strictEqual(hasPermission(Role.VISITOR, Role.STAFF), false);
});

test("Security: Spreadsheet / CSV Formula Injection Defense (CWE-1236)", async () => {
  const { sanitizeForSpreadsheet, sanitizeRowForExport } = await import("../../src/lib/security/sanitize");

  // Attack payloads targeting Excel/Calc execution
  const formulaPayloads = [
    "=CMD|'/c calc'!A1",
    "+1+1;cmd|' /C calc'!A0",
    "-2+3+cmd|' /C calc'!A0",
    "@SUM(1+1)*cmd|' /C calc'!A0",
    "\t=1+1",
    "\r=1+1",
  ];

  for (const payload of formulaPayloads) {
    const neutralized = sanitizeForSpreadsheet(payload);
    assert.strictEqual(neutralized.startsWith("'"), true, `Payload was not neutralized: ${payload}`);
  }

  // Benign strings should not be modified
  assert.strictEqual(sanitizeForSpreadsheet("Sai Tours"), "Sai Tours");
  assert.strictEqual(sanitizeForSpreadsheet("Chennai Package"), "Chennai Package");

  // Multi-column object sanitization
  const record = {
    customerName: "=DDE('cmd';'/c calc';'A1')",
    phone: "9842100000",
    notes: "+MaliciousNote",
  };
  const safeRecord = sanitizeRowForExport(record);
  assert.strictEqual(safeRecord.customerName, "'=DDE('cmd';'/c calc';'A1')");
  assert.strictEqual(safeRecord.phone, "9842100000");
  assert.strictEqual(safeRecord.notes, "'+MaliciousNote");
});

test("Security: Password Complexity Policy Enforcement", async () => {
  const { validatePasswordStrength } = await import("../../src/lib/security/sanitize");

  // Too short (< 10 chars)
  assert.strictEqual(validatePasswordStrength("Short1!").valid, false);

  // Missing uppercase
  assert.strictEqual(validatePasswordStrength("lowercase123!").valid, false);

  // Missing lowercase
  assert.strictEqual(validatePasswordStrength("UPPERCASE123!").valid, false);

  // Missing number
  assert.strictEqual(validatePasswordStrength("NoNumberPass!").valid, false);

  // Missing special symbol
  assert.strictEqual(validatePasswordStrength("NoSpecialSymbol123").valid, false);

  // Common dictionary password
  assert.strictEqual(validatePasswordStrength("password123").valid, false);
  assert.strictEqual(validatePasswordStrength("saitours123").valid, false);

  // Valid strong password
  assert.strictEqual(validatePasswordStrength("SaiTours#Secure2026!").valid, true);
});

test("Security: Brute-Force Rate Limiting & Sliding Window Lockout", async () => {
  const { checkRateLimit, resetRateLimit } = await import("../../src/lib/security/ratelimit");

  const testKey = "test-attacker-ip-1.2.3.4";
  resetRateLimit(testKey);

  const opts = {
    windowMs: 60000,
    maxAttempts: 3,
    lockoutDurationMs: 15 * 60 * 1000,
  };

  // Attempt 1: Allowed
  const r1 = checkRateLimit(testKey, opts);
  assert.strictEqual(r1.allowed, true);
  assert.strictEqual(r1.remaining, 2);

  // Attempt 2: Allowed
  const r2 = checkRateLimit(testKey, opts);
  assert.strictEqual(r2.allowed, true);
  assert.strictEqual(r2.remaining, 1);

  // Attempt 3: Allowed (last allowed attempt)
  const r3 = checkRateLimit(testKey, opts);
  assert.strictEqual(r3.allowed, true);
  assert.strictEqual(r3.remaining, 0);

  // Attempt 4: Exceeded threshold -> Locked out!
  const r4 = checkRateLimit(testKey, opts);
  assert.strictEqual(r4.allowed, false);
  assert.strictEqual(r4.isLocked, true);
  assert.strictEqual(typeof r4.retryAfterSeconds, "number");

  // Reset clears lockout
  resetRateLimit(testKey);
  const r5 = checkRateLimit(testKey, opts);
  assert.strictEqual(r5.allowed, true);
});
