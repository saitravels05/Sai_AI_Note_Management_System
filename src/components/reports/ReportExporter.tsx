"use client";

import React, { useState } from "react";
import { exportReportAction, ReportType, ExportFormat } from "@/server/actions/reports.actions";
import { Language, translations } from "@/lib/i18n";
import { Download, FileSpreadsheet, FileText, X, Loader2 } from "lucide-react";

interface ReportExporterProps {
  lang: Language;
  onClose: () => void;
}

export function ReportExporter({ lang, onClose }: ReportExporterProps) {
  const t = translations[lang];
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [reportType, setReportType] = useState<ReportType>("month_summary");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportReportAction(reportType, format, year, month);

      // Create download trigger
      const link = document.createElement("a");
      link.href = `data:${result.mimeType};base64,${result.base64Data}`;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {t.export}
              </h3>
              <p className="text-xs text-gray-500">Download formatted financial sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Report Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Select Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-orange-500"
            >
              <option value="month_summary">Month-End Summary</option>
              <option value="profit_loss">Profit & Loss Statement</option>
              <option value="day_book">Day Book (All Transactions)</option>
              <option value="customer_dues">Customer Outstanding Dues</option>
              <option value="gst_summary">GST Collection & Breakdown</option>
            </select>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              File Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  format === "xlsx"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-600"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  format === "csv"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-600"
                }`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>CSV File</span>
              </button>
            </div>
          </div>

          {/* Year & Month Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
              >
                {[
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"
                ].map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
