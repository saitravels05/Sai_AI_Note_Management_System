import { PrismaClient, RecordType, ServiceCategory, PaymentMode, PaymentStatus, Role } from "@prisma/client";
import { Money } from "../src/lib/money";

const prisma = new PrismaClient();

async function main() {
  console.log("================================================================================");
  console.log("  SAI Books – Master Journal Demo Data Seeder (Single Source of Truth)");
  console.log("================================================================================");

  // 1. Ensure Owner exists
  let owner = await prisma.user.findFirst({ where: { role: Role.OWNER } });
  if (!owner) {
    console.log("No owner found. Creating default Owner user...");
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash("Admin@12345", 10);
    owner = await prisma.user.create({
      data: {
        email: "owner@saitravels.com",
        passwordHash: hashedPassword,
        name: "Sai Admin",
        role: Role.OWNER,
        status: "ACTIVE",
        mustChangePassword: false,
      },
    });
    console.log("Created Owner: owner@saitravels.com / Admin@12345");
  }

  // 2. Setup Opening Balances in PaymentAccount
  console.log("Setting up Opening Balances in PaymentAccount...");
  await prisma.paymentAccount.upsert({
    where: { accountType: PaymentMode.CASH },
    update: { openingBalance: Money.from(25000).toDecimal() },
    create: { accountType: PaymentMode.CASH, name: "Cash in Hand", openingBalance: Money.from(25000).toDecimal() },
  });

  await prisma.paymentAccount.upsert({
    where: { accountType: PaymentMode.BANK_TRANSFER },
    update: { openingBalance: Money.from(150000).toDecimal() },
    create: { accountType: PaymentMode.BANK_TRANSFER, name: "HDFC Current Account", accountNumber: "50200012345678", openingBalance: Money.from(150000).toDecimal() },
  });

  await prisma.paymentAccount.upsert({
    where: { accountType: PaymentMode.UPI },
    update: { openingBalance: Money.from(15000).toDecimal() },
    create: { accountType: PaymentMode.UPI, name: "GPay / PhonePe Business", accountNumber: "saitravels@hdfcbank", openingBalance: Money.from(15000).toDecimal() },
  });

  // 3. Create Demo Customers
  console.log("Creating Demo Customers...");
  let custKumar = await prisma.customer.findFirst({ where: { name: "Kumar Travels" } });
  if (!custKumar) {
    custKumar = await prisma.customer.create({
      data: {
        name: "Kumar Travels",
        phone: "+91 98401 23456",
        email: "kumar.demo@gmail.com",
        address: "T. Nagar, Chennai, Tamil Nadu",
      },
    });
  }

  let custAnand = await prisma.customer.findFirst({ where: { name: "Anand Natarajan" } });
  if (!custAnand) {
    custAnand = await prisma.customer.create({
      data: {
        name: "Anand Natarajan",
        phone: "+91 98402 34567",
        email: "anand.demo@gmail.com",
        address: "KK Nagar, Madurai, Tamil Nadu",
      },
    });
  }

  let custMeena = await prisma.customer.findFirst({ where: { name: "Meena Sundaram" } });
  if (!custMeena) {
    custMeena = await prisma.customer.create({
      data: {
        name: "Meena Sundaram",
        phone: "+91 98403 45678",
        email: "meena.demo@gmail.com",
        address: "Gandhipuram, Coimbatore, Tamil Nadu",
      },
    });
  }

  // 4. Create Demo Suppliers
  console.log("Creating Demo Suppliers...");
  let suppIndigo = await prisma.supplier.findFirst({ where: { name: "IndiGo Airlines Portal" } });
  if (!suppIndigo) {
    suppIndigo = await prisma.supplier.create({
      data: {
        name: "IndiGo Airlines Portal",
        phone: "+91 98400 11111",
        email: "b2b@goindigo.in",
        category: ServiceCategory.FLIGHT_TICKET,
      },
    });
  }

  let suppTaj = await prisma.supplier.findFirst({ where: { name: "Taj Hotels & Resorts" } });
  if (!suppTaj) {
    suppTaj = await prisma.supplier.create({
      data: {
        name: "Taj Hotels & Resorts",
        phone: "+91 98400 22222",
        email: "reservations@tajhotels.com",
        category: ServiceCategory.HOTEL_BOOKING,
      },
    });
  }

  let suppIRCTC = await prisma.supplier.findFirst({ where: { name: "IRCTC Principal Portal" } });
  if (!suppIRCTC) {
    suppIRCTC = await prisma.supplier.create({
      data: {
        name: "IRCTC Principal Portal",
        phone: "+91 98400 33333",
        email: "agents@irctc.co.in",
        category: ServiceCategory.TRAIN_TICKET,
      },
    });
  }

  // 5. Seed Master Journal Entries (Demonstrating all 7 types)
  console.log("Seeding Master Journal (NoteRecord) Entries...");
  const now = new Date();

  const demoEntries = [
    // Entry 1: Flight Ticket (INCOME) with Customer Amount, Agent Cost & Profit
    {
      recordNumber: "REC-2026-1001",
      title: "Chennai to Delhi Roundtrip – Kumar",
      notes: "Indigo 6E-204 / 6E-205. Confirmed PNR #6EKUM9.",
      type: RecordType.INCOME,
      category: ServiceCategory.FLIGHT_TICKET,
      amount: Money.from(14500).toDecimal(),
      customerAmount: Money.from(14500).toDecimal(),
      agentAmount: Money.from(13200).toDecimal(),
      serviceCharge: Money.from(1300).toDecimal(), // ₹1,300 profit
      commissionAmount: Money.from(1300).toDecimal(),
      amountPaid: Money.from(14500).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.UPI,
      paymentStatus: PaymentStatus.COMPLETED,
      gstType: "EXTRA",
      gstRate: 5,
      gstAmount: Money.from(725).toDecimal(),
      referenceNumber: "6EKUM9",
      passengerCount: 1,
      travelDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // In 5 days
      customerId: custKumar.id,
      color: "amber",
      date: now,
    },
    // Entry 2: Airline Payment (EXPENSE)
    {
      recordNumber: "REC-2026-1002",
      title: "IndiGo B2B Portal Ticket Top-up",
      notes: "Issued ticket for Kumar PNR #6EKUM9 via net banking.",
      type: RecordType.EXPENSE,
      category: ServiceCategory.FLIGHT_TICKET,
      amount: Money.from(13200).toDecimal(),
      customerAmount: Money.from(0).toDecimal(),
      agentAmount: Money.from(13200).toDecimal(),
      serviceCharge: Money.from(0).toDecimal(),
      amountPaid: Money.from(13200).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.BANK_TRANSFER,
      paymentStatus: PaymentStatus.COMPLETED,
      supplierId: suppIndigo.id,
      color: "rose",
      date: now,
    },
    // Entry 3: Tour Package (RECEIVABLE) with Advance received and pending Due
    {
      recordNumber: "REC-2026-1003",
      title: "Singapore & Malaysia 5D4N Tour – Anand",
      notes: "Total package ₹85,000. Advance ₹35,000 paid by UPI. Balance ₹50,000 due 7 days before departure.",
      type: RecordType.RECEIVABLE,
      category: ServiceCategory.TOUR_PACKAGE,
      amount: Money.from(85000).toDecimal(),
      customerAmount: Money.from(85000).toDecimal(),
      agentAmount: Money.from(68000).toDecimal(),
      serviceCharge: Money.from(17000).toDecimal(), // ₹17,000 margin
      amountPaid: Money.from(35000).toDecimal(),
      balanceDue: Money.from(50000).toDecimal(), // ₹50,000 due
      paymentMode: PaymentMode.UPI,
      paymentStatus: PaymentStatus.PARTIAL,
      referenceNumber: "TOUR-SIN-2026",
      passengerCount: 2,
      travelDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
      customerId: custAnand.id,
      color: "indigo",
      date: now,
    },
    // Entry 4: Hotel Vendor (PAYABLE) with Advance paid and pending vendor Payable
    {
      recordNumber: "REC-2026-1004",
      title: "Taj Hotel Madurai – 3 Rooms 2 Nights Booking",
      notes: "Total hotel bill ₹30,000. Advance ₹10,000 paid from Bank. Balance ₹20,000 payable upon checkout.",
      type: RecordType.PAYABLE,
      category: ServiceCategory.HOTEL_BOOKING,
      amount: Money.from(30000).toDecimal(),
      customerAmount: Money.from(0).toDecimal(),
      agentAmount: Money.from(30000).toDecimal(),
      serviceCharge: Money.from(0).toDecimal(),
      amountPaid: Money.from(10000).toDecimal(),
      balanceDue: Money.from(20000).toDecimal(), // ₹20,000 due to hotel
      paymentMode: PaymentMode.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PARTIAL,
      referenceNumber: "TAJ-MDU-449",
      supplierId: suppTaj.id,
      color: "orange",
      date: now,
    },
    // Entry 5: Train Ticket Cancellation (REFUND)
    {
      recordNumber: "REC-2026-1005",
      title: "IRCTC Train Cancellation Refund to Meena",
      notes: "Ticket cancelled on request. ₹1,250 refunded to customer GPay after deduction.",
      type: RecordType.REFUND,
      category: ServiceCategory.TRAIN_TICKET,
      amount: Money.from(1250).toDecimal(),
      customerAmount: Money.from(1250).toDecimal(),
      agentAmount: Money.from(0).toDecimal(),
      serviceCharge: Money.from(0).toDecimal(),
      amountPaid: Money.from(1250).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.UPI,
      paymentStatus: PaymentStatus.COMPLETED,
      referenceNumber: "PNR-42119934",
      customerId: custMeena.id,
      color: "violet",
      date: now,
    },
    // Entry 6: Internal Account Transfer (TRANSFER)
    {
      recordNumber: "REC-2026-1006",
      title: "Cash Deposit to HDFC Bank Account",
      notes: "Surplus shop cash ₹10,000 deposited into HDFC Current Account.",
      type: RecordType.TRANSFER,
      category: ServiceCategory.OTHER,
      amount: Money.from(10000).toDecimal(),
      customerAmount: Money.from(0).toDecimal(),
      agentAmount: Money.from(0).toDecimal(),
      serviceCharge: Money.from(0).toDecimal(),
      amountPaid: Money.from(10000).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.CASH,
      transferToMode: PaymentMode.BANK_TRANSFER,
      paymentStatus: PaymentStatus.COMPLETED,
      color: "cyan",
      date: now,
    },
    // Entry 7: Memo / Plain Note (NOTE)
    {
      recordNumber: "REC-2026-1007",
      title: "PSK Madurai Tatkal Passport Appointment Document Verification",
      notes: "Anand Natarajan passport appointment on 15th at PSK Madurai. Annexure-E & Aadhaar original collected.",
      type: RecordType.NOTE,
      category: ServiceCategory.PASSPORT_SERVICE,
      amount: Money.from(0).toDecimal(),
      customerAmount: Money.from(0).toDecimal(),
      agentAmount: Money.from(0).toDecimal(),
      serviceCharge: Money.from(0).toDecimal(),
      amountPaid: Money.from(0).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.CASH,
      paymentStatus: PaymentStatus.PENDING,
      customerId: custAnand.id,
      color: "emerald",
      date: now,
    },
  ];

  for (const entry of demoEntries) {
    const existing = await prisma.noteRecord.findUnique({
      where: { recordNumber: entry.recordNumber },
    });

    if (!existing) {
      await prisma.noteRecord.create({
        data: {
          ...entry,
          createdById: owner.id,
        },
      });
      console.log(`Created Journal Entry: #${entry.recordNumber} - ${entry.title}`);
    } else {
      console.log(`Entry #${entry.recordNumber} already exists.`);
    }
  }

  console.log("================================================================================");
  console.log("Master Journal Seeding Complete!");
  console.log("All 7 Entry Types seeded successfully.");
  console.log("Opening Balances configured.");
  console.log("Now open http://localhost:3000 to see live calculated dashboard and ledgers.");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
