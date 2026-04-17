import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import type { OrderStatus } from "@/types";

interface OrderFilter {
  status?: string;
  type?: string;
  memberId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function getOrders(
  tenantId: string,
  branchId?: string,
  filter: OrderFilter = {},
  page = 1,
  limit = 20
) {
  await connectDB();

  const query: Record<string, unknown> = { tenantId, deletedAt: null };
  if (branchId) query.branchId = branchId;
  if (filter.status) query.status = filter.status;
  if (filter.type) query.type = filter.type;
  if (filter.memberId) query.memberId = filter.memberId;
  if (filter.dateFrom || filter.dateTo) {
    query.createdAt = {};
    if (filter.dateFrom) (query.createdAt as Record<string, Date>).$gte = filter.dateFrom;
    if (filter.dateTo) (query.createdAt as Record<string, Date>).$lte = filter.dateTo;
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("cashierId", "name")
      .lean(),
    Order.countDocuments(query),
  ]);

  return { orders, total, pages: Math.ceil(total / limit) };
}

export async function getOrderById(tenantId: string, orderId: string) {
  await connectDB();
  const order = await Order.findOne({ _id: orderId, tenantId, deletedAt: null })
    .populate("cashierId", "name")
    .populate("memberId", "name memberId")
    .lean();

  if (!order) return null;

  const items = await OrderItem.find({ orderId, tenantId })
    .populate("productId", "name sku images")
    .lean();

  return { ...order, items };
}

export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  status: OrderStatus,
  userId: string
) {
  await connectDB();
  const updates: Record<string, unknown> = { status };
  if (status === "paid") updates.paidAt = new Date();
  if (status === "completed") updates.completedAt = new Date();

  return Order.findOneAndUpdate(
    { _id: orderId, tenantId, deletedAt: null },
    { $set: updates },
    { new: true }
  ).lean();
}
