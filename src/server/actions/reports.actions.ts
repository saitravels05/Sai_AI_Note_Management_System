"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { Money } from "@/lib/money";
import { sanitizeRowForExport } from "@/lib/security/sanitize";
import { generateReportPdf } from "@/lib/pdf/report-pdf";
import * as XLSX from "xlsx";
import { AuditAction, RecordType, Role } from "@prisma/client";

export type ExportFormat = "xlsx" | "csv" | "pdf";
export type ReportType =
  | "month_summary"
  | "profit_loss"
  | "day_book"
  | "customer_dues"
  | "gst_summary";

export async function exportReportAction(
  reportType: ReportType,
  format: ExportFormat,
  year: number,
  month: number
): Promise<{ fileName: string; base64Data: string; mimeType: string }> {
  const session = await getSession();
  if (!session || session.role === Role.VISITOR) {
    throw new Error("Unauthorized: Financial exports require Staff or higher privilege.");
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const periodLabel = `${year}-${month.toString().padStart(2, "0")}`;

  const records = await prisma.noteRecord.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      isVoid: false,
    },
    include: {
      customer: true,
      supplier: true,
      createdBy: true,
    },
    orderBy: { date: "asc" },
  });

  const business = await prisma.businessProfile.findFirst();
  const businessName = business?.name || "Sai Tours and Travels";

  let sheetData: any[] = [];
  let sheetName = "Report";

  if (reportType === "day_book" || reportType === "month_summary") {
    sheetName = "DayBook";
    sheetData = records.map((r) => ({
      "Record #": r.recordNumber,
      Date: r.date.toISOString().split("T")[0],
      Title: r.title,
      Type: r.type,
      Category: r.category,
      "Amount (₹)": Money.from(r.amount).toNumber(),
      "Paid (₹)": Money.from(r.amountPaid).toNumber(),
      "Balance Due (₹)": Money.from(r.balanceDue).toNumber(),
      "Payment Mode": r.paymentMode,
      Customer: r.customer?.name || "",
      CreatedBy: r.createdBy.name,
      Notes: r.notes || "",
    }));
  } else if (reportType === "profit_loss") {
    sheetName = "ProfitAndLoss";
    const incomeRecords = records.filter((r) => r.type === RecordType.INCOME);
    const expenseRecords = records.filter((r) => r.type === RecordType.EXPENSE);

    const totalIncome = incomeRecords.reduce((sum, r) => sum.add(r.amount), Money.zero());
    const totalExpense = expenseRecords.reduce((sum, r) => sum.add(r.amount), Money.zero());
    const netProfit = totalIncome.sub(totalExpense);

    sheetData = [
      { Metric: "Total Money Received (Income)", "Amount (₹)": totalIncome.toNumber() },
      { Metric: "Total Money Spent (Expense)", "Amount (₹)": totalExpense.toNumber() },
      { Metric: "Net Profit / Balance", "Amount (₹)": netProfit.toNumber() },
      {},
      { Metric: "--- Inflow Breakdown by Category ---", "Amount (₹)": "" },
    ];

    const catSums: Record<string, Money> = {};
    for (const r of incomeRecords) {
      catSums[r.category] = (catSums[r.category] || Money.zero()).add(r.amount);
    }
    for (const [cat, val] of Object.entries(catSums)) {
      sheetData.push({ Metric: `Inflow: ${cat}`, "Amount (₹)": val.toNumber() });
    }
  } else if (reportType === "customer_dues") {
    sheetName = "CustomerDues";
    const unpaidRecords = records.filter((r) => Money.from(r.balanceDue).greaterThan(0));
    sheetData = unpaidRecords.map((r) => ({
      "Record #": r.recordNumber,
      Date: r.date.toISOString().split("T")[0],
      Customer: r.customer?.name || "Unknown",
      Phone: r.customer?.phone || "",
      Title: r.title,
      "Total (₹)": Money.from(r.amount).toNumber(),
      "Paid (₹)": Money.from(r.amountPaid).toNumber(),
      "Due Balance (₹)": Money.from(r.balanceDue).toNumber(),
      Status: r.paymentStatus,
    }));
  } else if (reportType === "gst_summary") {
    sheetName = "GSTSummary";
    const gstRecords = records.filter((r) => Money.from(r.gstAmount).greaterThan(0));
    sheetData = gstRecords.map((r) => ({
      "Record #": r.recordNumber,
      Date: r.date.toISOString().split("T")[0],
      Title: r.title,
      Type: r.type,
      "Base Amount (₹)": Money.from(r.amount).toNumber(),
      "GST Rate (%)": Money.from(r.gstRate).toNumber(),
      "GST Amount (₹)": Money.from(r.gstAmount).toNumber(),
      Customer: r.customer?.name || "",
    }));
  }

  // 1. Defend against CSV/Formula Injection (CWE-1236)
  const safeSheetData = sheetData.length > 0 ? sheetData : [{ Note: "No records found for this period" }];
  const sanitizedSheetData = safeSheetData.map((row) => sanitizeRowForExport(row));

  // 2. Audit report export action
  await logAudit({
    userId: session.id,
    action: AuditAction.EXPORT_REPORT,
    entityType: "FinancialReport",
    details: `Exported ${reportType.toUpperCase()} in ${format.toUpperCase()} format for period ${periodLabel}`,
  });

  const safeFileName = `${businessName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${reportType}_${periodLabel}.${format}`;

  // Handle PDF Export
  if (format === "pdf") {
    const incomeRecords = records.filter((r) => r.type === RecordType.INCOME);
    const expenseRecords = records.filter((r) => r.type === RecordType.EXPENSE);
    const totalIncome = incomeRecords.reduce((sum, r) => sum.add(r.amount), Money.zero());
    const totalExpense = expenseRecords.reduce((sum, r) => sum.add(r.amount), Money.zero());
    const netProfit = totalIncome.sub(totalExpense);
    const totalDues = records.reduce((sum, r) => sum.add(r.balanceDue), Money.zero());

    const headers = sanitizedSheetData.length > 0 ? Object.keys(sanitizedSheetData[0]) : ["Status"];
    const rows = sanitizedSheetData.map((row) => Object.values(row) as (string | number)[]);

    const pdfBuffer = await generateReportPdf({
      businessName,
      businessAddress: business?.address || undefined,
      businessGstin: business?.gstin || undefined,
      reportTitle: `${reportType.replace(/_/g, " ").toUpperCase()} REPORT`,
      periodLabel,
      summaryMetrics: {
        totalIncome: totalIncome.formatIndian(true),
        totalExpense: totalExpense.formatIndian(true),
        netProfit: netProfit.formatIndian(true),
        totalDues: totalDues.formatIndian(true),
      },
      headers,
      rows,
    });

    return {
      fileName: safeFileName,
      base64Data: pdfBuffer.toString("base64"),
      mimeType: "application/pdf",
    };
  }

  // Handle CSV / XLSX Export
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sanitizedSheetData);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  if (format === "csv") {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const base64Data = Buffer.from(csvContent, "utf8").toString("base64");
    return {
      fileName: safeFileName,
      base64Data,
      mimeType: "text/csv",
    };
  }

  // XLSX format
  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const base64Data = Buffer.from(xlsxBuffer).toString("base64");

  return {
    fileName: safeFileName,
    base64Data,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
