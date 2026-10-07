import test from "node:test";
import assert from "node:assert";
import { parseQuickAddSentence } from "../../src/lib/gemini";
import { RecordType, ServiceCategory, PaymentMode } from "@prisma/client";

test("AI Quick-Add: English Sentence Parsing with Amounts & Categories", async () => {
  const sentence = "Received 5000 from Kumar for Chennai flight ticket via UPI";
  const result = await parseQuickAddSentence(sentence);

  assert.strictEqual(result.amount, 5000);
  assert.strictEqual(result.type, RecordType.INCOME);
  assert.strictEqual(result.category, ServiceCategory.FLIGHT_TICKET);
  assert.strictEqual(result.paymentMode, PaymentMode.UPI);
  assert.strictEqual(result.partyName, "Kumar");
  assert.strictEqual(result.confidence >= 0.8, true);
});

test("AI Quick-Add: Expense Parsing with Hotel & Bank Transfer", async () => {
  const sentence = "Paid 3500 to Taj Hotel for Madurai booking by Bank";
  const result = await parseQuickAddSentence(sentence);

  assert.strictEqual(result.amount, 3500);
  assert.strictEqual(result.type, RecordType.EXPENSE);
  assert.strictEqual(result.category, ServiceCategory.HOTEL_BOOKING);
  assert.strictEqual(result.paymentMode, PaymentMode.BANK_TRANSFER);
});

test("AI Quick-Add: Tamil & Tanglish Parsing", async () => {
  const sentence = "Kumar Chennai flight ticketku 12000 koduthar UPI la";
  const result = await parseQuickAddSentence(sentence);

  assert.strictEqual(result.amount, 12000);
  assert.strictEqual(result.category, ServiceCategory.FLIGHT_TICKET);
  assert.strictEqual(result.paymentMode, PaymentMode.UPI);
});

test("AI Quick-Add: Decimal Paise and Fractional K Parsing", async () => {
  const sentence = "Tea and snacks expense 45.50 cash";
  const result = await parseQuickAddSentence(sentence);

  assert.strictEqual(result.amount, 45.5);
  assert.strictEqual(result.type, RecordType.EXPENSE);
  assert.strictEqual(result.paymentMode, PaymentMode.CASH);

  const kSentence = "Kerala tour package booking 2.5k received via GPay";
  const kResult = await parseQuickAddSentence(kSentence);
  assert.strictEqual(kResult.amount, 2500);
  assert.strictEqual(kResult.type, RecordType.INCOME);
  assert.strictEqual(kResult.paymentMode, PaymentMode.UPI);
});

test("AI Quick-Add: Train Ticket Category & Customer/Agent Amount Parsing", async () => {
  const sentence = "Train Ticket (Chennai - Ahmedabad) customer 13127.20 agent 12500 for Trichy Office by UPI";
  const result = await parseQuickAddSentence(sentence);

  assert.strictEqual(result.category, ServiceCategory.TRAIN_TICKET);
  assert.strictEqual(result.customerAmount, 13127.2);
  assert.strictEqual(result.agentAmount, 12500);
  assert.strictEqual(Number((result.serviceCharge || 0).toFixed(2)), 627.2);
  assert.strictEqual(result.paymentMode, PaymentMode.UPI);
});

test("AI Quick-Add: Contact Number & Dial Code Extraction", async () => {
  const sentence = "Received 7500 from Ramesh 9840123456 for Singapore visa service by UPI";
  const result = await parseQuickAddSentence(sentence);

  assert.strictEqual(result.amount, 7500);
  assert.strictEqual(result.partyName, "Ramesh");
  assert.strictEqual(result.partyPhone, "9840123456");
  assert.strictEqual(result.category, ServiceCategory.VISA_SERVICE);
  assert.strictEqual(result.paymentMode, PaymentMode.UPI);
});
