import test from "node:test";
import assert from "node:assert";
import { Money } from "../../src/lib/money";
import {
  calculateDashboardMetrics,
  calculateCustomerLedgers,
  calculateSupplierLedgers,
  diagnoseDataHealth,
  verifySystemReconciliation,
  OpeningBalances,
} from "../../src/lib/accounting-engine";
import { RecordType, ServiceCategory, PaymentMode, PaymentStatus } from "@prisma/client";

// Test Helper to construct mock NoteRecord entries
function createMockRecord(overrides: Partial<any>): any {
  const baseAmt = overrides.amount !== undefined ? overrides.amount : "1000.00";
  const isZero = Number(baseAmt) === 0;
  return {
    id: `rec-${Math.random().toString(36).substring(2, 9)}`,
    recordNumber: `SAI-${Math.floor(1000 + Math.random() * 9000)}`,
    title: "Test Transaction",
    notes: null,
    type: RecordType.INCOME,
    category: ServiceCategory.FLIGHT_TICKET,
    amount: baseAmt,
    customerAmount: overrides.customerAmount !== undefined ? overrides.customerAmount : (isZero ? "0.00" : "1000.00"),
    agentAmount: overrides.agentAmount !== undefined ? overrides.agentAmount : (isZero ? "0.00" : "800.00"),
    serviceCharge: overrides.serviceCharge !== undefined ? overrides.serviceCharge : (isZero ? "0.00" : "200.00"),
    commissionAmount: "0.00",
    discountAmount: "0.00",
    amountPaid: "1000.00",
    balanceDue: "0.00",
    paymentMode: PaymentMode.CASH,
    transferToMode: null,
    paymentStatus: PaymentStatus.COMPLETED,
    gstType: "NONE",
    gstRate: 0,
    gstAmount: "0.00",
    referenceNumber: null,
    travelDate: null,
    passengerCount: 1,
    date: new Date(),
    isVoid: false,
    isDeleted: false,
    deletedAt: null,
    deletedById: null,
    customerId: null,
    supplierId: null,
    createdById: "user-1",
    createdBy: { id: "user-1", name: "Staff Member 1" },
    customer: null,
    supplier: null,
    ...overrides,
  };
}

