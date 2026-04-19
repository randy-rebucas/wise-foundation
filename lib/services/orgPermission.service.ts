import { connectDB } from "@/lib/db/connect";
import { OrgPermission, type OrgPermissionKey } from "@/lib/db/models/OrgPermission";
import { Organization } from "@/lib/db/models/Organization";

const PERMISSION_TO_SETTING: Record<OrgPermissionKey, string> = {
  "sell:retail": "canSellRetail",
  "distribute:stock": "canDistribute",
  "has:inventory": "hasInventory",
  "earn:commission": "commissionEnabled",
  "submit:orders": "canSubmitOrders",
};

export async function getOrgPermissions(organizationId: string) {
  await connectDB();
  return OrgPermission.find({ organizationId })
    .populate("grantedBy", "name")
    .sort({ permission: 1 })
    .lean();
}

export async function setOrgPermission(
  organizationId: string,
  permission: OrgPermissionKey,
  isGranted: boolean,
  grantedBy: string,
  opts?: { expiresAt?: Date | null; notes?: string }
) {
  await connectDB();

  const record = await OrgPermission.findOneAndUpdate(
    { organizationId, permission },
    {
      $set: {
        isGranted,
        grantedBy,
        expiresAt: opts?.expiresAt ?? null,
        notes: opts?.notes,
      },
    },
    { upsert: true, new: true }
  ).lean();

  // Sync to org.settings for quick-read access
  const settingKey = PERMISSION_TO_SETTING[permission];
  if (settingKey) {
    await Organization.findByIdAndUpdate(
      organizationId,
      { $set: { [`settings.${settingKey}`]: isGranted } }
    );
  }

  return record;
}

export async function hasOrgPermission(
  organizationId: string,
  permission: OrgPermissionKey
): Promise<boolean> {
  await connectDB();
  const record = await OrgPermission.findOne({ organizationId, permission }).lean();
  if (!record) {
    // Fall back to org.settings if no explicit permission record exists
    const org = await Organization.findById(organizationId).lean();
    if (!org) return false;
    const key = PERMISSION_TO_SETTING[permission];
    if (!key || typeof key !== "string") return false;
    return !!(org.settings as Record<string, boolean>)[key];
  }
  if (record.expiresAt && record.expiresAt < new Date()) return false;
  return record.isGranted;
}
