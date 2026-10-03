"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  exportReportAction,
  ReportType,
  ExportFormat,
} from "@/server/actions/reports.actions";
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Calendar,
  FileText,
  Receipt,
  Users,
  Building2,
  TrendingUp,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface ReportsClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

interface ReportCardItem {
  id: ReportType;
  title: string;
  description: string;
  category: string;
  icon: any;
  color: string;
}

const REPORT_CARDS: ReportCardItem[] = [
  {
    id: "profit_loss",
    title: "Profit & Loss Statement (P&L)",
    description:
      "Comprehensive revenue from flights, passports, visas vs operational vendor costs and net surplus.",
    category: "Financial Statement",
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "day_book",
    title: "Daily Day Book (Cash & Bank Journal)",
    description:
      "Chronological register of all money received and money spent categorized by UPI, Cash, and Bank.",
    category: "Daily Operations",
    icon: FileText,
    color: "from-orange-500 to-amber-600",
  },
  {
    id: "gst_summary",
    title: "GST GSTR-1 Outward Supply Summary",
    description:
      "Tax invoice register with SAC 998553 codes, taxable values, CGST, SGST, and IGST for chartered accountant.",
    category: "Tax & Compliance",
    icon: Receipt,
    color: "from-sky-500 to-blue-600",
  },
  {
    id: "customer_dues",
    title: "Customer Receivables & Dues Ledger",
    description:
      "List of unpaid customer accounts with contact numbers, booking titles, and total balances due.",
    category: "Credit Control",
    icon: Users,
    color: "from-purple-500 to-indigo-600",
  },
  {
    id: "month_summary",
    title: "Monthly Executive Recap",
    description:
      "High-level executive report suitable for bank submissions, branch performance, and partner reviews.",
    category: "Executive BI",
    icon: BarChart3,
    color: "from-rose-500 to-pink-600",
  },
];

export function ReportsClient({ user }: ReportsClientProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handleDownload = async (reportType: ReportType, format: ExportFormat) => {
    const key = `${reportType}_${format}`;
    setDownloadingId(key);
    try {
      const res = await exportReportAction(reportType, format, year, month);

      // Trigger browser download
      const binaryString = window.atob(res.base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes.buffer], { type: res.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Failed to generate report");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header & Global Period Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Financial Reports &amp; BI Desk
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Export 1-click Excel (.xlsx) and CSV spreadsheets for chartered accountant and owner reviews
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <Calendar className="w-4 h-4 text-orange-500" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-transparent focus:ring-1 focus:ring-orange-500"
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-transparent focus:ring-1 focus:ring-orange-500"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200/60 dark:border-orange-900/30 flex items-center justify-between text-xs text-orange-950 dark:text-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">Indian Financial Year 2026-27 Accounting Standards:</span>
              <p className="text-[11px] text-orange-800 dark:text-orange-300 mt-0.5">
                All Excel files contain pre-formatted currency amounts in INR (₹) and Indian number separators (e.g. 1,50,000).
              </p>
            </div>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REPORT_CARDS.map((rc) => {
            const Icon = rc.icon;
            const isDownloadingXlsx = downloadingId === `${rc.id}_xlsx`;
            const isDownloadingCsv = downloadingId === `${rc.id}_csv`;

            return (
              <div
                key={rc.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-300 dark:hover:border-orange-800 transition group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${rc.color} text-white flex items-center justify-center shadow-md`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {rc.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition">
                      {rc.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {rc.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  {/* PDF Download Button */}
                  <button
                    onClick={() => handleDownload(rc.id, "pdf")}
                    disabled={Boolean(downloadingId)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{downloadingId === `${rc.id}_pdf` ? "Generating..." : "PDF"}</span>
                  </button>

                  {/* Excel (.xlsx) Download Button */}
                  <button
                    onClick={() => handleDownload(rc.id, "xlsx")}
                    disabled={Boolean(downloadingId)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{downloadingId === `${rc.id}_xlsx` ? "Exporting..." : "Excel"}</span>
                  </button>

                  {/* CSV Download Button */}
                  <button
                    onClick={() => handleDownload(rc.id, "csv")}
                    disabled={Boolean(downloadingId)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingId === `${rc.id}_csv` ? "..." : "CSV"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
