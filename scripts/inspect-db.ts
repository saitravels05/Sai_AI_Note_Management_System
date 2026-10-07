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

  const allRecords = await prisma.noteRecord.findMany({
    select: {
      id: true,
      recordNumber: true,
      title: true,
      type: true,
      amount: true,
      customerAmount: true,
      agentAmount: true,
      serviceCharge: true,
      amountPaid: true,
      balanceDue: true,
      date: true,
      isDeleted: true,
    },
    orderBy: { recordNumber: "asc" },
  });

  console.table(
    allRecords.map((r) => ({
      recordNumber: r.recordNumber,
      title: r.title,
      type: r.type,
      amount: r.amount?.toString(),
      customerAmount: r.customerAmount?.toString(),
      agentAmount: r.agentAmount?.toString(),
      serviceCharge: r.serviceCharge?.toString(),
      date: r.date?.toISOString(),
      isDeleted: r.isDeleted,
    }))
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
