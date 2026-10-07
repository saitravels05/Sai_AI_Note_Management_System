"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Money } from "@/lib/money";
import { generateUniqueRecordNumber } from "@/lib/record-number";
import { PaymentMode, RecordType, Role, ServiceCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getSuppliersAction() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const suppliers = await prisma.supplier.findMany({
    include: {
      _count: { select: { records: true } },
    },
    orderBy: { name: "asc" },
  });

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    category: s.category,
    gstin: s.gstin,
    bankDetails: s.bankDetails,
    totalBilled: s.totalBilled.toString(),
    totalPaid: s.totalPaid.toString(),
    balanceDue: s.balanceDue.toString(),
    transactionCount: s._count.records,
  }));
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

  revalidatePath("/suppliers");
  return { success: true, supplier };
}

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

  // Update supplier ledger
  const newDue = Money.from(supplier.balanceDue).sub(amt);
  const updatedSupplier = await prisma.supplier.update({
    where: { id: supplier.id },
    data: {
      totalPaid: Money.from(supplier.totalPaid).add(amt).toDecimal(),
      balanceDue: newDue.isNegative() ? Money.zero().toDecimal() : newDue.toDecimal(),
    },
  });

  // Generate linked expense note card
  const recordNumber = await generateUniqueRecordNumber();

  await prisma.noteRecord.create({
    data: {
      recordNumber,
      title: `Payment to ${supplier.name} (${supplier.category})`,
      notes: data.notes || `Vendor settlement via ${data.paymentMode}`,
      type: RecordType.EXPENSE,
      category: supplier.category,
      amount: amt.toDecimal(),
      amountPaid: amt.toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: data.paymentMode,
      supplierId: supplier.id,
      createdById: session.id,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/records");
  revalidatePath("/");
  return { success: true, supplier: updatedSupplier };
}
