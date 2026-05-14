import { connectDB } from "@/lib/db/connect";
import { AppSettings } from "@/lib/db/models/AppSettings";
import { User } from "@/lib/db/models/User";

/**
 * True when the setup wizard must run: settings not completed, or DB has no active users
 * (e.g. after reset while an `app_setup` cookie is still present).
 */
export async function computeSetupRequired(): Promise<boolean> {
  await connectDB();
  const settings = await AppSettings.findOne().lean();
  if (!settings?.setupCompleted) return true;
  const activeUsers = await User.countDocuments({ deletedAt: null });
  return activeUsers === 0;
}
