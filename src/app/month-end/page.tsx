import { getSession } from "@/lib/auth/session";
import { getMonthAuditSummary } from "@/server/actions/monthend.actions";
import { MonthEndClient } from "./MonthEndClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MonthEndPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const summary = await getMonthAuditSummary(year, month);

  return (
    <MonthEndClient
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      initialYear={year}
      initialMonth={month}
      initialSummary={summary}
    />
  );
}
