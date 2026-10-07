"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { QuickAddBar } from "@/components/notes/QuickAddBar";
import { NoteCard } from "@/components/notes/NoteCard";
import { TimelineView } from "@/components/views/TimelineView";
import { KanbanView } from "@/components/views/KanbanView";
import { CalendarView } from "@/components/views/CalendarView";
import { TableView } from "@/components/views/TableView";
import { MonthEndWizard } from "@/components/monthend/MonthEndWizard";
import { ReportExporter } from "@/components/reports/ReportExporter";
import { ExcelImporter } from "@/components/import/ExcelImporter";
import { AiChatModal } from "@/components/ai/AiChatModal";
import { PassportVisaTracker } from "@/components/travel/PassportVisaTracker";
import { Language, translations } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { Sparkles, Pin } from "lucide-react";

interface DashboardClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  metrics: {
    todayInflow: string;
    todayOutflow: string;
    netBalance: string;
    pendingDues: string;
  };
  initialRecords: any[];
}

export function DashboardClient({
  user,
  metrics,
  initialRecords,
}: DashboardClientProps) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("en");
  const [activeView, setActiveView] = useState("cards");

  // Modal visibility states
  const [showMonthEnd, setShowMonthEnd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showTravelHub, setShowTravelHub] = useState(false);

  const t = translations[lang];

  const handleRefresh = () => {
    router.refresh();
  };

  const pinnedRecords = initialRecords.filter((r) => r.isPinned);
  const normalRecords = initialRecords.filter((r) => !r.isPinned);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar
        user={user}
        metrics={metrics}
        activeView={activeView}
        onViewChange={setActiveView}
        lang={lang}
        onToggleLang={() => setLang(lang === "en" ? "ta" : "en")}
        onOpenMonthEnd={() => setShowMonthEnd(true)}
        onOpenExport={() => setShowExport(true)}
        onOpenImport={() => setShowImport(true)}
        onOpenAiChat={() => setShowAiChat(true)}
        onOpenTravelHub={() => setShowTravelHub(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Add Sentence Input Bar */}
        <QuickAddBar lang={lang} onRecordCreated={handleRefresh} />

        {/* View Render Area */}
        {activeView === "cards" && (
          <div className="space-y-6">
            {/* Pinned Section */}
            {pinnedRecords.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <Pin className="w-3.5 h-3.5 text-orange-500 rotate-45" />
                  <span>Pinned Cards</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedRecords.map((r) => (
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
                      customerPhone={r.customer?.phone}
                      isPinned={r.isPinned}
                      aiParsed={r.aiParsed}
                      lang={lang}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Recent Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Recent Note Cards ({initialRecords.length})
                </h3>
              </div>

              {normalRecords.length === 0 && pinnedRecords.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-8">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600 mx-auto mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    No note cards yet
                  </h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                    Type a sentence in the Quick-Add bar above (e.g. &quot;Received 5000 from Kumar for ticket by UPI&quot;) or click Manual Form.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {normalRecords.map((r) => (
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
                      customerPhone={r.customer?.phone}
                      isPinned={r.isPinned}
                      aiParsed={r.aiParsed}
                      lang={lang}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === "timeline" && (
          <TimelineView
            records={initialRecords}
            lang={lang}
            onRefresh={handleRefresh}
          />
        )}

        {activeView === "kanban" && (
          <KanbanView
            records={initialRecords}
            lang={lang}
            onRefresh={handleRefresh}
          />
        )}

        {activeView === "calendar" && (
          <CalendarView
            records={initialRecords}
            lang={lang}
            onRefresh={handleRefresh}
          />
        )}

        {activeView === "table" && (
          <TableView records={initialRecords} lang={lang} />
        )}
      </main>

      {/* Modals */}
      {showMonthEnd && (
        <MonthEndWizard
          lang={lang}
          onClose={() => setShowMonthEnd(false)}
          onRefresh={handleRefresh}
        />
      )}

      {showExport && (
        <ReportExporter
          lang={lang}
          onClose={() => setShowExport(false)}
        />
      )}

      {showImport && (
        <ExcelImporter
          lang={lang}
          onClose={() => setShowImport(false)}
          onRefresh={handleRefresh}
        />
      )}

      {showAiChat && (
        <AiChatModal
          lang={lang}
          onClose={() => setShowAiChat(false)}
        />
      )}

      {showTravelHub && (
        <PassportVisaTracker
          lang={lang}
          onClose={() => setShowTravelHub(false)}
        />
      )}
    </div>
  );
}
