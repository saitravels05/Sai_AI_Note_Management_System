import { getSession } from "@/lib/auth/session";
import { getReceivablesAgingAction } from "@/server/actions/receivables.actions";
import { ReceivablesClient } from "./ReceivablesClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const summary = await getReceivablesAgingAction();

  return (
    <ReceivablesClient
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      initialSummary={summary}
    />
  );
}
