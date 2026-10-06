import test from "node:test";
import assert from "node:assert";
import { Money, calculateGst, calculateGstInclusive } from "../../src/lib/money";
import { parseFlexibleDate, formatDateIndian } from "../../src/lib/date";

test("Accounting Engine: Tour Booking Financial Math, GST & Commission", () => {
  // Scenario: Singapore 4D3N Tour Package for 2 pax
  const packageTotal = Money.from(120000); // ₹1,20,000
  const advancePaid = Money.from(45000);   // ₹45,000
  const remainingDue = packageTotal.sub(advancePaid); // ₹75,000

  assert.strictEqual(remainingDue.toNumber(), 75000);
  assert.strictEqual(remainingDue.formatIndian(true), "₹75,000");

  // GST 5% on package
  const gstAmount = calculateGst(packageTotal, 5);
  assert.strictEqual(gstAmount.toNumber(), 6000); // 5% of 120,000 = 6,000

  // Total with GST
  const grandTotal = packageTotal.add(gstAmount);
  assert.strictEqual(grandTotal.toNumber(), 126000);
  assert.strictEqual(grandTotal.formatIndian(true), "₹1,26,000");

  // Agent Commission at 7.5% on base package
  const commission = packageTotal.mul(0.075);
  assert.strictEqual(commission.toNumber(), 9000); // 7.5% of 120,000 = 9,000

  // Net revenue after supplier hotel costs (₹80,000) and commission (₹9,000)
  const hotelSupplierCost = Money.from(80000);
  const totalCost = hotelSupplierCost.add(commission);
  const netProfit = packageTotal.sub(totalCost); // 120,000 - 89,000 = 31,000
  assert.strictEqual(netProfit.toNumber(), 31000);
  assert.strictEqual(netProfit.formatIndian(true), "₹31,000");
});

test("Accounting Engine: Multi-Stage Installment Payment Settlement", () => {
  let outstandingBalance = Money.from(150000); // ₹1,50,000

  // Installment 1: ₹50,000
  const payment1 = Money.from(50000);
  outstandingBalance = outstandingBalance.sub(payment1);
  assert.strictEqual(outstandingBalance.toNumber(), 100000);

  // Installment 2: ₹75,000
  const payment2 = Money.from(75000);
  outstandingBalance = outstandingBalance.sub(payment2);
  assert.strictEqual(outstandingBalance.toNumber(), 25000);

  // Final Settlement: ₹25,000
  const payment3 = Money.from(25000);
  outstandingBalance = outstandingBalance.sub(payment3);
  assert.strictEqual(outstandingBalance.toNumber(), 0);
  assert.strictEqual(outstandingBalance.formatIndian(true), "₹0");
});

test("Accounting Engine: Inclusive vs Exclusive GST Accuracy", () => {
  // Total inclusive amount: ₹10,500 at 5% GST
  // Base = 10500 / 1.05 = 10,000. GST = 500
  const inclusiveTotal = Money.from(10500);
  const { base, gst } = calculateGstInclusive(inclusiveTotal, 5);

  assert.strictEqual(base.toNumber(), 10000);
  assert.strictEqual(gst.toNumber(), 500);
  assert.strictEqual(base.add(gst).toNumber(), 10500);

  // Exclusive calculation verification
  const calculatedGst = calculateGst(base, 5);
  assert.strictEqual(calculatedGst.toNumber(), 500);
});

test("Accounting Engine: Paise Precision & Decimal Edge Cases", () => {
  // Precise paise additions that often cause floating point bugs in IEEE-754
  const tenPaise = Money.from(0.1);
  const twentyPaise = Money.from(0.2);
  const thirtyPaise = tenPaise.add(twentyPaise);

  assert.strictEqual(thirtyPaise.toNumber(), 0.3);
  assert.strictEqual(thirtyPaise.formatIndian(true), "₹0.30");

  // 1 Paisa calculation
  const onePaisa = Money.from(0.01);
  assert.strictEqual(onePaisa.toNumber(), 0.01);
  assert.strictEqual(onePaisa.formatIndian(true), "₹0.01");

  // Large Amount (100 Crores)
  const hundredCrores = Money.from(1000000000);
  assert.strictEqual(hundredCrores.formatIndian(true), "₹1,00,00,00,000");

  // Negative amount (Refund / Loss)
  const refund = Money.from(-12500.5);
  assert.strictEqual(refund.formatIndian(true), "-₹12,500.50");
});

test("Accounting Engine: Indian Calendar & Date Boundaries (IST)", () => {
  // Last second of month in IST (e.g. 31st March)
  const parsed31March = parseFlexibleDate("31/03/2026");
  assert.notStrictEqual(parsed31March, null);
  assert.strictEqual(formatDateIndian(parsed31March!), "31/03/2026");

  // Leap year check: 29th Feb 2028
  const leapDate = parseFlexibleDate("29/02/2028");
  assert.notStrictEqual(leapDate, null);
  assert.strictEqual(formatDateIndian(leapDate!), "29/02/2028");

  // Month boundary roll-over defense
  const novDate = parseFlexibleDate("05/11/2026");
  assert.strictEqual(formatDateIndian(novDate!), "05/11/2026");
});

test("Accounting Engine: Train Ticket Journal Entry, Customer Amount, Agent Amount & Service Charge (Profit)", () => {
  // Scenario from User Screenshot: Train Ticket (Chennai - Ahmedabad)
  // Customer Amount = ₹13,127.20
  // Agent Amount = ₹12,500.00
  // Service Charge (Profit) = Customer Amount - Agent Amount = ₹627.20
  const customerAmount = Money.from("13127.20");
  const agentAmount = Money.from("12500.00");
  const serviceCharge = customerAmount.sub(agentAmount);

  assert.strictEqual(serviceCharge.toFixed(2), "627.20");
  assert.strictEqual(serviceCharge.formatIndian(true, true), "₹627.20");
  assert.strictEqual(serviceCharge.isPositive(), true);

  // Profit Margin percentage
  const profitMarginPercent = serviceCharge.div(customerAmount).mul(100);
  assert.strictEqual(profitMarginPercent.toFixed(2), "4.78"); // 4.78% margin on train ticket booking
});

