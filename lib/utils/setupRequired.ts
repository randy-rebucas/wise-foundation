import { prisma } from "@/lib/db/prisma";

/**
 * True when the setup wizard must run: settings not completed, or DB has no active users
 * (e.g. after reset while an `app_setup` cookie is still present).
 */
export async function computeSetupRequired(): Promise<boolean> {
  const settings = await prisma.appSettings.findFirst();
  if (!settings?.setupCompleted) return true;
  const activeUsers = await prisma.user.count({ where: { deletedAt: null } });
  return activeUsers === 0;
}
