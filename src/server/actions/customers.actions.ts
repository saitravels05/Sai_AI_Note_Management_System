"use server";

import { prisma } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";
import { encryptField, decryptField, maskSensitive } from "@/lib/crypto";
import { Money } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getCustomersAction() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const customers = await prisma.customer.findMany({
    include: {
      records: { select: { id: true, amount: true, balanceDue: true } },
      bookings: { select: { id: true, bookingCode: true, destination: true } },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    notes: c.notes,
    hasPassport: Boolean(c.encryptedPassport),
    maskedPassport: c.encryptedPassport ? maskSensitive(decryptField(c.encryptedPassport), 2, 2) : null,
    totalBilled: c.totalBilled.toString(),
    totalPaid: c.totalPaid.toString(),
    balanceDue: c.balanceDue.toString(),
    recordCount: c.records.length,
    bookingCount: c.bookings.length,
  }));
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

  // Mandatory non-repudiation audit logging under India DPDP Act 2023 & ISO 27001
  await logAudit({
    userId: session.id,
    action: AuditAction.UPDATE_RECORD,
    entityType: "CustomerIdentityVault",
    entityId: customer.id,
    details: `ADMIN PRIVILEGE REVEAL: User ${session.email} revealed encrypted passport credentials for customer "${customer.name}" (ID: ${customer.id})`,
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
      records: { where: { isVoid: false }, select: { id: true, balanceDue: true } },
      bookings: { select: { id: true, status: true } },
    },
  });

  if (!customer) throw new Error("Customer not found.");

  // Careless user defense: Check pending dues
  const due = Money.from(customer.balanceDue);
  if (due.greaterThan(0)) {
    throw new Error(
      `Cannot delete customer with pending dues of ${due.formatIndian(true)}. Please settle or write off dues first.`
    );
  }

  // Check active bookings
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
