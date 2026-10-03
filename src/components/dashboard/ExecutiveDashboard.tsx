"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { QuickAddBar } from "@/components/notes/QuickAddBar";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Building2,
  Plane,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Receipt,
  Users,
  FileSpreadsheet,
  Sparkles,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ExecutiveDashboardProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  metrics: {
    todayInflow: string;
    todayOutflow: string;
    netBalance: string;
    totalCustomerDues: string;
    totalSupplierPayables: string;
    activePassportAppsCount: number;
    rawTodayInflow: number;
    rawTodayOutflow: number;
  };
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
  categoryData: Array<{
    name: string;
    value: number;
  }>;
  recentRecords: Array<{
    id: string;
    recordNumber: string;
    title: string;
    type: string;
    category: string;
    amount: string;
    amountPaid: string;
    balanceDue: string;
    paymentMode: string;
    paymentStatus: string;
    date: string;
    customerName?: string | null;
    customerPhone?: string | null;
  }>;
}

export function ExecutiveDashboard({
  user,
  metrics,
  monthlyTrend,
  categoryData,
  recentRecords,
}: ExecutiveDashboardProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredRecords = recentRecords.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.recordNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customerName && r.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType =
      filterType === "ALL" ||
      (filterType === "INCOME" && r.type === "INCOME") ||
      (filterType === "EXPENSE" && r.type === "EXPENSE") ||
      (filterType === "DUES" && Number(r.balanceDue.replace(/[^0-9.-]+/g, "")) > 0);
    return matchesSearch && matchesType;
  });

  return (
    <AppShell
      user={user}
      metrics={{
        todayInflow: metrics.todayInflow,
        todayOutflow: metrics.todayOutflow,
        netBalance: metrics.netBalance,
        pendingDues: metrics.totalCustomerDues,
      }}
    >
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Welcome Banner & Fast Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-6 text-white shadow-lg shadow-orange-500/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                Madurai Main Branch
              </span>
              <span className="text-xs text-orange-100">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              Vanakkam, {user.name.split(" ")[0]}! 🙏
            </h2>
            <p className="text-sm text-orange-100 max-w-xl mt-0.5">
              Welcome to Sai Tours & Travels Executive Console. All accounts, passport desks, and bookings are synchronized.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-orange-900 font-bold text-xs shadow hover:bg-orange-50 transition"
            >
              <Receipt className="w-3.5 h-3.5 text-orange-600" />
              <span>GST Invoice</span>
            </Link>
            <Link
              href="/passport-visa"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-800/80 hover:bg-orange-800 text-white font-semibold text-xs border border-orange-500/40 transition"
            >
              <Plane className="w-3.5 h-3.5 text-sky-300" />
              <span>Passport Desk</span>
            </Link>
            <Link
              href="/customers"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-800/80 hover:bg-orange-800 text-white font-semibold text-xs border border-orange-500/40 transition"
            >
              <Users className="w-3.5 h-3.5 text-amber-300" />
              <span>Customer CRM</span>
            </Link>
            <Link
              href="/ai-studio"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Gemini AI</span>
            </Link>
          </div>
        </div>

        {/* Natural Language Quick Add Sentence Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-orange-600 animate-spin-slow" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              AI Smart Note Entry (Type plain words like &quot;Received 4500 from Ramesh for Tatkal passport&quot;)
            </h3>
          </div>
          <QuickAddBar lang="en" onRecordCreated={() => router.refresh()} />
        </div>

        {/* 6 Executive Metric KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Today's Inflow */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold">Today Received</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                {metrics.todayInflow}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Money Inflow</p>
            </div>
          </div>

          {/* Card 2: Today's Outflow */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold">Today Spent</span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 truncate">
                {metrics.todayOutflow}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Money Outflow</p>
            </div>
          </div>

          {/* Card 3: Today's Net Balance */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold">Net Cash Flow</span>
              <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 truncate">
                {metrics.netBalance}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Daily Surplus</p>
            </div>
          </div>

          {/* Card 4: Customer Dues */}
          <Link
            href="/receivables"
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 hover:border-amber-400 transition shadow-xs flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 mb-2">
              <span className="font-semibold">Customer Dues</span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400 truncate">
                {metrics.totalCustomerDues}
              </p>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-500 flex items-center gap-0.5 mt-0.5">
                <span>View Aging</span>
                <ArrowUpRight className="w-3 h-3" />
              </p>
            </div>
          </Link>

          {/* Card 5: Supplier Payables */}
          <Link
            href="/suppliers"
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 hover:border-rose-400 transition shadow-xs flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 mb-2">
              <span className="font-semibold">Vendor Payables</span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 truncate">
                {metrics.totalSupplierPayables}
              </p>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-500 flex items-center gap-0.5 mt-0.5">
                <span>Vendor Ledger</span>
                <ArrowUpRight className="w-3 h-3" />
              </p>
            </div>
          </Link>

          {/* Card 6: Active Passport / Visa Applications */}
          <Link
            href="/passport-visa"
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-sky-200 dark:border-sky-900/50 hover:border-sky-400 transition shadow-xs flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-400 mb-2">
              <span className="font-semibold">Passport Desk</span>
              <div className="w-7 h-7 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 group-hover:scale-110 transition">
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-sky-600 dark:text-sky-400 truncate">
                {metrics.activePassportAppsCount} Active
              </p>
              <p className="text-[11px] text-sky-600/80 dark:text-sky-500 flex items-center gap-0.5 mt-0.5">
                <span>Track PSK</span>
                <ArrowUpRight className="w-3 h-3" />
              </p>
            </div>
          </Link>
        </div>

        {/* Visual Analytics Charts: Area Chart + Category Breakdown */}
        <AnalyticsCharts monthlyTrend={monthlyTrend} categoryData={categoryData} />

        {/* Live Journal Activity Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Recent Transactions &amp; Notes</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  {filteredRecords.length} entries
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Live stream of bookings, customer payments, vendor settlements, and travel notes
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type Pills */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
                {(["ALL", "INCOME", "EXPENSE", "DUES"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      filterType === t
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {t === "ALL"
                      ? "All"
                      : t === "INCOME"
                      ? "Inflow"
                      : t === "EXPENSE"
                      ? "Outflow"
                      : "Unpaid Dues"}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by name / #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 w-40 sm:w-52"
                />
              </div>

              <Link
                href="/records"
                className="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold text-xs hover:bg-orange-100 transition inline-flex items-center gap-1"
              >
                <span>Full Journal</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Transactions List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Record #</th>
                  <th className="pb-3">Title &amp; Booking Details</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Mode</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-right">Balance Due</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No records match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isIncome = r.type === "INCOME";
                    const hasDue = Number(r.balanceDue.replace(/[^0-9.-]+/g, "")) > 0;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3 pl-2 text-slate-500 font-mono text-[11px]">
                          {r.recordNumber}
                        </td>
                        <td className="py-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {r.title}
                          </div>
                          {r.customerName && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>Customer: {r.customerName}</span>
                              {r.customerPhone && <span>• {r.customerPhone}</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                            {r.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-[10px] font-semibold">
                            {r.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`font-black ${
                              isIncome
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isIncome ? "+" : "-"}₹{r.amount}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {hasDue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                              ₹{r.balanceDue} due
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              Settled
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasDue && r.customerPhone && (
                              <a
                                href={`https://wa.me/91${r.customerPhone.replace(
                                  /\D/g,
                                  ""
                                )}?text=${encodeURIComponent(
                                  `Vanakkam ${r.customerName || "Customer"}, this is a reminder from Sai Tours & Travels regarding ₹${r.balanceDue} pending for "${r.title}". UPI: saipassportmdu@okaxis. Thank you!`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition"
                                title="Send WhatsApp Payment Reminder"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <Link
                              href="/records"
                              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                              title="Inspect Record"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
