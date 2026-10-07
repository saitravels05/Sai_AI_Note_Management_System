"use client";

import React from "react";
import { NoteCard, NoteCardProps } from "@/components/notes/NoteCard";
import { Language } from "@/lib/i18n";
import { Calendar } from "lucide-react";

interface TimelineViewProps {
  records: any[];
  lang: Language;
  onRefresh: () => void;
}

export function TimelineView({ records, lang, onRefresh }: TimelineViewProps) {
  // Group records by Date (YYYY-MM-DD)
  const grouped: Record<string, any[]> = {};
  for (const r of records) {
    const dateKey = new Date(r.date).toISOString().split("T")[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(r);
  }

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No transactions recorded yet. Use the Quick-Add bar above to create your first note card.
      </div>
    );
  }

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
      {sortedDates.map((dateStr) => {
        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        return (
          <div key={dateStr} className="relative pl-8">
            {/* Timeline Dot */}
            <div className="absolute left-1.5 top-1 w-4 h-4 rounded-full bg-orange-500 ring-4 ring-white dark:ring-gray-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {formattedDate}
              </h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                {grouped[dateStr].length} entries
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped[dateStr].map((record) => (
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
                  customerPhone={record.customer?.phone}
                  isPinned={record.isPinned}
                  aiParsed={record.aiParsed}
                  lang={lang}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
