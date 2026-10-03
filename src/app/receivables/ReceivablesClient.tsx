"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  ReceivablesAgingSummary,
  ReceivableItem,
  settleReceivablePaymentAction,
} from "@/server/actions/receivables.actions";
import {
  Clock,
  Search,
  MessageCircle,
  Phone,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  X,
  CreditCard,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PaymentMode } from "@prisma/client";

interface ReceivablesClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  initialSummary: ReceivablesAgingSummary;
}

export function ReceivablesClient({ user, initialSummary }: ReceivablesClientProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<ReceivablesAgingSummary>(initialSummary);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBucket, setSelectedBucket] = useState<string>("ALL");
  const [languageMode, setLanguageMode] = useState<"en" | "ta">("en");

  // Payment Settlement Modal
  const [activeItem, setActiveItem] = useState<ReceivableItem | null>(null);
  const [receiveAmount, setReceiveAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>(PaymentMode.UPI);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredItems = summary.items.filter((item) => {
    const matchesSearch =
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customerPhone && item.customerPhone.includes(searchTerm));

    const matchesBucket =
      selectedBucket === "ALL" ||
      (selectedBucket === "0_30" && item.bucket === "0_30") ||
      (selectedBucket === "31_60" && item.bucket === "31_60") ||
      (selectedBucket === "61_90" && item.bucket === "61_90") ||
      (selectedBucket === "90_plus" && item.bucket === "90_plus");

    return matchesSearch && matchesBucket;
  });

  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || !receiveAmount || Number(receiveAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      await settleReceivablePaymentAction({
        recordId: activeItem.id,
        amountReceived: Number(receiveAmount),
        paymentMode: payMode,
        notes,
      });
      setActiveItem(null);
      setReceiveAmount("");
      setNotes("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to record payment settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Customer Receivables &amp; Aging Desk
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Automated 30/60/90-day aging buckets with 1-click Tamil &amp; English WhatsApp payment reminders
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguageMode(languageMode === "en" ? "ta" : "en")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              WhatsApp Msg: {languageMode === "en" ? "English" : "தமிழ் (Tamil)"}
            </button>
          </div>
        </div>

        {/* 4 Aging Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Bucket 1: 0-30 Days */}
          <div
            onClick={() => setSelectedBucket("0_30")}
            className={`p-4 rounded-3xl border transition cursor-pointer shadow-xs ${
              selectedBucket === "0_30"
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                0 - 30 Days (Current)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {summary.bucket0to30}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Recent bookings within 30 days</p>
          </div>

          {/* Bucket 2: 31-60 Days */}
          <div
            onClick={() => setSelectedBucket("31_60")}
            className={`p-4 rounded-3xl border transition cursor-pointer shadow-xs ${
              selectedBucket === "31_60"
                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                31 - 60 Days (Follow-up)
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {summary.bucket31to60}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Courtesy reminder recommended</p>
          </div>

          {/* Bucket 3: 61-90 Days */}
          <div
            onClick={() => setSelectedBucket("61_90")}
            className={`p-4 rounded-3xl border transition cursor-pointer shadow-xs ${
              selectedBucket === "61_90"
                ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                61 - 90 Days (Overdue)
              </span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {summary.bucket61to90}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">High priority collection</p>
          </div>

          {/* Bucket 4: 90+ Days */}
          <div
            onClick={() => setSelectedBucket("90_plus")}
            className={`p-4 rounded-3xl border transition cursor-pointer shadow-xs ${
              selectedBucket === "90_plus"
                ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
                : "border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                90+ Days (Critical)
              </span>
              <AlertOctagon className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400">
              {summary.bucket90Plus}
            </p>
            <p className="text-[11px] text-rose-500 mt-0.5">Urgent manager escalation</p>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: "ALL", label: `All Accounts (${summary.totalAccountsCount})` },
              { id: "0_30", label: "0-30 Days" },
              { id: "31_60", label: "31-60 Days" },
              { id: "61_90", label: "61-90 Days" },
              { id: "90_plus", label: "90+ Days" },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBucket(b.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  selectedBucket === b.id
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, booking, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Receivables Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 pl-6">Customer &amp; Booking</th>
                  <th className="py-3.5">Date &amp; Age</th>
                  <th className="py-3.5">Aging Bucket</th>
                  <th className="py-3.5 text-right">Total Bill</th>
                  <th className="py-3.5 text-right">Paid</th>
                  <th className="py-3.5 text-right">Pending Due</th>
                  <th className="py-3.5 text-right pr-6">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      All dues cleared! No pending customer balances match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const waLink =
                      languageMode === "en" ? item.whatsappLinkEn : item.whatsappLinkTa;

                    let bucketBadge = {
                      text: "0-30d Current",
                      bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
                    };
                    if (item.bucket === "31_60") {
                      bucketBadge = {
                        text: "31-60d Due",
                        bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
                      };
                    } else if (item.bucket === "61_90") {
                      bucketBadge = {
                        text: "61-90d Overdue",
                        bg: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
                      };
                    } else if (item.bucket === "90_plus") {
                      bucketBadge = {
                        text: "90d+ Critical",
                        bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
                      };
                    }

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-4 pl-6">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {item.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.title} ({item.number})
                          </div>
                          {item.customerPhone && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{item.customerPhone}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.date}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-bold">
                            {item.ageDays} days ago
                          </div>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${bucketBadge.bg}`}
                          >
                            {bucketBadge.text}
                          </span>
                        </td>
                        <td className="py-4 text-right text-slate-600 dark:text-slate-300">
                          {item.totalAmount}
                        </td>
                        <td className="py-4 text-right text-emerald-600 dark:text-emerald-400">
                          {item.amountPaid}
                        </td>
                        <td className="py-4 text-right">
                          <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                            {item.balanceDue}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {waLink ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
                                title={`Send ${languageMode === "en" ? "English" : "Tamil"} WhatsApp Payment Reminder`}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp Reminder</span>
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400">No Phone</span>
                            )}

                            <button
                              onClick={() => {
                                setActiveItem(item);
                                setReceiveAmount(item.balanceDue.replace(/[^0-9.-]+/g, ""));
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-xs transition"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Receive Payment</span>
                            </button>
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

        {/* Modal: Receive Customer Payment */}
        {activeItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Record Customer Settlement
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeItem.customerName} • {activeItem.number}
                  </p>
                </div>
                <button
                  onClick={() => setActiveItem(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex justify-between items-center font-medium">
                <span>Pending Balance Due:</span>
                <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                  {activeItem.balanceDue}
                </span>
              </div>

              <form onSubmit={handleSettlePayment} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Enter collected amount"
                    value={receiveAmount}
                    onChange={(e) => setReceiveAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                  >
                    <option value={PaymentMode.UPI}>UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value={PaymentMode.CASH}>Cash on Hand</option>
                    <option value={PaymentMode.BANK_TRANSFER}>Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value={PaymentMode.CARD}>Credit / Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid in Madurai office cash counter"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveItem(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Updating..." : "Clear / Settle Due"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
