import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { Inventory } from "@/lib/db/models/Inventory";
import { Member } from "@/lib/db/models/Member";
import { Branch } from "@/lib/db/models/Branch";
import mongoose from "mongoose";

export async function getSalesSummary(tenantId: string, branchId?: string, days = 30) {
  await connectDB();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const matchStage: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
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
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
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
    summary: totals[0] ?? {
      totalRevenue: 0,
      totalOrders: 0,
      totalDiscount: 0,
      avgOrderValue: 0,
    },
  };
}

export async function getTopProducts(tenantId: string, branchId?: string, limit = 10) {
  await connectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const matchStage: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
    createdAt: { $gte: startOfMonth },
  };
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
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
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

export async function getBranchPerformance(tenantId: string) {
  await connectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [performance, branches] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: { $in: ["paid", "completed"] },
          createdAt: { $gte: startOfMonth },
          deletedAt: null,
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
    Branch.find({ tenantId, deletedAt: null }).select("name code").lean(),
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

export async function getInventoryAlerts(tenantId: string) {
  await connectDB();
  return Inventory.find({
    tenantId,
    $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
  })
    .populate("productId", "name sku category")
    .populate("branchId", "name code")
    .limit(20)
    .lean();
}

export async function getMemberStats(tenantId: string) {
  await connectDB();
  const [total, active, newThisMonth] = await Promise.all([
    Member.countDocuments({ tenantId, deletedAt: null }),
    Member.countDocuments({ tenantId, status: "active", deletedAt: null }),
    Member.countDocuments({
      tenantId,
      deletedAt: null,
      joinedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    }),
  ]);
  return { total, active, newThisMonth };
}
