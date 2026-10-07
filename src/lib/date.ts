/**
 * Date Utility for Indian Standard Time (IST) & Multi-Format Parsing
 * Compliant with Indian travel industry date formats (DD/MM/YYYY, Excel serials, ISO)
 */

export function parseFlexibleDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;

  if (typeof val === "number") {
    // Excel serial date (days since 1899-12-30)
    // 25569 = difference between 1970-01-01 and 1899-12-30 in days
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + val * 86400000);
  }

  const str = String(val).trim();
  if (!str) return new Date();

  // Check Indian format: DD/MM/YYYY or DD-MM-YYYY (e.g. 25/12/2025, 05-09-2026)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(Date.UTC(year, month, day, 12, 0, 0));
    }
  }

  // Check ISO format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(Date.UTC(year, month, day, 12, 0, 0));
    }
  }

  // Standard fallback
  const standard = new Date(str);
  return isNaN(standard.getTime()) ? new Date() : standard;
}

/**
 * Format a Date to Indian standard DD/MM/YYYY in Asia/Kolkata
 */
export function formatDateIndian(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Get current date string (YYYY-MM-DD) in Asia/Kolkata timezone
 */
export function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Get start and end Date for a given date in Asia/Kolkata (IST)
 */
export function getISTDayRange(referenceDate?: Date | string): { start: Date; end: Date } {
  const d = referenceDate ? (typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate) : new Date();
  const istDateString = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const start = new Date(`${istDateString}T00:00:00.000+05:30`);
  const end = new Date(`${istDateString}T23:59:59.999+05:30`);
  return { start, end };
}

/**
 * Get start and end Date for a given month in Asia/Kolkata (IST)
 */
export function getISTMonthRange(referenceDate?: Date | string): { start: Date; end: Date } {
  const d = referenceDate ? (typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate) : new Date();
  const istDateString = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [yearStr, monthStr] = istDateString.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  
  const start = new Date(`${yearStr}-${monthStr}-01T00:00:00.000+05:30`);
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = String(lastDay).padStart(2, "0");
  const end = new Date(`${yearStr}-${monthStr}-${lastDayStr}T23:59:59.999+05:30`);
  return { start, end };
}
