import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import type { OrderStatus } from "@/types";

export type CustomerOrderRow = {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  paidAt: string | null;
  shipSummary: string;
};

export async function listMyMarketplaceOrders(customerUserId: string, limit = 50): Promise<CustomerOrderRow[]> {
  await connectDB();
  if (!mongoose.isValidObjectId(customerUserId)) return [];

  const oid = new mongoose.Types.ObjectId(customerUserId);
  const rows = await Order.find({
    type: "MARKETPLACE",
    marketplaceCustomerUserId: oid,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100))
    .select("orderNumber status total createdAt paidAt marketplaceShipping")
    .lean();

  return rows.map((o) => {
    const ship = o.marketplaceShipping as
      | { line1?: string; city?: string; region?: string }
      | undefined;
    const parts = [ship?.line1, ship?.city, ship?.region].filter(Boolean);
    const shipSummary = parts.length > 0 ? parts.join(" · ") : "—";
    return {
      _id: String(o._id),
      orderNumber: o.orderNumber,
      status: o.status as OrderStatus,
      total: o.total,
      createdAt: (o.createdAt as Date).toISOString(),
      paidAt: o.paidAt ? (o.paidAt as Date).toISOString() : null,
      shipSummary,
    };
  });
}
