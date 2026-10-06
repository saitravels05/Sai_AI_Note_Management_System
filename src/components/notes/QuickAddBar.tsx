"use client";

import React, { useState } from "react";
import { translations, Language } from "@/lib/i18n";
import { parseSentenceAction, createNoteCardAction } from "@/server/actions/notes.actions";
import { RecordType, ServiceCategory, PaymentMode } from "@prisma/client";
import { Sparkles, ArrowRight, Check, X, Loader2, PlusCircle } from "lucide-react";

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
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<RecordType>(RecordType.INCOME);
  const [category, setCategory] = useState<ServiceCategory>(ServiceCategory.OTHER);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [partyName, setPartyName] = useState("");
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);

  const handleParse = async (inputStr?: string) => {
    const textToParse = inputStr || sentence;
    if (!textToParse.trim()) return;

    setIsParsing(true);
    try {
      const parsed = await parseSentenceAction(textToParse);
      setTitle(parsed.title);
      setAmount(parsed.amount > 0 ? String(parsed.amount) : "");
      setType(parsed.type);
      setCategory(parsed.category);
      setPaymentMode(parsed.paymentMode);
      setPartyName(parsed.partyName || "");
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
    if (!title || !amount) return;

    setIsSaving(true);
    try {
      await createNoteCardAction({
        title,
        amount,
        type,
        category,
        paymentMode,
        partyName,
        notes,
      });

      // Reset
      setSentence("");
      setTitle("");
      setAmount("");
      setPartyName("");
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6 transition-all">
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
          <span>{isExpanded ? "Collapse" : "Manual Form"}</span>
        </button>
      </div>

      {/* Suggested Sentences for Beginners */}
      {!isExpanded && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold shrink-0">Try typing:</span>
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
            &quot;Paid 3500 to Taj Hotel by Bank&quot;
          </button>
        </div>
      )}

      {/* Expanded Confirmation / Edit Form */}
      {isExpanded && (
        <form onSubmit={handleSave} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
          {confidence && (
            <div className="col-span-full flex items-center justify-between bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded-lg text-xs text-orange-800 dark:text-orange-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                AI parsed with {(confidence * 100).toFixed(0)}% confidence. Review or edit below:
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Title */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Note Title / Reason *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ramesh – Goa package – advance"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Transaction Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RecordType)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            >
              <option value={RecordType.INCOME}>{t.moneyReceived}</option>
              <option value={RecordType.EXPENSE}>{t.moneySpent}</option>
              <option value={RecordType.RECEIVABLE}>{t.dueToReceive}</option>
              <option value={RecordType.PAYABLE}>{t.dueToPay}</option>
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
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            >
              {Object.entries(t.categories).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            >
              {Object.entries(t.paymentModes).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Customer / Supplier Name */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Customer / Supplier Name
            </label>
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="e.g. Kumar / Air India"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

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
              <span>Confirm & Save Card</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
