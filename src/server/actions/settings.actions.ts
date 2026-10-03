"use server";

import { prisma } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { AuditAction, Role, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getSettingsDataAction() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const business = await prisma.businessProfile.findFirst();
  const branches = await prisma.branch.findMany({ orderBy: { isMain: "desc" } });

  return {
    business: business
      ? {
          id: business.id,
          name: business.name,
          legalName: business.legalName,
          gstin: business.gstin || "",
          address: business.address || "",
          phone: business.phone || "",
          email: business.email || "",
          currencySymbol: business.currencySymbol,
          defaultGstRate: business.defaultGstRate.toString(),
          aiEnabled: business.aiEnabled,
        }
      : null,
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      city: b.city,
      phone: b.phone || "",
      address: b.address || "",
      isMain: b.isMain,
    })),
  };
}

export async function updateBusinessProfileAction(data: {
  name: string;
  legalName?: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
  defaultGstRate?: number | string;
}) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Only Admin or Owner can update business configuration.");
  }

  const existing = await prisma.businessProfile.findFirst();
  if (existing) {
    await prisma.businessProfile.update({
      where: { id: existing.id },
      data: {
        name: data.name.trim(),
        legalName: data.legalName?.trim() || data.name.trim(),
        gstin: data.gstin?.trim(),
        address: data.address?.trim(),
        phone: data.phone?.trim(),
        email: data.email?.trim().toLowerCase(),
        defaultGstRate: data.defaultGstRate ? Number(data.defaultGstRate) : 5.0,
      },
    });
  } else {
    await prisma.businessProfile.create({
      data: {
        name: data.name.trim(),
        legalName: data.legalName?.trim() || data.name.trim(),
        gstin: data.gstin?.trim(),
        address: data.address?.trim(),
        phone: data.phone?.trim(),
        email: data.email?.trim().toLowerCase(),
        defaultGstRate: data.defaultGstRate ? Number(data.defaultGstRate) : 5.0,
      },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function createBranchAction(data: {
  name: string;
  code: string;
  city: string;
  phone?: string;
  address?: string;
  isMain?: boolean;
}) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Only Admin or Owner can add new branches.");
  }

  const branch = await prisma.branch.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      city: data.city.trim(),
      phone: data.phone?.trim(),
      address: data.address?.trim(),
      isMain: data.isMain ?? false,
    },
  });

  revalidatePath("/settings");
  return { success: true, branch };
}

export async function createDatabaseBackupAction(): Promise<{
  fileName: string;
  jsonContent: string;
}> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, Role.OWNER)) {
    throw new Error("Security Alert: Only Business Owner can export full database snapshots.");
  }

  const [business, branches, records, customers, suppliers, invoices, passportApps] =
    await Promise.all([
      prisma.businessProfile.findFirst(),
      prisma.branch.findMany(),
      prisma.noteRecord.findMany({ where: { isVoid: false } }),
      prisma.customer.findMany(),
      prisma.supplier.findMany(),
      prisma.invoice.findMany(),
      prisma.passportApplication.findMany(),
    ]);

  const backupPayload = {
    exportedAt: new Date().toISOString(),
    exportedBy: session.email,
    business,
    branches,
    statistics: {
      recordsCount: records.length,
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      invoicesCount: invoices.length,
      passportAppsCount: passportApps.length,
    },
    customers,
    suppliers,
    invoices,
    passportApplications: passportApps,
    records,
  };

  const jsonContent = JSON.stringify(backupPayload, null, 2);
  const dateStr = new Date().toISOString().split("T")[0];
  const fileName = `Sai_Books_Backup_${dateStr}.json`;

  return { fileName, jsonContent };
}

