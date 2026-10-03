import { PrismaClient, RecordType, ServiceCategory, PaymentMode, PaymentStatus, Role, UserStatus } from "@prisma/client";
import { Money } from "../src/lib/money";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding realistic sample data for Sai Tours & Travels...");

  const owner = await prisma.user.findFirst({ where: { role: Role.OWNER } });
  if (!owner) {
    console.error("Owner account must exist first. Run npm run bootstrap:owner");
    process.exit(1);
  }

  // Create Customers
  const customer1 = await prisma.customer.upsert({
    where: { id: "cust-1" },
    update: {},
    create: {
      id: "cust-1",
      name: "Ramesh Kumar",
      phone: "+91 98421 11223",
      email: "ramesh.k@gmail.com",
      address: "Anna Nagar, Madurai",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: "cust-2" },
    update: {},
    create: {
      id: "cust-2",
      name: "Priya Murugan",
      phone: "+91 94432 44556",
      email: "priya.m@gmail.com",
      address: "KK Nagar, Madurai",
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { id: "cust-3" },
    update: {},
    create: {
      id: "cust-3",
      name: "Saravanan R",
      phone: "+91 97890 77889",
      email: "saravanan.r@gmail.com",
      address: "Simmakkal, Madurai",
    },
  });

  // Create Sample Note Cards
  const sampleCards = [
    {
      recordNumber: "REC-2026-0001",
      title: "Ramesh – Goa 3N/4D family package – advance",
      notes: "4 Pax family trip. Balance ₹15,000 payable on hotel check-in.",
      type: RecordType.INCOME,
      category: ServiceCategory.TOUR_PACKAGE,
      amount: Money.from(10000).toDecimal(),
      amountPaid: Money.from(10000).toDecimal(),
      balanceDue: Money.from(15000).toDecimal(),
      paymentMode: PaymentMode.UPI,
      paymentStatus: PaymentStatus.PARTIAL,
      customerId: customer1.id,
      isPinned: true,
      color: "amber",
      date: new Date(),
    },
    {
      recordNumber: "REC-2026-0002",
      title: "Priya – Singapore Tourist Visa documentation & fee",
      notes: "Express processing. PSK Madurai submission scheduled.",
      type: RecordType.INCOME,
      category: ServiceCategory.VISA_SERVICE,
      amount: Money.from(4500).toDecimal(),
      amountPaid: Money.from(4500).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.UPI,
      paymentStatus: PaymentStatus.COMPLETED,
      customerId: customer2.id,
      isPinned: true,
      color: "emerald",
      date: new Date(),
    },
    {
      recordNumber: "REC-2026-0003",
      title: "Saravanan – Chennai to Dubai Indigo flight ticket",
      notes: "Ticket issued via Amadeus. PNR: 6E-8842.",
      type: RecordType.INCOME,
      category: ServiceCategory.FLIGHT_TICKET,
      amount: Money.from(24500).toDecimal(),
      amountPaid: Money.from(24500).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.BANK_TRANSFER,
      paymentStatus: PaymentStatus.COMPLETED,
      customerId: customer3.id,
      isPinned: false,
      color: "sky",
      date: new Date(),
    },
    {
      recordNumber: "REC-2026-0004",
      title: "Paid Taj Gateway Hotel Madurai – 2 nights corporate suite",
      notes: "Direct NEFT to hotel corporate account.",
      type: RecordType.EXPENSE,
      category: ServiceCategory.HOTEL_BOOKING,
      amount: Money.from(8200).toDecimal(),
      amountPaid: Money.from(8200).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.BANK_TRANSFER,
      paymentStatus: PaymentStatus.COMPLETED,
      isPinned: false,
      color: "rose",
      date: new Date(),
    },
    {
      recordNumber: "REC-2026-0005",
      title: "Innova Crysta Kodaikanal drop – Driver Batta & Tolls",
      notes: "Vehicle TN-59-AX-1234, Driver Murugan.",
      type: RecordType.EXPENSE,
      category: ServiceCategory.VEHICLE_RENTAL,
      amount: Money.from(5500).toDecimal(),
      amountPaid: Money.from(5500).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.CASH,
      paymentStatus: PaymentStatus.COMPLETED,
      isPinned: false,
      color: "purple",
      date: new Date(),
    },
    {
      recordNumber: "REC-2026-0006",
      title: "Office Airtel Fiber & Electricity Bill – October",
      notes: "Branch utility expense.",
      type: RecordType.EXPENSE,
      category: ServiceCategory.OFFICE_EXPENSE,
      amount: Money.from(1850).toDecimal(),
      amountPaid: Money.from(1850).toDecimal(),
      balanceDue: Money.zero().toDecimal(),
      paymentMode: PaymentMode.UPI,
      paymentStatus: PaymentStatus.COMPLETED,
      isPinned: false,
      color: "indigo",
      date: new Date(),
    },
  ];

  for (const card of sampleCards) {
    await prisma.noteRecord.upsert({
      where: { recordNumber: card.recordNumber },
      update: {},
      create: {
        ...card,
        createdById: owner.id,
      },
    });
  }

  console.log(`[SUCCESS] Seeded ${sampleCards.length} realistic travel business note cards!`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
