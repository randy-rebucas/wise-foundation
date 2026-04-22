import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { Organization } from "@/lib/db/models/Organization";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import { StockMovement } from "@/lib/db/models/StockMovement";
import mongoose from "mongoose";
import type { ClientSession } from "mongoose";
import type { OrderStatus } from "@/types";

export interface OrderDeliveryPayload {
  deliveryReceiptNumber: string;
  receivedByName?: string;
}

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
  paid: ["delivered", "completed", "refunded"],
  delivered: ["completed"],
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
    .populate("deliveredBy", "name")
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
  userId: string,
  delivery?: OrderDeliveryPayload
) {
  await connectDB();

  const order = await Order.findOne({ _id: orderId, deletedAt: null });
  if (!order) return null;

  const allowed = VALID_TRANSITIONS[order.status as OrderStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from "${order.status}" to "${newStatus}"`);
  }

  if (newStatus === "delivered") {
    const receipt = delivery?.deliveryReceiptNumber?.trim();
    if (!receipt) {
      throw new Error("Delivery receipt number is required to mark an order as delivered");
    }
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === "approved") updates.approvedAt = new Date();
  if (newStatus === "paid") updates.paidAt = new Date();
  if (newStatus === "completed") updates.completedAt = new Date();
  if (newStatus === "delivered") {
    const receipt = delivery!.deliveryReceiptNumber.trim();
    updates.deliveredAt = new Date();
    updates.deliveryReceiptNumber = receipt;
    updates.deliveredBy = new mongoose.Types.ObjectId(userId);
    const receiver = delivery?.receivedByName?.trim();
    updates.receivedByName = receiver || null;
  }

  // B2B orders: transfer inventory from seller to buyer when payment is confirmed
  if (newStatus === "paid" && order.type === "B2B" && order.sellerOrganizationId && order.buyerOrganizationId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await Order.findByIdAndUpdate(orderId, { $set: updates }, { session });

      const items = await OrderItem.find({ orderId }).session(session).lean();
      for (const item of items) {
        await transferOrgStock(
          {
            fromOrganizationId: order.sellerOrganizationId.toString(),
            toOrganizationId: order.buyerOrganizationId.toString(),
            productId: item.productId.toString(),
            variantId: item.variantId?.toString() ?? null,
            quantity: item.quantity,
            reference: order.orderNumber,
          },
          userId,
          session
        );
      }

      await session.commitTransaction();
      return Order.findById(orderId).lean();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  return Order.findByIdAndUpdate(orderId, { $set: updates }, { new: true }).lean();
}

async function transferOrgStock(
  input: {
    fromOrganizationId: string;
    toOrganizationId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    reference?: string;
  },
  performedBy: string,
  session: ClientSession
) {
  const sourceInv = await OrganizationInventory.findOne({
    organizationId: input.fromOrganizationId,
    productId: input.productId,
    variantId: input.variantId ?? null,
  }).session(session);

  if (!sourceInv || sourceInv.quantity < input.quantity) {
    throw new Error(
      `Insufficient seller stock for product ${input.productId}. Available: ${sourceInv?.quantity ?? 0}, Required: ${input.quantity}`
    );
  }

  const sourcePrev = sourceInv.quantity;
  const sourceNew = sourcePrev - input.quantity;

  await OrganizationInventory.findOneAndUpdate(
    { organizationId: input.fromOrganizationId, productId: input.productId, variantId: input.variantId ?? null },
    { $inc: { quantity: -input.quantity, totalSold: input.quantity } },
    { session }
  );

  const destInv = await OrganizationInventory.findOne({
    organizationId: input.toOrganizationId,
    productId: input.productId,
    variantId: input.variantId ?? null,
  }).session(session);
  const destPrev = destInv?.quantity ?? 0;

  await OrganizationInventory.findOneAndUpdate(
    { organizationId: input.toOrganizationId, productId: input.productId, variantId: input.variantId ?? null },
    { $inc: { quantity: input.quantity, totalReceived: input.quantity } },
    { upsert: true, session }
  );

  await StockMovement.insertMany(
    [
      {
        branchId: null,
        organizationId: input.fromOrganizationId,
        fromOrganizationId: input.fromOrganizationId,
        toOrganizationId: input.toOrganizationId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        type: "TRANSFER",
        quantity: input.quantity,
        previousQuantity: sourcePrev,
        newQuantity: sourceNew,
        reference: input.reference,
        notes: `B2B fulfillment: ${input.reference}`,
        performedBy,
      },
      {
        branchId: null,
        organizationId: input.toOrganizationId,
        fromOrganizationId: input.fromOrganizationId,
        toOrganizationId: input.toOrganizationId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        type: "IN",
        quantity: input.quantity,
        previousQuantity: destPrev,
        newQuantity: destPrev + input.quantity,
        reference: input.reference,
        notes: `B2B receipt: ${input.reference}`,
        performedBy,
      },
    ],
    { session }
  );
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

    // Validate seller is authorized to distribute
    const seller = await Organization.findOne({
      _id: input.sellerOrganizationId,
      isActive: true,
      deletedAt: null,
    }).session(session).lean();
    if (!seller) throw new Error("Seller organization not found or inactive");
    if (!seller.settings.canDistribute) throw new Error("Seller organization is not authorized to distribute");

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

    await OrderItem.insertMany(
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
