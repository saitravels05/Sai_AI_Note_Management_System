import { getSession } from "@/lib/auth/session";
import { getCustomersAction } from "@/server/actions/customers.actions";
import { AppShell } from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { CustomersClient } from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const customers = await getCustomersAction();

  return (
    <AppShell user={session}>
      <CustomersClient initialCustomers={customers} />
    </AppShell>
  );
}
