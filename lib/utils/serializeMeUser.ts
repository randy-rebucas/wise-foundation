/**
 * Flatten current-user document for API responses: string `organizationId` and optional `organizationName`.
 */
export function serializeMeUser(user: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!user) return null;
  const base = { ...user };
  const orgField = base.organizationId;
  delete base.organizationId;

  let organizationId: string | null = null;
  let organizationName: string | null = null;

  if (orgField && typeof orgField === "object" && orgField !== null && "name" in orgField) {
    const org = orgField as { _id: { toString(): string }; name?: string };
    organizationId = org._id.toString();
    organizationName = org.name ?? null;
  } else if (orgField != null) {
    organizationId =
      typeof orgField === "object" && "toString" in orgField
        ? (orgField as { toString(): string }).toString()
        : String(orgField);
  }

  return { ...base, organizationId, organizationName };
}
