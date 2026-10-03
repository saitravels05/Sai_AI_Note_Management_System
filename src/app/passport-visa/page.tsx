import { getSession } from "@/lib/auth/session";
import { getPassportApplicationsAction } from "@/server/actions/passport.actions";
import { PassportVisaClient } from "./PassportVisaClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PassportVisaPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const apps = await getPassportApplicationsAction();

  return (
    <PassportVisaClient
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      initialApplications={apps}
    />
  );
}