test("Single Source of Truth: All 7 Entry Types & Dynamic Dashboard Calculation", () => {
  const openingBalances: OpeningBalances = {
    cash: Money.from(10000), // Opening Cash: ₹10,000
    bank: Money.from(50000), // Opening Bank: ₹50,000
    upi: Money.from(5000),   // Opening UPI: ₹5,000
  };

  const today = new Date();

  const entries = [
    // 1. INCOME: Ticket sold, paid by Cash
    createMockRecord({
      type: RecordType.INCOME,
      title: "Chennai Flight Ticket - Ramesh",
      amount: "5000.00",
      amountPaid: "5000.00",
      balanceDue: "0.00",
      serviceCharge: "500.00",
      paymentMode: PaymentMode.CASH,
      gstType: "EXTRA",
      gstRate: 5,
      gstAmount: "250.00",
      date: today,
    }),
    // 2. EXPENSE: Airline ticket purchase paid by Bank
    createMockRecord({
      type: RecordType.EXPENSE,
      title: "Indigo Airlines payment",
      amount: "4500.00",
      amountPaid: "4500.00",
      balanceDue: "0.00",
      paymentMode: PaymentMode.BANK_TRANSFER,
      gstType: "EXTRA",
      gstRate: 5,
      gstAmount: "225.00",
      date: today,
    }),
    // 3. RECEIVABLE: Customer due for Visa fee
    createMockRecord({
      type: RecordType.RECEIVABLE,
      title: "Dubai Visa Balance - Priya",
      amount: "3000.00",
      amountPaid: "1000.00",
      balanceDue: "2000.00",
      paymentMode: PaymentMode.UPI,
      customerId: "cust-priya",
      customer: { id: "cust-priya", name: "Priya", phone: "+919876543210" },
      date: today,
    }),
    // 4. PAYABLE: Vendor due for Madurai Hotel
    createMockRecord({
      type: RecordType.PAYABLE,
      title: "Taj Hotel Madurai - Due for group",
      amount: "8000.00",
      amountPaid: "2000.00",
      balanceDue: "6000.00",
      paymentMode: PaymentMode.BANK_TRANSFER,
      supplierId: "supp-taj",
      supplier: { id: "supp-taj", name: "Taj Hotel", phone: "+919876543211", category: ServiceCategory.HOTEL_BOOKING },
      date: today,
    }),
    // 5. REFUND: Partial ticket refund to customer via UPI
    createMockRecord({
      type: RecordType.REFUND,
      title: "Train Cancellation Refund - Suresh",
      amount: "1000.00",
      amountPaid: "1000.00",
      balanceDue: "0.00",
      paymentMode: PaymentMode.UPI,
      date: today,
    }),
    // 6. TRANSFER: Transfer ₹2,000 from Cash to Bank
    createMockRecord({
      type: RecordType.TRANSFER,
      title: "Cash deposit to HDFC Bank",
      amount: "2000.00",
      paymentMode: PaymentMode.CASH,
      transferToMode: PaymentMode.BANK_TRANSFER,
      date: today,
    }),
    // 7. NOTE: Informational passport courier tracking note
    createMockRecord({
      type: RecordType.NOTE,
      title: "Passport dispatched via BlueDart tracking #BL123456",
      amount: "0.00",
      amountPaid: "0.00",
      balanceDue: "0.00",
      date: today,
    }),
  ];

  const metrics = calculateDashboardMetrics(entries, openingBalances);

  // Inflows:
  // Income (5,000) + Receivable received part (1,000) = ₹6,000
  assert.strictEqual(metrics.todayInflow.toNumber(), 6000);

  // Outflows:
  // Expense (4,500) + Payable paid part (2,000) + Refund (1,000) = ₹7,500
  assert.strictEqual(metrics.todayOutflow.toNumber(), 7500);

  // Net Daily = 6,000 - 7,500 = -1,500
  assert.strictEqual(metrics.todayNet.toNumber(), -1500);

  // Customer Dues = ₹2,000 (from Priya's Visa balance)
  assert.strictEqual(metrics.totalCustomerDues.toNumber(), 2000);

  // Supplier Dues = ₹6,000 (Taj Hotel payable)
  assert.strictEqual(metrics.totalSupplierPayables.toNumber(), 6000);

  // Liquid Balances:
  // Cash = Opening (10,000) + Inflow (5,000) - Transfer Out (2,000) = ₹13,000
  assert.strictEqual(metrics.cashBalance.toNumber(), 13000);

  // Bank = Opening (50,000) - Expense (4,500) - Payable Paid (2,000) + Transfer In (2,000) = ₹45,500
  assert.strictEqual(metrics.bankBalance.toNumber(), 45500);

  // UPI = Opening (5,000) + Receivable Advance (1,000) - Refund (1,000) = ₹5,000
  assert.strictEqual(metrics.upiBalance.toNumber(), 5000);

  // Total Liquid = 13,000 + 45,500 + 5,000 = ₹63,500
  assert.strictEqual(metrics.totalLiquidBalance.toNumber(), 63500);

  // GST Calculation:
  // Collected = ₹250, Paid = ₹225, Net Payable = 250 - 225 = ₹25
  assert.strictEqual(metrics.thisMonthGstCollected.toNumber(), 250);
  assert.strictEqual(metrics.thisMonthGstPaid.toNumber(), 225);
  assert.strictEqual(metrics.thisMonthGstPayable.toNumber(), 25);
});

test("Single Source of Truth: Soft Delete & Restore Instantly Re-balances Totals", () => {
  const openingBalances: OpeningBalances = {
    cash: Money.from(10000),
    bank: Money.from(20000),
    upi: Money.from(0),
  };

  const record1 = createMockRecord({
    id: "rec-1",
    type: RecordType.INCOME,
    amount: "5000.00",
    amountPaid: "5000.00",
    paymentMode: PaymentMode.CASH,
  });

  const record2 = createMockRecord({
    id: "rec-2",
    type: RecordType.EXPENSE,
    amount: "3000.00",
    amountPaid: "3000.00",
    paymentMode: PaymentMode.CASH,
  });

  // State 1: Both active
  let metrics = calculateDashboardMetrics([record1, record2], openingBalances);
  assert.strictEqual(metrics.todayInflow.toNumber(), 5000);
  assert.strictEqual(metrics.todayOutflow.toNumber(), 3000);
  assert.strictEqual(metrics.cashBalance.toNumber(), 12000); // 10,000 + 5,000 - 3,000

  // State 2: User soft-deletes record2 (Expense of 3,000)
  const record2Deleted = { ...record2, isDeleted: true, deletedAt: new Date() };
  metrics = calculateDashboardMetrics([record1, record2Deleted], openingBalances);
  assert.strictEqual(metrics.todayInflow.toNumber(), 5000);
  assert.strictEqual(metrics.todayOutflow.toNumber(), 0); // No active expense!
  assert.strictEqual(metrics.cashBalance.toNumber(), 15000); // 10,000 + 5,000

  // State 3: User restores record2
  const record2Restored = { ...record2, isDeleted: false, deletedAt: null };
  metrics = calculateDashboardMetrics([record1, record2Restored], openingBalances);
  assert.strictEqual(metrics.todayInflow.toNumber(), 5000);
  assert.strictEqual(metrics.todayOutflow.toNumber(), 3000);
  assert.strictEqual(metrics.cashBalance.toNumber(), 12000); // Back to 12,000
});

