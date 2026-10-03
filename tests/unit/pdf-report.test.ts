import test from "node:test";
import assert from "node:assert";
import { generateReportPdf } from "../../src/lib/pdf/report-pdf";

test("PDF Report Generator: Creates Valid Financial Report Buffer", async () => {
  const pdfBuffer = await generateReportPdf({
    businessName: "Sai Tours and Travels",
    businessAddress: "Madurai PSK Road, Madurai, Tamil Nadu",
    businessGstin: "33AAACS1234F1Z5",
    reportTitle: "PROFIT & LOSS STATEMENT",
    periodLabel: "2026-09",
    summaryMetrics: {
      totalIncome: "₹1,50,000",
      totalExpense: "₹75,000",
      netProfit: "₹75,000",
      totalDues: "₹15,000",
    },
    headers: ["Date", "Description", "Category", "Amount", "Mode"],
    rows: [
      ["2026-09-01", "Kumar - Chennai flight ticket", "FLIGHT_TICKET", "₹5,000", "UPI"],
      ["2026-09-02", "Madurai to Tirupati Tour Package", "TOUR_PACKAGE", "₹25,000", "BANK_TRANSFER"],
      ["2026-09-03", "Office Electricity & Tea Expense", "OFFICE_EXPENSE", "₹1,200", "CASH"],
    ],
  });

  assert.strictEqual(Buffer.isBuffer(pdfBuffer), true);
  assert.strictEqual(pdfBuffer.length > 1000, true);
  // Verify PDF header magic bytes "%PDF-"
  const header = pdfBuffer.subarray(0, 5).toString("ascii");
  assert.strictEqual(header, "%PDF-");
});
