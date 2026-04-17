import { connectDB } from "@/lib/db/connect";
import { Tenant, type ITenant } from "@/lib/db/models/Tenant";
import { Branch } from "@/lib/db/models/Branch";
import { User } from "@/lib/db/models/User";
import { Role, DEFAULT_ROLE_PERMISSIONS } from "@/lib/db/models/Role";
import type { UserRole } from "@/types";

export async function getTenants(page = 1, limit = 20) {
  await connectDB();
  const skip = (page - 1) * limit;
  const [tenants, total] = await Promise.all([
    Tenant.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Tenant.countDocuments({ deletedAt: null }),
  ]);
  return { tenants, total, pages: Math.ceil(total / limit) };
}

export async function getTenantById(tenantId: string) {
  await connectDB();
  return Tenant.findOne({ _id: tenantId, deletedAt: null }).lean();
}

export async function updateTenant(tenantId: string, data: Partial<ITenant>) {
  await connectDB();
  return Tenant.findOneAndUpdate(
    { _id: tenantId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteTenant(tenantId: string) {
  await connectDB();
  return Tenant.findOneAndUpdate(
    { _id: tenantId },
    { $set: { deletedAt: new Date(), status: "suspended" } },
    { new: true }
  ).lean();
}

export async function getTenantStats(tenantId: string) {
  await connectDB();
  const [branchCount, userCount] = await Promise.all([
    Branch.countDocuments({ tenantId, deletedAt: null }),
    User.countDocuments({ tenantId, deletedAt: null }),
  ]);
  return { branchCount, userCount };
}
