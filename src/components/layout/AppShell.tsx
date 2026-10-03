"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions/auth.actions";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Building2,
  Clock,
  Plane,
  Lock,
  BarChart3,
  Sparkles,
  Settings,
  Shield,
  LogOut,
  Globe,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

interface AppShellProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  metrics?: {
    todayInflow?: string;
    todayOutflow?: string;
    netBalance?: string;
    pendingDues?: string;
  };
  children: React.ReactNode;
}

export function AppShell({ user, metrics, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("Madurai Main PSK Branch");
  const [isTamil, setIsTamil] = useState(false);

  const navItems = [
    { label: isTamil ? "டாஷ்போர்டு" : "Dashboard", href: "/", icon: LayoutDashboard },
    { label: isTamil ? "குறிப்புகள் & வரவு" : "Notes & Journal", href: "/records", icon: FileText },
    { label: isTamil ? "ஜிஎஸ்டி இன்வாய்ஸ்" : "GST Invoices", href: "/invoices", icon: Receipt },
    { label: isTamil ? "வாடிக்கையாளர் 360" : "Customer 360", href: "/customers", icon: Users },
    { label: isTamil ? "சப்ளையர் கணக்கு" : "Supplier Desk", href: "/suppliers", icon: Building2 },
    { label: isTamil ? "வரவேண்டிய பாக்கி" : "Receivables & Aging", href: "/receivables", icon: Clock },
    { label: isTamil ? "பாஸ்போர்ட் & விசா" : "Passport & Visa", href: "/passport-visa", icon: Plane },
    { label: isTamil ? "மாத கணக்கு முடித்தல்" : "Month-End Closing", href: "/month-end", icon: Lock },
    { label: isTamil ? "நிதி அறிக்கைகள்" : "Reports & BI", href: "/reports", icon: BarChart3 },
    { label: isTamil ? "AI ஸ்டுடியோ" : "Gemini AI Studio", href: "/ai-studio", icon: Sparkles, highlight: true },
    { label: isTamil ? "அமைப்புகள்" : "Settings & Backups", href: "/settings", icon: Settings },
    ...(user.role === "OWNER" || user.role === "ADMIN"
      ? [{ label: isTamil ? "பயனாளர் நிர்வாகம்" : "User Access", href: "/users", icon: Shield }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-sm border border-orange-200 dark:border-orange-900 bg-white p-0.5 shrink-0">
            <Image
              src="/brand/logo.jpg"
              alt="Sai Tours and Travels Logo"
              width={44}
              height={44}
              className="object-contain w-full h-full"
              priority
            />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
              SAI Books
            </h1>
            <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold truncate">
              Sai Tours & Travels
            </p>
          </div>
        </div>

        {/* Branch Selector */}
        <div className="px-4 py-2.5 bg-orange-50/50 dark:bg-orange-950/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {selectedBranch}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-orange-500 text-white shadow-xs"
                    : item.highlight
                    ? "text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : ""}`} />
                <span className="truncate">{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 font-bold uppercase">
                    AI
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {user.name}
              </p>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-semibold">
                {user.role}
              </span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <div className="lg:hidden flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/logo.jpg"
            alt="Logo"
            width={32}
            height={32}
            className="rounded-lg object-contain"
          />
          <span className="font-bold text-sm">SAI Books</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                pathname === item.href ? "bg-orange-500 text-white" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          <form action={logoutAction} className="pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            {metrics?.todayInflow && (
              <div className="hidden sm:flex items-center gap-3">
                <div>
                  <span className="text-slate-400">Received Today:</span>{" "}
                  <span className="font-bold text-emerald-600">{metrics.todayInflow}</span>
                </div>
                <div className="border-l border-slate-300 dark:border-slate-700 pl-3">
                  <span className="text-slate-400">Spent Today:</span>{" "}
                  <span className="font-bold text-rose-600">{metrics.todayOutflow}</span>
                </div>
                <div className="border-l border-slate-300 dark:border-slate-700 pl-3">
                  <span className="text-slate-400">Net:</span>{" "}
                  <span className="font-bold text-blue-600">{metrics.netBalance}</span>
                </div>
                {metrics.pendingDues && (
                  <div className="border-l border-slate-300 dark:border-slate-700 pl-3">
                    <span className="text-slate-400">Dues:</span>{" "}
                    <span className="font-bold text-amber-600">{metrics.pendingDues}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTamil(!isTamil)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-orange-500" />
              <span>{isTamil ? "English" : "தமிழ்"}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
