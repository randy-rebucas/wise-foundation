import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar initialUser={sidebarUser} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
