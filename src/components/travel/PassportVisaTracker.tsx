"use client";

import React, { useState } from "react";
import { Language } from "@/lib/i18n";
import {
  FileText,
  Plane,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Calendar,
  X,
  Plus,
} from "lucide-react";

interface PassportVisaTrackerProps {
  lang: Language;
  onClose: () => void;
}

interface ApplicationItem {
  id: string;
  applicantName: string;
  type: "PASSPORT" | "VISA";
  countryOrType: string;
  status: "SUBMITTED" | "DOCS_PENDING" | "APPOINTMENT_SCHEDULED" | "APPROVED";
  appointmentDate?: string;
  checklist: { name: string; checked: boolean }[];
}

export function PassportVisaTracker({ lang, onClose }: PassportVisaTrackerProps) {
  const [items, setItems] = useState<ApplicationItem[]>([
    {
      id: "1",
      applicantName: "Saravanan R",
      type: "PASSPORT",
      countryOrType: "Fresh Normal",
      status: "APPOINTMENT_SCHEDULED",
      appointmentDate: "12 Oct 2026",
      checklist: [
        { name: "Aadhaar Card Copy", checked: true },
        { name: "10th Marksheet / Birth Certificate", checked: true },
        { name: "Annexure / Form Filled", checked: true },
        { name: "Passport Fee Receipt", checked: true },
      ],
    },
    {
      id: "2",
      applicantName: "Priya Murugan",
      type: "VISA",
      countryOrType: "Singapore Tourist Visa",
      status: "DOCS_PENDING",
      checklist: [
        { name: "Original Passport (6+ mo validity)", checked: true },
        { name: "Flight Itinerary Confirmed", checked: true },
        { name: "Bank Statement (3 months)", checked: false },
        { name: "Passport Photo with White Background", checked: true },
      ],
    },
  ]);

  const toggleChecklist = (appId: string, itemIdx: number) => {
    setItems((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const newChecklist = [...app.checklist];
        newChecklist[itemIdx].checked = !newChecklist[itemIdx].checked;
        return { ...app, checklist: newChecklist };
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Passport & Visa Application Desk
              </h3>
              <p className="text-xs text-gray-500">Document checklists, appointment dates & status tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {items.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                    {app.applicantName}
                  </h4>
                  <span className="text-xs text-orange-600 font-semibold">
                    {app.type}: {app.countryOrType}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {app.status.replace(/_/g, " ")}
                </span>
              </div>

              {app.appointmentDate && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  Appointment: {app.appointmentDate} (Madurai PSK)
                </div>
              )}

              {/* Document Checklist */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 block mb-2">
                  Document Checklist:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {app.checklist.map((c, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={c.checked}
                        onChange={() => toggleChecklist(app.id, i)}
                        className="rounded text-orange-600 focus:ring-orange-500"
                      />
                      <span className={c.checked ? "line-through text-gray-400" : ""}>
                        {c.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
