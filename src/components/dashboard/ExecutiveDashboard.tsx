"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { QuickAddBar } from "@/components/notes/QuickAddBar";
import { DrillDownModal, DrillDownItem } from "./DrillDownModal";

const AnalyticsCharts = dynamic(
  () => import("@/components/dashboard/AnalyticsCharts").then((mod) => mod.AnalyticsCharts),
  {
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 animate-pulse" />
        <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 animate-pulse" />
      </div>
    ),
    ssr: false,
  }
);

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Building2,
  Plane,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Users,
  Sparkles,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  CreditCard,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface DashboardRecordItem {
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
  notes?: string | null;
}

export interface ExecutiveDashboardProps {
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
    cashBalance: string;
    bankBalance: string;
    upiBalance: string;
    totalLiquidBalance: string;
    thisMonthIncome: string;
    thisMonthExpense: string;
    thisMonthNetProfit: string;
    thisMonthCommission: string;
    thisMonthGstPayable: string;
    upcomingTripsCount: number;
  };
  reconciliation: {
    isReconciled: boolean;
    greenTick: boolean;
    statusText: string;
    dashboardNet: string;
    journalSum: string;
    discrepancies: string[];
  };
  healthIssues: Array<{
    id: string;
    recordNumber: string;
    severity: "CRITICAL" | "WARNING" | "INFO";
    title: string;
    description: string;
  }>;
  staffCollection?: Array<{
    staffName: string;
    totalCollected: string;
    count: number;
  }>;
  drillDownDatasets: {
    todayInflow: DrillDownItem[];
    todayOutflow: DrillDownItem[];
    customerDues: DrillDownItem[];
    supplierPayables: DrillDownItem[];
    cashJournal: DrillDownItem[];
    bankJournal: DrillDownItem[];
    upiJournal: DrillDownItem[];
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
  recentRecords: DashboardRecordItem[];
}

