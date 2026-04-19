import { redirect } from "next/navigation";
import { auth } from "@/auth";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard",
  ORG_ADMIN: "/org-dashboard",
  BRANCH_MANAGER: "/pos",
  STAFF: "/pos",
  INVENTORY_MANAGER: "/inventory",
};

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(ROLE_HOME[session.user.role] ?? "/dashboard");
}
