import { connectDB } from "@/lib/db/connect";
import { Tenant } from "@/lib/db/models/Tenant";
import { User } from "@/lib/db/models/User";
import { Order } from "@/lib/db/models/Order";
import { Member } from "@/lib/db/models/Member";
import { Branch } from "@/lib/db/models/Branch";
import { Product } from "@/lib/db/models/Product";

export async function getSystemStats() {
  await connectDB();

  const [
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    totalUsers,
    totalOrders,
    revenueAgg,
    totalMembers,
    recentTenants,
  ] = await Promise.all([
    Tenant.countDocuments({ deletedAt: null }),
    Tenant.countDocuments({ status: "active", deletedAt: null }),
    Tenant.countDocuments({ status: "trial", deletedAt: null }),
    Tenant.countDocuments({ status: "suspended", deletedAt: null }),
    User.countDocuments({ deletedAt: null }),
    Order.countDocuments({ status: { $in: ["paid", "completed"] }, deletedAt: null }),
    Order.aggregate([
      { $match: { status: { $in: ["paid", "completed"] }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Member.countDocuments({ status: "active", deletedAt: null }),
    Tenant.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  return {
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    totalUsers,
    totalOrders,
    totalRevenue: revenueAgg[0]?.total ?? 0,
    totalMembers,
    recentTenants,
  };
}

export async function getAllTenants(
  page = 1,
  limit = 20,
  search?: string,
  status?: string
) {
  await connectDB();
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { deletedAt: null };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (status && status !== "all") filter.status = status;

  const [tenants, total] = await Promise.all([
    Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Tenant.countDocuments(filter),
  ]);

  const enriched = await Promise.all(
    tenants.map(async (t) => {
      const [userCount, branchCount] = await Promise.all([
        User.countDocuments({ tenantId: t._id, deletedAt: null }),
        Branch.countDocuments({ tenantId: t._id, deletedAt: null }),
      ]);
      return { ...t, userCount, branchCount };
    })
  );

  return { tenants: enriched, total, pages: Math.ceil(total / limit) };
}

export async function getTenantDetail(tenantId: string) {
  await connectDB();
  const tenant = await Tenant.findOne({ _id: tenantId, deletedAt: null }).lean();
  if (!tenant) return null;

  const [users, branches, orderCount, memberCount, productCount] = await Promise.all([
    User.find({ tenantId, deletedAt: null }).select("-password").sort({ createdAt: -1 }).lean(),
    Branch.find({ tenantId, deletedAt: null }).sort({ isHeadOffice: -1 }).lean(),
    Order.countDocuments({ tenantId, deletedAt: null }),
    Member.countDocuments({ tenantId, deletedAt: null }),
    Product.countDocuments({ tenantId, deletedAt: null }),
  ]);

  return { tenant, users, branches, orderCount, memberCount, productCount };
}

export async function getAllUsersAcrossTenants(
  page = 1,
  limit = 20,
  search?: string,
  role?: string,
  tenantId?: string
) {
  await connectDB();
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { deletedAt: null };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (role && role !== "all") filter.role = role;
  if (tenantId && tenantId !== "all") filter.tenantId = tenantId;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("tenantId", "name slug")
      .lean(),
    User.countDocuments(filter),
  ]);

  return { users, total, pages: Math.ceil(total / limit) };
}

export async function updateTenantStatus(
  tenantId: string,
  status: "active" | "suspended" | "trial"
) {
  await connectDB();
  return Tenant.findOneAndUpdate(
    { _id: tenantId, deletedAt: null },
    { $set: { status } },
    { new: true }
  ).lean();
}
