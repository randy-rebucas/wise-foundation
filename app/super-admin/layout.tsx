import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SuperAdminSidebar } from "@/components/super-admin/SuperAdminSidebar";

interface Props {
  children: React.ReactNode;
}

export default async function SuperAdminLayout({ children }: Props) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/super-admin");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/login?error=access_denied");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SuperAdminSidebar
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
