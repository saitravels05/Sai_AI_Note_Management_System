"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  updateBusinessProfileAction,
  createBranchAction,
  createDatabaseBackupAction,
} from "@/server/actions/settings.actions";
import {
  Settings,
  Building2,
  MapPin,
  Phone,
  Mail,
  Shield,
  Download,
  Plus,
  CheckCircle2,
  X,
  FileJson,
  Sparkles,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SettingsClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  initialData: {
    business: {
      name: string;
      legalName: string;
      gstin: string;
      address: string;
      phone: string;
      email: string;
      currencySymbol: string;
      defaultGstRate: string;
      aiEnabled: boolean;
    } | null;
    branches: Array<{
      id: string;
      name: string;
      code: string;
      city: string;
      phone: string;
      address: string;
      isMain: boolean;
    }>;
  };
}

export function SettingsClient({ user, initialData }: SettingsClientProps) {
  const router = useRouter();
  const [business, setBusiness] = useState(
    initialData.business || {
      name: "Sai Tours and Travels",
      legalName: "Sai Tours and Travels",
      gstin: "33AAAAA0000A1Z5",
      address: "Near Madurai PSK, Mattuthavani, Madurai - 625020",
      phone: "+91 98421 00000",
      email: "saipassportmdu@gmail.com",
      currencySymbol: "₹",
      defaultGstRate: "5.00",
      aiEnabled: true,
    }
  );

  const [branches, setBranches] = useState(initialData.branches);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Branch modal
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchCity, setBranchCity] = useState("Madurai");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  // Backup state
  const [isExportingBackup, setIsExportingBackup] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg("");
    try {
      await updateBusinessProfileAction({
        name: business.name,
        legalName: business.legalName,
        gstin: business.gstin,
        address: business.address,
        phone: business.phone,
        email: business.email,
        defaultGstRate: Number(business.defaultGstRate),
      });
      setProfileSuccessMsg("Business profile updated successfully!");
      setTimeout(() => setProfileSuccessMsg(""), 3000);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim()) return;

    setIsSavingBranch(true);
    try {
      const res = await createBranchAction({
        name: branchName,
        code: branchCode,
        city: branchCity,
        phone: branchPhone,
        address: branchAddress,
      });
      setShowBranchModal(false);
      setBranchName("");
      setBranchCode("");
      setBranchPhone("");
      setBranchAddress("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to create branch");
    } finally {
      setIsSavingBranch(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsExportingBackup(true);
    try {
      const res = await createDatabaseBackupAction();
      const blob = new Blob([res.jsonContent], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Failed to export backup");
    } finally {
      setIsExportingBackup(false);
    }
  };

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600">
                <Settings className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Business Settings &amp; Branches
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Configure GSTIN, branch outlets, invoice headers, and full encrypted disaster recovery snapshots
            </p>
          </div>
        </div>

        {/* 2-Column Grid: Business Profile & Branches/Backups */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Business Profile Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Agency Profile &amp; GST Details
                </h3>
                <p className="text-xs text-slate-500">
                  Information printed on GST Tax Invoices and customer receipts
                </p>
              </div>

              {profileSuccessMsg && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trade / Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={business.name}
                    onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Legal Name (For GST)
                  </label>
                  <input
                    type="text"
                    value={business.legalName}
                    onChange={(e) => setBusiness({ ...business, legalName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={business.gstin}
                    onChange={(e) =>
                      setBusiness({ ...business, gstin: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={business.phone}
                    onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={business.email}
                    onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Office Address
                </label>
                <textarea
                  rows={2}
                  value={business.address}
                  onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default GST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={business.defaultGstRate}
                    onChange={(e) =>
                      setBusiness({ ...business, defaultGstRate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    disabled
                    value="₹ (INR - Indian Rupee)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {isSavingProfile ? "Saving Profile..." : "Save Business Profile"}
                </button>
              </div>
            </form>
          </div>

          {/* Column 3: Multi-Branch & Disaster Recovery Backups */}
          <div className="space-y-6">
            {/* Multi-Branch Management */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Operational Branches
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Madurai outlets &amp; airport counters
                  </p>
                </div>
                <button
                  onClick={() => setShowBranchModal(true)}
                  className="p-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300 transition"
                  title="Add Branch"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {branches.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-400 text-center">
                    Madurai Main PSK Branch (Default)
                  </div>
                ) : (
                  branches.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{b.name}</span>
                          {b.isMain && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                              Main HQ
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {b.city} • Code: {b.code}
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Disaster Recovery Snapshot Export */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Database Snapshot Backup
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Download a complete, offline JSON snapshot of all records, customer ledgers, invoices, and passport applications for disaster recovery.
              </p>

              {user.role === "OWNER" || user.role === "ADMIN" ? (
                <button
                  onClick={handleDownloadBackup}
                  disabled={isExportingBackup}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isExportingBackup ? "Packaging Backup..." : "Export Full Database (.json)"}
                  </span>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Security Notice: Only Business Owner can download offline snapshots.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Add Branch */}
        {showBranchModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Operating Branch
                </h3>
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mattuthavani Bus Stand Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Branch Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MDU-BUS"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={branchCity}
                      onChange={(e) => setBranchCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0452-2500000"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Address
                  </label>
                  <input
                    type="text"
                    placeholder="Shop #12, Omnibus Stand, Madurai"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBranch}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md transition disabled:opacity-50"
                  >
                    {isSavingBranch ? "Saving..." : "Add Branch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
