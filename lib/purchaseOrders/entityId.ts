/** Normalize populated or raw Mongo id fields to string. */
export function refEntityId(field: unknown): string | null {
  if (field == null) return null;
  if (typeof field === "object" && field !== null && "_id" in field) {
    return String((field as { _id: unknown })._id);
  }
  if (typeof field === "object" && field !== null && "toString" in field) {
    return (field as { toString(): string }).toString();
  }
  return String(field);
}
