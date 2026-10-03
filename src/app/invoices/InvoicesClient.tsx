"use client";

import React, { useState } from "react";
import Image from "next/image";
import { createInvoiceAction } from "@/server/actions/invoices.actions";
import { ServiceCategory } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Plus,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  Search,
  X,
  Loader2,
  FileCheck,
} from "lucide-react";

interface InvoicesClientProps {
  initialInvoices: any[];
}

export function InvoicesClient({ initialInvoices }: InvoicesClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [serviceType, setServiceType] = useState<ServiceCategory>(ServiceCategory.TOUR_PACKAGE);
  const [description, setDescription] = useState("");
  const [pnrOrDetails, setPnrOrDetails] = useState("");
  const [baseAmount, setBaseAmount] = useState("");
  const [gstRate, setGstRate] = useState(5);
  const [amountPaid, setAmountPaid] = useState("");

  const filtered = initialInvoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customerPhone && inv.customerPhone.includes(searchTerm))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !baseAmount) return;

    setIsSubmitting(true);
    try {
      await createInvoiceAction({
        customerName,
        customerPhone,
        customerAddress,
        serviceType,
        description: description || `${serviceType.replace(/_/g, " ")} booking`,
        pnrOrDetails,
        baseAmount,
        gstRate,
        amountPaid: amountPaid || "0",
      });

      setShowCreateModal(false);
      setCustomerName("");
      setCustomerPhone("");
      setBaseAmount("");
      setAmountPaid("");
      setDescription("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareWhatsApp = (inv: any) => {
    const text = encodeURIComponent(
      `Hello ${inv.customerName}, Greetings from Sai Tours & Travels! Here is your Invoice #${inv.invoiceNumber} for ${inv.description}. Total Amount: ₹${Number(inv.totalAmount).toLocaleString("en-IN")}, Paid: ₹${Number(inv.amountPaid).toLocaleString("en-IN")}, Balance Due: ₹${Number(inv.balanceDue).toLocaleString("en-IN")}. Thank you for choosing us!`
    );
    window.open(`https://wa.me/${inv.customerPhone?.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            GST Invoices & Travel Vouchers
          </h2>
          <p className="text-xs text-slate-500">
            Generate, print, and share GST tax invoices with SAC code 998553
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Tax Invoice / Voucher</span>
        </button>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice #, customer name or phone..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold">{filtered.length} Invoices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Description / PNR</th>
                <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No invoices issued yet. Click "New Tax Invoice / Voucher" to create your first invoice.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(inv.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{inv.customerName}</div>
                      {inv.customerPhone && <div className="text-[10px] text-slate-400">{inv.customerPhone}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div>{inv.description}</div>
                      {inv.pnrOrDetails && <div className="text-[10px] text-orange-600 font-semibold">{inv.pnrOrDetails}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      ₹{Number(inv.totalAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-600">
                      {Number(inv.balanceDue) > 0 ? `₹${Number(inv.balanceDue).toLocaleString("en-IN")}` : "Paid"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View & Print Voucher"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => shareWhatsApp(inv)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Generate GST Tax Invoice / Voucher
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Passenger Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98421 00000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Service Type
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as ServiceCategory)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value={ServiceCategory.TOUR_PACKAGE}>Tour Package</option>
                    <option value={ServiceCategory.FLIGHT_TICKET}>Flight Ticket</option>
                    <option value={ServiceCategory.HOTEL_BOOKING}>Hotel Booking</option>
                    <option value={ServiceCategory.PASSPORT_SERVICE}>Passport Service</option>
                    <option value={ServiceCategory.VISA_SERVICE}>Visa Service</option>
                    <option value={ServiceCategory.VEHICLE_RENTAL}>Vehicle Rental</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Routing
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Madurai to Singapore 4N/5D Holiday Package"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PNR / Ticket / File #
                  </label>
                  <input
                    type="text"
                    value={pnrOrDetails}
                    onChange={(e) => setPnrOrDetails(e.target.value)}
                    placeholder="e.g. 6E-8842 / ARN-9902"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GST Rate
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value={5}>5% (Tour Operator / Travel)</option>
                    <option value={18}>18% (Consultancy / Standard)</option>
                    <option value={0}>0% (Exempt)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Base Fare / Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Advance Paid (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice & Voucher View Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full p-8 shadow-2xl max-h-[95vh] overflow-y-auto print:p-0 print:shadow-none animate-in fade-in zoom-in-95 duration-200">
            {/* Action Bar (hidden on print) */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Printable GST Tax Invoice
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tax Invoice Document */}
            <div className="border border-slate-300 p-6 rounded-2xl space-y-6">
              {/* Invoice Header with Official Logo */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 relative">
                    <Image
                      src="/brand/logo.jpg"
                      alt="Sai Tours Logo"
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      SAI TOURS & TRAVELS
                    </h2>
                    <p className="text-xs text-slate-600">
                      Passport Services • Tickets • Tours • Packages • Cabs
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Madurai, Tamil Nadu, India • Phone: +91 98421 00000
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 uppercase">
                    Tax Invoice
                  </span>
                  <div className="text-sm font-bold font-mono mt-1 text-slate-900">
                    {selectedInvoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    Date: {new Date(selectedInvoice.date).toLocaleDateString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Billed To (Passenger):
                  </span>
                  <div className="font-bold text-sm text-slate-900">{selectedInvoice.customerName}</div>
                  {selectedInvoice.customerPhone && (
                    <div className="text-slate-600">Mobile: {selectedInvoice.customerPhone}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    SAC / Service Details:
                  </span>
                  <div className="font-semibold text-slate-800">SAC Code: 998553 (Tour Services)</div>
                  {selectedInvoice.pnrOrDetails && (
                    <div className="text-orange-600 font-bold">Ref / PNR: {selectedInvoice.pnrOrDetails}</div>
                  )}
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Base Amount (₹)</th>
                    <th className="p-2 text-right">CGST (2.5%)</th>
                    <th className="p-2 text-right">SGST (2.5%)</th>
                    <th className="p-2 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="p-2 font-medium">{selectedInvoice.description}</td>
                    <td className="p-2 text-right">₹{Number(selectedInvoice.baseAmount).toLocaleString("en-IN")}</td>
                    <td className="p-2 text-right">₹{Number(selectedInvoice.cgstAmount).toLocaleString("en-IN")}</td>
                    <td className="p-2 text-right">₹{Number(selectedInvoice.sgstAmount).toLocaleString("en-IN")}</td>
                    <td className="p-2 text-right font-bold">
                      ₹{Number(selectedInvoice.totalAmount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Settlement Summary */}
              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Invoice Amount:</span>
                    <span className="font-bold">₹{Number(selectedInvoice.totalAmount).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Advance / Paid:</span>
                    <span className="font-bold">₹{Number(selectedInvoice.amountPaid).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-bold text-amber-700">
                    <span>Balance Due:</span>
                    <span>₹{Number(selectedInvoice.balanceDue).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Signatory Footer */}
              <div className="pt-8 flex items-end justify-between text-[11px] text-slate-500 border-t border-slate-200">
                <div>
                  <p>Computer-generated invoice. Authorized by Sai Tours & Travels.</p>
                  <p>Subject to Madurai Jurisdiction.</p>
                </div>
                <div className="text-center">
                  <div className="w-32 border-b border-slate-400 mb-1" />
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
