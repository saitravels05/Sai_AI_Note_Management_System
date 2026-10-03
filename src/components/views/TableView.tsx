"use client";

import React, { useState } from "react";
import { Money } from "@/lib/money";
import { Language, translations } from "@/lib/i18n";
import { RecordType } from "@prisma/client";
import { Search } from "lucide-react";

interface TableViewProps {
  records: any[];
  lang: Language;
}

export function TableView({ records, lang }: TableViewProps) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = records.filter(
    (r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.recordNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customer?.name && r.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search records, customer, or record number..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <span className="text-xs text-gray-500 font-medium">
          Showing {filtered.length} of {records.length} records
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="py-3 px-4">Record #</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Title / Reason</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Payment</th>
              <th className="py-3 px-4 text-right">Amount (₹)</th>
              <th className="py-3 px-4 text-right">Due (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {filtered.map((r) => {
              const formattedDate = new Date(r.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const isExpense = r.type === RecordType.EXPENSE || r.type === RecordType.PAYABLE;

              return (
                <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-gray-500">{r.recordNumber}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{formattedDate}</td>
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                    <div>{r.title}</div>
                    {r.customer?.name && (
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                        Customer: {r.customer.name}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {(t.categories as Record<string, string>)[r.category] || r.category}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isExpense
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{r.paymentMode}</td>
                  <td
                    className={`py-3 px-4 text-right font-bold ${
                      isExpense
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {isExpense ? "-" : "+"}
                    {Money.from(r.amount).formatIndian(true)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                    {Money.from(r.balanceDue).isPositive()
                      ? Money.from(r.balanceDue).formatIndian(true)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
