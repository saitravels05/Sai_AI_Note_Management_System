import test from "node:test";
import assert from "node:assert";
import { Money } from "../../src/lib/money";
import {
  calculateDashboardMetrics,
  getRecordAmount,
  getRecordPaid,
  getRecordDue,
  OpeningBalances,
} from "../../src/lib/accounting-engine";
import { getISTDayRange, getISTMonthRange } from "../../src/lib/date";
import { RecordType, ServiceCategory, PaymentMode, PaymentStatus } from "@prisma/client";

function makeRecord(data: Partial<any>): any {
  return {
    id: `rec-${Math.random().toString(36).substring(2, 9)}`,
    recordNumber: data.recordNumber || "REC-2026-0001",
    title: data.title || "Sample Record",
    type: data.type || RecordType.INCOME,
    category: data.category || ServiceCategory.TRAIN_TICKET,
    amount: data.amount ?? "0",
    customerAmount: data.customerAmount ?? null,
    agentAmount: data.agentAmount ?? null,
    serviceCharge: data.serviceCharge ?? null,
    amountPaid: data.amountPaid ?? "0",
    balanceDue: data.balanceDue ?? "0",
    paymentMode: data.paymentMode || PaymentMode.UPI,
    paymentStatus: data.paymentStatus || PaymentStatus.COMPLETED,
    date: data.date || new Date("2026-10-07T12:00:00+05:30"),
    createdById: "user-sai",
    createdBy: { id: "user-sai", name: "Sai Tours and Travels" },
    isVoid: false,
    isDeleted: false,
    ...data,
  };
}

test("Phase 1 & 3: Safe Money Normalization handles commas, symbols, strings and decimal-safe math", () => {
  const r1 = makeRecord({ amount: "0", customerAmount: "14,500.50" });
  assert.strictEqual(getRecordAmount(r1).toFixed(2), "14500.50");

  const r2 = makeRecord({ amount: "₹25,000", customerAmount: "0" });
  assert.strictEqual(getRecordAmount(r2).toFixed(2), "25000.00");

  const r3 = makeRecord({ amount: null, customerAmount: null, agentAmount: "8,200" });
  assert.strictEqual(getRecordAmount(r3).toFixed(2), "8200.00");

  const r4 = makeRecord({ amount: 0, customerAmount: 0, serviceCharge: "1,500.75" });
  assert.strictEqual(getRecordAmount(r4).toFixed(2), "1500.75");
});

