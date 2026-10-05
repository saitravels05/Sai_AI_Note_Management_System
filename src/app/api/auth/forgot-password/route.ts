import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateSecureOtp, hashOtp, checkOtpRateLimit } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/email/send-email";
import { logAudit } from "@/lib/audit";
import { AuditAction, UserStatus } from "@prisma/client";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  locale: z.string().optional().default("ta-IN"),
  turnstileToken: z.string().optional(),
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers.get("user-agent")?.slice(0, 250) || "Unknown";

  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = forgotPasswordSchema.safeParse(body);

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
    const normalizedEmail = email.toLowerCase();

    // Constant-time message to eliminate user enumeration
    const genericSuccessResponse = {
      success: true,
      message:
        locale.startsWith("ta")
          ? "இந்த மின்னஞ்சல் பதிவு செய்யப்பட்டிருந்தால், 6-இலக்க OTP அனுப்பப்பட்டுள்ளது."
          : "If this email is registered, a 6-digit verification OTP has been sent.",
    };

    // 1. IP Rate limit check: Maximum 10 OTP requests per hour from a single IP
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const ipOtpCount = await prisma.passwordResetOtp.count({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (ipOtpCount >= 10) {
      return NextResponse.json(
        {
          success: false,
          error:
            locale.startsWith("ta")
              ? "இந்த ஐபி முகவரியிலிருந்து அதிக கோரிக்கைகள். சிறிது நேரம் கழித்து முயற்சிக்கவும்."
              : "Too many password reset requests from this network. Please try again later.",
        },
        { status: 429 }
      );
    }

    // 2. Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: true,
      },
    });

    // Defense against user enumeration: simulate work and return identical response
    if (!user) {
      // Artificial delay (120ms) to mirror database write latency
      await new Promise((r) => setTimeout(r, 120));
      return NextResponse.json(genericSuccessResponse);
    }

    // If account is suspended or pending approval, DO NOT allow password reset
    if (user.status !== UserStatus.ACTIVE) {
      await logAudit({
        userId: user.id,
        action: AuditAction.PASSWORD_RESET_BLOCKED,
        details: `Password reset blocked: User ${user.email} status is ${user.status}`,
        ipAddress,
        userAgent,
      });

      // Mirror timing and return identical response to prevent status enumeration
      await new Promise((r) => setTimeout(r, 100));
      return NextResponse.json(genericSuccessResponse);
    }

    // 3. User-level rate limiting & 60-second cooldown check
    const rateCheck = await checkOtpRateLimit({
      userId: user.id,
      ipAddress,
    });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: locale.startsWith("ta") ? rateCheck.reasonTamil : rateCheck.reason,
          cooldownRemainingSeconds: rateCheck.cooldownRemainingSeconds,
        },
        { status: 429 }
      );
    }

    // 4. Invalidate any existing unverified OTPs for this user
    await prisma.passwordResetOtp.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // 5. Generate cryptographically secure 6-digit OTP and HMAC hash
    const plainOtp = generateSecureOtp();
    const otpHash = hashOtp(plainOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 6. Store hashed OTP in database
    await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // 7. Record security audit log
    await logAudit({
      userId: user.id,
      action: AuditAction.OTP_REQUESTED,
      details: `Password reset OTP generated for ${user.email} (expires in 10 minutes)`,
      ipAddress,
      userAgent,
    });

    // 8. Dispatch email via Resend (or dev console fallback)
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
      ...genericSuccessResponse,
      ...(isDevWithoutKey ? { devOtp: plainOtp } : {}),
    });
  } catch (err: any) {
    console.error("[FORGOT PASSWORD API ERROR]", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process password reset at this time. Please try again.",
      },
      { status: 500 }
    );
  }
}
