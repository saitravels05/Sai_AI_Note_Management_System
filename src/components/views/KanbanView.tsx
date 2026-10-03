"use client";

import React from "react";
import { NoteCard } from "@/components/notes/NoteCard";
import { Language, translations } from "@/lib/i18n";
import { PaymentStatus } from "@prisma/client";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface KanbanViewProps {
  records: any[];
  lang: Language;
  onRefresh: () => void;
}

export function KanbanView({ records, lang, onRefresh }: KanbanViewProps) {
  const t = translations[lang];

  const pending = records.filter((r) => r.paymentStatus === PaymentStatus.PENDING);
  const partial = records.filter((r) => r.paymentStatus === PaymentStatus.PARTIAL);
  const completed = records.filter((r) => r.paymentStatus === PaymentStatus.COMPLETED);

  const columns = [
    {
      id: "pending",
      title: t.statuses.PENDING,
      icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
      items: pending,
      bg: "bg-amber-500/5",
      border: "border-amber-200 dark:border-amber-900/40",
    },
    {
      id: "partial",
      title: t.statuses.PARTIAL,
      icon: <Clock className="w-4 h-4 text-blue-500" />,
      items: partial,
      bg: "bg-blue-500/5",
      border: "border-blue-200 dark:border-blue-900/40",
    },
    {
      id: "completed",
      title: t.statuses.COMPLETED,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      items: completed,
      bg: "bg-emerald-500/5",
      border: "border-emerald-200 dark:border-emerald-900/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((col) => (
        <div
          key={col.id}
          className={`flex flex-col rounded-2xl p-4 border ${col.border} ${col.bg} min-h-[500px]`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              {col.icon}
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {col.title}
              </h3>
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white dark:bg-gray-800 shadow-2xs">
              {col.items.length}
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-4 flex-1 overflow-y-auto">
            {col.items.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                No cards in this status
              </div>
            ) : (
              col.items.map((record) => (
                <NoteCard
                  key={record.id}
                  id={record.id}
                  recordNumber={record.recordNumber}
                  title={record.title}
                  notes={record.notes}
                  type={record.type}
                  category={record.category}
                  amount={record.amount}
                  amountPaid={record.amountPaid}
                  balanceDue={record.balanceDue}
                  paymentMode={record.paymentMode}
                  paymentStatus={record.paymentStatus}
                  date={record.date}
                  customerName={record.customer?.name}
                  isPinned={record.isPinned}
                  aiParsed={record.aiParsed}
                  lang={lang}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
