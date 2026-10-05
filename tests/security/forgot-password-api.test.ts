import test from "node:test";
import assert from "node:assert";
import { prisma } from "../../src/lib/db";
import {
  generateSecureOtp,
  hashOtp,
  verifyOtpConstantTime,
  generateResetToken,
  hashResetToken,
  validatePasswordStrength,
} from "../../src/lib/auth/otp";
import bcrypt from "bcryptjs";
import { UserStatus, Role } from "@prisma/client";

test("End-to-End Forgot Password Security Workflow in PostgreSQL", async () => {
  const testEmail = `test-reset-${Date.now()}@saitravelservices.com`;
  const initialPassword = "OldPassword123!@#Original";
  const initialPasswordHash = await bcrypt.hash(initialPassword, 10);

  // 1. Setup active test user
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: "Security Tester",
      passwordHash: initialPasswordHash,
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      tokenVersion: 1,
    },
  });

  try {
    // 2. Request OTP & Save in DB
    const plainOtp = generateSecureOtp();
    const otpHash = hashOtp(plainOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const otpRecord = await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
        ipAddress: "127.0.0.1",
        userAgent: "IntegrationTestRunner/1.0",
      },
    });

    assert.ok(otpRecord.id);
    assert.strictEqual(otpRecord.isUsed, false);

    // 3. Test wrong OTP attempt counter
    const wrongOtp = "000000";
    const isWrongValid = verifyOtpConstantTime(wrongOtp, otpRecord.otpHash);
    assert.strictEqual(isWrongValid, false);

    const updatedOtp = await prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { attemptsCount: { increment: 1 } },
    });
    assert.strictEqual(updatedOtp.attemptsCount, 1);

    // 4. Test valid OTP verification & issue reset token
    const isCorrectValid = verifyOtpConstantTime(plainOtp, otpRecord.otpHash);
    assert.strictEqual(isCorrectValid, true);

    // Mark OTP as used
    await prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    const { rawToken, tokenHash } = generateResetToken();
    const resetTokenRecord = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    assert.ok(resetTokenRecord.id);

    // 5. Verify password history rejection (cannot reuse initial password)
    const historyCheck = await validatePasswordStrength(initialPassword, [user.passwordHash]);
    assert.strictEqual(historyCheck.valid, false, "Must reject reuse of old password");
    assert.ok(historyCheck.errors.some((e) => e.includes("cannot reuse")));

    // 6. Accept brand new strong password and update tokenVersion
    const brandNewPassword = "NewSaiTravels2026!SecureKey";
    const newStrength = await validatePasswordStrength(brandNewPassword, [user.passwordHash]);
    assert.strictEqual(newStrength.valid, true);

    const newPasswordHash = await bcrypt.hash(brandNewPassword, 10);

    // Execute password reset transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { isUsed: true },
      }),
      prisma.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: newPasswordHash,
        },
      }),
    ]);

    // 7. Verify user state: password changed, tokenVersion bumped to 2 (revokes old sessions)
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert.strictEqual(updatedUser?.tokenVersion, 2, "tokenVersion must be incremented to 2");
    assert.notStrictEqual(updatedUser?.passwordHash, initialPasswordHash);

    // 8. Verify the reset token cannot be reused
    const reusedTokenCheck = await prisma.passwordResetToken.findFirst({
      where: { id: resetTokenRecord.id, isUsed: false },
    });
    assert.strictEqual(reusedTokenCheck, null, "Used reset token must not be accepted again");
  } finally {
    // Clean up test records
    await prisma.passwordHistory.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetOtp.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});
