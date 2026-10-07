"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Money } from "@/lib/money";
import { AuditAction, InvoiceStatus, Role, ServiceCategory } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export interface CreateInvoiceInput {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGstin?: string;
  customerAddress?: string;
  serviceType: ServiceCategory;
  description: string;
  pnrOrDetails?: string;
  baseAmount: number | string;
  gstRate?: number; // e.g. 5 or 18
  isInterstate?: boolean; // IGST vs CGST+SGST
  amountPaid?: number | string;
  paymentTerms?: string;
  notes?: string;
}

export async function createInvoiceAction(input: CreateInvoiceInput) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.role === Role.VISITOR) {
    throw new Error("Permission Denied: Visitors have read-only access.");
  }

  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  const invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(4, "0")}`;

  const base = Money.from(input.baseAmount);
  const gstRate = input.gstRate ?? 5; // Default 5% for tour operator services
  const totalGst = base.mul(gstRate / 100);

  let cgst = Money.zero();
  let sgst = Money.zero();
  let igst = Money.zero();

  if (input.isInterstate) {
    igst = totalGst;
  } else {
    cgst = totalGst.div(2);
    sgst = totalGst.div(2);
  }

  const total = base.add(totalGst);
  const paid = Money.from(input.amountPaid ?? 0);
  const due = total.sub(paid);

  const status = due.isZero() ? InvoiceStatus.PAID : InvoiceStatus.ISSUED;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerGstin: input.customerGstin,
      customerAddress: input.customerAddress,
      serviceType: input.serviceType,
      description: input.description,
      pnrOrDetails: input.pnrOrDetails,
      baseAmount: base.toDecimal(),
      cgstAmount: cgst.toDecimal(),
      sgstAmount: sgst.toDecimal(),
      igstAmount: igst.toDecimal(),
      totalAmount: total.toDecimal(),
      amountPaid: paid.toDecimal(),
      balanceDue: due.toDecimal(),
      status,
      notes: input.notes,
      paymentTerms: input.paymentTerms || "Immediate settlement upon voucher issuance.",
    },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.CREATE_RECORD,
    entityType: "Invoice",
    entityId: invoice.id,
    details: `Generated GST Tax Invoice #${invoiceNumber} for ${invoice.customerName} (₹${total.toNumber()})`,
  });

  revalidatePath("/invoices");
  return { success: true, invoice };
}

export async function getInvoicesAction() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date.toISOString(),
    customerName: inv.customerName,
    customerPhone: inv.customerPhone,
    serviceType: inv.serviceType,
    description: inv.description,
    pnrOrDetails: inv.pnrOrDetails,
    baseAmount: inv.baseAmount.toString(),
    cgstAmount: inv.cgstAmount.toString(),
    sgstAmount: inv.sgstAmount.toString(),
    igstAmount: inv.igstAmount.toString(),
    totalAmount: inv.totalAmount.toString(),
    amountPaid: inv.amountPaid.toString(),
    balanceDue: inv.balanceDue.toString(),
    status: inv.status,
  }));
}
