import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Tenant } from "@/lib/db/models/Tenant";
import { User } from "@/lib/db/models/User";
import { Order } from "@/lib/db/models/Order";
import { Member } from "@/lib/db/models/Member";
import { Branch } from "@/lib/db/models/Branch";
import { Product } from "@/lib/db/models/Product";
import { Transaction } from "@/lib/db/models/Transaction";

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

  const [users, branches, orderCount, memberCount, productCount, financials] = await Promise.all([
    User.find({ tenantId, deletedAt: null }).select("-password").sort({ createdAt: -1 }).lean(),
    Branch.find({ tenantId, deletedAt: null }).sort({ isHeadOffice: -1 }).lean(),
    Order.countDocuments({ tenantId, deletedAt: null }),
    Member.countDocuments({ tenantId, deletedAt: null }),
    Product.countDocuments({ tenantId, deletedAt: null }),
    getTenantFinancials(tenantId),
  ]);

  return { tenant, users, branches, orderCount, memberCount, productCount, financials };
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

export async function getTenantFinancials(tenantId: string) {
  await connectDB();
  const tid = new mongoose.Types.ObjectId(tenantId);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Build last-6-months buckets
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    revenueAgg,
    refundAgg,
    discountAgg,
    thisMonthAgg,
    lastMonthAgg,
    paymentMethodAgg,
    monthlyRevenueAgg,
    recentTransactions,
    totalTransactionCount,
  ] = await Promise.all([
    // Total gross revenue (paid + completed)
    Order.aggregate([
      { $match: { tenantId: tid, status: { $in: ["paid", "completed"] }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    // Total refunds
    Order.aggregate([
      { $match: { tenantId: tid, status: "refunded", deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    // Total discounts given
    Order.aggregate([
      { $match: { tenantId: tid, status: { $in: ["paid", "completed"] }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$discountAmount" } } },
    ]),
    // This month revenue
    Order.aggregate([
      {
        $match: {
          tenantId: tid,
          status: { $in: ["paid", "completed"] },
          deletedAt: null,
          createdAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    // Last month revenue
    Order.aggregate([
      {
        $match: {
          tenantId: tid,
          status: { $in: ["paid", "completed"] },
          deletedAt: null,
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    // Revenue by payment method
    Order.aggregate([
      { $match: { tenantId: tid, status: { $in: ["paid", "completed"] }, deletedAt: null } },
      { $group: { _id: "$paymentMethod", total: { $sum: "$total" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    // Monthly revenue — last 6 months
    Order.aggregate([
      {
        $match: {
          tenantId: tid,
          status: { $in: ["paid", "completed"] },
          deletedAt: null,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    // Recent 10 transactions
    Transaction.find({ tenantId: tid })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("branchId", "name code")
      .populate("performedBy", "name")
      .lean(),
    // Total transaction count
    Transaction.countDocuments({ tenantId: tid }),
  ]);

  const grossRevenue = revenueAgg[0]?.total ?? 0;
  const totalOrders = revenueAgg[0]?.count ?? 0;
  const totalRefunds = refundAgg[0]?.total ?? 0;
  const refundCount = refundAgg[0]?.count ?? 0;
  const totalDiscounts = discountAgg[0]?.total ?? 0;
  const netRevenue = grossRevenue - totalRefunds;
  const avgOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;

  const thisMonthRevenue = thisMonthAgg[0]?.total ?? 0;
  const lastMonthRevenue = lastMonthAgg[0]?.total ?? 0;
  const monthOverMonthChange =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : null;

  return {
    grossRevenue,
    netRevenue,
    totalRefunds,
    refundCount,
    totalDiscounts,
    totalOrders,
    avgOrderValue,
    thisMonthRevenue,
    lastMonthRevenue,
    monthOverMonthChange,
    paymentMethodBreakdown: paymentMethodAgg as Array<{
      _id: string;
      total: number;
      count: number;
    }>,
    monthlyRevenue: monthlyRevenueAgg as Array<{
      _id: { year: number; month: number };
      total: number;
      count: number;
    }>,
    recentTransactions,
    totalTransactionCount,
  };
}

export async function getTenantTransactions(
  tenantId: string,
  page = 1,
  limit = 20,
  type?: string,
  paymentMethod?: string,
  dateFrom?: string,
  dateTo?: string
) {
  await connectDB();
  const skip = (page - 1) * limit;
  const tid = new mongoose.Types.ObjectId(tenantId);

  const filter: Record<string, unknown> = { tenantId: tid };
  if (type && type !== "all") filter.type = type;
  if (paymentMethod && paymentMethod !== "all") filter.paymentMethod = paymentMethod;
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      dateFilter.$lte = to;
    }
    filter.createdAt = dateFilter;
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("branchId", "name code")
      .populate("performedBy", "name email")
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return { transactions, total, pages: Math.ceil(total / limit) };
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
