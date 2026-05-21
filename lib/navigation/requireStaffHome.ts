import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { getStaffHomePath } from "@/lib/navigation/staffHome";

/** Redirects when the signed-in user must not view this role-exclusive page. */
export function requireStaffRoleHome(
  session: Session | null,
  allowedRoles: string[]
): void {
  const user = session?.user;
  if (!user) return;
  if (allowedRoles.includes(user.role)) return;
  redirect(getStaffHomePath(user));
}
