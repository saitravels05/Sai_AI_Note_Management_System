"use client";

import React, { useState } from "react";
import { QuickAddBar } from "@/components/notes/QuickAddBar";
import { NoteCard } from "@/components/notes/NoteCard";
import { TimelineView } from "@/components/views/TimelineView";
import { KanbanView } from "@/components/views/KanbanView";
import { TableView } from "@/components/views/TableView";
import { CalendarView } from "@/components/views/CalendarView";
import { useRouter } from "next/navigation";
import { Search, Filter, LayoutGrid, Clock, ListTodo, Calendar as CalendarIcon, Table as TableIcon } from "lucide-react";

interface RecordsClientProps {
  initialRecords: any[];
}

export function RecordsClient({ initialRecords }: RecordsClientProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<"cards" | "timeline" | "kanban" | "calendar" | "table">("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");

  const filtered = initialRecords.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.recordNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customer?.name && r.customer.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "ALL" || r.category === selectedCategory;
    const matchesType = selectedType === "ALL" || r.type === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Notes & Transactions Journal
          </h2>
          <p className="text-xs text-slate-500">
            Card-based ledger for daily collections, supplier settlements, and tour records
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-xl p-1 self-start sm:self-auto">
          {[
            { id: "cards", label: "Cards", icon: LayoutGrid },
            { id: "timeline", label: "Timeline", icon: Clock },
            { id: "kanban", label: "Board", icon: ListTodo },
            { id: "calendar", label: "Calendar", icon: CalendarIcon },
            { id: "table", label: "Table", icon: TableIcon },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === v.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <v.icon className="w-3.5 h-3.5" />
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Add Bar */}
      <QuickAddBar lang="en" onRecordCreated={() => router.refresh()} />

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search records, passengers, PNR..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
        >
          <option value="ALL">All Categories</option>
          <option value="TOUR_PACKAGE">Tour Packages</option>
          <option value="FLIGHT_TICKET">Flight Tickets</option>
          <option value="HOTEL_BOOKING">Hotel Bookings</option>
          <option value="PASSPORT_SERVICE">Passport Services</option>
          <option value="VISA_SERVICE">Visa Services</option>
          <option value="VEHICLE_RENTAL">Vehicle Rentals</option>
          <option value="OFFICE_EXPENSE">Office Expenses</option>
        </select>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
        >
          <option value="ALL">All Types</option>
          <option value="INCOME">Money Received (Inflow)</option>
          <option value="EXPENSE">Money Spent (Outflow)</option>
          <option value="RECEIVABLE">Customer Dues</option>
          <option value="PAYABLE">Supplier Dues</option>
        </select>

        <span className="text-xs text-slate-400 font-semibold ml-auto">
          {filtered.length} Cards
        </span>
      </div>

      {/* Main View Area */}
      {activeView === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
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
              lang="en"
              onRefresh={() => router.refresh()}
            />
          ))}
        </div>
      )}

      {activeView === "timeline" && (
        <TimelineView records={filtered} lang="en" onRefresh={() => router.refresh()} />
      )}

      {activeView === "kanban" && (
        <KanbanView records={filtered} lang="en" onRefresh={() => router.refresh()} />
      )}

      {activeView === "calendar" && (
        <CalendarView records={filtered} lang="en" onRefresh={() => router.refresh()} />
      )}

      {activeView === "table" && <TableView records={filtered} lang="en" />}
    </div>
  );
}
