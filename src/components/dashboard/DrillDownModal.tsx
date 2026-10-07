"use client";

import React from "react";
import { X, ExternalLink, Calendar, CheckCircle2, Clock, MessageCircle, Wallet } from "lucide-react";
import Link from "next/link";

export interface DrillDownItem {
  id: string;
  recordNumber: string;
  title: string;
  date: string;
  type: string;
  category: string;
  amount: string;
  amountPaid: string;
  balanceDue: string;
  paymentMode: string;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
}

export interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  totalDisplay: string;
  records: DrillDownItem[];
}

export function DrillDownModal({
  isOpen,
  onClose,
  title,
  subtitle,
  totalDisplay,
  records,
}: DrillDownModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle} • <strong className="text-slate-700 dark:text-slate-200">{records.length} entries</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Calculated Total
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                {totalDisplay}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Entries List */}
        <div className="overflow-y-auto p-5 space-y-3 flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {records.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No journal entries match this drill-down.</p>
              <p className="text-xs text-slate-400 mt-1">
                All numbers are calculated live from active entries in Notes & Journal.
              </p>
            </div>
          ) : (
            records.map((r) => {
              const isIncome = r.type === "INCOME";
              const hasDue = Number(r.balanceDue.replace(/[^0-9.-]+/g, "")) > 0;

              return (
                <div
                  key={r.id}
                  className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 p-2.5 rounded-2xl transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {r.recordNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {r.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {r.date}
                      </span>
                      {r.customerName && (
                        <span>• Customer: <strong className="text-slate-700 dark:text-slate-300">{r.customerName}</strong></span>
                      )}
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        {r.category.replace(/_/g, " ")}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-orange-50 dark:bg-orange-950/40 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                        {r.paymentMode}
                      </span>
                    </div>

                    {r.notes && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                        {r.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <p
                        className={`text-sm font-black font-mono ${
                          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}₹{r.amount}
                      </p>
                      {hasDue ? (
                        <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                          ₹{r.balanceDue} due
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Settled
                        </span>
                      )}
                    </div>

                    {r.customerPhone && hasDue && (
                      <a
                        href={`https://wa.me/91${r.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Vanakkam ${r.customerName || "Customer"}, reminder from Sai Tours & Travels regarding ₹${r.balanceDue} pending for "${r.title}".`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-100 transition"
                        title="WhatsApp Reminder"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Master source: Notes &amp; Journal • Never edited by hand
          </span>
          <Link
            href="/records"
            className="text-orange-600 dark:text-orange-400 font-bold hover:underline inline-flex items-center gap-1"
          >
            <span>Open in Full Journal</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
