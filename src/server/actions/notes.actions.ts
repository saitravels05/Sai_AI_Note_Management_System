"use server";

import { prisma } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { parseQuickAddSentence, ParsedNoteCard } from "@/lib/gemini";
import { Money, calculateGst } from "@/lib/money";
import { AuditAction, PaymentMode, PaymentStatus, RecordType, Role, ServiceCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface NoteCardInput {
  title: string;
  notes?: string;
  type: RecordType;
  category: ServiceCategory;
  amount?: number | string;
  customerAmount?: number | string;
  agentAmount?: number | string;
  serviceCharge?: number | string;
  amountPaid?: number | string;
  paymentMode: PaymentMode;
  date?: string;
  partyName?: string;
  partyPhone?: string;
  gstRate?: number | string;
  tags?: string[];
  color?: string;
}

import { generateUniqueRecordNumber } from "@/lib/record-number";

export async function parseSentenceAction(sentence: string): Promise<ParsedNoteCard> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Please sign in to use AI smart note parsing.");
  }

  const boundedSentence = (sentence || "").trim().slice(0, 300);
  return await parseQuickAddSentence(boundedSentence);
}

export async function createNoteCardAction(input: NoteCardInput) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Please sign in.");
  }

  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  if (!input.title || !input.title.trim()) {
    throw new Error("Card title / description is required.");
  }

  const custMoney =
    input.customerAmount !== undefined && input.customerAmount !== ""
      ? Money.from(input.customerAmount)
      : input.amount !== undefined && input.amount !== ""
      ? Money.from(input.amount)
      : Money.zero();

  const agentMoney =
    input.agentAmount !== undefined && input.agentAmount !== ""
      ? Money.from(input.agentAmount)
      : Money.zero();

  const serviceChargeMoney =
    input.serviceCharge !== undefined && input.serviceCharge !== ""
      ? Money.from(input.serviceCharge)
      : custMoney.sub(agentMoney);

  const primaryMoney = custMoney.isPositive()
    ? custMoney
    : agentMoney.isPositive()
    ? agentMoney
    : Money.from(input.amount || 0);

  if (!primaryMoney.isPositive()) {
    throw new Error("Customer amount must be a valid positive number.");
  }

  const amountDecimal = primaryMoney.toDecimal();
  const customerAmountDecimal = custMoney.isPositive() ? custMoney.toDecimal() : amountDecimal;
  const agentAmountDecimal =
    agentMoney.isPositive() || (input.agentAmount !== undefined && input.agentAmount !== "")
      ? agentMoney.toDecimal()
      : null;
  const serviceChargeDecimal = serviceChargeMoney.toDecimal();

  const defaultPaid = input.paymentMode === PaymentMode.CREDIT_UNPAID ? 0 : amountDecimal;
  const amountPaidDecimal = Money.from(input.amountPaid ?? defaultPaid).toDecimal();
  const balanceDueDecimal = Money.from(amountDecimal).sub(amountPaidDecimal).toDecimal();

  let paymentStatus: PaymentStatus = PaymentStatus.COMPLETED;
  if (balanceDueDecimal.greaterThan(0)) {
    paymentStatus = amountPaidDecimal.greaterThan(0) ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;
  }

  const gstRate = Money.from(input.gstRate ?? 0).toDecimal();
  const gstAmount = calculateGst(amountDecimal, gstRate).toDecimal();

  // Find or create customer if a party name or phone number was entered
  let customerId: string | undefined = undefined;
  const partyNameTrimmed = input.partyName?.trim() || "";
  const partyPhoneTrimmed = input.partyPhone?.trim() || "";

  if (partyNameTrimmed || partyPhoneTrimmed) {
    let customer = null;

    if (partyPhoneTrimmed) {
      customer = await prisma.customer.findFirst({
        where: { phone: partyPhoneTrimmed },
      });
    }

    if (!customer && partyNameTrimmed) {
      customer = await prisma.customer.findFirst({
        where: { name: { equals: partyNameTrimmed, mode: "insensitive" } },
      });
    }

    const effectiveName = partyNameTrimmed || `Customer (${partyPhoneTrimmed})`;

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: effectiveName,
          phone: partyPhoneTrimmed || null,
          totalBilled: amountDecimal,
          totalPaid: amountPaidDecimal,
          balanceDue: balanceDueDecimal,
        },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          phone: partyPhoneTrimmed || customer.phone || null,
          totalBilled: Money.from(customer.totalBilled).add(amountDecimal).toDecimal(),
          totalPaid: Money.from(customer.totalPaid).add(amountPaidDecimal).toDecimal(),
          balanceDue: Money.from(customer.balanceDue).add(balanceDueDecimal).toDecimal(),
        },
      });
    }
    customerId = customer.id;
  }

  const recordNumber = await generateUniqueRecordNumber();
  const dateObj = input.date ? new Date(input.date) : new Date();

  // Check if target month is locked
  const periodKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, "0")}`;
  const lockedPeriod = await prisma.monthPeriod.findUnique({
    where: { periodKey },
  });

  if (lockedPeriod && lockedPeriod.status === "CLOSED") {
    throw new Error(`Period ${periodKey} is CLOSED and LOCKED. Please contact the Owner to unlock.`);
  }

  let finalNotes = input.notes || "";
  if (partyPhoneTrimmed && !finalNotes.includes(partyPhoneTrimmed)) {
    finalNotes = finalNotes ? `${finalNotes} | Ph: ${partyPhoneTrimmed}` : `Ph: ${partyPhoneTrimmed}`;
  }

  const record = await prisma.noteRecord.create({
    data: {
      recordNumber,
      title: input.title,
      notes: finalNotes || null,
      type: input.type,
      category: input.category,
      amount: amountDecimal,
      customerAmount: customerAmountDecimal,
      agentAmount: agentAmountDecimal,
      serviceCharge: serviceChargeDecimal,
      commissionAmount: serviceChargeDecimal,
      amountPaid: amountPaidDecimal,
      balanceDue: balanceDueDecimal,
      paymentMode: input.paymentMode,
      paymentStatus,
      gstRate,
      gstAmount,
      date: dateObj,
      tags: input.tags || [],
      color: input.color || "amber",
      customerId,
      createdById: session.id,
      monthPeriodId: lockedPeriod?.id,
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.CREATE_RECORD,
    entityType: "NoteRecord",
    entityId: record.id,
    details: `Created Note Card #${recordNumber} (${input.title}) - Customer: ₹${amountDecimal.toString()}, Agent: ₹${agentMoney.toString()}, Profit: ₹${serviceChargeDecimal.toString()}`,
  });

  revalidatePath("/");
  return { success: true, record };
}

export async function voidNoteCardAction(recordId: string, reason: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized.");
  }

  if (!hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Only Admin or Owner can void/cancel records.");
  }

  const record = await prisma.noteRecord.findUnique({
    where: { id: recordId },
    include: { monthPeriod: true },
  });

  if (!record) {
    throw new Error("Record not found.");
  }

  if (record.monthPeriod && record.monthPeriod.status === "CLOSED") {
    throw new Error("Cannot void a transaction in a CLOSED accounting month.");
  }

  const updated = await prisma.noteRecord.update({
    where: { id: recordId },
    data: {
      isVoid: true,
      voidReason: reason || "Voided by user",
      voidedAt: new Date(),
      voidedById: session.id,
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.VOID_RECORD,
    entityType: "NoteRecord",
    entityId: record.id,
    details: `Voided record #${record.recordNumber}. Reason: ${reason}`,
  });

  revalidatePath("/");
  return { success: true, record: updated };
}
