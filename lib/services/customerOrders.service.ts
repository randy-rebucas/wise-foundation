import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { Product } from "@/lib/db/models/Product";
import type { OrderStatus } from "@/types";

export type CustomerOrderRow = {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  paidAt: string | null;
  shipSummary: string;
  thumbnailUrl: string | null;
  itemCount: number;
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

  const orderIds = rows.map((o) => o._id as mongoose.Types.ObjectId);
  const lineItems = orderIds.length
    ? await OrderItem.find({ orderId: { $in: orderIds } })
        .select("orderId productId quantity")
        .sort({ createdAt: 1 })
        .lean()
    : [];

  const productIds = [
    ...new Set(lineItems.map((item) => item.productId as mongoose.Types.ObjectId)),
  ];
  const products =
    productIds.length > 0
      ? await Product.find({ _id: { $in: productIds }, deletedAt: null })
          .select("images")
          .lean()
      : [];
  const imageByProductId = new Map(
    products.map((p) => [String(p._id), (p.images?.[0] as string | undefined) ?? null])
  );

  const metaByOrderId = new Map<string, { thumbnailUrl: string | null; itemCount: number }>();
  for (const item of lineItems) {
    const orderKey = String(item.orderId);
    const qty = item.quantity as number;
    const existing = metaByOrderId.get(orderKey);
    if (existing) {
      existing.itemCount += qty;
      continue;
    }
    metaByOrderId.set(orderKey, {
      thumbnailUrl: imageByProductId.get(String(item.productId)) ?? null,
      itemCount: qty,
    });
  }

  return rows.map((o) => {
    const ship = o.marketplaceShipping as
      | { line1?: string; city?: string; region?: string }
      | undefined;
    const parts = [ship?.line1, ship?.city, ship?.region].filter(Boolean);
    const shipSummary = parts.length > 0 ? parts.join(" · ") : "—";
    const orderKey = String(o._id);
    const meta = metaByOrderId.get(orderKey);
    return {
      _id: orderKey,
      orderNumber: o.orderNumber,
      status: o.status as OrderStatus,
      total: o.total,
      createdAt: (o.createdAt as Date).toISOString(),
      paidAt: o.paidAt ? (o.paidAt as Date).toISOString() : null,
      shipSummary,
      thumbnailUrl: meta?.thumbnailUrl ?? null,
      itemCount: meta?.itemCount ?? 0,
    };
  });
}
