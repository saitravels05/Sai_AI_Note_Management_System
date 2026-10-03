import PDFDocument from "pdfkit";
import { Money } from "@/lib/money";

export interface PdfReportOptions {
  businessName: string;
  businessAddress?: string;
  businessGstin?: string;
  reportTitle: string;
  periodLabel: string;
  summaryMetrics?: {
    totalIncome?: string;
    totalExpense?: string;
    netProfit?: string;
    totalDues?: string;
  };
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Generates an executive, printable PDF financial report
 */
export async function generateReportPdf(options: PdfReportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        const fullBuffer = Buffer.concat(chunks);
        resolve(fullBuffer);
      });
      doc.on("error", (err: Error) => reject(err));

      // 1. Header Banner
      doc
        .fillColor("#ea580c") // Sai orange
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(options.businessName, 40, 40);

      doc
        .fillColor("#64748b")
        .fontSize(9)
        .font("Helvetica")
        .text(
          `${options.businessAddress || "Madurai PSK Road, Madurai, Tamil Nadu, India"} | GSTIN: ${
            options.businessGstin || "33AAACS1234F1Z5"
          }`,
          40,
          65
        );

      doc
        .strokeColor("#cbd5e1")
        .lineWidth(1)
        .moveTo(40, 80)
        .lineTo(555, 80)
        .stroke();

      // 2. Report Title & Period Metadata
      doc
        .fillColor("#0f172a")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(options.reportTitle, 40, 95);

      doc
        .fillColor("#64748b")
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Accounting Period: ${options.periodLabel}  |  Generated on: ${new Date().toLocaleDateString(
            "en-IN"
          )}`,
          40,
          115
        );

      // 3. Summary Cards (if provided)
      let currentY = 135;
      if (options.summaryMetrics) {
        const metrics = options.summaryMetrics;
        const boxWidth = 120;
        const boxHeight = 45;

        const cards = [
          { label: "Total Inflow", value: metrics.totalIncome || "₹0", color: "#16a34a" },
          { label: "Total Outflow", value: metrics.totalExpense || "₹0", color: "#dc2626" },
          { label: "Net Balance", value: metrics.netProfit || "₹0", color: "#2563eb" },
          { label: "Pending Dues", value: metrics.totalDues || "₹0", color: "#d97706" },
        ];

        cards.forEach((c, idx) => {
          const x = 40 + idx * (boxWidth + 6);
          doc
            .rect(x, currentY, boxWidth, boxHeight)
            .fillAndStroke("#f8fafc", "#e2e8f0");

          doc
            .fillColor("#64748b")
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(c.label.toUpperCase(), x + 8, currentY + 8);

          doc
            .fillColor(c.color)
            .fontSize(11)
            .font("Helvetica-Bold")
            .text(c.value, x + 8, currentY + 24);
        });

        currentY += 60;
      }

      // 4. Data Table
      const colWidths = [70, 160, 90, 80, 80]; // Total 480
      const startX = 40;

      // Header Row
      doc
        .rect(startX, currentY, 515, 22)
        .fillAndStroke("#0f172a", "#0f172a");

      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");

      let currentX = startX + 6;
      options.headers.slice(0, 5).forEach((h, idx) => {
        const w = colWidths[idx] || 90;
        doc.text(h, currentX, currentY + 6, { width: w - 10, lineBreak: false, ellipsis: true });
        currentX += w;
      });

      currentY += 24;

      // Row Data
      doc.font("Helvetica").fontSize(8);
      options.rows.forEach((row, rowIdx) => {
        if (currentY > 740) {
          doc.addPage();
          currentY = 50;
        }

        const isEven = rowIdx % 2 === 0;
        if (isEven) {
          doc.rect(startX, currentY - 2, 515, 18).fill("#f8fafc");
        }

        doc.fillColor("#334155");
        let cellX = startX + 6;
        row.slice(0, 5).forEach((cell, colIdx) => {
          const w = colWidths[colIdx] || 90;
          const textVal = String(cell ?? "");
          doc.text(textVal, cellX, currentY + 2, { width: w - 10, lineBreak: false, ellipsis: true });
          cellX += w;
        });

        currentY += 18;
      });

      // 5. Signature Section
      if (currentY > 700) {
        doc.addPage();
        currentY = 600;
      } else {
        currentY = Math.max(currentY + 40, 720);
      }

      doc
        .strokeColor("#94a3b8")
        .lineWidth(1)
        .moveTo(380, currentY)
        .lineTo(540, currentY)
        .stroke();

      doc
        .fillColor("#475569")
        .fontSize(8)
        .font("Helvetica")
        .text("Authorized Signatory", 380, currentY + 6, { align: "center", width: 160 });

      // Page numbers on all pages
      const pageRange = doc.bufferedPageRange();
      for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
        doc.switchToPage(i);
        doc
          .fillColor("#94a3b8")
          .fontSize(8)
          .text(
            `Page ${i + 1} of ${pageRange.count}  |  Sai Tours & Travels Ledger System`,
            40,
            800,
            { align: "center", width: 515 }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