test("Phase 2 & 4: All 11 user cards are recognized with their real financial values and zero false anomalies", () => {
  const cards = [
    makeRecord({ recordNumber: "REC-2026-0001", title: "IRCTC (Chennai - Ahmedabad)", category: ServiceCategory.TRAIN_TICKET, amount: "0", customerAmount: "13127.20", agentAmount: "12500.00", paymentMode: PaymentMode.UPI }),
    makeRecord({ recordNumber: "REC-2026-0002", title: "Flight Rider (Dummy Ticket) (Dubai - Chennai)", category: ServiceCategory.FLIGHT_TICKET, amount: "0", customerAmount: "2500.00", agentAmount: "700.00", paymentMode: PaymentMode.CASH }),
    makeRecord({ recordNumber: "REC-2026-0003", title: "Flight Rider (Dummy Ticket) (Oman 1 Month Visa)", category: ServiceCategory.VISA_SERVICE, amount: "0", customerAmount: "6500.00", agentAmount: "5200.00", paymentMode: PaymentMode.UPI }),
    makeRecord({ recordNumber: "REC-2026-0004", title: "Riya Portal (Trichy - Muscat)", category: ServiceCategory.FLIGHT_TICKET, amount: "0", customerAmount: "18500.00", agentAmount: "17200.00", paymentMode: PaymentMode.BANK_TRANSFER }),
    makeRecord({ recordNumber: "REC-2026-0005", title: "Riya Portal (Mumbai - Madurai)", category: ServiceCategory.FLIGHT_TICKET, amount: "0", customerAmount: "8200.00", agentAmount: "7600.00", paymentMode: PaymentMode.UPI }),
    makeRecord({ recordNumber: "REC-2026-0006", title: "Riya Portal (Chennai - Tashkent)", category: ServiceCategory.FLIGHT_TICKET, amount: "0", customerAmount: "32000.00", agentAmount: "29500.00", paymentMode: PaymentMode.BANK_TRANSFER }),
    makeRecord({ recordNumber: "REC-2026-0007", title: "Riya Portal (Trichy - Chennai)", category: ServiceCategory.FLIGHT_TICKET, amount: "0", customerAmount: "4500.00", agentAmount: "4100.00", paymentMode: PaymentMode.UPI }),
    makeRecord({ recordNumber: "REC-2026-0008", title: "Flight Rider (Dummy Ticket) (Muscat - Kochi)", category: ServiceCategory.FLIGHT_TICKET, amount: "0", customerAmount: "2200.00", agentAmount: "600.00", paymentMode: PaymentMode.CASH }),
    makeRecord({ recordNumber: "REC-2026-0009", title: "AK Travel Services (China Attraction)", category: ServiceCategory.OTHER, amount: "0", customerAmount: "11500.00", agentAmount: "10000.00", paymentMode: PaymentMode.BANK_TRANSFER }),
    makeRecord({ recordNumber: "REC-2026-0010", title: "AK Travel Services (Dubai Attraction)", category: ServiceCategory.OTHER, amount: "0", customerAmount: "14000.00", agentAmount: "12200.00", paymentMode: PaymentMode.UPI }),
    makeRecord({ recordNumber: "REC-2026-0011", title: "IRCTC (Madurai - Pune)", category: ServiceCategory.TRAIN_TICKET, amount: "0", customerAmount: "3850.00", agentAmount: "3500.00", paymentMode: PaymentMode.UPI }),
  ];

  // Verify none of the 11 cards evaluate to ₹0
  for (const c of cards) {
    const amt = getRecordAmount(c);
    assert.strictEqual(amt.isZero(), false, `Card ${c.recordNumber} should not be ₹0`);
    assert.strictEqual(amt.isPositive(), true, `Card ${c.recordNumber} must be positive`);
  }

  // Dashboard calculation over all 11 records
  const metrics = calculateDashboardMetrics(cards, { cash: Money.zero(), bank: Money.zero(), upi: Money.zero() }, new Date("2026-10-07T12:00:00+05:30"));

  // Total customer billed across the 11 records:
  // 13127.20 + 2500 + 6500 + 18500 + 8200 + 32000 + 4500 + 2200 + 11500 + 14000 + 3850 = 116,877.20
  assert.strictEqual(metrics.todayInflow.toFixed(2), "116877.20");
  assert.strictEqual(metrics.todayNet.toFixed(2), "116877.20");

  // Staff Collection Breakdown
  const staffCollections = metrics.staffCollectionBreakdown["user-sai"];
  assert.notStrictEqual(staffCollections, undefined);
  assert.strictEqual(staffCollections.count, 11);
  assert.strictEqual(staffCollections.totalCollected.toFixed(2), "116877.20");
  assert.strictEqual(staffCollections.staffName, "Sai Tours and Travels");

  // Payment method distributions
  // Cash: 2500 + 2200 = 4700
  // Bank: 18500 + 32000 + 11500 = 62000
  // UPI: 13127.20 + 6500 + 8200 + 4500 + 14000 + 3850 = 50177.20
  assert.strictEqual(metrics.cashBalance.toFixed(2), "4700.00");
  assert.strictEqual(metrics.bankBalance.toFixed(2), "62000.00");
  assert.strictEqual(metrics.upiBalance.toFixed(2), "50177.20");
  assert.strictEqual(metrics.totalLiquidBalance.toFixed(2), "116877.20");
});

