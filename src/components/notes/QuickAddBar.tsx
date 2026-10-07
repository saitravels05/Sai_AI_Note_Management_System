"use client";

import React, { useState, useMemo } from "react";
import { translations, Language } from "@/lib/i18n";
import { parseSentenceAction, createNoteCardAction } from "@/server/actions/notes.actions";
import { RecordType, ServiceCategory, PaymentMode } from "@prisma/client";
import {
  Sparkles,
  Check,
  Loader2,
  PlusCircle,
  TrendingUp,
  Calculator,
  Phone,
  Calendar,
  Hash,
  ArrowRightLeft,
} from "lucide-react";

export const COUNTRY_DIAL_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+960", country: "Maldives", flag: "🇲🇻" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+1", country: "USA / Canada", flag: "🇺🇸" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
];

interface QuickAddBarProps {
  lang: Language;
  onRecordCreated: () => void;
}

export function QuickAddBar({ lang, onRecordCreated }: QuickAddBarProps) {
  const t = translations[lang];
  const [sentence, setSentence] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [customerAmount, setCustomerAmount] = useState("");
  const [agentAmount, setAgentAmount] = useState("");
  const [type, setType] = useState<RecordType>(RecordType.INCOME);
  const [category, setCategory] = useState<ServiceCategory>(ServiceCategory.OTHER);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [transferToMode, setTransferToMode] = useState<PaymentMode>(PaymentMode.BANK_TRANSFER);
  const [partyName, setPartyName] = useState("");
  const [dialCode, setDialCode] = useState("+91");
  const [contactNo, setContactNo] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [passengerCount, setPassengerCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);

  // Auto-calculated Service Charge (Profit) = Customer Amount - Agent Amount
  const serviceChargeValue = useMemo(() => {
    if (!customerAmount && !agentAmount) return "";
    const c = parseFloat(customerAmount) || 0;
    const a = parseFloat(agentAmount) || 0;
    return (c - a).toFixed(2);
  }, [customerAmount, agentAmount]);

  const handleParse = async (inputStr?: string) => {
    const textToParse = inputStr || sentence;
    if (!textToParse.trim()) return;

    setIsParsing(true);
    try {
      const parsed = await parseSentenceAction(textToParse);
      setTitle(parsed.title);
      setCustomerAmount(
        parsed.customerAmount !== undefined && parsed.customerAmount > 0
          ? String(parsed.customerAmount)
          : parsed.amount > 0
          ? String(parsed.amount)
          : ""
      );
      setAgentAmount(
        parsed.agentAmount !== undefined && parsed.agentAmount > 0
          ? String(parsed.agentAmount)
          : ""
      );
      setType(parsed.type);
      setCategory(parsed.category);
      setPaymentMode(parsed.paymentMode);
      setPartyName(parsed.partyName || "");
      if (parsed.partyPhone) {
        const rawPhone = parsed.partyPhone.trim();
        const matchedDial = COUNTRY_DIAL_CODES.find((c) => rawPhone.startsWith(c.code));
        if (matchedDial) {
          setDialCode(matchedDial.code);
          setContactNo(rawPhone.slice(matchedDial.code.length).trim());
        } else if (rawPhone.startsWith("+")) {
          setContactNo(rawPhone);
        } else {
          setDialCode("+91");
          setContactNo(rawPhone);
        }
      }
      setNotes(parsed.notes || textToParse);
      setConfidence(parsed.confidence);
      setIsExpanded(true);
    } catch (err) {
      console.error("Parse failed:", err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (type !== RecordType.NOTE && !customerAmount && !agentAmount) return;

    setIsSaving(true);
    try {
      let fullPartyPhone: string | undefined = undefined;
      const cleanContact = contactNo.trim();
      if (cleanContact) {
        fullPartyPhone = cleanContact.startsWith("+")
          ? cleanContact
          : `${dialCode} ${cleanContact}`;
      }

      await createNoteCardAction({
        title,
        customerAmount: customerAmount || "0",
        agentAmount: agentAmount || "0",
        serviceCharge: serviceChargeValue,
        amount: customerAmount || agentAmount || "0",
        type,
        category,
        paymentMode,
        transferToMode: type === RecordType.TRANSFER ? transferToMode : undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        travelDate: travelDate || undefined,
        passengerCount: parseInt(passengerCount) || 1,
        partyName: partyName.trim() || undefined,
        partyPhone: fullPartyPhone,
        notes,
      });

      // Reset
      setSentence("");
      setTitle("");
      setCustomerAmount("");
      setAgentAmount("");
      setPartyName("");
      setContactNo("");
      setDialCode("+91");
      setReferenceNumber("");
      setTravelDate("");
      setPassengerCount("1");
      setNotes("");
      setIsExpanded(false);
      setConfidence(null);
      onRecordCreated();
    } catch (err: any) {
      alert(err.message || "Failed to save note card.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 p-4 mb-6 transition-all">
      {/* Top Input Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleParse()}
            placeholder={t.quickAddPlaceholder}
            className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-white"
          />
          <button
            onClick={() => handleParse()}
            disabled={isParsing || !sentence.trim()}
            className="absolute right-2 top-2 p-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition-all cursor-pointer"
            title="Parse with AI"
          >
            {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full sm:w-auto px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-orange-500" />
          <span>{isExpanded ? "Collapse" : "Full Entry Form"}</span>
        </button>
      </div>

      {/* Suggested Sentences */}
      {!isExpanded && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold shrink-0">Try typing:</span>
          <button
            onClick={() => {
              const text = "Train Ticket (Chennai - Ahmedabad) customer 13127.20 agent 12500 Trichy Office by UPI";
              setSentence(text);
              handleParse(text);
            }}
            className="px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 shrink-0 cursor-pointer font-medium border border-orange-200 dark:border-orange-800"
          >
            &quot;Train Ticket Chennai to Ahmedabad cust 13127.20 agent 12500 by UPI&quot;
          </button>
          <button
            onClick={() => {
              setSentence("Received 5000 from Kumar for Chennai flight ticket via UPI");
              handleParse("Received 5000 from Kumar for Chennai flight ticket via UPI");
            }}
            className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 shrink-0 cursor-pointer"
          >
            &quot;Received 5000 from Kumar for Chennai flight ticket by UPI&quot;
          </button>
          <button
            onClick={() => {
              setSentence("Paid 3500 to Taj Hotel for Madurai booking by Bank");
              handleParse("Paid 3500 to Taj Hotel for Madurai booking by Bank");
            }}
            className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 shrink-0 cursor-pointer"
          >
            &quot;Paid 3500 to Taj Hotel for Madurai booking by Bank&quot;
          </button>
        </div>
      )}

      {/* Expanded Manual Entry Form */}
      {isExpanded && (
        <form onSubmit={handleSave} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {confidence && (
            <div className="col-span-full flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 text-xs text-orange-800 dark:text-orange-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                Parsed with Gemini AI ({Math.round(confidence * 100)}% confidence). Please confirm and save.
              </span>
            </div>
          )}

          {/* Title */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Title / Description *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flight Ticket (MAA - DXB)"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Entry Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RecordType)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
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

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Service Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceCategory)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
            >
              {Object.entries(t.categories).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Amount */}
          {type !== RecordType.NOTE && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Customer / Bill Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={customerAmount}
                onChange={(e) => setCustomerAmount(e.target.value)}
                placeholder="e.g. 13127.20"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          )}

          {/* Agent Amount */}
          {type !== RecordType.NOTE && type !== RecordType.TRANSFER && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Agent / Cost Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                value={agentAmount}
                onChange={(e) => setAgentAmount(e.target.value)}
                placeholder="e.g. 12500.00"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          )}

          {/* Service Charge (Profit) - Auto calculated */}
          {type !== RecordType.NOTE && type !== RecordType.TRANSFER && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Profit / Margin (₹)
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                  <Calculator className="w-3 h-3" /> Auto
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={serviceChargeValue ? `₹${serviceChargeValue}` : "₹0.00"}
                className={`w-full px-3 py-2 border rounded-lg text-sm font-bold cursor-default select-none font-mono ${
                  parseFloat(serviceChargeValue) > 0
                    ? "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                    : parseFloat(serviceChargeValue) < 0
                    ? "border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900"
                }`}
              />
            </div>
          )}

          {/* Payment Mode */}
          {type !== RecordType.NOTE && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                {type === RecordType.TRANSFER ? "Transfer From Mode" : "Payment Mode"}
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
              >
                {Object.entries(t.paymentModes).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Transfer Destination Mode */}
          {type === RecordType.TRANSFER && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                <span>Transfer To Mode</span>
              </label>
              <select
                value={transferToMode}
                onChange={(e) => setTransferToMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
              >
                <option value={PaymentMode.BANK_TRANSFER}>Bank Transfer (NEFT/IMPS)</option>
                <option value={PaymentMode.CASH}>Cash in Hand</option>
                <option value={PaymentMode.UPI}>UPI (GPay / PhonePe)</option>
              </select>
            </div>
          )}

          {/* Customer / Supplier Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              {t.customerOrSupplier || "Customer / Supplier Name"}
            </label>
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Contact No. with Dial Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-orange-500" />
                {t.contactPhone || "Contact No."}
              </span>
              <span className="text-[10px] text-gray-400">Optional</span>
            </label>
            <div className="flex rounded-lg shadow-2xs">
              <div className="relative shrink-0">
                <select
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  className="h-full px-2.5 py-2 bg-gray-100 dark:bg-gray-800 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg text-xs font-semibold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 focus:z-10 cursor-pointer"
                  title="Select Country Dial Code"
                >
                  {COUNTRY_DIAL_CODES.map((c) => (
                    <option key={`${c.code}-${c.country}`} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <input
                  type="tel"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  placeholder="98401 23456"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-r-lg text-sm focus:ring-2 focus:ring-orange-500 font-mono text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Reference # / PNR / ARN */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Hash className="w-3 h-3 text-slate-400" />
              <span>Reference # / PNR / ARN</span>
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. PNR-678912 or ARN-1234"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-mono text-gray-900 dark:text-white"
            />
          </div>

          {/* Travel Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Travel / Appointment Date</span>
            </label>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Real-time Profit Formula Pill */}
          {customerAmount && type !== RecordType.NOTE && type !== RecordType.TRANSFER && (
            <div className="col-span-full flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Live Profit Formula:
                </span>
                <span>Customer (₹{customerAmount})</span>
                <span>−</span>
                <span>Agent ({agentAmount ? `₹${agentAmount}` : "₹0.00"})</span>
                <span>=</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  ₹{serviceChargeValue || "0.00"} Profit Margin
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {parseFloat(serviceChargeValue) >= 0 ? "Surplus Profit" : "Loss Margin"}
              </span>
            </div>
          )}

          {/* Submit Action */}
          <div className="col-span-full flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 cursor-pointer"
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
              <span>Confirm &amp; Save Journal Entry</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
