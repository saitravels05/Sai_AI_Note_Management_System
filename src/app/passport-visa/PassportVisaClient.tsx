"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  createPassportApplicationAction,
  updatePassportStatusAction,
  toggleChecklistItemAction,
} from "@/server/actions/passport.actions";
import {
  Plane,
  Plus,
  Search,
  CheckSquare,
  Square,
  Calendar,
  Phone,
  Mail,
  FileText,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  X,
  MapPin,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PassportAppStatus, PaymentMode } from "@prisma/client";

interface PassportApplicationItem {
  id: string;
  applicantName: string;
  phone: string;
  email?: string | null;
  serviceType: string;
  arnNumber?: string | null;
  appointmentDate?: string | null;
  pskLocation?: string | null;
  status: PassportAppStatus;
  checklistItems: string[];
  documentsCollected: string[];
  governmentFee: string;
  serviceCharge: string;
  totalCharge: string;
  amountPaid: string;
  balanceDue: string;
  notes?: string | null;
}

interface PassportVisaClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  initialApplications: PassportApplicationItem[];
}

const STATUS_CONFIG: Record<
  PassportAppStatus,
  { label: string; bg: string; color: string; step: number }
> = {
  DOCS_COLLECTING: {
    label: "1. Collecting Docs",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    color: "text-amber-700 dark:text-amber-300",
    step: 1,
  },
  APPLICATION_FILED: {
    label: "2. Form Filed Online",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    color: "text-sky-700 dark:text-sky-300",
    step: 2,
  },
  APPOINTMENT_SCHEDULED: {
    label: "3. PSK Appt Fixed",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    color: "text-indigo-700 dark:text-indigo-300",
    step: 3,
  },
  VERIFICATION_PENDING: {
    label: "4. Police Verification",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    color: "text-purple-700 dark:text-purple-300",
    step: 4,
  },
  PASSPORT_DISPATCHED: {
    label: "5. Printed / In Transit",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    color: "text-blue-700 dark:text-blue-300",
    step: 5,
  },
  COMPLETED: {
    label: "6. Handed Over",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    color: "text-emerald-700 dark:text-emerald-300",
    step: 6,
  },
};

