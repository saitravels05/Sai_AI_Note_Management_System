import { getSession } from "@/lib/auth/session";
import { ReportsClient } from "./ReportsClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <ReportsClient
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
    />
  );
}
