import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Money } from "@/lib/money";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1. Verify CRON_SECRET authorization header
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing CRON_SECRET" },
      { status: 401 }
    );
  }

  try {
    // 2. Fetch customers with active pending dues
    const customersWithDues = await prisma.customer.findMany({
      where: {
        balanceDue: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        balanceDue: true,
      },
      take: 100,
    });

    const reminderQueue = customersWithDues.map((c) => {
      const dueFormatted = Money.from(c.balanceDue).formatIndian(true);
      return {
        customerId: c.id,
        name: c.name,
        phone: c.phone || "No phone listed",
        dueAmount: dueFormatted,
        reminderMessageEn: `Dear ${c.name}, this is a gentle reminder from Sai Tours & Travels regarding your pending balance of ${dueFormatted}. Kindly settle at your earliest convenience. Thank you!`,
        reminderMessageTa: `வணக்கம் ${c.name}, சாய் டூர்ஸ் & டிராவல்ஸ் நிறுவனத்திலிருந்து நினைவூட்டல்: தங்களின் நிலுவைத் தொகை ${dueFormatted}. விரைவில் செலுத்த வேண்டுகிறோம். நன்றி!`,
      };
    });

    return NextResponse.json({
      success: true,
      processedCount: reminderQueue.length,
      timestamp: new Date().toISOString(),
      reminders: reminderQueue,
    });
  } catch (error: any) {
    console.error("[CRON ERROR: Payment Reminders Failed]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process payment reminders" },
      { status: 500 }
    );
  }
}
