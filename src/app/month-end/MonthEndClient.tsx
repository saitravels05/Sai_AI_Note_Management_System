"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  MonthAuditSummary,
  closeMonthAction,
  unlockMonthAction,
  getMonthAuditSummary,
} from "@/server/actions/monthend.actions";
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building,
  CreditCard,
  RefreshCw,
  X,
  FileCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface MonthEndClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  initialYear: number;
  initialMonth: number;
  initialSummary: MonthAuditSummary;
}

export function MonthEndClient({
  user,
  initialYear,
  initialMonth,
  initialSummary,
}: MonthEndClientProps) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [summary, setSummary] = useState<MonthAuditSummary>(initialSummary);
  const [isLoading, setIsLoading] = useState(false);

  // Lock & Unlock modals
  const [showLockModal, setShowLockModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePeriodChange = async (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setIsLoading(true);
    try {
      const res = await getMonthAuditSummary(newYear, newMonth);
      setSummary(res);
    } catch (err: any) {
      alert(err.message || "Failed to load audit summary");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseMonth = async () => {
    setIsProcessing(true);
    try {
      await closeMonthAction(year, month);
      setShowLockModal(false);
      const res = await getMonthAuditSummary(year, month);
      setSummary(res);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to lock month");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlockMonth = async () => {
    if (!unlockReason.trim()) return;
    setIsProcessing(true);
    try {
      await unlockMonthAction(year, month, unlockReason);
      setShowUnlockModal(false);
      setUnlockReason("");
      const res = await getMonthAuditSummary(year, month);
      setSummary(res);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to unlock month");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header & Month Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Month-End Closing &amp; Period Lock
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tamper-proof accounting audit, anomaly detection, and historical ledger protection
            </p>
          </div>

          {/* Period Selector Controls */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <select
              value={month}
              onChange={(e) => handlePeriodChange(year, Number(e.target.value))}
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
              onChange={(e) => handlePeriodChange(Number(e.target.value), month)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-transparent focus:ring-1 focus:ring-orange-500"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={() => handlePeriodChange(year, month)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Refresh Audit Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div
          className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
            summary.isClosed
              ? "bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 text-rose-900 dark:text-rose-200"
              : "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-2xl shrink-0 ${
                summary.isClosed
                  ? "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {summary.isClosed ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">
                  Period {monthNames[month - 1]} {year}:{" "}
                  {summary.isClosed ? "LOCKED & ARCHIVED" : "OPEN FOR ENTRIES"}
                </h3>
              </div>
              <p className="text-xs opacity-90 mt-1 max-w-2xl">
                {summary.isClosed
                  ? `This period was reconciled and locked on ${new Date(
                      summary.closedAt || ""
                    ).toLocaleString("en-IN")}. Modifications, edits, and deletions are strictly frozen.`
                  : "All staff can record travel notes, receipts, and bookings. When ready, close the month to freeze records against future tampering."}
              </p>
            </div>
          </div>

          <div>
            {summary.isClosed ? (
              user.role === "OWNER" || user.role === "ADMIN" ? (
                <button
                  onClick={() => setShowUnlockModal(true)}
                  className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs shadow-xs hover:bg-rose-100/50 transition inline-flex items-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Owner Re-Open Period</span>
                </button>
              ) : null
            ) : (
              <button
                onClick={() => setShowLockModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition inline-flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Reconcile &amp; Lock Month</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Financial Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Money Received</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {summary.totalIncome}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total Inflow</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Money Spent</span>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {summary.totalExpense}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total Outflow</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Net Surplus / Profit</span>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {summary.netProfit}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Operating Margin</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Cash on Hand</span>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {summary.cashBalance}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Desk Cash Drawer</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Bank &amp; UPI Inflow</span>
            <p className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1">
              {summary.bankBalance}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Direct Axis/SBI bank</p>
          </div>
        </div>

        {/* Anomaly & Fraud Inspector */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Automated Anomaly &amp; Discrepancy Inspector
            </h3>
          </div>

          {summary.anomalies.length === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Zero reconciliation anomalies detected. All {summary.totalRecordsCount} recorded
                cards have valid amounts, non-zero values, and unique booking titles.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                Attention: {summary.anomalies.length} potential issues flagged for review before locking:
              </p>
              <div className="space-y-1.5">
                {summary.anomalies.map((anom, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2 font-medium"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{anom}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Category-Wise Monthly Inflow &amp; Outflow
              </h3>
              <p className="text-xs text-slate-500">
                Breakdown of receipts vs expenses per travel service line
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              Total Cards: {summary.totalRecordsCount}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 pl-6">Service Category</th>
                  <th className="py-3 text-right">Money Received (Inflow)</th>
                  <th className="py-3 text-right pr-6">Money Spent (Outflow)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {Object.entries(summary.categoryBreakdown).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      No activity recorded for {monthNames[month - 1]} {year}.
                    </td>
                  </tr>
                ) : (
                  Object.entries(summary.categoryBreakdown).map(([cat, val]) => (
                    <tr
                      key={cat}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 pl-6 font-bold text-slate-800 dark:text-slate-200">
                        {cat.replace(/_/g, " ")}
                      </td>
                      <td className="py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {val.income}
                      </td>
                      <td className="py-3.5 text-right font-bold text-rose-600 dark:text-rose-400 pr-6">
                        {val.expense}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Confirm Lock Month */}
        {showLockModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Confirm Month Lock
                  </h3>
                </div>
                <button
                  onClick={() => setShowLockModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                You are about to lock <strong>{monthNames[month - 1]} {year}</strong>.
                Once locked:
              </p>

              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                <li>All staff accounts will be blocked from modifying or voiding cards in this period.</li>
                <li>Financial metrics ({summary.netProfit} net profit) are frozen as audit snapshot.</li>
                <li>Only the Owner ({user.email}) can reopen the month with mandatory audit justification.</li>
              </ul>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCloseMonth}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {isProcessing ? "Freezing..." : "Yes, Lock Period"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Unlock Month (Admin/Owner) */}
        {showUnlockModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                    <Unlock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Owner Re-Open Authorization
                  </h3>
                </div>
                <button
                  onClick={() => setShowUnlockModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Re-opening <strong>{monthNames[month - 1]} {year}</strong> requires an explicit
                audit justification that will be logged permanently in the system audit trail.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Re-Opening *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Discovered delayed airline refund voucher from Indigo that needs ledger reconciliation."
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing || !unlockReason.trim()}
                  onClick={handleUnlockMonth}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {isProcessing ? "Re-opening..." : "Authorize Unlock"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
