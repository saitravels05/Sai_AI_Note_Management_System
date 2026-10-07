"use client";

import React, { useState, useMemo, useEffect } from "react";
import { translations, Language } from "@/lib/i18n";
import { updateNoteCardAction } from "@/server/actions/notes.actions";
import { RecordType, ServiceCategory, PaymentMode, PaymentStatus } from "@prisma/client";
import { COUNTRY_DIAL_CODES } from "./QuickAddBar";
import {
  X,
  Loader2,
  Check,
  TrendingUp,
  Calculator,
  Phone,
  Calendar,
  FileText,
  Pencil,
  AlertCircle,
} from "lucide-react";

export interface EditNoteCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: {
    id: string;
    recordNumber: string;
    title: string;
    notes?: string | null;
    type: RecordType;
    category: ServiceCategory;
    amount: string | number;
    customerAmount?: string | number | null;
    agentAmount?: string | number | null;
    serviceCharge?: string | number | null;
    amountPaid: string | number;
    balanceDue: string | number;
    paymentMode: PaymentMode;
    paymentStatus?: PaymentStatus;
    date: string | Date;
    customerName?: string | null;
    customerPhone?: string | null;
  };
  lang: Language;
  onUpdated: () => void;
}

export function EditNoteCardModal({
  isOpen,
  onClose,
  record,
  lang,
  onUpdated,
}: EditNoteCardModalProps) {
  const t = translations[lang];

  // Helper to get local YYYY-MM-DD
  const formatInputDate = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  };

  // State
  const [title, setTitle] = useState(record.title);
  const [type, setType] = useState<RecordType>(record.type);
  const [category, setCategory] = useState<ServiceCategory>(record.category);
  const [customerAmount, setCustomerAmount] = useState(
    record.customerAmount !== undefined && record.customerAmount !== null
      ? String(record.customerAmount)
      : String(record.amount || "")
  );
  const [agentAmount, setAgentAmount] = useState(
    record.agentAmount !== undefined && record.agentAmount !== null
      ? String(record.agentAmount)
      : ""
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(record.paymentMode);
  const [partyName, setPartyName] = useState(record.customerName || "");
  const [date, setDate] = useState(formatInputDate(record.date));
  const [dialCode, setDialCode] = useState("+91");
  const [contactNo, setContactNo] = useState("");
  const [notes, setNotes] = useState(record.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever record or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setTitle(record.title);
      setType(record.type);
      setCategory(record.category);
      setCustomerAmount(
        record.customerAmount !== undefined && record.customerAmount !== null
          ? String(record.customerAmount)
          : String(record.amount || "")
      );
      setAgentAmount(
        record.agentAmount !== undefined && record.agentAmount !== null
          ? String(record.agentAmount)
          : ""
      );
      setPaymentMode(record.paymentMode);
      setPartyName(record.customerName || "");
      setDate(formatInputDate(record.date));

      // Extract existing phone number
      let rawPhone = (record.customerPhone || "").trim();
      if (!rawPhone && record.notes) {
        const m = record.notes.match(/Ph:\s*([+\d\s-]+)/);
        if (m) rawPhone = m[1].trim();
      }

      if (rawPhone) {
        const matched = COUNTRY_DIAL_CODES.find((c) => rawPhone.startsWith(c.code));
        if (matched) {
          setDialCode(matched.code);
          setContactNo(rawPhone.slice(matched.code.length).trim());
        } else {
          setDialCode("+91");
          setContactNo(rawPhone);
        }
      } else {
        setDialCode("+91");
        setContactNo("");
      }

      // Clean notes to avoid duplicating phone append
      let cleanedNotes = record.notes || "";
      if (cleanedNotes.includes(" | Ph:")) {
        cleanedNotes = cleanedNotes.split(" | Ph:")[0].trim();
      } else if (cleanedNotes.startsWith("Ph:")) {
        cleanedNotes = "";
      }
      setNotes(cleanedNotes);
      setError(null);
    }
  }, [isOpen, record]);

  // Real-time Service Charge (Profit) calculation
  const serviceChargeValue = useMemo(() => {
    if (!customerAmount && !agentAmount) return "";
    const c = parseFloat(customerAmount) || 0;
    const a = parseFloat(agentAmount) || 0;
    return (c - a).toFixed(2);
  }, [customerAmount, agentAmount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || (!customerAmount && !agentAmount)) {
      setError("Please fill required fields (Title and Amount).");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      let fullPartyPhone: string | undefined = undefined;
      const cleanContact = contactNo.trim();
      if (cleanContact) {
        fullPartyPhone = cleanContact.startsWith("+")
          ? cleanContact
          : `${dialCode} ${cleanContact}`;
      }

      await updateNoteCardAction({
        id: record.id,
        title: title.trim(),
        customerAmount,
        agentAmount: agentAmount || "0",
        serviceCharge: serviceChargeValue,
        amount: customerAmount || agentAmount,
        type,
        category,
        paymentMode,
        partyName: partyName.trim(),
        partyPhone: fullPartyPhone,
        date,
        notes: notes.trim(),
      });

      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update note card.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                <Pencil className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Edit Note Card
              </h3>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                {record.recordNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Modify card details, financial breakdown, party information, or contact number.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Row 1: Title (2 cols) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Note Title / Reason *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Flight Rider (Dummy Ticket)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white font-medium"
              />
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RecordType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              >
                <option value={RecordType.INCOME}>{t.moneyReceived}</option>
                <option value={RecordType.EXPENSE}>{t.moneySpent}</option>
                <option value={RecordType.RECEIVABLE}>{t.dueToReceive}</option>
                <option value={RecordType.PAYABLE}>{t.dueToPay}</option>
                <option value={RecordType.REFUND}>{t.refund}</option>
                <option value={RecordType.TRANSFER}>{t.transfer}</option>
                <option value={RecordType.NOTE}>{t.plainNote}</option>
              </select>
            </div>

            {/* Service Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Service Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              >
                {Object.entries(t.categories).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 2: Customer Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.customerAmount} (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={customerAmount}
                onChange={(e) => setCustomerAmount(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Agent Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.agentAmount} (₹)
              </label>
              <input
                type="number"
                step="any"
                value={agentAmount}
                onChange={(e) => setAgentAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Service Charge (Profit) Auto */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.serviceCharge} (₹)
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                  <Calculator className="w-3 h-3" /> Auto
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={serviceChargeValue ? `₹${serviceChargeValue}` : "₹0.00"}
                className={`w-full px-3 py-2 border rounded-xl text-sm font-bold cursor-default select-none ${
                  parseFloat(serviceChargeValue) > 0
                    ? "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                    : parseFloat(serviceChargeValue) < 0
                    ? "border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900"
                }`}
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              >
                {Object.entries(t.paymentModes).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 3: Customer / Supplier Name (2 cols) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.customerOrSupplier || "Customer / Supplier Name"}
              </label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g. Saranya Manikandan"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Contact No. with Dial Code (2 cols) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-500" />
                  {t.contactPhone || "Contact No. / WhatsApp"}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>
              <div className="flex rounded-xl shadow-2xs">
                <div className="relative shrink-0">
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    className="h-full px-2.5 py-2 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:z-10 cursor-pointer"
                    title="Select Country Dial Code"
                  >
                    {COUNTRY_DIAL_CODES.map((c) => (
                      <option key={`${c.code}-${c.country}`} value={c.code}>
                        {c.flag} {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-1">
                  <input
                    type="tel"
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    placeholder="e.g. 97912 58865"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-r-xl text-sm focus:ring-2 focus:ring-orange-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Transaction Date (2 cols) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Transaction Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white font-medium"
              />
            </div>

            {/* Notes / Remarks (2 cols) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>Notes / Booking Remarks</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or remarks"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Real-time Profit Formula Pill */}
          {customerAmount && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Calculation:
                </span>
                <span>Customer (₹{customerAmount})</span>
                <span>−</span>
                <span>Agent ({agentAmount ? `₹${agentAmount}` : "₹0.00"})</span>
                <span>=</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{serviceChargeValue || "0.00"} Service Charge (Profit)
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {parseFloat(serviceChargeValue) >= 0 ? "Profit" : "Loss"}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Update &amp; Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