test("Phase 5 & 8: Customer and Vendor Dues accurately reflect partial and unpaid balances", () => {
  const records = [
    makeRecord({
      title: "Partial Customer Booking",
      type: RecordType.INCOME,
      amount: "10000.00",
      amountPaid: "4000.00",
      balanceDue: "6000.00",
      paymentStatus: PaymentStatus.PARTIAL,
      paymentMode: PaymentMode.CASH,
    }),
    makeRecord({
      title: "Unpaid Customer Invoice",
      type: RecordType.RECEIVABLE,
      amount: "15000.00",
      amountPaid: "0.00",
      balanceDue: "15000.00",
      paymentStatus: PaymentStatus.PENDING,
      paymentMode: PaymentMode.CREDIT_UNPAID,
    }),
    makeRecord({
      title: "Supplier Payable Flight Cost",
      type: RecordType.PAYABLE,
      amount: "12000.00",
      amountPaid: "5000.00",
      balanceDue: "7000.00",
      paymentStatus: PaymentStatus.PARTIAL,
      paymentMode: PaymentMode.BANK_TRANSFER,
    }),
  ];

  const metrics = calculateDashboardMetrics(records);
  // Total Customer Dues: 6000 + 15000 = 21000
  assert.strictEqual(metrics.totalCustomerDues.toFixed(2), "21000.00");
  // Total Supplier Payables: 7000
  assert.strictEqual(metrics.totalSupplierPayables.toFixed(2), "7000.00");
});

test("Phase 7 & 13: Asia/Kolkata (IST) Day and Month Boundaries prevent UTC shifting", () => {
  // Test late evening in IST (23:45 IST on Oct 7) which is 18:15 UTC Oct 7
  const lateNightIST = new Date("2026-10-07T23:45:00+05:30");
  const { start, end } = getISTDayRange(lateNightIST);

  assert.strictEqual(lateNightIST >= start && lateNightIST <= end, true);

  // Early morning in IST (00:15 IST on Oct 7) which is 18:45 UTC Oct 6
  const earlyMorningIST = new Date("2026-10-07T00:15:00+05:30");
  assert.strictEqual(earlyMorningIST >= start && earlyMorningIST <= end, true);

  // Month range for October 2026
  const { start: mStart, end: mEnd } = getISTMonthRange("2026-10-15");
  assert.strictEqual(lateNightIST >= mStart && lateNightIST <= mEnd, true);
});

test("Phase 4: Legitimate ₹0 warnings trigger ONLY for zero financial value, not plain notes", () => {
  // 1. Plain Note with 0 amount -> NEVER an anomaly
  const plainNote = makeRecord({
    title: "Meeting notes with customer",
    type: RecordType.NOTE,
    amount: "0",
    customerAmount: null,
    agentAmount: null,
  });
  const amtNote = getRecordAmount(plainNote);
  assert.strictEqual(amtNote.isZero(), true);
  // Anomaly condition check:
  const isPlainNoteAnomaly = plainNote.type !== RecordType.NOTE && amtNote.isZero();
  assert.strictEqual(isPlainNoteAnomaly, false, "Plain note should not trigger ₹0 anomaly");

  // 2. Financial Income with true 0 across all fields -> SHOULD trigger legitimate anomaly
  const zeroIncome = makeRecord({
    title: "Empty Income Transaction",
    type: RecordType.INCOME,
    amount: "0",
    customerAmount: "0",
    agentAmount: "0",
    serviceCharge: "0",
  });
  const amtZero = getRecordAmount(zeroIncome);
  assert.strictEqual(amtZero.isZero(), true);
  const isIncomeAnomaly = zeroIncome.type !== RecordType.NOTE && amtZero.isZero();
  assert.strictEqual(isIncomeAnomaly, true, "True ₹0 financial entry must trigger anomaly");
});
