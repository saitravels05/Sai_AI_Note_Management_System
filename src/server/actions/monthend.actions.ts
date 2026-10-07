"use server";

import { prisma } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { Money, calculateNetProfit } from "@/lib/money";
import { AuditAction, MonthStatus, PaymentMode, RecordType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getRecordAmount, getRecordPaid, getRecordDue } from "@/lib/accounting-engine";
import { getISTMonthRange } from "@/lib/date";

export interface MonthAuditSummary {
  periodKey: string;
  isClosed: boolean;
  closedAt?: string | null;
  totalIncome: string;
  totalExpense: string;
  netProfit: string;
  cashBalance: string;
  bankBalance: string;
  customerDues: string;
  pendingRecordsCount: number;
  totalRecordsCount: number;
  anomalies: string[];
  categoryBreakdown: Record<string, { income: string; expense: string }>;
}

export async function getMonthAuditSummary(year: number, month: number): Promise<MonthAuditSummary> {
  const periodKey = `${year}-${month.toString().padStart(2, "0")}`;
  // Exact Asia/Kolkata IST month boundaries
  const { start: startDate, end: endDate } = getISTMonthRange(`${year}-${month.toString().padStart(2, "0")}-01`);

  const existingPeriod = await prisma.monthPeriod.findUnique({
    where: { periodKey },
  });

  const records = await prisma.noteRecord.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      isVoid: false,
      isDeleted: false,
    },
    include: {
      customer: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  let totalIncome = Money.zero();
  let totalExpense = Money.zero();
  let cashBalance = Money.zero();
  let bankBalance = Money.zero();
  let customerDues = Money.zero();
  let pendingCount = 0;
  const anomalies: string[] = [];
  const categoryBreakdown: Record<string, { income: Money; expense: Money }> = {};

  const seenTransactions = new Set<string>();

  for (const r of records) {
    const amt = getRecordAmount(r);
    const paid = getRecordPaid(r, amt);
    const due = getRecordDue(r, amt, paid);
    const cat = r.category;

    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { income: Money.zero(), expense: Money.zero() };
    }

    if (r.type === RecordType.INCOME) {
      const inflow = paid.isPositive() ? paid : amt;
      totalIncome = totalIncome.add(inflow);
      categoryBreakdown[cat].income = categoryBreakdown[cat].income.add(inflow);

      if (r.paymentMode === PaymentMode.CASH) {
        cashBalance = cashBalance.add(inflow);
      } else if (r.paymentMode === PaymentMode.UPI || r.paymentMode === PaymentMode.BANK_TRANSFER || r.paymentMode === PaymentMode.CARD) {
        bankBalance = bankBalance.add(inflow);
      }
    } else if (r.type === RecordType.EXPENSE || r.type === RecordType.REFUND) {
      const outflow = r.type === RecordType.REFUND ? amt : (paid.isPositive() ? paid : amt);
      totalExpense = totalExpense.add(outflow);
      categoryBreakdown[cat].expense = categoryBreakdown[cat].expense.add(outflow);

      if (r.paymentMode === PaymentMode.CASH) {
        cashBalance = cashBalance.sub(outflow);
      } else if (r.paymentMode === PaymentMode.UPI || r.paymentMode === PaymentMode.BANK_TRANSFER || r.paymentMode === PaymentMode.CARD) {
        bankBalance = bankBalance.sub(outflow);
      }
    } else if (r.type === RecordType.TRANSFER) {
      const fromMode = r.paymentMode;
      const toMode = r.transferToMode || PaymentMode.BANK_TRANSFER;
      if (fromMode === PaymentMode.CASH) cashBalance = cashBalance.sub(amt);
      else bankBalance = bankBalance.sub(amt);

      if (toMode === PaymentMode.CASH) cashBalance = cashBalance.add(amt);
      else bankBalance = bankBalance.add(amt);
    } else if (r.type === RecordType.RECEIVABLE) {
      customerDues = customerDues.add(due);
      if (paid.isPositive()) {
        totalIncome = totalIncome.add(paid);
        if (r.paymentMode === PaymentMode.CASH) cashBalance = cashBalance.add(paid);
        else bankBalance = bankBalance.add(paid);
      }
    } else if (r.type === RecordType.PAYABLE) {
      if (paid.isPositive()) {
        totalExpense = totalExpense.add(paid);
        if (r.paymentMode === PaymentMode.CASH) cashBalance = cashBalance.sub(paid);
        else bankBalance = bankBalance.sub(paid);
      }
    }

    if (due.greaterThan(0)) {
      pendingCount++;
    }

    // LEGITIMATE ANOMALY DETECTIONS:
    // 1. Truly ₹0 amount on financial record (not a plain NOTE, and has no amount in ANY field)
    if (r.type !== RecordType.NOTE && amt.isZero()) {
      anomalies.push(`Card #${r.recordNumber} (${r.title}) has an amount of ₹0 across all fields.`);
    }

    // 2. Negative amount
    if (amt.isNegative()) {
      anomalies.push(`Card #${r.recordNumber} (${r.title}) has an invalid negative amount (${amt.formatIndian(true)}).`);
    }

    // 3. Paid exceeds billed amount
    if (paid.greaterThan(amt) && r.type !== RecordType.TRANSFER && amt.isPositive()) {
      anomalies.push(`Card #${r.recordNumber} (${r.title}) amount paid (${paid.formatIndian(true)}) exceeds bill amount (${amt.formatIndian(true)}).`);
    }

    // 4. Outstanding customer due without customer assigned
    if (due.greaterThan(0) && (r.type === RecordType.RECEIVABLE || r.type === RecordType.INCOME) && !r.customerId && !r.customer?.name) {
      anomalies.push(`Card #${r.recordNumber} (${r.title}) has an unpaid due of ${due.formatIndian(true)} without an assigned customer.`);
    }

    // 5. Duplicate transaction detection
    const dupKey = `${r.title.toLowerCase().trim()}_${amt.toFixed(2)}`;
    if (seenTransactions.has(dupKey)) {
      anomalies.push(`Possible duplicate entry found: "${r.title}" for ${amt.formatIndian(true)}.`);
    } else {
      seenTransactions.add(dupKey);
    }
  }

  const netProfit = calculateNetProfit(totalIncome, totalExpense);

  const formattedBreakdown: Record<string, { income: string; expense: string }> = {};
  for (const [k, v] of Object.entries(categoryBreakdown)) {
    formattedBreakdown[k] = {
      income: v.income.formatIndian(true),
      expense: v.expense.formatIndian(true),
    };
  }

  return {
    periodKey,
    isClosed: existingPeriod?.status === MonthStatus.CLOSED,
    closedAt: existingPeriod?.closedAt?.toISOString() || null,
    totalIncome: totalIncome.formatIndian(true),
    totalExpense: totalExpense.formatIndian(true),
    netProfit: netProfit.formatIndian(true),
    cashBalance: cashBalance.formatIndian(true),
    bankBalance: bankBalance.formatIndian(true),
    customerDues: customerDues.formatIndian(true),
    pendingRecordsCount: pendingCount,
    totalRecordsCount: records.length,
    anomalies,
    categoryBreakdown: formattedBreakdown,
  };
}

