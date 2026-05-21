import { isPlatformAdmin } from "@/lib/permissions";

/** Platform staff who can mark commissions paid or cancelled. */
export function canManageCommissionPayouts(role: string | undefined | null): boolean {
  return isPlatformAdmin(role);
}
