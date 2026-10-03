import { getSession } from "@/lib/auth/session";
import { AiStudioClient } from "./AiStudioClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AiStudioPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AiStudioClient
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
    />
  );
}
