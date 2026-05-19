/** API prefixes reachable without a staff session (marketplace + customer account). */
export const CUSTOMER_API_PREFIXES = ["/api/account", "/api/marketplace"] as const;

/** API prefixes reachable without any session. */
export const PUBLIC_API_PREFIXES = ["/api/auth", "/api/setup"] as const;

export const STAFF_BLOCKED_ROLES = ["CUSTOMER", "MEMBER"] as const;

export type StaffBlockedRole = (typeof STAFF_BLOCKED_ROLES)[number];

export function isCustomerOrPublicApi(pathname: string): boolean {
  if (
    PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return true;
  }
  return CUSTOMER_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isStaffBlockedRole(role: string): role is StaffBlockedRole {
  return (STAFF_BLOCKED_ROLES as readonly string[]).includes(role);
}
