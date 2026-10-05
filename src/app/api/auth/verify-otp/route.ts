import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyOtpConstantTime, generateResetToken } from "@/lib/auth/otp";
import { logAudit } from "@/lib/audit";
import { AuditAction, UserStatus } from "@prisma/client";

const verifyOtpSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be exactly 6 digits."),
  twoFactorCode: z.string().optional(),
  locale: z.string().optional().default("ta-IN"),
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
    const parseResult = verifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid input data.",
        },
        { status: 400 }
      );
    }

    const { email, otp, twoFactorCode, locale } = parseResult.data;
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
        role: true,
        twoFactorEnabled: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return NextResponse.json(
        {
          success: false,
          error: isTamil
            ? "OTP தவறானது அல்லது காலாவதியானது. புதிய OTP-ஐக் கோரவும்."
            : "Invalid or expired OTP. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // 2. Fetch the most recent active OTP for this user
    const activeOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeOtp) {
      await logAudit({
        userId: user.id,
        action: AuditAction.OTP_FAILED,
        details: `OTP verification failed for ${user.email}: No active or unexpired OTP found.`,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          error: isTamil
            ? "OTP காலாவதியாகிவிட்டது அல்லது செல்லுபடியாகாது. புதிய OTP-ஐக் கோரவும்."
            : "OTP has expired or is invalid. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    // 3. Brute-force Lockout Check: Maximum 5 attempts allowed per OTP
    if (activeOtp.attemptsCount >= 5) {
      // Invalidate the OTP permanently
      await prisma.passwordResetOtp.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });

      await logAudit({
        userId: user.id,
        action: AuditAction.OTP_FAILED,
        details: `OTP permanently destroyed for ${user.email}: Maximum 5 incorrect attempts exceeded.`,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          error: isTamil
            ? "அதிக தவறான முயற்சிகள். பாதுகாப்பு காரணங்களுக்காக இந்த OTP ரத்து செய்யப்பட்டது. புதிய OTP-ஐக் கோரவும்."
            : "Too many incorrect attempts. This OTP has been invalidated for security. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    // 4. Constant-time verification
    const isValid = verifyOtpConstantTime(otp, activeOtp.otpHash);

    if (!isValid) {
      const nextAttemptCount = activeOtp.attemptsCount + 1;
      const remainingAttempts = Math.max(0, 5 - nextAttemptCount);

      // Increment attempt count, invalidate if reached 5
      await prisma.passwordResetOtp.update({
        where: { id: activeOtp.id },
        data: {
          attemptsCount: nextAttemptCount,
          isUsed: remainingAttempts === 0 ? true : activeOtp.isUsed,
        },
      });

      await logAudit({
        userId: user.id,
        action: AuditAction.OTP_FAILED,
        details: `Failed OTP attempt for ${user.email} (Attempt ${nextAttemptCount}/5). Remaining: ${remainingAttempts}`,
        ipAddress,
        userAgent,
      });

      const errorMsg =
        remainingAttempts > 0
          ? isTamil
            ? `தவறான OTP. உங்களுக்கு இன்னும் ${remainingAttempts} வாய்ப்புகள் உள்ளன.`
            : `Invalid OTP. You have ${remainingAttempts} attempt(s) remaining.`
          : isTamil
          ? "அதிக தவறான முயற்சிகள். இந்த OTP ரத்து செய்யப்பட்டது. புதிய OTP-ஐக் கோரவும்."
          : "Maximum attempts exceeded. This OTP has been cancelled. Please request a new one.";

      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    // 5. OTP is VALID: Invalidate OTP so it can NEVER be reused
    await prisma.passwordResetOtp.update({
      where: { id: activeOtp.id },
      data: { isUsed: true },
    });

    // 6. Check 2FA requirement (if user has 2FA enabled)
    if (user.twoFactorEnabled) {
      if (!twoFactorCode || twoFactorCode.trim() === "") {
        return NextResponse.json({
          success: false,
          requires2FA: true,
          message: isTamil
            ? "தயவுசெய்து உங்கள் 2FA அங்கீகாரக் குறியீட்டை உள்ளிடவும்."
            : "Please enter your 2FA authentication code to continue.",
        });
      }
      // If 2FA verification needed, verify code
    }

    // 7. Generate short-lived (10-minute) single-use Reset Token
    const { rawToken, tokenHash } = generateResetToken();
    const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate any old unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // Store hashed reset token in DB
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: tokenExpiresAt,
        isUsed: false,
      },
    });

    // 8. Record audit log
    await logAudit({
      userId: user.id,
      action: AuditAction.OTP_VERIFIED,
      details: `OTP verified successfully for ${user.email}. Issued single-use reset token.`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      resetToken: rawToken,
      message: isTamil
        ? "OTP வெற்றிகரமாக சரிபார்க்கப்பட்டது. புதிய கடவுச்சொல்லை உள்ளிடவும்."
        : "OTP verified successfully. Please enter your new password.",
    });
  } catch (err: any) {
    console.error("[VERIFY OTP API ERROR]", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify OTP at this time. Please try again.",
      },
      { status: 500 }
    );
  }
}
