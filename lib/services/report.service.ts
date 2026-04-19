import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { Inventory } from "@/lib/db/models/Inventory";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import { Member } from "@/lib/db/models/Member";
import { Branch } from "@/lib/db/models/Branch";
import { Organization } from "@/lib/db/models/Organization";
import { Commission } from "@/lib/db/models/Commission";
import mongoose from "mongoose";

// ─── Branch Reports ──────────────────────────────────────────────────────────

export async function getSalesSummary(branchId?: string, days = 30) {
  await connectDB();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const matchStage: Record<string, unknown> = {
    status: { $in: ["paid", "completed"] },
    createdAt: { $gte: startDate },
    deletedAt: null,
  };
  if (branchId) matchStage.branchId = new mongoose.Types.ObjectId(branchId);

  const [dailySales, totals] = await Promise.all([
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
          discount: { $sum: "$discountAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
          totalDiscount: { $sum: "$discountAmount" },
          avgOrderValue: { $avg: "$total" },
        },
      },
    ]),
  ]);

  return {
    dailySales,
    summary: totals[0] ?? { totalRevenue: 0, totalOrders: 0, totalDiscount: 0, avgOrderValue: 0 },
  };
}

export async function getTopProducts(branchId?: string, limit = 10) {
  await connectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const matchStage: Record<string, unknown> = { createdAt: { $gte: startOfMonth } };
  if (branchId) matchStage.branchId = new mongoose.Types.ObjectId(branchId);

  return OrderItem.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$productId",
        totalQuantity: { $sum: "$quantity" },
        totalRevenue: { $sum: "$total" },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
    {
      $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" },
    },
    { $unwind: "$product" },
    {
      $project: {
        productName: "$product.name",
        sku: "$product.sku",
        category: "$product.category",
        totalQuantity: 1,
        totalRevenue: 1,
      },
    },
  ]);
}

export async function getBranchPerformance() {
  await connectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [performance, branches] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: { $in: ["paid", "completed"] },
          createdAt: { $gte: startOfMonth },
          deletedAt: null,
          branchId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$branchId",
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    Branch.find({ deletedAt: null }).select("name code").lean(),
  ]);

  const branchMap = new Map(branches.map((b) => [b._id.toString(), b]));

  return performance.map((p) => ({
    branchId: p._id.toString(),
    branchName: branchMap.get(p._id.toString())?.name ?? "Unknown",
    branchCode: branchMap.get(p._id.toString())?.code ?? "?",
    revenue: p.revenue,
    orders: p.orders,
  }));
}

export async function getInventoryAlerts() {
  await connectDB();
  return Inventory.find({ $expr: { $lte: ["$quantity", "$lowStockThreshold"] } })
    .populate("productId", "name sku category")
    .populate("branchId", "name code")
    .limit(20)
    .lean();
}

export async function getMemberStats() {
  await connectDB();
  const [total, active, newThisMonth] = await Promise.all([
    Member.countDocuments({ deletedAt: null }),
    Member.countDocuments({ status: "active", deletedAt: null }),
    Member.countDocuments({
      deletedAt: null,
      joinedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    }),
  ]);
  return { total, active, newThisMonth };
}

// ─── Organization Reports ────────────────────────────────────────────────────

export async function getOrgSalesSummary(organizationId?: string, days = 30) {
  await connectDB();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const orgMatch: Record<string, unknown> = organizationId
    ? {
        $or: [
          { organizationId: new mongoose.Types.ObjectId(organizationId) },
          { sellerOrganizationId: new mongoose.Types.ObjectId(organizationId) },
        ],
      }
    : {};

  const matchStage: Record<string, unknown> = {
    status: { $in: ["paid", "completed"] },
    createdAt: { $gte: startDate },
    deletedAt: null,
    ...orgMatch,
  };

  const [dailySales, totals, byType] = await Promise.all([
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
          totalDiscount: { $sum: "$discountAmount" },
          avgOrderValue: { $avg: "$total" },
        },
      },
    ]),
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$type",
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    dailySales,
    summary: totals[0] ?? { totalRevenue: 0, totalOrders: 0, totalDiscount: 0, avgOrderValue: 0 },
    byType,
  };
}