export async function restoreDatabaseBackupAction(jsonString: string): Promise<{
  success: boolean;
  restoredRecords: number;
  restoredCustomers: number;
  restoredSuppliers: number;
  restoredInvoices: number;
}> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, Role.OWNER)) {
    throw new Error("Security Alert: Only the Business Owner can restore database backups.");
  }

  let payload: any;
  try {
    payload = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid backup file: Not a valid JSON document.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid backup structure: Empty or corrupted payload.");
  }

  let restoredCustomers = 0;
  let restoredSuppliers = 0;
  let restoredInvoices = 0;
  let restoredRecords = 0;

  // 1. Restore Customers
  if (Array.isArray(payload.customers)) {
    for (const c of payload.customers) {
      if (!c.name) continue;
      await prisma.customer.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          notes: c.notes,
          encryptedPassport: c.encryptedPassport,
          encryptedAadhaar: c.encryptedAadhaar,
          totalBilled: c.totalBilled,
          totalPaid: c.totalPaid,
          balanceDue: c.balanceDue,
        },
        create: {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          notes: c.notes,
          encryptedPassport: c.encryptedPassport,
          encryptedAadhaar: c.encryptedAadhaar,
          totalBilled: c.totalBilled,
          totalPaid: c.totalPaid,
          balanceDue: c.balanceDue,
        },
      });
      restoredCustomers++;
    }
  }

  // 2. Restore Suppliers
  if (Array.isArray(payload.suppliers)) {
    for (const s of payload.suppliers) {
      if (!s.name) continue;
      await prisma.supplier.upsert({
        where: { id: s.id },
        update: {
          name: s.name,
          phone: s.phone,
          email: s.email,
          category: s.category,
          gstin: s.gstin,
          bankDetails: s.bankDetails,
          totalBilled: s.totalBilled,
          totalPaid: s.totalPaid,
          balanceDue: s.balanceDue,
        },
        create: {
          id: s.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
          category: s.category,
          gstin: s.gstin,
          bankDetails: s.bankDetails,
          totalBilled: s.totalBilled,
          totalPaid: s.totalPaid,
          balanceDue: s.balanceDue,
        },
      });
      restoredSuppliers++;
    }
  }

  // 3. Restore Invoices
  if (Array.isArray(payload.invoices)) {
    for (const inv of payload.invoices) {
      if (!inv.invoiceNumber) continue;
      await prisma.invoice.upsert({
        where: { id: inv.id },
        update: {
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          baseAmount: inv.baseAmount,
          totalAmount: inv.totalAmount,
          amountPaid: inv.amountPaid,
          balanceDue: inv.balanceDue,
          status: inv.status,
          serviceType: inv.serviceType,
          description: inv.description,
        },
        create: {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          baseAmount: inv.baseAmount,
          totalAmount: inv.totalAmount,
          amountPaid: inv.amountPaid,
          balanceDue: inv.balanceDue,
          status: inv.status,
          serviceType: inv.serviceType,
          description: inv.description,
        },
      });
      restoredInvoices++;
    }
  }

  // 4. Restore Note Records
  if (Array.isArray(payload.records)) {
    for (const r of payload.records) {
      if (!r.recordNumber || !r.title) continue;
      await prisma.noteRecord.upsert({
        where: { id: r.id },
        update: {
          recordNumber: r.recordNumber,
          title: r.title,
          notes: r.notes,
          type: r.type,
          category: r.category,
          amount: r.amount,
          amountPaid: r.amountPaid,
          balanceDue: r.balanceDue,
          paymentMode: r.paymentMode,
          paymentStatus: r.paymentStatus,
          date: new Date(r.date),
          isVoid: r.isVoid ?? false,
          customerId: r.customerId,
          supplierId: r.supplierId,
          createdById: r.createdById || session.id,
        },
        create: {
          id: r.id,
          recordNumber: r.recordNumber,
          title: r.title,
          notes: r.notes,
          type: r.type,
          category: r.category,
          amount: r.amount,
          amountPaid: r.amountPaid,
          balanceDue: r.balanceDue,
          paymentMode: r.paymentMode,
          paymentStatus: r.paymentStatus,
          date: new Date(r.date),
          isVoid: r.isVoid ?? false,
          customerId: r.customerId,
          supplierId: r.supplierId,
          createdById: r.createdById || session.id,
        },
      });
      restoredRecords++;
    }
  }

  await logAudit({
    userId: session.id,
    action: AuditAction.UPDATE_RECORD,
    entityType: "DatabaseBackup",
    details: `RESTORE EXECUTED by ${session.email}: Restored ${restoredRecords} records, ${restoredCustomers} customers, ${restoredSuppliers} suppliers, ${restoredInvoices} invoices.`,
  });

  revalidatePath("/");
  revalidatePath("/records");
  revalidatePath("/customers");
  revalidatePath("/suppliers");
  revalidatePath("/invoices");

  return {
    success: true,
    restoredRecords,
    restoredCustomers,
    restoredSuppliers,
    restoredInvoices,
  };
}

export async function getUsersManagementAction() {
  const session = await getSession();
  if (!session || !hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Only Admin or Owner can access user management.");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString().split("T")[0],
  }));
}

export async function updateUserStatusAction(userId: string, status: UserStatus) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, Role.ADMIN)) {
    throw new Error("Only Admin or Owner can approve or suspend users.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  revalidatePath("/users");
  return { success: true, user: updated };
}

export async function updateUserRoleAction(userId: string, role: Role) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, Role.OWNER)) {
    throw new Error("Security Alert: Only Business Owner can modify user roles.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/users");
  return { success: true, user: updated };
}
