/**
 * Maintenance mode utilities
 */
import { unstable_cache, revalidateTag } from "next/cache";
import { connectDB } from "@/lib/db/connect";
import { AppSettings } from "@/lib/db/models/AppSettings";

/** Fast env-var check used as a fallback (no DB required). */
export function isMaintenanceMode(): boolean {
  return process.env.MAINTENANCE_MODE === "true";
}

export function isMaintenanceModeAdmin(): boolean {
  return false;
}

// Empty array means all roles are blocked during maintenance
export const MAINTENANCE_BYPASS_ROLES: string[] = [];

/**
 * DB-backed check with a short cache TTL.
 * Returns true when either the env var OR the DB flag is set.
 */
export const getMaintenanceMode = unstable_cache(
  async (): Promise<boolean> => {
    if (isMaintenanceMode()) return true;
    try {
      await connectDB();
      const doc = await AppSettings.findOne({}, { maintenanceMode: 1 }).lean();
      return doc?.maintenanceMode === true;
    } catch {
      return false;
    }
  },
  ["maintenance-mode"],
  { tags: ["maintenance-mode"], revalidate: 10 }
);

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  await connectDB();
  await AppSettings.updateOne({}, { $set: { maintenanceMode: enabled } });
  revalidateTag("maintenance-mode");
}
