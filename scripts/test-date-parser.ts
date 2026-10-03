export function parseFlexibleDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'number') {
    // Excel serial date (days since 1899-12-30)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + val * 86400000);
  }
  const str = String(val).trim();
  // Check DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }
  const standard = new Date(str);
  return isNaN(standard.getTime()) ? new Date() : standard;
}

console.log('25/12/2025 ->', parseFlexibleDate('25/12/2025').toISOString().split('T')[0]);
console.log('05-09-2026 ->', parseFlexibleDate('05-09-2026').toISOString().split('T')[0]);
console.log('2026-08-15 ->', parseFlexibleDate('2026-08-15').toISOString().split('T')[0]);
