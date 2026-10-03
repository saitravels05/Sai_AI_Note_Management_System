"use client";

import React, { useState } from "react";
import Image from "next/image";
import { translations, Language } from "@/lib/i18n";
import { logoutAction } from "@/server/actions/auth.actions";
import {
  Sparkles,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Download,
  Lock,
  LogOut,
  Globe,
  LayoutGrid,
  ListTodo,
  Clock,
  Table as TableIcon,
  HelpCircle,
} from "lucide-react";

interface NavbarProps {
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
  activeView: string;
  onViewChange: (view: string) => void;
  lang: Language;
  onToggleLang: () => void;
  onOpenMonthEnd: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenAiChat: () => void;
  onOpenTravelHub: () => void;
}

export function Navbar({
  user,
  metrics,
  activeView,
  onViewChange,
  lang,
  onToggleLang,
  onOpenMonthEnd,
  onOpenExport,
  onOpenImport,
  onOpenAiChat,
  onOpenTravelHub,
}: NavbarProps) {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-xs">
      {/* Top Brand & Actions Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-xs border border-orange-200 dark:border-orange-900 bg-white p-0.5">
            <Image
              src="/brand/logo.jpg"
              alt="Sai Tours and Travels Logo"
              width={48}
              height={48}
              className="object-contain w-full h-full"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t.appName}
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                Tours & Travels
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sai Tours and Travels • Madurai
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          {/* AI Assistant Button */}
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{t.aiAssistant}</span>
          </button>

          {/* Tours & Visa Hub */}
          <button
            onClick={onOpenTravelHub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-orange-500" />
            <span className="hidden md:inline">Travel Hub</span>
          </button>

          {/* Month-End Close Wizard */}
          <button
            onClick={onOpenMonthEnd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span className="hidden md:inline">{t.closeMonthTitle}</span>
          </button>

          {/* Excel Import */}
          <button
            onClick={onOpenImport}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-all cursor-pointer"
            title={t.excelImport}
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          {/* Export Reports */}
          <button
            onClick={onOpenExport}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-all cursor-pointer"
            title={t.export}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Language Switch */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "தமிழ்" : "English"}</span>
          </button>

          {/* User Badge & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-800">
            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 font-medium text-gray-700 dark:text-gray-300 hidden lg:inline">
              {user.role}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                title={t.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Live Financial Summary Strip (Zero Accounting Jargon) */}
      <div className="bg-gray-50 dark:bg-gray-800/60 border-t border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto gap-4 text-xs">
          <div className="flex items-center gap-6 shrink-0">
            <div>
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {t.moneyReceived}:
              </span>{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {metrics.todayInflow}
              </span>
            </div>

            <div className="border-l border-gray-300 dark:border-gray-700 pl-4">
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {t.moneySpent}:
              </span>{" "}
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                {metrics.todayOutflow}
              </span>
            </div>

            <div className="border-l border-gray-300 dark:border-gray-700 pl-4">
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {t.netProfit}:
              </span>{" "}
              <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                {metrics.netBalance}
              </span>
            </div>

            <div className="border-l border-gray-300 dark:border-gray-700 pl-4">
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {t.totalDues}:
              </span>{" "}
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                {metrics.pendingDues}
              </span>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-200/70 dark:bg-gray-900 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => onViewChange("cards")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeView === "cards"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t.views.cards}</span>
            </button>
            <button
              onClick={() => onViewChange("timeline")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeView === "timeline"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t.views.timeline}</span>
            </button>
            <button
              onClick={() => onViewChange("kanban")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeView === "kanban"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>{t.views.kanban}</span>
            </button>
            <button
              onClick={() => onViewChange("calendar")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeView === "calendar"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t.views.calendar}</span>
            </button>
            <button
              onClick={() => onViewChange("table")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeView === "table"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{t.views.table}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
