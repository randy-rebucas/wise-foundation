import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import mongoose from "mongoose";
import type { OrderStatus } from "@/types";

interface OrderFilter {
  status?: string;
  type?: string;
  memberId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["approved", "cancelled"],
  approved: ["paid", "cancelled"],
  paid: ["completed", "refunded"],
  completed: [],
  cancelled: [],
  refunded: [],
};

export async function getOrders(
  branchId?: string,
  filter: OrderFilter = {},
  page = 1,
  limit = 20,
  organizationId?: string
) {
  await connectDB();

  const query: Record<string, unknown> = { deletedAt: null };
  if (organizationId) {
    query.$or = (
      [
        { organizationId },
        { buyerOrganizationId: organizationId },
        { sellerOrganizationId: organizationId },
      ] as Record<string, unknown>[]
    );
  } else if (branchId) {
    query.branchId = branchId;
  }
  if (filter.status) query.status = filter.status;
  if (filter.type) query.type = filter.type;
  if (filter.memberId) query.memberId = filter.memberId;
  if (filter.dateFrom || filter.dateTo) {
    query.createdAt = {};
    if (filter.dateFrom) (query.createdAt as Record<string, Date>).$gte = filter.dateFrom;
    if (filter.dateTo) (query.createdAt as Record<string, Date>).$lte = filter.dateTo;
  }

  const skip = (page - 1) * limit;

  type MongoQuery = Record<string, unknown>;
  const orgClause: MongoQuery[] = organizationId
    ? [{ organizationId }, { buyerOrganizationId: organizationId }, { sellerOrganizationId: organizationId }]
    : [];
  const pendingBase: MongoQuery = {
    deletedAt: null,
    ...(organizationId ? { $or: orgClause } : branchId ? { branchId } : {}),
  };

  const [orders, total, pendingCount, approvedCount] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("cashierId", "name")
      .populate("buyerOrganizationId", "name type")
      .populate("sellerOrganizationId", "name type")
      .lean(),
    Order.countDocuments(query),
    Order.countDocuments({ ...pendingBase, status: "pending" } as MongoQuery),
    Order.countDocuments({ ...pendingBase, status: "approved" } as MongoQuery),
  ]);

  return { orders, total, pages: Math.ceil(total / limit), pendingCount, approvedCount };
}

export async function getOrderById(orderId: string) {
  await connectDB();
  const order = await Order.findOne({ _id: orderId, deletedAt: null })
    .populate("cashierId", "name")
    .populate("memberId", "name memberId")
    .populate("buyerOrganizationId", "name type")
    .populate("sellerOrganizationId", "name type")
    .lean();

  if (!order) return null;

  const items = await OrderItem.find({ orderId })
    .populate("productId", "name sku images")
    .lean();

  return { ...order, items };
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string
) {
  await connectDB();

  const order = await Order.findOne({ _id: orderId, deletedAt: null });
  if (!order) return null;

  const allowed = VALID_TRANSITIONS[order.status as OrderStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from "${order.status}" to "${newStatus}"`);
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === "approved") updates.approvedAt = new Date();
  if (newStatus === "paid") updates.paidAt = new Date();
  if (newStatus === "completed") updates.completedAt = new Date();

  return Order.findByIdAndUpdate(orderId, { $set: updates }, { new: true }).lean();
}

export interface CreateB2BOrderInput {
  sellerOrganizationId: string;
  buyerOrganizationId: string;
  items: {
    productId: string;
    variantId?: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }[];
  discountPercent?: number;
  paymentMethod: "cash" | "gcash" | "card" | "bank_transfer" | "credit";
  notes?: string;
  createdBy: string;
}

export async function createB2BOrder(input: CreateB2BOrderInput) {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate seller has enough stock for each item
    for (const item of input.items) {
      const stock = await OrganizationInventory.findOne({
        organizationId: input.sellerOrganizationId,
        productId: item.productId,
        ...(item.variantId ? { variantId: item.variantId } : { variantId: null }),
      }).session(session);

      if (!stock || stock.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product: ${item.productName}`);
      }
    }

    const count = await Order.countDocuments().session(session);
    const orderNumber = `B2B-${String(count + 1).padStart(6, "0")}`;

    const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const discountPercent = input.discountPercent ?? 0;
    const discountAmount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
    const total = subtotal - discountAmount;

    const [order] = await Order.create(
      [
        {
          orderNumber,
          type: "B2B",
          status: "pending",
          sellerOrganizationId: input.sellerOrganizationId,
          buyerOrganizationId: input.buyerOrganizationId,
          cashierId: input.createdBy,
          subtotal,
          discountAmount,
          discountPercent,
          total,
          amountPaid: 0,
          change: 0,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
        },
      ],
      { session }
    );

    await OrderItem.create(
      input.items.map((item) => ({
        orderId: order._id,
        productId: item.productId,
        variantId: item.variantId ?? null,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity,
      })),
      { session }
    );

    await session.commitTransaction();
    return order;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
