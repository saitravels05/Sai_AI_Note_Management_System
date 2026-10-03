import test from "node:test";
import assert from "node:assert";
import { parseFlexibleDate, formatDateIndian, getTodayIST } from "../../src/lib/date";

test("Date Parsing: Indian DD/MM/YYYY Format", () => {
  const d1 = parseFlexibleDate("25/12/2025");
  assert.strictEqual(d1.toISOString().split("T")[0], "2025-12-25");

  const d2 = parseFlexibleDate("05-09-2026");
  assert.strictEqual(d2.toISOString().split("T")[0], "2026-09-05");

  const d3 = parseFlexibleDate("1/1/2026");
  assert.strictEqual(d3.toISOString().split("T")[0], "2026-01-01");
});

test("Date Parsing: ISO and Standard Formats", () => {
  const iso = parseFlexibleDate("2026-08-15");
  assert.strictEqual(iso.toISOString().split("T")[0], "2026-08-15");
});

test("Date Parsing: Excel Serial Numbers", () => {
  // Day 45678 in Excel
  const excel = parseFlexibleDate(45678);
  assert.strictEqual(excel instanceof Date, true);
  assert.strictEqual(isNaN(excel.getTime()), false);
});

test("Date Formatting: Indian DD/MM/YYYY Output", () => {
  const date = new Date(Date.UTC(2026, 7, 15, 12, 0, 0)); // 15 August 2026
  const formatted = formatDateIndian(date);
  assert.strictEqual(formatted, "15/08/2026");
});

test("Timezone: Asia/Kolkata Today String", () => {
  const today = getTodayIST();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});
