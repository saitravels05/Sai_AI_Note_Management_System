"use server";

import { prisma } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";
import { encryptField, decryptField, maskSensitive } from "@/lib/crypto";
import { Money } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * CUSTOMER MODULE – 100% DERIVED FROM MASTER JOURNAL (NoteRecord)
 * Billed, Paid, and Due balances are calculated dynamically from active entries.
 * Users enter data only in Notes & Journal; customer ledgers reflect changes live.
 */

export async function getCustomersAction() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const customers = await prisma.customer.findMany({
    include: {
      records: {
        where: { isVoid: false, isDeleted: false },
        select: {
          id: true,
          amount: true,
          amountPaid: true,
          balanceDue: true,
        },
      },
      _count: {
        select: { records: true, bookings: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((c) => {
    let billed = Money.zero();
    let paid = Money.zero();
    let due = Money.zero();

    for (const r of c.records) {
      billed = billed.add(r.amount);
      paid = paid.add(r.amountPaid);
      due = due.add(r.balanceDue);
    }

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      notes: c.notes,
      hasPassport: Boolean(c.encryptedPassport),
      maskedPassport: c.encryptedPassport ? maskSensitive(decryptField(c.encryptedPassport), 2, 2) : null,
      totalBilled: billed.formatIndian(false),
      totalPaid: paid.formatIndian(false),
      balanceDue: due.formatIndian(false),
      recordCount: c._count.records,
      bookingCount: c._count.bookings,
    };
  });
}

export async function getCustomerLedgerAction(customerId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      records: {
        where: { isVoid: false, isDeleted: false },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!customer) throw new Error("Customer not found.");

  let runningBalance = Money.zero();
  let totalBilled = Money.zero();
  let totalPaid = Money.zero();

  const ledgerEntries = customer.records.map((r) => {
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
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    },
    totalBilled: totalBilled.formatIndian(true),
    totalPaid: totalPaid.formatIndian(true),
    balanceDue: runningBalance.formatIndian(true),
    entries: ledgerEntries,
  };
}

export async function createCustomerAction(data: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  passportNumber?: string;
  aadhaarNumber?: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  const encryptedPassport = data.passportNumber ? encryptField(data.passportNumber.trim().toUpperCase()) : null;
  const encryptedAadhaar = data.aadhaarNumber ? encryptField(data.aadhaarNumber.trim()) : null;

  const customer = await prisma.customer.create({
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim(),
      email: data.email?.trim().toLowerCase(),
      address: data.address?.trim(),
      encryptedPassport,
      encryptedAadhaar,
      notes: data.notes?.trim(),
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.CREATE_RECORD,
    entityType: "Customer",
    entityId: customer.id,
    details: `Created customer record for ${customer.name} with encrypted identity credentials`,
  });

  revalidatePath("/customers");
  return { success: true, customer };
}

export async function revealCustomerSensitiveAction(
  customerId: string
): Promise<{ passport?: string | null; aadhaar?: string | null }> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Permission Denied: Only Admin or Owner can reveal encrypted identity credentials.");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, encryptedPassport: true, encryptedAadhaar: true },
  });

  if (!customer) throw new Error("Customer not found");

  await logAudit({
    userId: session.id,
    action: AuditAction.UPDATE_RECORD,
    entityType: "CustomerIdentityVault",
    entityId: customer.id,
    details: `ADMIN PRIVILEGE REVEAL: User ${session.email} revealed encrypted credentials for "${customer.name}" (ID: ${customer.id})`,
  });

  return {
    passport: decryptField(customer.encryptedPassport),
    aadhaar: decryptField(customer.encryptedAadhaar),
  };
}

export async function updateCustomerAction(data: {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  passportNumber?: string;
  aadhaarNumber?: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  const existing = await prisma.customer.findUnique({ where: { id: data.id } });
  if (!existing) throw new Error("Customer not found.");

  const updateData: any = {
    name: data.name.trim(),
    phone: data.phone?.trim(),
    email: data.email?.trim().toLowerCase(),
    address: data.address?.trim(),
    notes: data.notes?.trim(),
  };

  if (data.passportNumber) {
    updateData.encryptedPassport = encryptField(data.passportNumber.trim().toUpperCase());
  }
  if (data.aadhaarNumber) {
    updateData.encryptedAadhaar = encryptField(data.aadhaarNumber.trim());
  }

  const updated = await prisma.customer.update({
    where: { id: data.id },
    data: updateData,
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.UPDATE_RECORD,
    entityType: "Customer",
    entityId: updated.id,
    details: `Updated customer profile for ${updated.name}`,
  });

  revalidatePath("/customers");
  return { success: true, customer: updated };
}

export async function deleteCustomerAction(customerId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Permission Denied: Only Admin or Owner can delete customer records.");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      records: { where: { isVoid: false, isDeleted: false }, select: { id: true, balanceDue: true } },
      bookings: { select: { id: true, status: true } },
    },
  });

  if (!customer) throw new Error("Customer not found.");

  // Dynamically calculate live pending dues from NoteRecord
  let totalDue = Money.zero();
  for (const r of customer.records) {
    totalDue = totalDue.add(r.balanceDue);
  }

  if (totalDue.greaterThan(0)) {
    throw new Error(
      `Cannot delete customer with pending dues of ${totalDue.formatIndian(true)}. Please settle dues via Notes & Journal first.`
    );
  }

  const activeBookings = customer.bookings.filter((b) => b.status === "CONFIRMED");
  if (activeBookings.length > 0) {
    throw new Error(
      `Cannot delete customer with ${activeBookings.length} active confirmed booking(s). Please complete or cancel bookings first.`
    );
  }

  await prisma.customer.delete({
    where: { id: customerId },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.DELETE_RECORD,
    entityType: "Customer",
    entityId: customerId,
    details: `Deleted customer record "${customer.name}" (ID: ${customerId})`,
  });

  revalidatePath("/customers");
  return { success: true };
}