export async function getTopOrganizations(days = 30) {
  await connectDB();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const matchBase = {
    status: { $in: ["paid", "completed"] },
    createdAt: { $gte: startDate },
    deletedAt: null,
  };

  // Aggregate seller-side orders (DISTRIBUTOR + B2B sales)
  const sellerPerf = await Order.aggregate([
    { $match: { ...matchBase, sellerOrganizationId: { $ne: null } } },
    {
      $group: {
        _id: "$sellerOrganizationId",
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "organizations",
        localField: "_id",
        foreignField: "_id",
        as: "org",
      },
    },
    { $unwind: "$org" },
    {
      $project: {
        name: "$org.name",
        type: "$org.type",
        commissionRate: "$org.commissionRate",
        revenue: 1,
        orders: 1,
      },
    },
  ]);

  // Commissions summary per org
  const commSummary = await Commission.aggregate([
    { $match: { status: { $in: ["pending", "paid"] } } },
    {
      $group: {
        _id: "$organizationId",
        totalCommission: { $sum: "$amount" },
        pendingCommission: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
      },
    },
  ]);
  const commMap = new Map(
    commSummary.map((c) => [c._id.toString(), { total: c.totalCommission, pending: c.pendingCommission }])
  );

  return sellerPerf.map((o) => ({
    orgId: o._id.toString(),
    name: o.name,
    type: o.type,
    commissionRate: o.commissionRate,
    revenue: o.revenue,
    orders: o.orders,
    totalCommission: commMap.get(o._id.toString())?.total ?? 0,
    pendingCommission: commMap.get(o._id.toString())?.pending ?? 0,
  }));
}

export async function getDistributionSummary(days = 30) {
  await connectDB();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const orgs = await Organization.find({ deletedAt: null, isActive: true })
    .select("name type commissionRate settings")
    .lean();

  const orgsByType = {
    distributor: orgs.filter((o) => o.type === "distributor").length,
    franchise: orgs.filter((o) => o.type === "franchise").length,
    partner: orgs.filter((o) => o.type === "partner").length,
  };

  const matchBase = {
    status: { $in: ["paid", "completed"] },
    createdAt: { $gte: startDate },
    deletedAt: null,
  };

  // Revenue by org type (via seller org lookup)
  const revenueByType = await Order.aggregate([
    { $match: { ...matchBase, sellerOrganizationId: { $ne: null } } },
    {
      $lookup: {
        from: "organizations",
        localField: "sellerOrganizationId",
        foreignField: "_id",
        as: "org",
      },
    },
    { $unwind: "$org" },
    {
      $group: {
        _id: "$org.type",
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
  ]);

  const revenueMap: Record<string, { revenue: number; orders: number }> = {};
  for (const r of revenueByType) {
    revenueMap[r._id] = { revenue: r.revenue, orders: r.orders };
  }

  const [totalCommissions] = await Commission.aggregate([
    { $match: { status: { $in: ["pending", "paid"] } } },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
      },
    },
  ]);

  return {
    orgCounts: orgsByType,
    revenueByType: {
      distributor: revenueMap.distributor ?? { revenue: 0, orders: 0 },
      franchise: revenueMap.franchise ?? { revenue: 0, orders: 0 },
      partner: revenueMap.partner ?? { revenue: 0, orders: 0 },
    },
    commissions: totalCommissions ?? { total: 0, pending: 0 },
  };
}

export async function getOrgInventorySummary(organizationId?: string) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (organizationId) filter.organizationId = new mongoose.Types.ObjectId(organizationId);

  const items = await OrganizationInventory.find(filter)
    .populate("organizationId", "name type")
    .populate("productId", "name sku category")
    .lean();

  const grouped: Record<
    string,
    { orgId: string; orgName: string; orgType: string; totalProducts: number; totalUnits: number; lowStockCount: number }
  > = {};

  for (const item of items) {
    const org = item.organizationId as { _id: { toString(): string }; name: string; type: string } | null;
    if (!org) continue;
    const key = org._id.toString();
    if (!grouped[key]) {
      grouped[key] = {
        orgId: key,
        orgName: org.name,
        orgType: org.type,
        totalProducts: 0,
        totalUnits: 0,
        lowStockCount: 0,
      };
    }
    grouped[key].totalProducts++;
    grouped[key].totalUnits += item.quantity;
    if (item.quantity <= 5) grouped[key].lowStockCount++;
  }

  return Object.values(grouped).sort((a, b) => b.totalUnits - a.totalUnits);
}
