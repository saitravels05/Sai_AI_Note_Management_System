import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [
    users,
    records,
    customers,
    suppliers,
    invoices,
    passportApps,
    months,
    branches,
    business,
  ] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, role: true } }),
    prisma.noteRecord.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.invoice.count(),
    prisma.passportApplication.count(),
    prisma.monthPeriod.count(),
    prisma.branch.count(),
    prisma.businessProfile.count(),
  ]);

  console.log("DB STATUS:");
  console.log({
    users,
    recordsCount: records,
    customersCount: customers,
    suppliersCount: suppliers,
    invoicesCount: invoices,
    passportAppsCount: passportApps,
    monthPeriodsCount: months,
    branchesCount: branches,
    businessProfilesCount: business,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
