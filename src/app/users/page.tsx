import { getSession } from "@/lib/auth/session";
import { getUsersManagementAction } from "@/server/actions/settings.actions";
import { UsersClient } from "./UsersClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const users = await getUsersManagementAction();

  return (
    <UsersClient
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      initialUsers={users}
    />
  );
}
