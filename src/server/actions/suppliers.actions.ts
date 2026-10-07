"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Money } from "@/lib/money";
import { generateUniqueRecordNumber } from "@/lib/record-number";
import { logAudit } from "@/lib/audit";
import { AuditAction, PaymentMode, RecordType, Role, ServiceCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * SUPPLIER / VENDOR MODULE – 100% DERIVED FROM MASTER JOURNAL (NoteRecord)
 * All payables, settlements, and running balances are computed dynamically.
 * Users record vendor expenses and payments in Notes & Journal;
 * the supplier ledger derives everything live.
 */

export async function getSuppliersAction() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const suppliers = await prisma.supplier.findMany({
    include: {
      records: {
        where: { isVoid: false, isDeleted: false },
        select: {
          id: true,
          type: true,
          amount: true,
          amountPaid: true,
          balanceDue: true,
        },
      },
      _count: { select: { records: true } },
    },
    orderBy: { name: "asc" },
  });

  return suppliers.map((s) => {
    let billed = Money.zero();
    let paid = Money.zero();
    let due = Money.zero();

    for (const r of s.records) {
      billed = billed.add(r.amount);
      paid = paid.add(r.amountPaid);
      due = due.add(r.balanceDue);
    }

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      category: s.category,
      gstin: s.gstin,
      bankDetails: s.bankDetails,
      totalBilled: billed.formatIndian(false),
      totalPaid: paid.formatIndian(false),
      balanceDue: due.formatIndian(false),
      transactionCount: s._count.records,
    };
  });
}

export async function getSupplierLedgerAction(supplierId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      records: {
        where: { isVoid: false, isDeleted: false },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!supplier) throw new Error("Supplier not found");

  let runningBalance = Money.zero();
  let totalBilled = Money.zero();
  let totalPaid = Money.zero();

  const ledgerEntries = supplier.records.map((r) => {
    const amt = Money.from(r.amount);
    const paid = Money.from(r.amountPaid);
    const due = Money.from(r.balanceDue);

    totalBilled = totalBilled.add(amt);
    totalPaid = totalPaid.add(paid);
    runningBalance = runningBalance.add(due);

    return {
      id: r.id,
      recordNumber: r.recordNumber,
      date: r.date.toISOString().split("T")[0],
      title: r.title,
      type: r.type,
      category: r.category,
      amount: amt.formatIndian(true),
      amountPaid: paid.formatIndian(true),
      balanceDue: due.formatIndian(true),
      runningBalanceDue: runningBalance.formatIndian(true),
      paymentMode: r.paymentMode,
      paymentStatus: r.paymentStatus,
      referenceNumber: r.referenceNumber,
    };
  });

  return {
    supplier: {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      category: supplier.category,
      gstin: supplier.gstin,
      bankDetails: supplier.bankDetails,
    },
    totalBilled: totalBilled.formatIndian(true),
    totalPaid: totalPaid.formatIndian(true),
    balanceDue: runningBalance.formatIndian(true),
    entries: ledgerEntries,
  };
}

export async function createSupplierAction(data: {
  name: string;
  phone?: string;
  email?: string;
  category: ServiceCategory;
  gstin?: string;
  bankDetails?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim(),
      email: data.email?.trim().toLowerCase(),
      category: data.category,
      gstin: data.gstin?.trim(),
      bankDetails: data.bankDetails?.trim(),
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.CREATE_RECORD,
    entityType: "Supplier",
    entityId: supplier.id,
    details: `Created vendor profile "${supplier.name}" (${supplier.category})`,
  });

  revalidatePath("/suppliers");
  return { success: true, supplier };
}

/**
 * Record a payment to supplier:
 * Directly creates a single source-of-truth NoteRecord entry (EXPENSE).
 * Both supplier ledger and dashboard update live without duplicate state storage.
 */
export async function recordSupplierPaymentAction(data: {
  supplierId: string;
  amount: number | string;
  paymentMode: PaymentMode;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: data.supplierId },
  });
  if (!supplier) throw new Error("Supplier not found");

  const amt = Money.from(data.amount);
  if (!amt.isPositive()) {
    throw new Error("Payment amount must be a positive number.");
  }

  // Generate single master journal entry in NoteRecord
  const recordNumber = await generateUniqueRecordNumber();

  const record = await prisma.noteRecord.create({
    data: {
      recordNumber,
      title: `Vendor Payment to ${supplier.name}`,
      notes: data.notes || `Settlement payment to supplier ${supplier.name}`,
      type: RecordType.EXPENSE,
      category: supplier.category,
      amount: amt.toDecimal(),
      amountPaid: amt.toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: data.paymentMode,
      paymentStatus: "COMPLETED",
      supplierId: supplier.id,
      createdById: session.id,
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.CREATE_RECORD,
    entityType: "NoteRecord",
    entityId: record.id,
    details: `Settled vendor payment of ₹${amt.toString()} to "${supplier.name}" via ${data.paymentMode}`,
  });

  revalidatePath("/suppliers");
  revalidatePath("/records");
  revalidatePath("/");
  return { success: true, record };
}
