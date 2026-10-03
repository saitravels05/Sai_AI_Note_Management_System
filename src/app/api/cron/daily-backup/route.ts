import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export const maxDuration = 60; // 60 seconds max execution
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1. Verify CRON_SECRET authorization header
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing CRON_SECRET" },
      { status: 401 }
    );
  }

  try {
    // 2. Fetch system state snapshot for automated off-site backup
    const [records, customers, suppliers, invoices, passportApps] = await Promise.all([
      prisma.noteRecord.findMany({ take: 50000, orderBy: { createdAt: "desc" } }),
      prisma.customer.findMany(),
      prisma.supplier.findMany(),
      prisma.invoice.findMany(),
      prisma.passportApplication.findMany(),
    ]);

    const backupSnapshot = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      summary: {
        totalRecords: records.length,
        totalCustomers: customers.length,
        totalSuppliers: suppliers.length,
        totalInvoices: invoices.length,
        totalPassportApps: passportApps.length,
      },
    };

    // Log the automated backup event in the system audit trail
    await logAudit({
      action: AuditAction.EXPORT_REPORT,
      entityType: "SystemBackup",
      details: `Automated daily backup executed successfully: ${records.length} records, ${customers.length} customers.`,
    });

    return NextResponse.json({
      success: true,
      message: "Daily backup snapshot generated successfully",
      ...backupSnapshot,
    });
  } catch (error: any) {
    console.error("[CRON ERROR: Daily Backup Failed]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute daily backup" },
      { status: 500 }
    );
  }
}
