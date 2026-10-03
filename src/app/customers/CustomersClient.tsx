"use client";

import React, { useState } from "react";
import {
  createCustomerAction,
  revealCustomerSensitiveAction,
} from "@/server/actions/customers.actions";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Shield,
  Eye,
  Share2,
  X,
  Loader2,
  Lock,
} from "lucide-react";

interface CustomersClientProps {
  initialCustomers: any[];
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [revealedData, setRevealedData] = useState<{ id: string; passport?: string; aadhaar?: string } | null>(null);
  const [isRevealing, setIsRevealing] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = initialCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createCustomerAction({
        name,
        phone,
        email,
        address,
        passportNumber,
        notes,
      });

      setShowAddModal(false);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setPassportNumber("");
      setNotes("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to create customer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReveal = async (customerId: string) => {
    setIsRevealing(customerId);
    try {
      const data = await revealCustomerSensitiveAction(customerId);
      setRevealedData({
        id: customerId,
        passport: data.passport || undefined,
        aadhaar: data.aadhaar || undefined,
      });
    } catch (err: any) {
      alert(err.message || "Failed to decrypt identity details.");
    } finally {
      setIsRevealing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Customer 360 & Travelers CRM
          </h2>
          <p className="text-xs text-slate-500">
            Passenger contact vaults, AES-256 encrypted passport records, and balance dues
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, phone, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-semibold">{filtered.length} Customers</span>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Header: Name and Balance Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600 font-bold text-sm">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {c.name}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {c.recordCount} Transactions
                    </span>
                  </div>
                </div>

                {Number(c.balanceDue) > 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Due: ₹{Number(c.balanceDue).toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Clear
                  </span>
                )}
              </div>

              {/* Contact Information */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4">
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{c.address}</span>
                  </div>
                )}
              </div>

              {/* Encrypted Passport Vault Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-orange-500" />
                    Passport Vault:
                  </span>

                  {c.hasPassport && (
                    <button
                      onClick={() => handleReveal(c.id)}
                      disabled={isRevealing === c.id}
                      className="text-[10px] text-orange-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {isRevealing === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                      <span>{revealedData?.id === c.id ? "Hide" : "Reveal"}</span>
                    </button>
                  )}
                </div>

                {revealedData?.id === c.id ? (
                  <div className="font-mono font-bold text-slate-900 dark:text-white text-xs bg-orange-100/60 dark:bg-orange-950/40 p-1.5 rounded-lg border border-orange-200 dark:border-orange-800">
                    {revealedData?.passport || "No Passport Recorded"}
                  </div>
                ) : (
                  <div className="font-mono text-slate-400 text-xs">
                    {c.maskedPassport || "Not registered"}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total Spend: <strong className="text-slate-900 dark:text-white">₹{Number(c.totalBilled).toLocaleString("en-IN")}</strong>
              </span>

              {c.phone && (
                <a
                  href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl cursor-pointer"
                >
                  <Share2 className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Add New Customer Profile
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Customer / Passenger Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Saravanan Raman"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98421 00000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Passport Number (Encrypted with AES-256)
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="e.g. Z1234567"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. KK Nagar, Madurai, Tamil Nadu"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
