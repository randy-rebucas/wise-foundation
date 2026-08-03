/**
 * Maintenance mode utilities
 */
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";

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
      const doc = await prisma.appSettings.findFirst({ select: { maintenanceMode: true } });
      return doc?.maintenanceMode === true;
    } catch {
      return false;
    }
  },
  ["maintenance-mode"],
  { tags: ["maintenance-mode"], revalidate: 10 }
);

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  const existing = await prisma.appSettings.findFirst();
  if (existing) {
    await prisma.appSettings.update({ where: { id: existing.id }, data: { maintenanceMode: enabled } });
  }
  revalidateTag("maintenance-mode", "page");
}
