import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateSecureOtp, hashOtp, checkOtpRateLimit } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/email/send-email";
import { logAudit } from "@/lib/audit";
import { AuditAction, UserStatus } from "@prisma/client";

const resendOtpSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
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
    const parseResult = resendOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid input data.",
        },
        { status: 400 }
      );
    }

    const { email, locale } = parseResult.data;
    const isTamil = locale.startsWith("ta");
    const normalizedEmail = email.toLowerCase();

    const genericSuccess = {
      success: true,
      message: isTamil
        ? "புதிய சரிபார்ப்பு OTP உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டது."
        : "A new verification OTP has been sent to your email address.",
    };

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      await new Promise((r) => setTimeout(r, 120));
      return NextResponse.json(genericSuccess);
    }

    // 1. Enforce 60-second cooldown and hourly limit
    const rateCheck = await checkOtpRateLimit({
      userId: user.id,
      ipAddress,
    });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: isTamil ? rateCheck.reasonTamil : rateCheck.reason,
          cooldownRemainingSeconds: rateCheck.cooldownRemainingSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Invalidate all older OTPs for this user
    await prisma.passwordResetOtp.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // 3. Generate new 6-digit OTP
    const plainOtp = generateSecureOtp();
    const otpHash = hashOtp(plainOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Save new OTP record
    await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // 5. Audit log
    await logAudit({
      userId: user.id,
      action: AuditAction.OTP_REQUESTED,
      details: `Resent password reset OTP for ${user.email}`,
      ipAddress,
      userAgent,
    });

    // 6. Send email
    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp: plainOtp,
      locale,
    });

    const isDevWithoutKey =
      process.env.NODE_ENV === "development" &&
      (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_xxx"));

    return NextResponse.json({
      ...genericSuccess,
      ...(isDevWithoutKey ? { devOtp: plainOtp } : {}),
    });
  } catch (err: any) {
    console.error("[RESEND OTP API ERROR]", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to resend OTP at this time. Please try again.",
      },
      { status: 500 }
    );
  }
}