export async function closeMonthAction(year: number, month: number) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Only Admin or Owner can close and lock a month.");
  }

  const periodKey = `${year}-${month.toString().padStart(2, "0")}`;
  const summary = await getMonthAuditSummary(year, month);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const period = await prisma.monthPeriod.upsert({
    where: { periodKey },
    update: {
      status: MonthStatus.CLOSED,
      closedAt: new Date(),
      closedById: session.id,
      snapshotData: summary as any,
    },
    create: {
      periodKey,
      year,
      month,
      status: MonthStatus.CLOSED,
      closedAt: new Date(),
      closedById: session.id,
      snapshotData: summary as any,
    },
  });

  // Link all records in this month to the period
  await prisma.noteRecord.updateMany({
    where: {
      date: { gte: startDate, lte: endDate },
      monthPeriodId: null,
    },
    data: {
      monthPeriodId: period.id,
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.CLOSE_MONTH,
    entityType: "MonthPeriod",
    entityId: period.id,
    details: `Month ${periodKey} closed and locked. Net Profit: ${summary.netProfit}`,
  });

  revalidatePath("/");
  return { success: true, periodKey };
}

export async function unlockMonthAction(year: number, month: number, reason: string) {
  const session = await getSession();
  if (!session || session.role !== Role.OWNER) {
    throw new Error("Only the Business Owner can unlock a closed accounting month.");
  }

  if (!reason || reason.trim().length < 5) {
    throw new Error("Please provide a valid, descriptive reason for unlocking this month.");
  }

  const periodKey = `${year}-${month.toString().padStart(2, "0")}`;

  await prisma.monthPeriod.update({
    where: { periodKey },
    data: {
      status: MonthStatus.OPEN,
      unlockedAt: new Date(),
      unlockedById: session.id,
      unlockReason: reason,
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.UNLOCK_MONTH,
    entityType: "MonthPeriod",
    details: `Owner unlocked month ${periodKey}. Reason: ${reason}`,
  });

  revalidatePath("/");
  return { success: true, periodKey };
}
