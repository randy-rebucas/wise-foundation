import { auth } from "@/auth";
import { requireStaffRoleHome } from "@/lib/navigation/requireStaffHome";

export default async function CommissionsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  requireStaffRoleHome(session, ["ADMIN", "ORG_ADMIN"]);
  return <>{children}</>;
}
