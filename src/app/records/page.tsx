import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { RecordsClient } from "./RecordsClient";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const records = await prisma.noteRecord.findMany({
    where: { isVoid: false },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  const serialized = records.map((r) => ({
    id: r.id,
    recordNumber: r.recordNumber,
    title: r.title,
    notes: r.notes,
    type: r.type,
    category: r.category,
    amount: r.amount.toString(),
    amountPaid: r.amountPaid.toString(),
    balanceDue: r.balanceDue.toString(),
    paymentMode: r.paymentMode,
    paymentStatus: r.paymentStatus,
    date: r.date.toISOString(),
    isPinned: r.isPinned,
    customer: r.customer,
    supplier: r.supplier,
    createdBy: r.createdBy,
  }));

  return (
    <AppShell user={session}>
      <RecordsClient initialRecords={serialized} />
    </AppShell>
  );
}
