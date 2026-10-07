import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Money } from "@/lib/money";
import { getISTDayRange } from "@/lib/date";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";
import {
  calculateDashboardMetrics,
  calculateCustomerLedgers,
  calculateSupplierLedgers,
  diagnoseDataHealth,
  verifySystemReconciliation,
  getRecordAmount,
  getRecordPaid,
  getRecordDue,
  OpeningBalances,
} from "@/lib/accounting-engine";
import { RecordType, Role, PaymentMode, PassportAppStatus } from "@prisma/client";
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

  // Role-based where clause (Server-side RBAC enforcement)
  const isStaff = session.role === Role.STAFF;
  const recordsWhere: any = {
    isVoid: false,
    isDeleted: false,
  };
  if (isStaff) {
    recordsWhere.createdById = session.id;
  }

  // Parallel database queries
  const [
    allRecords,
    paymentAccounts,
    customers,
    suppliers,
    passportAppsCount,
  ] = await Promise.all([
    // 1. All active journal records (master source of truth)
    prisma.noteRecord.findMany({
      where: recordsWhere,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    }),

    // 2. Configured payment accounts with opening balances
    prisma.paymentAccount.findMany(),

    // 3. Customers for ledger reconciliation
    prisma.customer.findMany({
      select: { id: true, name: true, phone: true },
    }),

    // 4. Suppliers for vendor ledger reconciliation
    prisma.supplier.findMany({
      select: { id: true, name: true, phone: true, category: true },
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

  // Construct Opening Balances
  const openingBalances: OpeningBalances = {
    cash: Money.zero(),
    bank: Money.zero(),
    upi: Money.zero(),
  };

  for (const acc of paymentAccounts) {
    const bal = Money.from(acc.openingBalance);
    if (acc.accountType === PaymentMode.CASH) {
      openingBalances.cash = bal;
    } else if (acc.accountType === PaymentMode.BANK_TRANSFER || acc.accountType === PaymentMode.CARD) {
      openingBalances.bank = openingBalances.bank.add(bal);
    } else if (acc.accountType === PaymentMode.UPI) {
      openingBalances.upi = bal;
    }
  }

  // 100% Deterministic Central Calculation Engine
  const metricsResult = calculateDashboardMetrics(allRecords, openingBalances, today);
  const customerLedgers = calculateCustomerLedgers(customers, allRecords);
  const supplierLedgers = calculateSupplierLedgers(suppliers, allRecords);
  const reconciliation = verifySystemReconciliation(allRecords, customerLedgers, supplierLedgers);
  const healthIssues = diagnoseDataHealth(allRecords, {
    cash: metricsResult.cashBalance,
    bank: metricsResult.bankBalance,
    upi: metricsResult.upiBalance,
  });

  // Calculate 6-month trend array for Recharts
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendMap: Record<string, { income: Money; expense: Money }> = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
    trendMap[key] = { income: Money.zero(), expense: Money.zero() };
  }

  for (const r of allRecords) {
    const amt = getRecordAmount(r);
    const rDate = new Date(r.date);
    const monthKey = `${monthNames[rDate.getMonth()]} '${rDate.getFullYear().toString().slice(-2)}`;
    if (trendMap[monthKey]) {
      if (r.type === RecordType.INCOME) {
        trendMap[monthKey].income = trendMap[monthKey].income.add(amt);
      } else if (r.type === RecordType.EXPENSE || r.type === RecordType.REFUND) {
        trendMap[monthKey].expense = trendMap[monthKey].expense.add(amt);
      }
    }
  }

  const monthlyTrend = Object.entries(trendMap).map(([month, data]) => ({
    month,
    income: data.income.toNumber(),
    expense: data.expense.toNumber(),
    net: data.income.sub(data.expense).toNumber(),
  }));

  // Category chart data
  const finalCategoryData = Object.entries(metricsResult.categoryIncomeBreakdown)
    .map(([name, val]) => ({
      name: name.replace(/_/g, " "),
      value: val.toNumber(),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Serialized Helper for Drill Down items
  const serializeDrillItem = (r: any) => {
    const amt = getRecordAmount(r);
    const paid = getRecordPaid(r, amt);
    const due = getRecordDue(r, amt, paid);
    return {
      id: r.id,
      recordNumber: r.recordNumber,
      title: r.title,
      date: new Date(r.date).toISOString().split("T")[0],
      type: r.type,
      category: r.category,
      amount: amt.formatIndian(false),
      amountPaid: paid.formatIndian(false),
      balanceDue: due.formatIndian(false),
      paymentMode: r.paymentMode,
      customerName: r.customer?.name || null,
      customerPhone: r.customer?.phone || null,
      notes: r.notes || null,
    };
  };

  const { start: todayStart, end: todayEnd } = getISTDayRange(today);

  // Build Drill-down Datasets
  const drillDownDatasets = {
    todayInflow: allRecords
      .filter((r) => {
        const d = new Date(r.date);
        return d >= todayStart && d <= todayEnd && r.type === RecordType.INCOME;
      })
      .map(serializeDrillItem),

    todayOutflow: allRecords
      .filter((r) => {
        const d = new Date(r.date);
        return d >= todayStart && d <= todayEnd && (r.type === RecordType.EXPENSE || r.type === RecordType.REFUND);
      })
      .map(serializeDrillItem),

    customerDues: allRecords
      .filter((r) => getRecordDue(r).greaterThan(0) && (r.type === RecordType.RECEIVABLE || r.type === RecordType.INCOME))
      .map(serializeDrillItem),

    supplierPayables: allRecords
      .filter((r) => getRecordDue(r).greaterThan(0) && (r.type === RecordType.PAYABLE || r.type === RecordType.EXPENSE))
      .map(serializeDrillItem),

    cashJournal: allRecords
      .filter((r) => r.paymentMode === PaymentMode.CASH)
      .slice(0, 40)
      .map(serializeDrillItem),

    bankJournal: allRecords
      .filter((r) => r.paymentMode === PaymentMode.BANK_TRANSFER || r.paymentMode === PaymentMode.CARD)
      .slice(0, 40)
      .map(serializeDrillItem),

    upiJournal: allRecords
      .filter((r) => r.paymentMode === PaymentMode.UPI)
      .slice(0, 40)
      .map(serializeDrillItem),
  };

  // Staff collection (for Owner/Admin/Manager)
  const staffCollectionList = Object.values(metricsResult.staffCollectionBreakdown).map((s) => ({
    staffName: s.staffName,
    totalCollected: s.totalCollected.formatIndian(true),
    count: s.count,
  }));

  // Recent 15 records for the bottom table
  const recentRecords = allRecords.slice(0, 15).map((r) => {
    const amt = getRecordAmount(r);
    const paid = getRecordPaid(r, amt);
    const due = getRecordDue(r, amt, paid);
    return {
      id: r.id,
      recordNumber: r.recordNumber,
      title: r.title,
      type: r.type,
      category: r.category,
      amount: amt.formatIndian(false),
      amountPaid: paid.formatIndian(false),
      balanceDue: due.formatIndian(false),
      paymentMode: r.paymentMode,
      paymentStatus: r.paymentStatus,
      date: new Date(r.date).toISOString().split("T")[0],
      customerName: r.customer?.name || null,
      customerPhone: r.customer?.phone || null,
      notes: r.notes || null,
    };
  });

  return (
    <ExecutiveDashboard
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      metrics={{
        todayInflow: metricsResult.todayInflow.formatIndian(true),
        todayOutflow: metricsResult.todayOutflow.formatIndian(true),
        netBalance: metricsResult.todayNet.formatIndian(true),
        totalCustomerDues: metricsResult.totalCustomerDues.formatIndian(true),
        totalSupplierPayables: metricsResult.totalSupplierPayables.formatIndian(true),
        activePassportAppsCount: passportAppsCount,
        cashBalance: metricsResult.cashBalance.formatIndian(true),
        bankBalance: metricsResult.bankBalance.formatIndian(true),
        upiBalance: metricsResult.upiBalance.formatIndian(true),
        totalLiquidBalance: metricsResult.totalLiquidBalance.formatIndian(true),
        thisMonthIncome: metricsResult.thisMonthIncome.formatIndian(true),
        thisMonthExpense: metricsResult.thisMonthExpense.formatIndian(true),
        thisMonthNetProfit: metricsResult.thisMonthNetProfit.formatIndian(true),
        thisMonthCommission: metricsResult.thisMonthCommission.formatIndian(true),
        thisMonthGstPayable: metricsResult.thisMonthGstPayable.formatIndian(true),
        upcomingTripsCount: metricsResult.upcomingTripsCount,
      }}
      reconciliation={{
        isReconciled: reconciliation.isReconciled,
        greenTick: reconciliation.greenTick,
        statusText: reconciliation.statusText,
        dashboardNet: reconciliation.dashboardNet,
        journalSum: reconciliation.journalSum,
        discrepancies: reconciliation.discrepancies,
      }}
      healthIssues={healthIssues}
      staffCollection={session.role !== Role.STAFF ? staffCollectionList : undefined}
      drillDownDatasets={drillDownDatasets}
      monthlyTrend={monthlyTrend}
      categoryData={finalCategoryData}
      recentRecords={recentRecords}
    />
  );
}