export function PassportVisaClient({ user, initialApplications }: PassportVisaClientProps) {
  const router = useRouter();
  const [apps, setApps] = useState<PassportApplicationItem[]>(initialApplications);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Application Form states
  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceType, setServiceType] = useState("Fresh Normal");
  const [arnNumber, setArnNumber] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [pskLocation, setPskLocation] = useState("Madurai PSK (Mattuthavani)");
  const [governmentFee, setGovernmentFee] = useState("1500");
  const [serviceCharge, setServiceCharge] = useState("1000");
  const [amountPaid, setAmountPaid] = useState("2500");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.UPI);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Metrics
  const activeCount = apps.filter((a) => a.status !== PassportAppStatus.COMPLETED).length;
  const pskFixedCount = apps.filter(
    (a) => a.status === PassportAppStatus.APPOINTMENT_SCHEDULED
  ).length;
  const policeCount = apps.filter(
    (a) => a.status === PassportAppStatus.VERIFICATION_PENDING
  ).length;
  const completedCount = apps.filter((a) => a.status === PassportAppStatus.COMPLETED).length;

  const filteredApps = apps.filter((a) => {
    const matchesSearch =
      a.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.phone.includes(searchTerm) ||
      (a.arnNumber && a.arnNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      a.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "ALL" || a.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      await createPassportApplicationAction({
        applicantName,
        phone,
        email,
        serviceType,
        arnNumber,
        appointmentDate: appointmentDate || undefined,
        pskLocation,
        governmentFee: Number(governmentFee),
        serviceCharge: Number(serviceCharge),
        amountPaid: Number(amountPaid),
        paymentMode,
        notes,
      });

      setShowAddModal(false);
      setApplicantName("");
      setPhone("");
      setEmail("");
      setArnNumber("");
      setAppointmentDate("");
      setNotes("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to create application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: PassportAppStatus) => {
    try {
      await updatePassportStatusAction(id, newStatus);
      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleToggleChecklist = async (id: string, item: string) => {
    try {
      await toggleChecklistItemAction(id, item);
      setApps((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const isCollected = a.documentsCollected.includes(item);
          const updated = isCollected
            ? a.documentsCollected.filter((d) => d !== item)
            : [...a.documentsCollected, item];
          return { ...a, documentsCollected: updated };
        })
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to toggle checklist item");
    }
  };

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600">
                <Plane className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Passport &amp; Visa Services Desk
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              End-to-end PSK appointment scheduler, document checklist, ARN tracker &amp; Police Verification desk
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>

        {/* 4 Pipeline Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Active Applications</span>
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
              {activeCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Currently in pipeline</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              PSK Appointments Fixed
            </span>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {pskFixedCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Madurai PSK visits</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              Police Verification
            </span>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {policeCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Thana inquiry stage</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Delivered &amp; Completed
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {completedCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Delivered to customers</p>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedStatus("ALL")}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                selectedStatus === "ALL"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All ({apps.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  selectedStatus === st
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search applicant name, phone, ARN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Application Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              No passport/visa applications match this view.
            </div>
          ) : (
            filteredApps.map((a) => {
              const statusCfg = STATUS_CONFIG[a.status];
              const phoneClean = a.phone.replace(/\D/g, "");
              const waLink = `https://wa.me/91${phoneClean}?text=${encodeURIComponent(
                `Vanakkam ${a.applicantName}, update from Sai Tours & Travels regarding your ${a.serviceType} application (ARN: ${a.arnNumber || "Assigned"}). Current Status: ${statusCfg.label}. ${a.appointmentDate ? `PSK Appointment: ${new Date(a.appointmentDate).toLocaleString("en-IN")}` : ""}. Thank you!`
              )}`;

              return (
                <div
                  key={a.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-sky-300 dark:hover:border-sky-800 transition"
                >
                  <div className="space-y-3">
                    {/* Top Row: Service Type Badge & Status Selector */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold text-[11px] truncate">
                        {a.serviceType}
                      </span>
                      <select
                        value={a.status}
                        onChange={(e) =>
                          handleStatusChange(a.id, e.target.value as PassportAppStatus)
                        }
                        className={`text-[10px] font-bold px-2 py-1 rounded-xl border border-transparent focus:ring-1 focus:ring-sky-500 font-sans cursor-pointer ${statusCfg.bg} ${statusCfg.color}`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
                          <option key={st} value={st}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Applicant Info */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {a.applicantName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{a.phone}</span>
                        </span>
                        {a.arnNumber && (
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            ARN: {a.arnNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PSK Appointment Box if scheduled */}
                    {a.appointmentDate && (
                      <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            PSK Date:{" "}
                            {new Date(a.appointmentDate).toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-indigo-700/80 dark:text-indigo-300">
                          <MapPin className="w-3 h-3" />
                          <span>{a.pskLocation || "Madurai PSK"}</span>
                        </div>
                      </div>
                    )}

                    {/* Document Checklist */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Document Checklist ({a.documentsCollected.length} /{" "}
                        {a.checklistItems.length})
                      </span>
                      <div className="space-y-1">
                        {a.checklistItems.map((item) => {
                          const isCollected = a.documentsCollected.includes(item);
                          return (
                            <button
                              key={item}
                              onClick={() => handleToggleChecklist(a.id, item)}
                              className="flex items-center gap-2 text-xs text-left w-full hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 rounded-lg transition"
                            >
                              {isCollected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span
                                className={
                                  isCollected
                                    ? "text-slate-700 dark:text-slate-300 font-medium line-through opacity-75"
                                    : "text-slate-600 dark:text-slate-400"
                                }
                              >
                                {item}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Fee & Action Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-slate-400">Total: ₹{a.totalCharge}</div>
                      <div className="text-xs font-bold text-emerald-600">
                        Paid: ₹{a.amountPaid}
                        {Number(a.balanceDue) > 0 && (
                          <span className="text-rose-500 ml-1">
                            (₹{a.balanceDue} due)
                          </span>
                        )}
                      </div>
                    </div>

                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
                      title="Send WhatsApp Status Update to Applicant"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: New Passport Application */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  New Passport / Visa File
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateApplication} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Applicant Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. S. Meenakshi Sundaram"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9842100000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Service Type
                    </label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                    >
                      <option value="Fresh Normal Passport">Fresh Normal Passport (₹1,500 govt)</option>
                      <option value="Tatkal Passport">Tatkal Passport (₹3,500 govt)</option>
                      <option value="Passport Renewal">Passport Renewal / Re-issue</option>
                      <option value="Minor / Child Passport">Minor / Child Passport</option>
                      <option value="Police Clearance Cert (PCC)">Police Clearance Cert (PCC)</option>
                      <option value="Dubai Tourist Visa (30/60 Days)">Dubai Tourist Visa (30/60 Days)</option>
                      <option value="Singapore / Malaysia E-Visa">Singapore / Malaysia E-Visa</option>
                      <option value="Schengen / US Visa Processing">Schengen / US Visa Processing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ARN # (If already generated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 26-1000928371"
                      value={arnNumber}
                      onChange={(e) => setArnNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      PSK Appointment Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      PSK Center
                    </label>
                    <input
                      type="text"
                      value={pskLocation}
                      onChange={(e) => setPskLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Charges */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Govt Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={governmentFee}
                      onChange={(e) => setGovernmentFee(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Service Charge (₹)
                    </label>
                    <input
                      type="number"
                      value={serviceCharge}
                      onChange={(e) => setServiceCharge(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Collected Now (₹)
                    </label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Advance Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                  >
                    <option value={PaymentMode.UPI}>UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value={PaymentMode.CASH}>Cash on Hand</option>
                    <option value={PaymentMode.BANK_TRANSFER}>Bank Transfer</option>
                    <option value={PaymentMode.CARD}>Credit/Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Applicant Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Non-ECR status verified, original 10th marksheet kept in safe custody"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-md transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "Save Application"}
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
