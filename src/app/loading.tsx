import React from "react";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row text-slate-900 dark:text-slate-100">
      {/* Top glowing orange instant progress indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 animate-pulse z-50 shadow-sm" />

      {/* Desktop Sidebar Skeleton */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-100 dark:bg-orange-950/40 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-24 animate-pulse" />
            <div className="h-3 bg-orange-200 dark:bg-orange-900/40 rounded-md w-28 animate-pulse" />
          </div>
        </div>

        {/* Branch Selector Skeleton */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-md w-36 animate-pulse" />
        </div>

        {/* Nav Items Skeleton */}
        <nav className="flex-1 p-3 space-y-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 animate-pulse"
            >
              <div className="w-4 h-4 rounded-md bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-28" />
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-32 animate-pulse" />
            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-32 animate-pulse" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header Title Shimmer */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-48 animate-pulse" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md w-64 animate-pulse" />
            </div>
            <div className="h-10 bg-orange-100 dark:bg-orange-950/40 rounded-xl w-32 animate-pulse" />
          </div>

          {/* Metric Cards Shimmer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-pulse"
              >
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="h-7 bg-slate-300 dark:bg-slate-700 rounded-md w-32" />
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-24" />
              </div>
            ))}
          </div>

          {/* Table / Content Shimmer */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-pulse">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-md w-40" />
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-11 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
