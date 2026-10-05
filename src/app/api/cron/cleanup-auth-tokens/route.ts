import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  // Verify authorization via CRON_SECRET header or query parameter
  const authHeader = req.headers.get("authorization");
  const cronSecretHeader = req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret) {
    const isBearerValid = authHeader === `Bearer ${expectedSecret}`;
    const isHeaderValid = cronSecretHeader === expectedSecret;

    if (!isBearerValid && !isHeaderValid) {
      return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
    }
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Delete used or expired OTP records older than 24 hours
    const deletedOtps = await prisma.passwordResetOtp.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: twentyFourHoursAgo } },
          { isUsed: true, createdAt: { lt: twentyFourHoursAgo } },
        ],
      },
    });

    // 2. Delete used or expired reset tokens older than 24 hours
    const deletedTokens = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: twentyFourHoursAgo } },
          { isUsed: true, createdAt: { lt: twentyFourHoursAgo } },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      deletedOtps: deletedOtps.count,
      deletedTokens: deletedTokens.count,
    });
  } catch (err: any) {
    console.error("[CRON AUTH TOKEN CLEANUP ERROR]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
