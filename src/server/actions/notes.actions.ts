"use server";

import { prisma } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { parseQuickAddSentence, ParsedNoteCard } from "@/lib/gemini";
import { Money, calculateGst } from "@/lib/money";
import {
  AuditAction,
  PaymentMode,
  PaymentStatus,
  RecordType,
  Role,
  ServiceCategory,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateUniqueRecordNumber } from "@/lib/record-number";

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
  transferToMode?: PaymentMode;
  date?: string;
  partyName?: string;
  partyPhone?: string;
  customerId?: string;
  supplierId?: string;
  referenceNumber?: string;
  travelDate?: string;
  passengerCount?: number;
  gstType?: string;
  gstRate?: number | string;
  discountAmount?: number | string;
  commissionAmount?: number | string;
  paymentStatus?: PaymentStatus;
  tags?: string[];
  color?: string;
}

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

  const isPlainNote = input.type === RecordType.NOTE;

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

  if (!isPlainNote && !primaryMoney.isPositive()) {
    throw new Error("Financial entry amount must be a valid positive number.");
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

  let paymentStatus: PaymentStatus = input.paymentStatus || PaymentStatus.COMPLETED;
  if (balanceDueDecimal.greaterThan(0)) {
    paymentStatus = amountPaidDecimal.greaterThan(0) ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;
  }

  const gstRate = Money.from(input.gstRate ?? 0).toDecimal();
  const gstAmount = calculateGst(amountDecimal, gstRate).toDecimal();
  const discountAmount = Money.from(input.discountAmount ?? 0).toDecimal();
  const commissionAmount = Money.from(input.commissionAmount ?? serviceChargeDecimal).toDecimal();

  // Find or create customer or supplier
  let customerId: string | undefined = input.customerId || undefined;
  let supplierId: string | undefined = input.supplierId || undefined;
  const partyNameTrimmed = input.partyName?.trim() || "";
  const partyPhoneTrimmed = input.partyPhone?.trim() || "";

  if (!customerId && (partyNameTrimmed || partyPhoneTrimmed)) {
    // If EXPENSE or PAYABLE, look up supplier or customer
    if (input.type === RecordType.EXPENSE || input.type === RecordType.PAYABLE) {
      let supplier = null;
      if (partyNameTrimmed) {
        supplier = await prisma.supplier.findFirst({
          where: { name: { equals: partyNameTrimmed, mode: "insensitive" } },
        });
      }
      if (!supplier && partyNameTrimmed) {
        supplier = await prisma.supplier.create({
          data: {
            name: partyNameTrimmed,
            phone: partyPhoneTrimmed || null,
            category: input.category,
          },
        });
      }
      if (supplier) supplierId = supplier.id;
    } else {
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
  }

  const recordNumber = await generateUniqueRecordNumber();
  const dateObj = input.date ? new Date(input.date) : new Date();

  // Strict Locked Month Check
  const periodKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, "0")}`;
  const lockedPeriod = await prisma.monthPeriod.findUnique({
    where: { periodKey },
  });

  if (lockedPeriod && lockedPeriod.status === "CLOSED") {
    throw new Error(`Accounting period ${periodKey} is CLOSED and LOCKED. Please contact the Owner/Admin to unlock.`);
  }

  let finalNotes = input.notes || "";
  if (partyPhoneTrimmed && !finalNotes.includes(partyPhoneTrimmed)) {
    finalNotes = finalNotes ? `${finalNotes} | Ph: ${partyPhoneTrimmed}` : `Ph: ${partyPhoneTrimmed}`;
  }

  const travelDateObj = input.travelDate ? new Date(input.travelDate) : null;

  const record = await prisma.noteRecord.create({
    data: {
      recordNumber,
      title: input.title.trim(),
      notes: finalNotes || null,
      type: input.type,
      category: input.category,
      amount: amountDecimal,
      customerAmount: customerAmountDecimal,
      agentAmount: agentAmountDecimal,
      serviceCharge: serviceChargeDecimal,
      commissionAmount,
      discountAmount,
      amountPaid: amountPaidDecimal,
      balanceDue: balanceDueDecimal,
      paymentMode: input.paymentMode,
      transferToMode: input.type === RecordType.TRANSFER ? input.transferToMode || PaymentMode.BANK_TRANSFER : null,
      paymentStatus,
      gstType: input.gstType || "NONE",
      gstRate,
      gstAmount,
      referenceNumber: input.referenceNumber?.trim() || null,
      travelDate: travelDateObj,
      passengerCount: input.passengerCount ? Number(input.passengerCount) : 1,
      date: dateObj,
      tags: input.tags || [],
      color: input.color || "amber",
      customerId,
      supplierId,
      createdById: session.id,
      monthPeriodId: lockedPeriod?.id,
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.CREATE_RECORD,
    entityType: "NoteRecord",
    entityId: record.id,
    details: `Created Journal Entry #${recordNumber} (${input.title}) - Type: ${input.type}, Amount: ₹${amountDecimal.toString()}`,
  });

  revalidateAllPaths();
  return { success: true, record };
}

