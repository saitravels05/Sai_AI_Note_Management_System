"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Money } from "@/lib/money";
import { generateUniqueRecordNumber } from "@/lib/record-number";
import { AuditAction, PassportAppStatus, PaymentMode, RecordType, Role, ServiceCategory } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getPassportApplicationsAction() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const apps = await prisma.passportApplication.findMany({
    orderBy: { createdAt: "desc" },
  });

  return apps.map((a) => ({
    id: a.id,
    applicantName: a.applicantName,
    phone: a.phone,
    email: a.email,
    serviceType: a.serviceType,
    arnNumber: a.arnNumber,
    appointmentDate: a.appointmentDate?.toISOString() || null,
    pskLocation: a.pskLocation,
    status: a.status,
    checklistItems: a.checklistItems,
    documentsCollected: a.documentsCollected,
    governmentFee: a.governmentFee.toString(),
    serviceCharge: a.serviceCharge.toString(),
    totalCharge: a.totalCharge.toString(),
    amountPaid: a.amountPaid.toString(),
    balanceDue: a.balanceDue.toString(),
    notes: a.notes,
  }));
}

export async function createPassportApplicationAction(data: {
  applicantName: string;
  phone: string;
  email?: string;
  serviceType: string;
  arnNumber?: string;
  appointmentDate?: string;
  pskLocation?: string;
  governmentFee?: number | string;
  serviceCharge?: number | string;
  amountPaid?: number | string;
  paymentMode?: PaymentMode;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  const govFee = Money.from(data.governmentFee ?? 1500);
  const serviceCharge = Money.from(data.serviceCharge ?? 1000);
  const total = govFee.add(serviceCharge);
  const paid = Money.from(data.amountPaid ?? 0);
  const due = total.sub(paid);

  const app = await prisma.passportApplication.create({
    data: {
      applicantName: data.applicantName.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim().toLowerCase(),
      serviceType: data.serviceType,
      arnNumber: data.arnNumber?.trim(),
      appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : null,
      pskLocation: data.pskLocation || "Madurai PSK",
      status: PassportAppStatus.DOCS_COLLECTING,
      governmentFee: govFee.toDecimal(),
      serviceCharge: serviceCharge.toDecimal(),
      totalCharge: total.toDecimal(),
      amountPaid: paid.toDecimal(),
      balanceDue: due.toDecimal(),
      notes: data.notes?.trim(),
    },
  });

  // If initial payment was made, generate an Income note card
  if (paid.isPositive()) {
    const recordNumber = await generateUniqueRecordNumber();

    await prisma.noteRecord.create({
      data: {
        recordNumber,
        title: `${app.applicantName} – ${app.serviceType} Passport advance`,
        notes: `ARN: ${app.arnNumber || "Pending"}. PSK: ${app.pskLocation}`,
        type: RecordType.INCOME,
        category: ServiceCategory.PASSPORT_SERVICE,
        amount: total.toDecimal(),
        amountPaid: paid.toDecimal(),
        balanceDue: due.toDecimal(),
        paymentMode: data.paymentMode || PaymentMode.UPI,
        createdById: session.id,
      },
    });
  }

  revalidatePath("/passport-visa");
  revalidatePath("/");
  return { success: true, app };
}

export async function updatePassportStatusAction(id: string, status: PassportAppStatus) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  const updated = await prisma.passportApplication.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/passport-visa");
  return { success: true, app: updated };
}

export async function toggleChecklistItemAction(id: string, item: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  const app = await prisma.passportApplication.findUnique({ where: { id } });
  if (!app) throw new Error("Application not found");

  const isCollected = app.documentsCollected.includes(item);
  const updatedDocs = isCollected
    ? app.documentsCollected.filter((d) => d !== item)
    : [...app.documentsCollected, item];

  const updated = await prisma.passportApplication.update({
    where: { id },
    data: { documentsCollected: updatedDocs },
  });

  revalidatePath("/passport-visa");
  return { success: true, app: updated };
}
