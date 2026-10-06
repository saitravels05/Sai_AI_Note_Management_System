import test from "node:test";
import assert from "node:assert";
import { Money, calculateGst, calculateNetProfit, calculateServiceCharge } from "../../src/lib/money";

test("Money Math: Exact Decimal Precision without Floating Point Loss", () => {
  const a = Money.from("0.1");
  const b = Money.from("0.2");
  const sum = a.add(b);

  assert.strictEqual(sum.toFixed(1), "0.3");
  assert.strictEqual(sum.formatIndian(false, true), "0.30");
});

test("Money Format: Indian Numbering System Formatting", () => {
  const oneLakh = Money.from(100000);
  assert.strictEqual(oneLakh.formatIndian(true), "₹1,00,000");

  const crore = Money.from(12345678.5);
  assert.strictEqual(crore.formatIndian(true, true), "₹1,23,45,678.50");

  const small = Money.from(500);
  assert.strictEqual(small.formatIndian(true), "₹500");
});

test("Money Math: GST and Commission Calculations", () => {
  const base = Money.from(10000);
  const gst = calculateGst(base, 5); // 5% GST
  assert.strictEqual(gst.toFixed(2), "500.00");
  assert.strictEqual(gst.formatIndian(true), "₹500");

  const totalWithGst = base.add(gst);
  assert.strictEqual(totalWithGst.formatIndian(true), "₹10,500");
});

test("Money Math: Net Profit Calculation", () => {
  const income = Money.from(55000);
  const expense = Money.from(22000);
  const net = calculateNetProfit(income, expense);

  assert.strictEqual(net.formatIndian(true), "₹33,000");
  assert.strictEqual(net.isPositive(), true);
});

test("Money Math: Service Charge (Profit) Calculation", () => {
  const customerAmount = Money.from("13127.20");
  const agentAmount = Money.from("12500.00");
  const serviceCharge = calculateServiceCharge(customerAmount, agentAmount);

  assert.strictEqual(serviceCharge.toFixed(2), "627.20");
  assert.strictEqual(serviceCharge.formatIndian(true, true), "₹627.20");
  assert.strictEqual(serviceCharge.isPositive(), true);
});

test("Money Robustness: Parsing Currency Strings with Symbols and Suffixes", () => {
  // Test variations commonly found in Excel imports and careless user inputs
  assert.strictEqual(Money.from("₹5000").toNumber(), 5000);
  assert.strictEqual(Money.from("₹ 1,00,000").toNumber(), 100000);
  assert.strictEqual(Money.from("Rs. 10,000/-").toNumber(), 10000);
  assert.strictEqual(Money.from("INR 50,000").toNumber(), 50000);
  assert.strictEqual(Money.from("2500.50/-").toNumber(), 2500.5);
  assert.strictEqual(Money.from("-₹1,500").toNumber(), -1500);
  assert.strictEqual(Money.from("(2,000)").toNumber(), -2000); // Accounting parenthesis format
  assert.strictEqual(Money.from("").toNumber(), 0);
  assert.strictEqual(Money.from("invalid-amount").toNumber(), 0);
});

test("Money Format: Standard Negative Indian Currency Notation", () => {
  const negativeThousand = Money.from(-1000);
  // Standard Indian accounting format: -₹1,000 (never ₹-1,000)
  assert.strictEqual(negativeThousand.formatIndian(true), "-₹1,000");
  assert.strictEqual(negativeThousand.formatIndian(false), "-1,000");

  const negativeLakh = Money.from(-125000.75);
  assert.strictEqual(negativeLakh.formatIndian(true, true), "-₹1,25,000.75");
});

test("Money Math: Inclusive GST Extraction", async () => {
  const { calculateGstInclusive } = await import("../../src/lib/money");

  // Flight ticket ₹5,250 inclusive of 5% GST
  const result = calculateGstInclusive(5250, 5);
  assert.strictEqual(result.base.formatIndian(true), "₹5,000");
  assert.strictEqual(result.gst.formatIndian(true), "₹250");
  assert.strictEqual(result.base.add(result.gst).formatIndian(true), "₹5,250");

  // ₹11,800 inclusive of 18% GST (e.g. Hotel luxury package)
  const hotel18 = calculateGstInclusive(11800, 18);
  assert.strictEqual(hotel18.base.formatIndian(true), "₹10,000");
  assert.strictEqual(hotel18.gst.formatIndian(true), "₹1,800");
});
