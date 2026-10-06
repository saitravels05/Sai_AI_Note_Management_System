"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  createSupplierAction,
  recordSupplierPaymentAction,
} from "@/server/actions/suppliers.actions";
import {
  Building2,
  Plus,
  Search,
  CreditCard,
  Phone,
  Mail,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Wallet,
  ArrowUpRight,
  TrendingDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PaymentMode, ServiceCategory } from "@prisma/client";

interface SupplierItem {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  category: ServiceCategory;
  gstin?: string | null;
  bankDetails?: string | null;
  totalBilled: string;
  totalPaid: string;
  balanceDue: string;
  transactionCount: number;
}

interface SuppliersClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  initialSuppliers: SupplierItem[];
}

export function SuppliersClient({ user, initialSuppliers }: SuppliersClientProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeSupplier, setActiveSupplier] = useState<SupplierItem | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<ServiceCategory>(ServiceCategory.FLIGHT_TICKET);
  const [gstin, setGstin] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pay form states
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>(PaymentMode.BANK_TRANSFER);
  const [payNotes, setPayNotes] = useState("");

  // Aggregate metrics
  const totalBilledNum = suppliers.reduce((sum, s) => sum + Number(s.totalBilled || 0), 0);
  const totalPaidNum = suppliers.reduce((sum, s) => sum + Number(s.totalPaid || 0), 0);
  const totalDueNum = suppliers.reduce((sum, s) => sum + Number(s.balanceDue || 0), 0);

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm)) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "ALL" || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createSupplierAction({
        name,
        phone,
        email,
        category,
        gstin,
        bankDetails,
      });
      setShowAddModal(false);
      setName("");
      setPhone("");
      setEmail("");
      setGstin("");
      setBankDetails("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to create supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || !payAmount || Number(payAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      await recordSupplierPaymentAction({
        supplierId: activeSupplier.id,
        amount: Number(payAmount),
        paymentMode: payMode,
        notes: payNotes,
      });
      setShowPayModal(false);
      setPayAmount("");
      setPayNotes("");
      setActiveSupplier(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
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
              <div className="p-2 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600">
                <Building2 className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Supplier &amp; Vendor Desk
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Airlines, bus operators, hoteliers, cab vendors, and visa consolidators ledger
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Supplier</span>
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Total Billed by Vendors</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ₹{totalBilledNum.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cumulative invoices received</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Total Settled / Paid
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{totalPaidNum.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cleared through Bank/UPI/Cash</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              Total Payables Due (Outstanding)
            </span>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              ₹{totalDueNum.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-rose-500 mt-0.5">Balance due to travel vendors</p>
          </div>
        </div>

        {/* Category Filters and Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: "ALL", label: "All Vendors" },
              { id: "FLIGHT_TICKET", label: "Airlines" },
              { id: "BUS_TICKET", label: "Bus Operators" },
              { id: "HOTEL_BOOKING", label: "Hotels" },
              { id: "VEHICLE_RENTAL", label: "Cab Vendors" },
              { id: "VISA_SERVICE", label: "Visa Consolidators" },
              { id: "PASSPORT_SERVICE", label: "PSK & Govt" },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  selectedCategory === c.id
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor name, phone, GST..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 pl-6">Vendor Name</th>
                  <th className="py-3.5">Category</th>
                  <th className="py-3.5">Contact &amp; GSTIN</th>
                  <th className="py-3.5 text-right">Total Billed</th>
                  <th className="py-3.5 text-right">Total Paid</th>
                  <th className="py-3.5 text-right">Balance Due</th>
                  <th className="py-3.5 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No suppliers registered yet. Click &quot;Add New Supplier&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => {
                    const hasBalance = Number(s.balanceDue) > 0;

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-4 pl-6">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {s.name}
                          </div>
                          {s.bankDetails && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              Bank: {s.bankDetails}
                            </div>
                          )}
                        </td>
                        <td className="py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold text-[10px]">
                            {s.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="space-y-0.5 text-[11px] text-slate-500">
                            {s.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{s.phone}</span>
                              </div>
                            )}
                            {s.gstin && (
                              <div className="font-mono text-[10px] text-slate-400">
                                GST: {s.gstin}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 text-right text-slate-600 dark:text-slate-300">
                          ₹{Number(s.totalBilled).toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 text-right text-emerald-600 dark:text-emerald-400">
                          ₹{Number(s.totalPaid).toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 text-right">
                          {hasBalance ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              ₹{Number(s.balanceDue).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              All Cleared
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right pr-6">
                          <button
                            onClick={() => {
                              setActiveSupplier(s);
                              setPayAmount(hasBalance ? s.balanceDue : "");
                              setShowPayModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900 text-orange-800 dark:text-orange-200 font-bold text-xs transition"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>Pay Voucher</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add Supplier */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Travel Vendor / Supplier
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Indigo Airlines, Akbar Travels, Madurai Cabs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Service Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 font-semibold"
                    >
                      <option value={ServiceCategory.FLIGHT_TICKET}>Flight Ticket</option>
                      <option value={ServiceCategory.TRAIN_TICKET}>Train Ticket</option>
                      <option value={ServiceCategory.BUS_TICKET}>Bus Ticket</option>
                      <option value={ServiceCategory.HOTEL_BOOKING}>Hotel Booking</option>
                      <option value={ServiceCategory.VEHICLE_RENTAL}>Vehicle Rental</option>
                      <option value={ServiceCategory.VISA_SERVICE}>Visa Service</option>
                      <option value={ServiceCategory.PASSPORT_SERVICE}>Passport Service</option>
                      <option value={ServiceCategory.OTHER}>Other Vendor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9842100000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="vendor@travels.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Account / IFSC / UPI ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SBI A/c: 1234567890, IFSC: SBIN0001234"
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Supplier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Record Payment Voucher */}
        {showPayModal && activeSupplier && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Record Payment Voucher
                  </h3>
                  <p className="text-xs text-slate-500">Pay to {activeSupplier.name}</p>
                </div>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 text-xs flex justify-between items-center font-medium">
                <span>Current Outstanding Due:</span>
                <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                  ₹{Number(activeSupplier.balanceDue).toLocaleString("en-IN")}
                </span>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount to Pay (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Enter amount"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 font-semibold"
                  >
                    <option value={PaymentMode.BANK_TRANSFER}>Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value={PaymentMode.UPI}>UPI (GPay / PhonePe / Paytm)</option>
                    <option value={PaymentMode.CASH}>Cash on Hand</option>
                    <option value={PaymentMode.CARD}>Credit / Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR 42091823901, Settled ticket batch #42"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : "Confirm Payment"}
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
