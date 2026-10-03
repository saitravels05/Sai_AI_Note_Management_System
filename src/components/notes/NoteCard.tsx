"use client";

import React, { useState } from "react";
import { translations, Language } from "@/lib/i18n";
import { Money } from "@/lib/money";
import { voidNoteCardAction } from "@/server/actions/notes.actions";
import { RecordType, PaymentMode, ServiceCategory, PaymentStatus } from "@prisma/client";
import {
  Pin,
  Calendar,
  User,
  CreditCard,
  Tag,
  AlertCircle,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

export interface NoteCardProps {
  id: string;
  recordNumber: string;
  title: string;
  notes?: string | null;
  type: RecordType;
  category: ServiceCategory;
  amount: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  date: string | Date;
  customerName?: string | null;
  isPinned: boolean;
  color?: string | null;
  aiParsed?: boolean;
  lang: Language;
  onRefresh: () => void;
}

export function NoteCard({
  id,
  recordNumber,
  title,
  notes,
  type,
  category,
  amount,
  amountPaid,
  balanceDue,
  paymentMode,
  paymentStatus,
  date,
  customerName,
  isPinned,
  aiParsed,
  lang,
  onRefresh,
}: NoteCardProps) {
  const t = translations[lang];
  const [isVoiding, setIsVoiding] = useState(false);

  const formattedAmount = Money.from(amount).formatIndian(true);
  const formattedDue = Money.from(balanceDue).formatIndian(true);
  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const getTypeStyle = () => {
    switch (type) {
      case RecordType.INCOME:
        return {
          border: "border-emerald-200 dark:border-emerald-800",
          badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
          amountColor: "text-emerald-600 dark:text-emerald-400",
          label: t.moneyReceived,
        };
      case RecordType.EXPENSE:
        return {
          border: "border-rose-200 dark:border-rose-800",
          badge: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
          amountColor: "text-rose-600 dark:text-rose-400",
          label: t.moneySpent,
        };
      case RecordType.RECEIVABLE:
        return {
          border: "border-amber-200 dark:border-amber-800",
          badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
          amountColor: "text-amber-600 dark:text-amber-400",
          label: t.dueToReceive,
        };
      case RecordType.PAYABLE:
        return {
          border: "border-purple-200 dark:border-purple-800",
          badge: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
          amountColor: "text-purple-600 dark:text-purple-400",
          label: t.dueToPay,
        };
    }
  };

  const style = getTypeStyle();

  const handleVoid = async () => {
    const reason = prompt("Enter a reason to cancel/void this card:");
    if (!reason) return;

    setIsVoiding(true);
    try {
      await voidNoteCardAction(id, reason);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to void record.");
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all border ${style.border}`}
    >
      {/* Top Header: Record # and Date */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
        <div className="flex items-center gap-1.5 font-mono font-medium">
          <span>{recordNumber}</span>
          {aiParsed && (
            <span title="Parsed with AI" className="text-orange-500">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>
          <button
            onClick={handleVoid}
            disabled={isVoiding}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded transition-all cursor-pointer"
            title="Void / Cancel Card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content: Title and Amount */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">
          {title}
        </h3>
        <span className={`text-lg font-bold shrink-0 ${style.amountColor}`}>
          {type === RecordType.EXPENSE || type === RecordType.PAYABLE ? "-" : "+"}
          {formattedAmount}
        </span>
      </div>

      {/* Optional Free-text Notes */}
      {notes && (
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3 bg-gray-50 dark:bg-gray-900/60 p-2 rounded-lg">
          {notes}
        </p>
      )}

      {/* Badges Footer: Category, Payment Mode, Customer, Dues */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
        {/* Type Badge */}
        <span className={`px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
          {style.label}
        </span>

        {/* Category Badge */}
        <span className="px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {t.categories[category] || category}
        </span>

        {/* Payment Mode Badge */}
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium">
          <CreditCard className="w-3 h-3" />
          {t.paymentModes[paymentMode] || paymentMode}
        </span>

        {/* Customer Badge */}
        {customerName && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-medium">
            <User className="w-3 h-3" />
            {customerName}
          </span>
        )}

        {/* Balance Due indicator if pending */}
        {Money.from(balanceDue).greaterThan(0) && (
          <span className="ml-auto flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            Due: {formattedDue}
          </span>
        )}
      </div>
    </div>
  );
}