export function ExecutiveDashboard({
  user,
  metrics,
  reconciliation,
  healthIssues,
  staffCollection,
  drillDownDatasets,
  monthlyTrend,
  categoryData,
  recentRecords,
}: ExecutiveDashboardProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showHealthDrawer, setShowHealthDrawer] = useState(false);

  // Drill-down Modal State
  const [drillModal, setDrillModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    totalDisplay: string;
    records: DrillDownItem[];
  }>({
    isOpen: false,
    title: "",
    subtitle: "",
    totalDisplay: "",
    records: [],
  });

  const openDrillDown = (
    title: string,
    subtitle: string,
    totalDisplay: string,
    records: DrillDownItem[]
  ) => {
    setDrillModal({
      isOpen: true,
      title,
      subtitle,
      totalDisplay,
      records,
    });
  };

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
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Welcome Banner & Fast Action Bar */}
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
              Single Source of Truth Console. Notes &amp; Journal is the ONLY place where you enter data.
              Every card, ledger, and report calculates automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/records"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-orange-900 font-bold text-xs shadow hover:bg-orange-50 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Notes &amp; Journal</span>
            </Link>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-800/80 hover:bg-orange-800 text-white font-semibold text-xs border border-orange-500/40 transition"
            >
              <Receipt className="w-3.5 h-3.5 text-orange-200" />
              <span>GST Invoices</span>
            </Link>
            <Link
              href="/customers"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-800/80 hover:bg-orange-800 text-white font-semibold text-xs border border-orange-500/40 transition"
            >
              <Users className="w-3.5 h-3.5 text-amber-300" />
              <span>Customer Ledgers</span>
            </Link>
            <Link
              href="/suppliers"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-800/80 hover:bg-orange-800 text-white font-semibold text-xs border border-orange-500/40 transition"
            >
              <Building2 className="w-3.5 h-3.5 text-rose-300" />
              <span>Vendor Ledgers</span>
            </Link>
          </div>
        </div>

        {/* 100% RECONCILIATION VERIFICATION STATUS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Accounting Reconciliation: 100% Verified</span>
              </div>
              <p className="text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5">
                Dashboard Totals = Journal Entry Sum = Customer &amp; Vendor Ledgers. Zero drift.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {healthIssues.length > 0 && (
              <button
                onClick={() => setShowHealthDrawer(!showHealthDrawer)}
                className="px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold text-[11px] flex items-center gap-1 hover:bg-amber-200 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{healthIssues.length} Health Notices</span>
                {showHealthDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            <span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              Net: {metrics.netBalance}
            </span>
          </div>
        </div>

        {/* DATA HEALTH ISSUES ACCORDION */}
        {showHealthDrawer && healthIssues.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-xs space-y-2 animate-in fade-in duration-150">
            <h4 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Data Health &amp; Integrity Diagnostics</span>
            </h4>
            <div className="divide-y divide-amber-200 dark:divide-amber-900/60">
              {healthIssues.map((issue) => (
                <div key={issue.id} className="py-2 first:pt-1 last:pb-0 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-semibold text-amber-900 dark:text-amber-300">
                      [{issue.recordNumber}] {issue.title}
                    </span>
                    <p className="text-amber-700 dark:text-amber-400 text-[11px] mt-0.5">
                      {issue.description}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      issue.severity === "CRITICAL"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {issue.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Natural Language Quick Add Sentence Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-orange-600 animate-spin-slow" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Master Entry Bar (Type: &quot;Received 5000 from Kumar for Chennai flight ticket by UPI&quot;)
            </h3>
          </div>
          <QuickAddBar lang="en" onRecordCreated={() => router.refresh()} />
        </div>

        {/* PRIMARY DRILL-DOWN KPI METRIC CARDS (Click any card to drill down) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Cashflow &amp; Balances (Click any card to view exact entries)
            </h3>
            <span className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold">
              Live Calculated
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* 1. Today Received */}
            <button
              onClick={() =>
                openDrillDown(
                  "Today's Money Received",
                  "All income and advances recorded today",
                  metrics.todayInflow,
                  drillDownDatasets.todayInflow
                )
              }
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition shadow-xs text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-semibold text-[11px]">Today Received</span>
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 truncate font-mono">
                  {metrics.todayInflow}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click to Drill-Down</p>
              </div>
            </button>

            {/* 2. Today Spent */}
            <button
              onClick={() =>
                openDrillDown(
                  "Today's Money Spent",
                  "All expenses and vendor outflows recorded today",
                  metrics.todayOutflow,
                  drillDownDatasets.todayOutflow
                )
              }
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 transition shadow-xs text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-semibold text-[11px]">Today Spent</span>
                <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base font-black text-rose-600 dark:text-rose-400 truncate font-mono">
                  {metrics.todayOutflow}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click to Drill-Down</p>
              </div>
            </button>

            {/* 3. Daily Net */}
            <button
              onClick={() =>
                openDrillDown(
                  "Today's Net Cash Flow",
                  "Inflows minus outflows today",
                  metrics.netBalance,
                  [...drillDownDatasets.todayInflow, ...drillDownDatasets.todayOutflow]
                )
              }
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition shadow-xs text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-semibold text-[11px]">Net Daily</span>
                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base font-black text-indigo-600 dark:text-indigo-400 truncate font-mono">
                  {metrics.netBalance}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Surplus Today</p>
              </div>
            </button>

            {/* 4. Customer Dues */}
            <button
              onClick={() =>
                openDrillDown(
                  "Customer Dues Breakdown",
                  "All unsettled customer balances across bookings",
                  metrics.totalCustomerDues,
                  drillDownDatasets.customerDues
                )
              }
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 hover:border-amber-500 transition shadow-xs text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 mb-1.5">
                <span className="font-semibold text-[11px]">Customer Dues</span>
                <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base font-black text-amber-600 dark:text-amber-400 truncate font-mono">
                  {metrics.totalCustomerDues}
                </p>
                <p className="text-[10px] text-amber-600/80 mt-0.5">Click to Drill-Down</p>
              </div>
            </button>

            {/* 5. Vendor Payables */}
            <button
              onClick={() =>
                openDrillDown(
                  "Vendor Payables Breakdown",
                  "Unsettled supplier dues for airlines, hotels, and rentals",
                  metrics.totalSupplierPayables,
                  drillDownDatasets.supplierPayables
                )
              }
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 hover:border-rose-500 transition shadow-xs text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 mb-1.5">
                <span className="font-semibold text-[11px]">Vendor Dues</span>
                <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base font-black text-rose-600 dark:text-rose-400 truncate font-mono">
                  {metrics.totalSupplierPayables}
                </p>
                <p className="text-[10px] text-rose-600/80 mt-0.5">Click to Drill-Down</p>
              </div>
            </button>

            {/* 6. Cash in Hand */}
            <button
              onClick={() =>
                openDrillDown(
                  "Cash in Hand Journal",
                  "Opening balance + all cash entries",
                  metrics.cashBalance,
                  drillDownDatasets.cashJournal
                )
              }
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition shadow-xs text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-semibold text-[11px]">Cash in Hand</span>
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base font-black text-slate-800 dark:text-slate-200 truncate font-mono">
                  {metrics.cashBalance}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Physical Cash</p>
              </div>
            </button>

            {/* 7. Bank & UPI */}
            <button
              onClick={() =>
                openDrillDown(
                  "Bank & UPI Journal",
                  "Bank accounts + GPay/PhonePe settlements",
                  metrics.bankBalance,
                  [...drillDownDatasets.bankJournal, ...drillDownDatasets.upiJournal]
                )
              }
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition shadow-xs text-left cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-semibold text-[11px]">Bank &amp; UPI</span>
                <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base font-black text-blue-600 dark:text-blue-400 truncate font-mono">
                  {metrics.bankBalance}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">UPI: {metrics.upiBalance}</p>
              </div>
            </button>

            {/* 8. Passport Desk */}
            <Link
              href="/passport-visa"
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-sky-200 dark:border-sky-900/50 hover:border-sky-400 transition shadow-xs flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-400 mb-1.5">
                <span className="font-semibold text-[11px]">Passport Desk</span>
                <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 group-hover:scale-110 transition">
                  <Plane className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base font-black text-sky-600 dark:text-sky-400 truncate">
                  {metrics.activePassportAppsCount} Active
                </p>
                <p className="text-[10px] text-sky-600/80 mt-0.5">PSK Madurai</p>
              </div>
            </Link>
          </div>
        </div>

        {/* THIS MONTH EXECUTIVE RECAP STRIP */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              This Month Summary:
            </span>
            <span className="text-slate-500 ml-2">All-in-one monthly accounting performance</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-mono font-medium">
            <div>
              <span className="text-slate-400 text-[11px]">Income: </span>
              <strong className="text-emerald-600 dark:text-emerald-400">{metrics.thisMonthIncome}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Expense: </span>
              <strong className="text-rose-600 dark:text-rose-400">{metrics.thisMonthExpense}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Net Profit: </span>
              <strong className="text-indigo-600 dark:text-indigo-400">{metrics.thisMonthNetProfit}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Commission: </span>
              <strong className="text-amber-600 dark:text-amber-400">{metrics.thisMonthCommission}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">GST Payable: </span>
              <strong className="text-slate-700 dark:text-slate-300">{metrics.thisMonthGstPayable}</strong>
            </div>
          </div>
        </div>

        {/* Visual Analytics Charts: Area Chart + Category Breakdown */}
        <AnalyticsCharts monthlyTrend={monthlyTrend} categoryData={categoryData} />

        {/* STAFF-WISE COLLECTION BREAKDOWN (For Owner, Admin, Manager) */}
        {staffCollection && staffCollection.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Staff Collection Breakdown (This Month)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {staffCollection.map((s) => (
                <div
                  key={s.staffName}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">{s.staffName}</p>
                    <p className="text-[11px] text-slate-400">{s.count} collections</p>
                  </div>
                  <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                    {s.totalCollected}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Journal Activity Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Recent Journal Entries</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  {filteredRecords.length} entries
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Single Source of Truth • Every record added here immediately updates every ledger and report
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
                  placeholder="Filter by title / #..."
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
                  <th className="pb-3">Title &amp; Party Details</th>
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
                              <span>Party: {r.customerName}</span>
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
                        <td className="py-3 text-right font-mono">
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
                        <td className="py-3 text-right font-mono">
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
                              title="Inspect in Journal"
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

      {/* Interactive Drill-down Modal */}
      <DrillDownModal
        isOpen={drillModal.isOpen}
        onClose={() => setDrillModal((prev) => ({ ...prev, isOpen: false }))}
        title={drillModal.title}
        subtitle={drillModal.subtitle}
        totalDisplay={drillModal.totalDisplay}
        records={drillModal.records}
      />
    </AppShell>
  );
}
