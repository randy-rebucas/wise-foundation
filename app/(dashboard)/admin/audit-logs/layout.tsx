import { auth } from "@/auth";
import { requireStaffRoleHome } from "@/lib/navigation/requireStaffHome";

export default async function AuditLogsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  requireStaffRoleHome(session, ["ADMIN"]);
  return <>{children}</>;
}
