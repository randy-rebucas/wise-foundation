import { cache } from "react";
import { connectDB } from "@/lib/db/connect";
import { Tenant } from "@/lib/db/models/Tenant";

/**
 * Resolve a tenant document from its URL slug.
 *
 * Wrapped with React.cache so repeated calls within the same server-render
 * cycle (e.g. layout + page both calling it) result in a single DB query.
 */
export const getTenantBySlug = cache(async (slug: string) => {
  await connectDB();
  return Tenant.findOne({ slug, deletedAt: null }).lean();
});
