"use client";

import React, { useState, useEffect } from "react";
import {
  getMonthAuditSummary,
  closeMonthAction,
  unlockMonthAction,
  MonthAuditSummary,
} from "@/server/actions/monthend.actions";
import { Language, translations } from "@/lib/i18n";
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";

interface MonthEndWizardProps {
  lang: Language;
  onClose: () => void;
  onRefresh: () => void;
}

export function MonthEndWizard({ lang, onClose, onRefresh }: MonthEndWizardProps) {
  const t = translations[lang];
  const [currentStep, setCurrentStep] = useState(1);
  const [summary, setSummary] = useState<MonthAuditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const data = await getMonthAuditSummary(selectedYear, selectedMonth);
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedYear, selectedMonth]);

  const handleCloseMonth = async () => {
    if (!confirm("Are you sure you want to CLOSE and LOCK this month? Once locked, records cannot be edited without Owner unlock.")) {
      return;
    }

    setIsProcessing(true);
    try {
      await closeMonthAction(selectedYear, selectedMonth);
      await fetchSummary();
      onRefresh();
      alert("Month closed and locked successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to close month.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlockMonth = async () => {
    const reason = prompt("Enter the mandatory audit reason to unlock this month:");
    if (!reason || reason.trim().length < 5) {
      alert("A valid audit reason of at least 5 characters is required.");
      return;
    }

    setIsProcessing(true);
    try {
      await unlockMonthAction(selectedYear, selectedMonth, reason);
      await fetchSummary();
      onRefresh();
      alert("Month unlocked successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to unlock month.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {t.closeMonthTitle}
              </h3>
              <p className="text-xs text-gray-500">{t.closeMonthDesc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-4">
          {[
            { step: 1, label: "1. Unpaid Items" },
            { step: 2, label: "2. AI Anomaly Check" },
            { step: 3, label: "3. Confirm Totals" },
            { step: 4, label: "4. Lock Period" },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex items-center gap-2 text-xs font-semibold ${
                currentStep >= s.step
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep >= s.step
                    ? "bg-orange-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                }`}
              >
                {s.step}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="text-xs">Calculating month totals & checking anomalies...</span>
          </div>
        ) : !summary ? (
          <div className="text-center py-12 text-sm text-gray-500">Failed to load summary.</div>
        ) : (
          <div>
            {/* Locked Warning Banner */}
            {summary.isClosed && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Period {summary.periodKey} is CLOSED & LOCKED
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Balances are tamper-proof and archived.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUnlockMonth}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 shadow-2xs hover:bg-emerald-100 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5 inline mr-1" />
                  Owner Unlock
                </button>
              </div>
            )}

            {/* Step 1: Unpaid Dues */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                    Step 1: Check Pending / Unpaid Items
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Review customers or suppliers who still owe or are owed money for this month.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 font-medium">Uncollected Dues:</span>
                      <div className="text-lg font-bold text-amber-600">{summary.customerDues}</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 font-medium">Pending Cards:</span>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {summary.pendingRecordsCount} of {summary.totalRecordsCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: AI Anomaly Detection */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      Step 2: AI Anomaly & Mistake Inspection
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Automatic scan for duplicates, ₹0 amounts, or unlinked bookings.
                  </p>

                  {summary.anomalies.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      All transactions look clean and verified! No anomalies detected.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {summary.anomalies.map((a, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Confirm Totals */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                    Step 3: Confirm Final Month Figures
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Verify that your cash, bank balances, and net profit match your actual holdings.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100">
                      <span className="text-[11px] text-gray-500">Money Received</span>
                      <div className="text-sm font-bold text-emerald-600">{summary.totalIncome}</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100">
                      <span className="text-[11px] text-gray-500">Money Spent</span>
                      <div className="text-sm font-bold text-rose-600">{summary.totalExpense}</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100">
                      <span className="text-[11px] text-gray-500">Net Profit</span>
                      <div className="text-sm font-bold text-blue-600">{summary.netProfit}</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100">
                      <span className="text-[11px] text-gray-500">Cash Balance</span>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {summary.cashBalance}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100">
                      <span className="text-[11px] text-gray-500">Bank & UPI</span>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {summary.bankBalance}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100">
                      <span className="text-[11px] text-gray-500">Pending Dues</span>
                      <div className="text-sm font-bold text-amber-600">{summary.customerDues}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Lock Month */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 text-center">
                  <Lock className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    Lock Period {summary.periodKey}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                    Closing locks all {summary.totalRecordsCount} cards for this month to guarantee
                    accounting integrity. Only the Owner can unlock this period later.
                  </p>

                  <button
                    onClick={handleCloseMonth}
                    disabled={summary.isClosed || isProcessing}
                    className="px-6 py-3 rounded-xl font-bold text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    ) : (
                      <Lock className="w-4 h-4 inline mr-2" />
                    )}
                    {summary.isClosed ? "Month Already Locked" : "Lock & Close Month Now"}
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100 dark:border-gray-700">
              <button
                disabled={currentStep === 1}
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-30 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs cursor-pointer"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
