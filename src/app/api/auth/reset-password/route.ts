import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { hashResetToken, validatePasswordStrength } from "@/lib/auth/otp";
import { clearSessionCookie } from "@/lib/auth/session";
import { sendPasswordChangedEmail } from "@/lib/email/send-email";
import { logAudit } from "@/lib/audit";
import { resetRateLimit } from "@/lib/security/ratelimit";
import { AuditAction, UserStatus } from "@prisma/client";

const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Please provide a valid email address."),
    resetToken: z.string().trim().min(32, "Invalid reset token."),
    newPassword: z.string().min(12, "Password must be at least 12 characters."),
    confirmPassword: z.string(),
    locale: z.string().optional().default("ta-IN"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation password do not match.",
    path: ["confirmPassword"],
  });

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers.get("user-agent")?.slice(0, 250) || "Unknown";

  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = resetPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid input data.",
        },
        { status: 400 }
      );
    }

    const { email, resetToken, newPassword, locale } = parseResult.data;
    const isTamil = locale.startsWith("ta");
    const normalizedEmail = email.toLowerCase();

    // 1. Fetch user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        passwordHash: true,
        tokenVersion: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return NextResponse.json(
        {
          success: false,
          error: isTamil
            ? "கடவுச்சொல்லை மீட்டமைக்க முடியவில்லை. கணக்கு முடக்கப்பட்டுள்ளது அல்லது காணப்படவில்லை."
            : "Cannot reset password. User is not active or not found.",
        },
        { status: 400 }
      );
    }

    // 2. Validate single-use reset token in database
    const tokenHash = hashResetToken(resetToken);
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      await logAudit({
        userId: user.id,
        action: AuditAction.PASSWORD_RESET_BLOCKED,
        details: `Reset password blocked: Invalid or expired reset token for ${user.email}`,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          error: isTamil
            ? "மீட்டமைப்பு டோக்கன் காலாவதியானது அல்லது செல்லுபடியாகாது. மீண்டும் தொடக்கத்திலிருந்து முயற்சிக்கவும்."
            : "The reset token has expired or is invalid. Please start the password reset process again.",
        },
        { status: 400 }
      );
    }

    // 3. Password Strength & History Check (Last 5 passwords cannot be reused)
    const history = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { passwordHash: true },
    });

    const historicalHashes = [user.passwordHash, ...history.map((h) => h.passwordHash)];
    const strengthResult = await validatePasswordStrength(newPassword, historicalHashes);

    if (!strengthResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: isTamil ? strengthResult.errorsTamil[0] : strengthResult.errors[0],
          details: isTamil ? strengthResult.errorsTamil : strengthResult.errors,
        },
        { status: 400 }
      );
    }

    // 4. Hash new password with bcrypt (Cost factor 12)
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // 5. Execute atomic transaction:
    //    - Update user's password
    //    - Increment tokenVersion (revoking ALL active sessions across all devices)
    //    - Invalidate reset token and any remaining OTPs
    //    - Save to PasswordHistory
    await prisma.$transaction(async (tx) => {
      // Update User credentials & bump tokenVersion
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          tokenVersion: { increment: 1 },
          mustChangePassword: false,
        },
      });

      // Mark the reset token as used
      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { isUsed: true },
      });

      // Invalidate all pending reset tokens for this user
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          isUsed: false,
        },
        data: { isUsed: true },
      });

      // Invalidate all pending OTPs for this user
      await tx.passwordResetOtp.updateMany({
        where: {
          userId: user.id,
          isUsed: false,
        },
        data: { isUsed: true },
      });

      // Store in password history
      await tx.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: newPasswordHash,
        },
      });
    });

    // 6. Clear failed login rate limiter for this email
    resetRateLimit(`login:${normalizedEmail}`);

    // 7. Clear local session cookie if current browser had one
    await clearSessionCookie();

    // 8. Log security audit event
    await logAudit({
      userId: user.id,
      action: AuditAction.PASSWORD_RESET_SUCCESS,
      details: `Password successfully changed for ${user.email}. All previous sessions revoked.`,
      ipAddress,
      userAgent,
    });

    // 9. Send confirmation email to user
    await sendPasswordChangedEmail({
      to: user.email,
      name: user.name,
      locale,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: isTamil
        ? "உங்கள் கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது! பழைய அமர்வுகள் வெளியேற்றப்பட்டன. இப்போது உள்நுழையவும்."
        : "Your password has been successfully reset! All active sessions have been logged out. Please sign in with your new password.",
    });
  } catch (err: any) {
    console.error("[RESET PASSWORD API ERROR]", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to reset password at this time. Please try again.",
      },
      { status: 500 }
    );
  }
}