export interface UpdateNoteCardInput {
  id: string;
  title: string;
  notes?: string;
  type: RecordType;
  category: ServiceCategory;
  customerAmount?: number | string;
  agentAmount?: number | string;
  serviceCharge?: number | string;
  amount?: number | string;
  amountPaid?: number | string;
  paymentMode: PaymentMode;
  transferToMode?: PaymentMode;
  date?: string;
  partyName?: string;
  partyPhone?: string;
  customerId?: string;
  supplierId?: string;
  referenceNumber?: string;
  travelDate?: string;
  passengerCount?: number;
  gstType?: string;
  gstRate?: number | string;
  discountAmount?: number | string;
  commissionAmount?: number | string;
  paymentStatus?: PaymentStatus;
}

export async function updateNoteCardAction(input: UpdateNoteCardInput) {
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

  const existing = await prisma.noteRecord.findUnique({
    where: { id: input.id },
    include: { customer: true, supplier: true, monthPeriod: true },
  });

  if (!existing) {
    throw new Error("Record not found.");
  }

  if (existing.isVoid || existing.isDeleted) {
    throw new Error("Cannot edit a voided or deleted transaction record.");
  }

  if (existing.monthPeriod && existing.monthPeriod.status === "CLOSED") {
    throw new Error(`Period ${existing.monthPeriod.periodKey} is CLOSED and LOCKED. Please contact the Owner/Admin to unlock.`);
  }

  // Staff permission guard: Staff can only edit records they created
  if (session.role === Role.STAFF && existing.createdById !== session.id) {
    throw new Error("Permission Denied: Staff members can only edit their own entries.");
  }

  const isPlainNote = input.type === RecordType.NOTE;

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

  if (!isPlainNote && !primaryMoney.isPositive()) {
    throw new Error("Financial entry amount must be a valid positive number.");
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

  let paymentStatus: PaymentStatus = input.paymentStatus || existing.paymentStatus;
  if (balanceDueDecimal.greaterThan(0)) {
    paymentStatus = amountPaidDecimal.greaterThan(0) ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;
  }

  const gstRate = Money.from(input.gstRate ?? existing.gstRate).toDecimal();
  const gstAmount = calculateGst(amountDecimal, gstRate).toDecimal();
  const discountAmount = Money.from(input.discountAmount ?? existing.discountAmount).toDecimal();
  const commissionAmount = Money.from(input.commissionAmount ?? serviceChargeDecimal).toDecimal();

  let customerId = input.customerId !== undefined ? input.customerId : existing.customerId;
  let supplierId = input.supplierId !== undefined ? input.supplierId : existing.supplierId;
  const partyNameTrimmed = input.partyName?.trim() || "";
  const partyPhoneTrimmed = input.partyPhone?.trim() || "";

  if (partyNameTrimmed || partyPhoneTrimmed) {
    if (input.type === RecordType.EXPENSE || input.type === RecordType.PAYABLE) {
      let supplier = null;
      if (partyNameTrimmed) {
        supplier = await prisma.supplier.findFirst({
          where: { name: { equals: partyNameTrimmed, mode: "insensitive" } },
        });
      }
      if (!supplier && partyNameTrimmed) {
        supplier = await prisma.supplier.create({
          data: {
            name: partyNameTrimmed,
            phone: partyPhoneTrimmed || null,
            category: input.category,
          },
        });
      }
      if (supplier) supplierId = supplier.id;
    } else {
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
          },
        });
      }
      customerId = customer.id;
    }
  }

  const dateObj = input.date ? new Date(input.date) : existing.date;
  const periodKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, "0")}`;
  const targetPeriod = await prisma.monthPeriod.findUnique({
    where: { periodKey },
  });

  if (targetPeriod && targetPeriod.status === "CLOSED") {
    throw new Error(`Target period ${periodKey} is CLOSED and LOCKED.`);
  }

  let finalNotes = input.notes !== undefined ? input.notes : existing.notes || "";
  if (partyPhoneTrimmed && !finalNotes.includes(partyPhoneTrimmed)) {
    finalNotes = finalNotes ? `${finalNotes} | Ph: ${partyPhoneTrimmed}` : `Ph: ${partyPhoneTrimmed}`;
  }

  const travelDateObj = input.travelDate ? new Date(input.travelDate) : existing.travelDate;

  const updated = await prisma.noteRecord.update({
    where: { id: input.id },
    data: {
      title: input.title.trim(),
      notes: finalNotes || null,
      type: input.type,
      category: input.category,
      amount: amountDecimal,
      customerAmount: customerAmountDecimal,
      agentAmount: agentAmountDecimal,
      serviceCharge: serviceChargeDecimal,
      commissionAmount,
      discountAmount,
      amountPaid: amountPaidDecimal,
      balanceDue: balanceDueDecimal,
      paymentMode: input.paymentMode,
      transferToMode: input.type === RecordType.TRANSFER ? input.transferToMode || PaymentMode.BANK_TRANSFER : null,
      paymentStatus,
      gstType: input.gstType || existing.gstType || "NONE",
      gstRate,
      gstAmount,
      referenceNumber: input.referenceNumber !== undefined ? input.referenceNumber?.trim() || null : existing.referenceNumber,
      travelDate: travelDateObj,
      passengerCount: input.passengerCount ? Number(input.passengerCount) : existing.passengerCount,
      date: dateObj,
      customerId,
      supplierId,
      updatedById: session.id,
      monthPeriodId: targetPeriod?.id ?? existing.monthPeriodId,
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.UPDATE_RECORD,
    entityType: "NoteRecord",
    entityId: updated.id,
    details: `Updated Journal Entry #${existing.recordNumber} (${input.title}) - Type: ${input.type}, Amount: ₹${amountDecimal.toString()}`,
  });

  revalidateAllPaths();
  return { success: true, record: updated };
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
    details: `Voided Journal Entry #${record.recordNumber}. Reason: ${reason}`,
  });

  revalidateAllPaths();
  return { success: true, record: updated };
}

