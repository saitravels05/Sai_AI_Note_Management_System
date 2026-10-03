import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Money } from "@/lib/money";
import { RecordType } from "@prisma/client";

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
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59));

    const records = await prisma.noteRecord.findMany({
      where: {
        isVoid: false,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const income = records
      .filter((r) => r.type === RecordType.INCOME)
      .reduce((sum, r) => sum.add(r.amount), Money.zero());

    const expense = records
      .filter((r) => r.type === RecordType.EXPENSE)
      .reduce((sum, r) => sum.add(r.amount), Money.zero());

    const netProfit = income.sub(expense);
    const outstandingDues = records.reduce((sum, r) => sum.add(r.balanceDue), Money.zero());

    const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

    return NextResponse.json({
      success: true,
      message: `Month-end financial summary compiled for ${monthName}`,
      period: monthName,
      metrics: {
        totalIncome: income.formatIndian(true),
        totalExpense: expense.formatIndian(true),
        netProfit: netProfit.formatIndian(true),
        outstandingDues: outstandingDues.formatIndian(true),
        recordCount: records.length,
      },
    });
  } catch (error: any) {
    console.error("[CRON ERROR: Month-End Summary Failed]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate month-end report" },
      { status: 500 }
    );
  }
}
