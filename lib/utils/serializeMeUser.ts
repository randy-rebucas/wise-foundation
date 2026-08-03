/**
 * Flatten current-user record for API responses: string `organizationId` and optional `organizationName`.
 */
export function serializeMeUser(
  user: (Record<string, unknown> & { organization?: { name: string } | null }) | null | undefined
): Record<string, unknown> | null {
  if (!user) return null;
  const { organization, ...base } = user;
  return {
    ...base,
    organizationName: organization?.name ?? null,
  };
}