/**
 * Soft Delete: moves entry to recycle bin. Disappears from all active totals.
 */
export async function deleteNoteCardAction(recordId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (!hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Permission Denied: Only Admin or Owner can delete journal entries.");
  }

  const record = await prisma.noteRecord.findUnique({
    where: { id: recordId },
    include: { monthPeriod: true },
  });

  if (!record) throw new Error("Record not found.");

  if (record.monthPeriod && record.monthPeriod.status === "CLOSED") {
    throw new Error("Cannot delete a transaction in a CLOSED accounting month.");
  }

  const updated = await prisma.noteRecord.update({
    where: { id: recordId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedById: session.id,
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.DELETE_RECORD,
    entityType: "NoteRecord",
    entityId: record.id,
    details: `Soft deleted Journal Entry #${record.recordNumber} (${record.title}) into Recycle Bin`,
  });

  revalidateAllPaths();
  return { success: true, record: updated };
}

/**
 * Restore: recovers entry from recycle bin. Totals immediately recalculate live.
 */
export async function restoreNoteCardAction(recordId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (!hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Permission Denied: Only Admin or Owner can restore deleted entries.");
  }

  const record = await prisma.noteRecord.findUnique({
    where: { id: recordId },
    include: { monthPeriod: true },
  });

  if (!record) throw new Error("Record not found.");

  if (record.monthPeriod && record.monthPeriod.status === "CLOSED") {
    throw new Error("Cannot restore a transaction into a CLOSED accounting month.");
  }

  const updated = await prisma.noteRecord.update({
    where: { id: recordId },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
      isVoid: false,
      voidReason: null,
      voidedAt: null,
      voidedById: null,
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.RESTORE_RECORD,
    entityType: "NoteRecord",
    entityId: record.id,
    details: `Restored Journal Entry #${record.recordNumber} (${record.title}) from Recycle Bin`,
  });

  revalidateAllPaths();
  return { success: true, record: updated };
}

function revalidateAllPaths() {
  revalidatePath("/");
  revalidatePath("/records");
  revalidatePath("/customers");
  revalidatePath("/suppliers");
  revalidatePath("/receivables");
  revalidatePath("/reports");
  revalidatePath("/passport-visa");
  revalidatePath("/month-end");
}
