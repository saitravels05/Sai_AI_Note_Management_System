import { getSession } from "@/lib/auth/session";
import { getSettingsDataAction } from "@/server/actions/settings.actions";
import { SettingsClient } from "./SettingsClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const data = await getSettingsDataAction();

  return (
    <SettingsClient
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      initialData={data}
    />
  );
}