test("Single Source of Truth: Customer and Supplier Running Balances Derive Dynamically", () => {
  const entries = [
    // Customer 1: Kumar - Booking 1 (₹10,000, paid ₹6,000, due ₹4,000)
    createMockRecord({
      customerId: "cust-kumar",
      customer: { id: "cust-kumar", name: "Kumar", phone: "+919876500001" },
      type: RecordType.INCOME,
      amount: "10000.00",
      customerAmount: "10000.00",
      amountPaid: "6000.00",
      balanceDue: "4000.00",
    }),
    // Customer 1: Kumar - Subsequent payment of ₹4,000 settling due
    createMockRecord({
      customerId: "cust-kumar",
      customer: { id: "cust-kumar", name: "Kumar", phone: "+919876500001" },
      type: RecordType.INCOME,
      amount: "4000.00",
      customerAmount: "4000.00",
      amountPaid: "4000.00",
      balanceDue: "0.00",
    }),
    // Supplier 1: Air India - Flight invoice of ₹15,000, paid ₹10,000, due ₹5,000
    createMockRecord({
      supplierId: "supp-airindia",
      supplier: { id: "supp-airindia", name: "Air India", phone: "+919876500002", category: ServiceCategory.FLIGHT_TICKET },
      type: RecordType.EXPENSE,
      amount: "15000.00",
      agentAmount: "15000.00",
      amountPaid: "10000.00",
      balanceDue: "5000.00",
    }),
  ];

  const custLedgers = calculateCustomerLedgers(entries);
  const suppLedgers = calculateSupplierLedgers(entries);

  // Verify Kumar's dynamic ledger
  const kumar = custLedgers["cust-kumar"];
  assert.ok(kumar, "Kumar's ledger should be calculated");
  assert.strictEqual(kumar.totalBilled.toNumber(), 14000); // 10,000 + 4,000
  assert.strictEqual(kumar.totalPaid.toNumber(), 10000);   // 6,000 + 4,000
  assert.strictEqual(kumar.balanceDue.toNumber(), 4000);   // Remaining balance from entry 1

  // Verify Air India's dynamic ledger
  const airIndia = suppLedgers["supp-airindia"];
  assert.ok(airIndia, "Air India's ledger should be calculated");
  assert.strictEqual(airIndia.totalBilled.toNumber(), 15000);
  assert.strictEqual(airIndia.totalPaid.toNumber(), 10000);
  assert.strictEqual(airIndia.balanceDue.toNumber(), 5000);

  // Verify 100% System Reconciliation
  const recon = verifySystemReconciliation(entries, custLedgers, suppLedgers);
  assert.strictEqual(recon.isReconciled, true);
  assert.strictEqual(recon.greenTick, true);
  assert.strictEqual(recon.discrepancies.length, 0);
});

test("Single Source of Truth: Data Health Diagnostics Flags Anomalies", () => {
  const openingBalances: OpeningBalances = {
    cash: Money.from(100),
    bank: Money.from(0),
    upi: Money.from(0),
  };

  const entriesWithAnomalies = [
    // Anomaly 1: Expense larger than cash balance causing negative balance
    createMockRecord({
      type: RecordType.EXPENSE,
      amount: "500.00",
      amountPaid: "500.00",
      paymentMode: PaymentMode.CASH,
    }),
    // Anomaly 2: Zero amount on financial record
    createMockRecord({
      type: RecordType.INCOME,
      amount: "0.00",
      amountPaid: "0.00",
    }),
    // Anomaly 3: High value entry (> ₹1,50,000)
    createMockRecord({
      type: RecordType.INCOME,
      amount: "250000.00",
      amountPaid: "250000.00",
      paymentMode: PaymentMode.BANK_TRANSFER,
    }),
    // Anomaly 4: Unassigned Customer on due
    createMockRecord({
      type: RecordType.RECEIVABLE,
      amount: "5000.00",
      amountPaid: "0.00",
      balanceDue: "5000.00",
      customerId: null,
      customer: null,
    }),
  ];

  const issues = diagnoseDataHealth(entriesWithAnomalies, openingBalances);

  // Verify all expected diagnostic flags were detected
  const issueTypes = issues.map((i) => i.title);
  assert.ok(issueTypes.some((t) => t.includes("Negative Cash")), "Should flag negative cash");
  assert.ok(issueTypes.some((t) => t.includes("₹0 Amount")), "Should flag zero amount");
  assert.ok(issueTypes.some((t) => t.includes("High Value Entry")), "Should flag high value");
  assert.ok(issueTypes.some((t) => t.includes("Unassigned Customer Due")), "Should flag unassigned customer");
});
