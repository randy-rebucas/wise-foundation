import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

const BLOCKED_ROLES = ["MEMBER"];

interface Props {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: Props) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (BLOCKED_ROLES.includes(session.user.role)) {
    redirect("/login?error=access_denied");
  }

  const sidebarUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    permissions: session.user.permissions,
  };

  return (
    <DashboardShell initialUser={sidebarUser}>
      {children}
    </DashboardShell>
  );
}
