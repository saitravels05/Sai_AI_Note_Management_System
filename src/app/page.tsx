import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Money } from "@/lib/money";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";
import { RecordType, PassportAppStatus } from "@prisma/client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter boundary for charts: start of month, 5 months ago
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // High-performance parallelized data fetching
  const [
    recentRecords,
    activeRecordsSubset,
    customerDuesAgg,
    supplierPayablesAgg,
    passportAppsCount,
  ] = await Promise.all([
    // 1. Fetch only the 15 most recent records with joins
    prisma.noteRecord.findMany({
      where: { isVoid: false },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: 15,
    }),

    // 2. Fetch only minimal scalar fields for 6-month trends and today's cashflow
    prisma.noteRecord.findMany({
      where: {
        isVoid: false,
        date: { gte: sixMonthsAgo },
      },
      select: {
        type: true,
        category: true,
        amount: true,
        date: true,
      },
    }),

    // 3. Ultra-fast database native aggregation for customer receivables
    prisma.noteRecord.aggregate({
      where: { isVoid: false, balanceDue: { gt: 0 } },
      _sum: { balanceDue: true },
    }),

    // 4. Ultra-fast database native aggregation for supplier payables
    prisma.supplier.aggregate({
      where: { balanceDue: { gt: 0 } },
      _sum: { balanceDue: true },
    }),

    // 5. Active passport apps count
    prisma.passportApplication.count({
      where: {
        status: {
          notIn: [PassportAppStatus.COMPLETED],
        },
      },
    }),
  ]);

  let todayInflow = Money.zero();
  let todayOutflow = Money.zero();

  // Category accumulation
  const categorySums: Record<string, Money> = {};

  // Monthly trend accumulation (last 6 months)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendMap: Record<string, { income: Money; expense: Money }> = {};

  // Initialize last 6 months in order
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
    trendMap[key] = { income: Money.zero(), expense: Money.zero() };
  }

  for (const r of activeRecordsSubset) {
    const amt = Money.from(r.amount);
    const rDate = new Date(r.date);
    const dateStart = new Date(r.date);
    dateStart.setHours(0, 0, 0, 0);

    // Today's metrics
    if (dateStart.getTime() === today.getTime()) {
      if (r.type === RecordType.INCOME) todayInflow = todayInflow.add(amt);
      if (r.type === RecordType.EXPENSE) todayOutflow = todayOutflow.add(amt);
    }

    // Category breakdown (for Inflow)
    if (r.type === RecordType.INCOME) {
      const catKey = r.category.replace(/_/g, " ");
      categorySums[catKey] = (categorySums[catKey] || Money.zero()).add(amt);
    }

    // Monthly trend
    const monthKey = `${monthNames[rDate.getMonth()]} '${rDate.getFullYear().toString().slice(-2)}`;
    if (trendMap[monthKey]) {
      if (r.type === RecordType.INCOME) {
        trendMap[monthKey].income = trendMap[monthKey].income.add(amt);
      } else if (r.type === RecordType.EXPENSE) {
        trendMap[monthKey].expense = trendMap[monthKey].expense.add(amt);
      }
    }
  }

  const totalCustomerDues = Money.from(customerDuesAgg._sum.balanceDue || 0);
  const totalSupplierPayables = Money.from(supplierPayablesAgg._sum.balanceDue || 0);
  const netBalance = todayInflow.sub(todayOutflow);

  // Format monthly trend array for Recharts
  const monthlyTrend = Object.entries(trendMap).map(([month, data]) => ({
    month,
    income: data.income.toNumber(),
    expense: data.expense.toNumber(),
    net: data.income.sub(data.expense).toNumber(),
  }));

  // Format category data array for Recharts
  const finalCategoryData = Object.entries(categorySums)
    .map(([name, val]) => ({
      name,
      value: val.toNumber(),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Recent 15 records
  const serializedRecent = recentRecords.map((r) => ({
    id: r.id,
    recordNumber: r.recordNumber,
    title: r.title,
    type: r.type,
    category: r.category,
    amount: Money.from(r.amount).formatIndian(false),
    customerAmount: r.customerAmount ? Money.from(r.customerAmount).formatIndian(false) : null,
    agentAmount: r.agentAmount ? Money.from(r.agentAmount).formatIndian(false) : null,
    serviceCharge: r.serviceCharge ? Money.from(r.serviceCharge).formatIndian(false) : null,
    amountPaid: Money.from(r.amountPaid).formatIndian(false),
    balanceDue: Money.from(r.balanceDue).formatIndian(false),
    paymentMode: r.paymentMode,
    paymentStatus: r.paymentStatus,
    date: r.date.toISOString().split("T")[0],
    customerName: r.customer?.name || null,
    customerPhone: r.customer?.phone || null,
  }));

  return (
    <ExecutiveDashboard
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      metrics={{
        todayInflow: todayInflow.formatIndian(true),
        todayOutflow: todayOutflow.formatIndian(true),
        netBalance: netBalance.formatIndian(true),
        totalCustomerDues: totalCustomerDues.formatIndian(true),
        totalSupplierPayables: totalSupplierPayables.formatIndian(true),
        activePassportAppsCount: passportAppsCount,
        rawTodayInflow: todayInflow.toNumber(),
        rawTodayOutflow: todayOutflow.toNumber(),
      }}
      monthlyTrend={monthlyTrend}
      categoryData={finalCategoryData}
      recentRecords={serializedRecent}
    />
  );
}
