"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { Money } from "@/lib/money";
import { parseFlexibleDate } from "@/lib/date";
import { generateUniqueRecordNumbers } from "@/lib/record-number";
import { sanitizeForSpreadsheet } from "@/lib/security/sanitize";
import * as XLSX from "xlsx";
import { AuditAction, PaymentMode, RecordType, Role, ServiceCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

const MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const MAX_IMPORT_ROWS = 1000;

export interface PreviewSpreadsheetResult {
  headers: string[];
  sampleRows: Record<string, any>[];
  totalRows: number;
}

export interface ColumnMapping {
  dateCol?: string;
  titleCol?: string;
  amountCol?: string;
  typeCol?: string;
  categoryCol?: string;
  paymentModeCol?: string;
  customerCol?: string;
  notesCol?: string;
}

export async function previewSpreadsheetAction(base64Data: string): Promise<PreviewSpreadsheetResult> {
  const session = await getSession();
  if (!session || session.role === Role.VISITOR) {
    throw new Error("Unauthorized: Spreadsheet upload requires Staff or higher privilege.");
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length > MAX_IMPORT_SIZE_BYTES) {
    throw new Error("File exceeds maximum allowed size limit of 5MB.");
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Invalid spreadsheet: No worksheets found.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (rawJson.length === 0) {
    return { headers: [], sampleRows: [], totalRows: 0 };
  }

  const headers = Object.keys(rawJson[0]);
  const sampleRows = rawJson.slice(0, 5);

  return {
    headers,
    sampleRows,
    totalRows: rawJson.length,
  };
}

export async function executeImportAction(
  base64Data: string,
  fileName: string,
  mapping: ColumnMapping
): Promise<{ success: boolean; importedCount: number; errors: string[]; batchId?: string }> {
  const session = await getSession();
  if (!session || session.role === Role.VISITOR) {
    throw new Error("Unauthorized: Spreadsheet imports require Staff or higher privilege.");
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length > MAX_IMPORT_SIZE_BYTES) {
    throw new Error("File exceeds maximum allowed size limit of 5MB.");
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Import exceeds maximum allowed limit of ${MAX_IMPORT_ROWS} rows per batch.`);
  }

  const errors: string[] = [];
  const validRecordsData: any[] = [];

  const currentYear = new Date().getFullYear();
  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNum = idx + 2; // 1-based, plus header

    const rawTitle = mapping.titleCol ? String(row[mapping.titleCol] || "").trim() : "";
    const rawAmount = mapping.amountCol ? row[mapping.amountCol] : "";
    const rawDate = mapping.dateCol ? row[mapping.dateCol] : "";

    if (!rawTitle) {
      errors.push(`Row ${rowNum}: Missing title / description.`);
      continue;
    }

    const moneyObj = Money.from(rawAmount);
    if (!moneyObj.isPositive()) {
      errors.push(`Row ${rowNum}: Invalid amount "${rawAmount}".`);
      continue;
    }

    const parsedDate = parseFlexibleDate(rawDate);

    let type: RecordType = RecordType.INCOME;
    if (mapping.typeCol) {
      const rawType = String(row[mapping.typeCol] || "").toUpperCase();
      if (rawType.includes("EXPENSE") || rawType.includes("SPENT") || rawType.includes("DEBIT")) {
        type = RecordType.EXPENSE;
      }
    }

    let category: ServiceCategory = ServiceCategory.OTHER;
    if (mapping.categoryCol) {
      const rawCat = String(row[mapping.categoryCol] || "").toUpperCase().replace(/\s+/g, "_");
      if (Object.values(ServiceCategory).includes(rawCat as ServiceCategory)) {
        category = rawCat as ServiceCategory;
      }
    }

    let paymentMode: PaymentMode = PaymentMode.CASH;
    if (mapping.paymentModeCol) {
      const rawMode = String(row[mapping.paymentModeCol] || "").toUpperCase();
      if (rawMode.includes("UPI") || rawMode.includes("GPAY") || rawMode.includes("PHONEPE")) paymentMode = PaymentMode.UPI;
      else if (rawMode.includes("BANK") || rawMode.includes("NEFT") || rawMode.includes("IMPS")) paymentMode = PaymentMode.BANK_TRANSFER;
      else if (rawMode.includes("CARD")) paymentMode = PaymentMode.CARD;
    }

    const customerName = mapping.customerCol ? String(row[mapping.customerCol] || "").trim() : "";
    const notes = mapping.notesCol ? String(row[mapping.notesCol] || "").trim() : "";

    validRecordsData.push({
      title: sanitizeForSpreadsheet(rawTitle.slice(0, 200)),
      notes: notes ? sanitizeForSpreadsheet(notes.slice(0, 500)) : undefined,
      type,
      category,
      amount: moneyObj.toDecimal(),
      amountPaid: moneyObj.toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode,
      date: parsedDate,
      customerName: customerName ? sanitizeForSpreadsheet(customerName.slice(0, 100)) : undefined,
    });
  }

  if (validRecordsData.length === 0) {
    return {
      success: false,
      importedCount: 0,
      errors: errors.length > 0 ? errors : ["No valid rows found to import."],
    };
  }

  // Generate batch of collision-free sequential record numbers
  const recordNumbers = await generateUniqueRecordNumbers(validRecordsData.length);
  for (let i = 0; i < validRecordsData.length; i++) {
    validRecordsData[i].recordNumber = recordNumbers[i];
  }

  // Create import batch record
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const batch = await prisma.importBatch.create({
    data: {
      fileName: safeFileName,
      totalRows: rawRows.length,
      importedRows: validRecordsData.length,
      failedRows: errors.length,
      createdById: session.id,
    },
  });

  // Insert valid records in a transaction
  for (const item of validRecordsData) {
    let customerId: string | undefined = undefined;
    if (item.customerName) {
      let cust = await prisma.customer.findFirst({
        where: { name: { equals: item.customerName, mode: "insensitive" } },
      });
      if (!cust) {
        cust = await prisma.customer.create({
          data: {
            name: item.customerName,
            totalBilled: item.amount,
            totalPaid: item.amountPaid,
          },
        });
      }
      customerId = cust.id;
    }

    await prisma.noteRecord.create({
      data: {
        recordNumber: item.recordNumber,
        title: item.title,
        notes: item.notes,
        type: item.type,
        category: item.category,
        amount: item.amount,
        amountPaid: item.amountPaid,
        balanceDue: item.balanceDue,
        paymentMode: item.paymentMode,
        date: item.date,
        customerId,
        createdById: session.id,
        importBatchId: batch.id,
      },
    });
  }

  await logAudit({
    userId: session.id,
    action: AuditAction.IMPORT_EXCEL,
    entityType: "ImportBatch",
    entityId: batch.id,
    details: `Imported ${validRecordsData.length} records from ${safeFileName} (Batch ID: ${batch.id})`,
  });

  revalidatePath("/");
  revalidatePath("/records");

  return {
    success: true,
    importedCount: validRecordsData.length,
    errors,
    batchId: batch.id,
  };
}

export async function undoImportAction(batchId: string): Promise<{ success: boolean; deletedCount: number }> {
  const session = await getSession();
  if (!session || session.role === Role.VISITOR) {
    throw new Error("Unauthorized.");
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch || batch.isUndone) {
    throw new Error("Batch not found or already undone.");
  }

  // Delete all records in batch
  const deleteResult = await prisma.noteRecord.deleteMany({
    where: { importBatchId: batchId },
  });

  // Mark batch as undone
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { isUndone: true },
  });

  await logAudit({
    userId: session.id,
    action: AuditAction.UNDO_IMPORT,
    entityType: "ImportBatch",
    entityId: batch.id,
    details: `Undid import batch ${batch.fileName}. Removed ${deleteResult.count} records.`,
  });

  revalidatePath("/");
  revalidatePath("/records");

  return {
    success: true,
    deletedCount: deleteResult.count,
  };
}
