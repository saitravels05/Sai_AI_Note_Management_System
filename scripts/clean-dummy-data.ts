import { PrismaClient, Role, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=======================================================");
  console.log("SAI Books – Fresh Production Clean-Up");
  console.log("=======================================================");

  // 1. Delete dependent dummy transactional and CRM data
  const delAttachments = await prisma.documentAttachment.deleteMany({});
  console.log(`[DELETED] Document attachments: ${delAttachments.count}`);

  const delRecords = await prisma.noteRecord.deleteMany({});
  console.log(`[DELETED] Dummy Note Records: ${delRecords.count}`);

  const delBookings = await prisma.travelBooking.deleteMany({});
  console.log(`[DELETED] Travel Bookings: ${delBookings.count}`);

  const delCustomers = await prisma.customer.deleteMany({});
  console.log(`[DELETED] Dummy Customers: ${delCustomers.count}`);

  const delSuppliers = await prisma.supplier.deleteMany({});
  console.log(`[DELETED] Suppliers: ${delSuppliers.count}`);

  const delInvoices = await prisma.invoice.deleteMany({});
  console.log(`[DELETED] Invoices: ${delInvoices.count}`);

  const delPassportApps = await prisma.passportApplication.deleteMany({});
  console.log(`[DELETED] Passport Applications: ${delPassportApps.count}`);

  const delMonths = await prisma.monthPeriod.deleteMany({});
  console.log(`[DELETED] Month Periods: ${delMonths.count}`);

  const delBatches = await prisma.importBatch.deleteMany({});
  console.log(`[DELETED] Import Batches: ${delBatches.count}`);

  const delAudit = await prisma.auditLog.deleteMany({});
  console.log(`[DELETED] Initial Audit Logs: ${delAudit.count}`);

  // Clean non-owner test accounts (leave only owner saipassportmdu@gmail.com)
  const delTestUsers = await prisma.user.deleteMany({
    where: {
      email: { not: "saipassportmdu@gmail.com" },
    },
  });
  console.log(`[DELETED] Test visitor accounts: ${delTestUsers.count}`);

  // 2. Ensure Primary Owner Account is pristine and active
  const owner = await prisma.user.findUnique({
    where: { email: "saipassportmdu@gmail.com" },
  });

  if (owner) {
    console.log(`[PRESERVED] Owner Account Active: ${owner.email} (Role: ${owner.role})`);
  } else {
    console.warn(`[WARNING] Owner account not found. Please run npm run bootstrap:owner.`);
  }

  // 3. Ensure Business Profile is fresh and accurate
  await prisma.businessProfile.upsert({
    where: { id: "default-business-profile" },
    update: {
      name: "Sai Tours and Travels",
      legalName: "Sai Tours & Travels Madurai",
      gstin: "33AAAAA0000A1Z5",
      email: "saipassportmdu@gmail.com",
      phone: "+91 98421 00000",
      address: "Near Madurai PSK, Mattuthavani, Madurai - 625020, Tamil Nadu, India",
      currency: "INR",
      currencySymbol: "₹",
      logoUrl: "/brand/logo.jpg",
      financialYearStart: 4,
      defaultGstRate: 5.0,
      aiEnabled: true,
    },
    create: {
      id: "default-business-profile",
      name: "Sai Tours and Travels",
      legalName: "Sai Tours & Travels Madurai",
      gstin: "33AAAAA0000A1Z5",
      email: "saipassportmdu@gmail.com",
      phone: "+91 98421 00000",
      address: "Near Madurai PSK, Mattuthavani, Madurai - 625020, Tamil Nadu, India",
      currency: "INR",
      currencySymbol: "₹",
      logoUrl: "/brand/logo.jpg",
      financialYearStart: 4,
      defaultGstRate: 5.0,
      aiEnabled: true,
    },
  });
  console.log(`[SUCCESS] Business Profile set to: Sai Tours and Travels`);

  // 4. Ensure Primary Branch is registered
  const mainBranch = await prisma.branch.upsert({
    where: { code: "MDU-MAIN" },
    update: {
      name: "Madurai Main PSK Branch",
      city: "Madurai",
      phone: "+91 98421 00000",
      address: "Near Madurai PSK, Mattuthavani, Madurai - 625020",
      isMain: true,
    },
    create: {
      name: "Madurai Main PSK Branch",
      code: "MDU-MAIN",
      city: "Madurai",
      phone: "+91 98421 00000",
      address: "Near Madurai PSK, Mattuthavani, Madurai - 625020",
      isMain: true,
    },
  });
  console.log(`[SUCCESS] Primary Branch initialized: ${mainBranch.name} (${mainBranch.code})`);

  console.log("=======================================================");
  console.log("CLEANUP COMPLETE: Fresh application ready for production!");
  console.log("=======================================================");
}

main()
  .catch((e) => {
    console.error("Clean-up failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
