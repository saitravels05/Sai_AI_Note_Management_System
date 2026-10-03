import { getSession } from "@/lib/auth/session";
import { getInvoicesAction } from "@/server/actions/invoices.actions";
import { AppShell } from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { InvoicesClient } from "./InvoicesClient";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const invoices = await getInvoicesAction();

  return (
    <AppShell user={session}>
      <InvoicesClient initialInvoices={invoices} />
    </AppShell>
  );
}
