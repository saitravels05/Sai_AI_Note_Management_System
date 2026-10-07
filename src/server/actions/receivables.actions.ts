"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Money } from "@/lib/money";
import { generateUniqueRecordNumber } from "@/lib/record-number";
import { PaymentMode, RecordType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface ReceivableItem {
  id: string;
  sourceType: "record" | "invoice";
  number: string;
  title: string;
  customerName: string;
  customerPhone?: string | null;
  date: string;
  ageDays: number;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  bucket: "0_30" | "31_60" | "61_90" | "90_plus";
  whatsappLinkEn: string;
  whatsappLinkTa: string;
}

export interface ReceivablesAgingSummary {
  totalReceivable: string;
  totalAccountsCount: number;
  bucket0to30: string;
  bucket31to60: string;
  bucket61to90: string;
  bucket90Plus: string;
  items: ReceivableItem[];
}

export async function getReceivablesAgingAction(): Promise<ReceivablesAgingSummary> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const business = await prisma.businessProfile.findFirst();
  const businessName = business?.name || "Sai Tours and Travels";
  const upiId = "saipassportmdu@okaxis"; // Default Madurai PSK branch UPI

  const records = await prisma.noteRecord.findMany({
    where: {
      isVoid: false,
      balanceDue: { gt: 0 },
    },
    include: {
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { date: "asc" },
  });

  const now = new Date();
  let totalReceivable = Money.zero();
  let b0to30 = Money.zero();
  let b31to60 = Money.zero();
  let b61to90 = Money.zero();
  let b90Plus = Money.zero();

  const items: ReceivableItem[] = [];

  for (const r of records) {
    const due = Money.from(r.balanceDue);
    if (!due.greaterThan(0)) continue;

    totalReceivable = totalReceivable.add(due);
    const recDate = new Date(r.date);
    const diffTime = Math.abs(now.getTime() - recDate.getTime());
    const ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let bucket: "0_30" | "31_60" | "61_90" | "90_plus" = "0_30";
    if (ageDays <= 30) {
      bucket = "0_30";
      b0to30 = b0to30.add(due);
    } else if (ageDays <= 60) {
      bucket = "31_60";
      b31to60 = b31to60.add(due);
    } else if (ageDays <= 90) {
      bucket = "61_90";
      b61to90 = b61to90.add(due);
    } else {
      bucket = "90_plus";
      b90Plus = b90Plus.add(due);
    }

    const cName = r.customer?.name || "Customer";
    const phone = r.customer?.phone?.replace(/\D/g, "") || "";
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;

    // Bilingual courteous WhatsApp reminder templates
    const dueFormatted = due.formatIndian(true);
    const msgEn = `Vanakkam ${cName}, this is a gentle reminder from ${businessName} regarding your booking "${r.title}". Pending due balance is ${dueFormatted}. You can pay via UPI: ${upiId} or Google Pay/PhonePe. Thank you!`;
    const msgTa = `வணக்கம் ${cName}, ${businessName}-ல் இருந்து உங்கள் முன்பதிவு "${r.title}"-க்கான நிலுவைத்தொகை ${dueFormatted} உள்ளது. UPI: ${upiId} மூலம் செலுத்தலாம். நன்றி!`;

    const whatsappLinkEn = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgEn)}`
      : "";
    const whatsappLinkTa = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgTa)}`
      : "";

    items.push({
      id: r.id,
      sourceType: "record",
      number: r.recordNumber,
      title: r.title,
      customerName: cName,
      customerPhone: r.customer?.phone,
      date: recDate.toISOString().split("T")[0],
      ageDays,
      totalAmount: Money.from(r.amount).formatIndian(true),
      amountPaid: Money.from(r.amountPaid).formatIndian(true),
      balanceDue: dueFormatted,
      bucket,
      whatsappLinkEn,
      whatsappLinkTa,
    });
  }

  return {
    totalReceivable: totalReceivable.formatIndian(true),
    totalAccountsCount: items.length,
    bucket0to30: b0to30.formatIndian(true),
    bucket31to60: b31to60.formatIndian(true),
    bucket61to90: b61to90.formatIndian(true),
    bucket90Plus: b90Plus.formatIndian(true),
    items,
  };
}

export async function settleReceivablePaymentAction(data: {
  recordId: string;
  amountReceived: number | string;
  paymentMode: PaymentMode;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  const payingAmt = Money.from(data.amountReceived);
  if (!payingAmt.isPositive()) {
    throw new Error("Settlement amount must be a positive number.");
  }

  const record = await prisma.noteRecord.findUnique({
    where: { id: data.recordId },
    include: { customer: true },
  });

  if (!record) throw new Error("Record not found");

  const currentPaid = Money.from(record.amountPaid);
  const currentTotal = Money.from(record.amount);

  const newPaid = currentPaid.add(payingAmt);
  const newDue = currentTotal.sub(newPaid);
  const isFullySettled = !newDue.greaterThan(0);

  // Update record
  await prisma.noteRecord.update({
    where: { id: record.id },
    data: {
      amountPaid: newPaid.toDecimal(),
      balanceDue: isFullySettled ? Money.zero().toDecimal() : newDue.toDecimal(),
      paymentStatus: isFullySettled ? "COMPLETED" : "PARTIAL",
      notes: `${record.notes || ""}\n[Settlement on ${new Date().toLocaleDateString("en-IN")}: Received ₹${payingAmt.toNumber()} via ${data.paymentMode}. Notes: ${data.notes || "None"}]`.trim(),
    },
  });

  // If customer linked, update customer balance
  if (record.customerId && record.customer) {
    const custPaid = Money.from(record.customer.totalPaid).add(payingAmt);
    const custDue = Money.from(record.customer.balanceDue).sub(payingAmt);
    await prisma.customer.update({
      where: { id: record.customerId },
      data: {
        totalPaid: custPaid.toDecimal(),
        balanceDue: custDue.isNegative() ? Money.zero().toDecimal() : custDue.toDecimal(),
      },
    });
  }

  // Create an income entry note for this received settlement
  const recordNumber = await generateUniqueRecordNumber();

  await prisma.noteRecord.create({
    data: {
      recordNumber,
      title: `Payment Received from ${record.customer?.name || "Customer"} (${record.title})`,
      notes: data.notes || `Settlement towards card #${record.recordNumber}`,
      type: RecordType.INCOME,
      category: record.category,
      amount: payingAmt.toDecimal(),
      amountPaid: payingAmt.toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: data.paymentMode,
      paymentStatus: "COMPLETED",
      customerId: record.customerId,
      createdById: session.id,
    },
  });

  revalidatePath("/receivables");
  revalidatePath("/records");
  revalidatePath("/customers");
  revalidatePath("/");

  return { success: true };
}
