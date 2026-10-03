import { getSession } from "@/lib/auth/session";
import { getSuppliersAction } from "@/server/actions/suppliers.actions";
import { SuppliersClient } from "./SuppliersClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const suppliers = await getSuppliersAction();

  return (
    <SuppliersClient
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      initialSuppliers={suppliers}
    />
  );
}
