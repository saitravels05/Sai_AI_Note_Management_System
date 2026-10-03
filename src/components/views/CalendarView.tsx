"use client";

import React, { useState } from "react";
import { Money } from "@/lib/money";
import { Language, translations } from "@/lib/i18n";
import { RecordType } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NoteCard } from "@/components/notes/NoteCard";

interface CalendarViewProps {
  records: any[];
  lang: Language;
  onRefresh: () => void;
}

export function CalendarView({ records, lang, onRefresh }: CalendarViewProps) {
  const t = translations[lang];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayRecords, setSelectedDayRecords] = useState<any[] | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map records by day of month
  const dayMap: Record<number, any[]> = {};
  for (const r of records) {
    const d = new Date(r.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      if (!dayMap[dayNum]) dayMap[dayNum] = [];
      dayMap[dayNum].push(r);
    }
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{monthName}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Leading empty days */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl" />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayRecords = dayMap[dayNum] || [];

          let dayInflow = Money.zero();
          let dayOutflow = Money.zero();
          for (const r of dayRecords) {
            if (r.type === RecordType.INCOME) dayInflow = dayInflow.add(r.amount);
            if (r.type === RecordType.EXPENSE) dayOutflow = dayOutflow.add(r.amount);
          }

          return (
            <div
              key={`day-${dayNum}`}
              onClick={() => setSelectedDayRecords(dayRecords.length > 0 ? dayRecords : null)}
              className={`h-24 p-2 rounded-xl border border-gray-100 dark:border-gray-700/60 transition-all flex flex-col justify-between cursor-pointer ${
                dayRecords.length > 0
                  ? "bg-orange-50/40 hover:bg-orange-50 dark:bg-gray-800/80 dark:hover:bg-gray-700/80 hover:border-orange-300"
                  : "bg-white dark:bg-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {dayNum}
                </span>
                {dayRecords.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-semibold">
                    {dayRecords.length}
                  </span>
                )}
              </div>

              {dayRecords.length > 0 && (
                <div className="text-[10px] space-y-0.5">
                  {dayInflow.isPositive() && (
                    <div className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                      +{dayInflow.formatIndian(true)}
                    </div>
                  )}
                  {dayOutflow.isPositive() && (
                    <div className="text-rose-600 dark:text-rose-400 font-semibold truncate">
                      -{dayOutflow.formatIndian(true)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Drill-down Modal */}
      {selectedDayRecords && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              <h4 className="font-bold text-gray-900 dark:text-white">
                Entries for Selected Day ({selectedDayRecords.length})
              </h4>
              <button
                onClick={() => setSelectedDayRecords(null)}
                className="text-gray-500 hover:text-gray-700 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              {selectedDayRecords.map((r) => (
                <NoteCard
                  key={r.id}
                  id={r.id}
                  recordNumber={r.recordNumber}
                  title={r.title}
                  notes={r.notes}
                  type={r.type}
                  category={r.category}
                  amount={r.amount}
                  amountPaid={r.amountPaid}
                  balanceDue={r.balanceDue}
                  paymentMode={r.paymentMode}
                  paymentStatus={r.paymentStatus}
                  date={r.date}
                  customerName={r.customer?.name}
                  isPinned={r.isPinned}
                  aiParsed={r.aiParsed}
                  lang={lang}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
