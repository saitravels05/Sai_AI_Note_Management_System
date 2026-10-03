"use client";

import React, { useState } from "react";
import {
  previewSpreadsheetAction,
  executeImportAction,
  undoImportAction,
  ColumnMapping,
} from "@/server/actions/import.actions";
import { Language, translations } from "@/lib/i18n";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface ExcelImporterProps {
  lang: Language;
  onClose: () => void;
  onRefresh: () => void;
}

export function ExcelImporter({ lang, onClose, onRefresh }: ExcelImporterProps) {
  const t = translations[lang];
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    errors: string[];
    batchId?: string;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const b64 = (event.target?.result as string).split(",")[1];
      setFileBase64(b64);
      try {
        const preview = await previewSpreadsheetAction(b64);
        setHeaders(preview.headers);
        setSampleRows(preview.sampleRows);
        setTotalRows(preview.totalRows);

        // Auto-guess columns
        const guessed: ColumnMapping = {};
        for (const h of preview.headers) {
          const lower = h.toLowerCase();
          if (lower.includes("title") || lower.includes("description") || lower.includes("name")) {
            guessed.titleCol = h;
          }
          if (lower.includes("amount") || lower.includes("price") || lower.includes("total") || lower.includes("fee")) {
            guessed.amountCol = h;
          }
          if (lower.includes("date")) {
            guessed.dateCol = h;
          }
          if (lower.includes("notes") || lower.includes("remarks")) {
            guessed.notesCol = h;
          }
        }
        setMapping(guessed);
      } catch (err: any) {
        alert(err.message || "Failed to read spreadsheet.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteImport = async () => {
    if (!fileBase64 || !mapping.titleCol || !mapping.amountCol) {
      alert("Please map at least Title and Amount columns.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await executeImportAction(fileBase64, fileName, mapping);
      setImportResult(res);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Import execution failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!importResult?.batchId) return;
    if (!confirm("Are you sure you want to undo this import and remove all imported cards?")) return;

    setIsLoading(true);
    try {
      await undoImportAction(importResult.batchId);
      alert("Import has been completely undone!");
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to undo import.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {t.excelImport}
              </h3>
              <p className="text-xs text-gray-500">
                Safely import historical cards with column mapping & undo protection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload State */}
        {!fileBase64 && (
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-orange-500 transition-colors">
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Select or Drop Excel (.xlsx, .xls) or CSV
            </p>
            <p className="text-xs text-gray-500 mb-4">Max 5,000 rows per file</p>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white cursor-pointer shadow-xs">
              <Upload className="w-4 h-4" />
              <span>Browse Spreadsheet</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Column Mapping State */}
        {fileBase64 && !importResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                File: {fileName} ({totalRows} rows)
              </span>
              <button
                onClick={() => setFileBase64(null)}
                className="text-orange-600 hover:underline font-semibold"
              >
                Change File
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Step 2: Map Columns to Note Cards
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Title / Note Description *
                  </label>
                  <select
                    value={mapping.titleCol || ""}
                    onChange={(e) => setMapping({ ...mapping, titleCol: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                  >
                    <option value="">Select column...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Amount (₹) *
                  </label>
                  <select
                    value={mapping.amountCol || ""}
                    onChange={(e) => setMapping({ ...mapping, amountCol: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                  >
                    <option value="">Select column...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Date Column
                  </label>
                  <select
                    value={mapping.dateCol || ""}
                    onChange={(e) => setMapping({ ...mapping, dateCol: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                  >
                    <option value="">(Optional - Defaults to today)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Notes / Remarks Column
                  </label>
                  <select
                    value={mapping.notesCol || ""}
                    onChange={(e) => setMapping({ ...mapping, notesCol: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                  >
                    <option value="">(Optional)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Preview of first rows */}
            {sampleRows.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-semibold text-gray-500 mb-2 block">
                  Preview of First Rows:
                </span>
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {headers.slice(0, 4).map((h) => (
                          <th key={h} className="py-2 px-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {sampleRows.map((r, i) => (
                        <tr key={i}>
                          {headers.slice(0, 4).map((h) => (
                            <td key={h} className="py-2 px-3 text-gray-600 dark:text-gray-400">
                              {String(r[h] || "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Start Import Now</span>
              </button>
            </div>
          </div>
        )}

        {/* Import Results & Undo Option */}
        {importResult && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              Import Completed!
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Successfully created {importResult.importedCount} Note Cards.
            </p>

            {importResult.errors.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-left max-h-32 overflow-y-auto">
                <span className="font-semibold text-amber-800">Skipped {importResult.errors.length} invalid rows:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-700">
                  {importResult.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={handleUndo}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-rose-300 text-rose-700 hover:bg-rose-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo This Import</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
