import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { OrderStatus, SessionUser } from "@/types";

/** Whether the user may read or transition this order (branch- or org-scoped). */
export function canUserAccessOrder(
  order: {
    branchId?: string | null;
    organizationId?: string | null;
    buyerOrganizationId?: string | null;
    sellerOrganizationId?: string | null;
  },
  user: SessionUser
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "ORG_ADMIN") {
    const orgStr = user.organizationId;
    if (!orgStr) return false;
    if (order.organizationId === orgStr) return true;
    if (order.buyerOrganizationId === orgStr) return true;
    if (order.sellerOrganizationId === orgStr) return true;
    if (order.branchId && (user.branchIds ?? []).includes(order.branchId)) return true;
    return false;
  }
  if (!order.branchId) return false;
  return (user.branchIds ?? []).includes(order.branchId);
}

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
  const orgClause: Prisma.OrderWhereInput[] = organizationId
    ? [{ organizationId }, { buyerOrganizationId: organizationId }, { sellerOrganizationId: organizationId }]
    : [];

  const where: Prisma.OrderWhereInput = {
    deletedAt: null,
    ...(organizationId ? { OR: orgClause } : branchId ? { branchId } : {}),
  };
  if (filter.status) where.status = filter.status as OrderStatus;
  if (filter.type) where.type = filter.type as Prisma.OrderWhereInput["type"];
  if (filter.memberId) where.memberId = filter.memberId;
  if (filter.dateFrom || filter.dateTo) {
    where.createdAt = {
      ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
      ...(filter.dateTo ? { lte: filter.dateTo } : {}),
    };
  }

  const skip = (page - 1) * limit;

  const [orders, total, pendingCount, approvedCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        cashier: { select: { name: true } },
        buyerOrganization: { select: { name: true, type: true } },
        sellerOrganization: { select: { name: true, type: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, status: "pending" } }),
    prisma.order.count({ where: { ...where, status: "approved" } }),
  ]);

  return { orders, total, pages: Math.ceil(total / limit), pendingCount, approvedCount };
}

export async function getOrderById(orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, deletedAt: null },
    include: {
      cashier: { select: { name: true } },
      deliveredByUser: { select: { name: true } },
      member: { select: { name: true, memberId: true } },
      buyerOrganization: { select: { name: true, type: true } },
      sellerOrganization: { select: { name: true, type: true } },
    },
  });

  if (!order) return null;

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { product: { select: { name: true, sku: true, images: true } } },
  });

  return { ...order, items };
}

/** Transfers org-level inventory (and records the paired stock movements) within a transaction. */
async function transferOrgStock(
  tx: Prisma.TransactionClient,
  input: {
    fromOrganizationId: string;
    toOrganizationId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    reference?: string;
    notesPrefix?: string;
  },
  performedBy: string
) {
  const notesPrefix = input.notesPrefix ?? "B2B";
  const vId = input.variantId ?? null;

  const sourceInv = await tx.organizationInventory.findFirst({
    where: { organizationId: input.fromOrganizationId, productId: input.productId, variantId: vId },
  });

  if (!sourceInv || sourceInv.quantity < input.quantity) {
    throw new Error(
      `Insufficient seller stock for product ${input.productId}. Available: ${sourceInv?.quantity ?? 0}, Required: ${input.quantity}`
    );
  }

  const sourcePrev = sourceInv.quantity;
  const sourceNew = sourcePrev - input.quantity;

  await tx.organizationInventory.update({
    where: { id: sourceInv.id },
    data: { quantity: { decrement: input.quantity }, totalSold: { increment: input.quantity } },
  });

  const destInv = await tx.organizationInventory.findFirst({
    where: { organizationId: input.toOrganizationId, productId: input.productId, variantId: vId },
  });
  const destPrev = destInv?.quantity ?? 0;

  if (destInv) {
    await tx.organizationInventory.update({
      where: { id: destInv.id },
      data: { quantity: { increment: input.quantity }, totalReceived: { increment: input.quantity } },
    });
  } else {
    await tx.organizationInventory.create({
      data: {
        organizationId: input.toOrganizationId,
        productId: input.productId,
        variantId: vId,
        quantity: input.quantity,
        totalReceived: input.quantity,
      },
    });
  }

  await tx.stockMovement.createMany({
    data: [
      {
        branchId: null,
        organizationId: input.fromOrganizationId,
        fromOrganizationId: input.fromOrganizationId,
        toOrganizationId: input.toOrganizationId,
        productId: input.productId,
        variantId: vId,
        type: "TRANSFER",
        quantity: input.quantity,
        previousQuantity: sourcePrev,
        newQuantity: sourceNew,
        reference: input.reference,
        notes: `${notesPrefix} fulfillment: ${input.reference}`,
        performedBy,
      },
      {
        branchId: null,
        organizationId: input.toOrganizationId,
        fromOrganizationId: input.fromOrganizationId,
        toOrganizationId: input.toOrganizationId,
        productId: input.productId,
        variantId: vId,
        type: "IN",
        quantity: input.quantity,
        previousQuantity: destPrev,
        newQuantity: destPrev + input.quantity,
        reference: input.reference,
        notes: `${notesPrefix} receipt: ${input.reference}`,
        performedBy,
      },
    ],
  });
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string,
  delivery?: OrderDeliveryPayload,
  opts?: { force?: boolean }
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, deletedAt: null } });
  if (!order) return null;

  // `force` is an admin-only escape hatch for correcting orders created during
  // testing that got stuck in a terminal status (completed/cancelled/refunded)
  // with no valid forward transition. It skips the transition graph but still
  // goes through the same field updates below (no stock/transaction side effects
  // are re-applied, since those already ran on the original transition).
  if (!opts?.force) {
    const allowed = VALID_TRANSITIONS[order.status as OrderStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from "${order.status}" to "${newStatus}"`);
    }
  }

  if (newStatus === "delivered") {
    const receipt = delivery?.deliveryReceiptNumber?.trim();
    if (!receipt) {
      throw new Error("Delivery receipt number is required to mark an order as delivered");
    }
    const duplicate = await prisma.order.findFirst({
      where: { id: { not: orderId }, deliveryReceiptNumber: receipt },
    });
    if (duplicate) {
      throw new Error(`Delivery receipt number "${receipt}" is already used by order ${duplicate.orderNumber}`);
    }
  }

  const updates: Prisma.OrderUpdateInput = { status: newStatus };
  if (newStatus === "approved") updates.approvedAt = new Date();
  if (newStatus === "paid") updates.paidAt = new Date();
  if (newStatus === "completed") updates.completedAt = new Date();
  if (newStatus === "delivered") {
    const receipt = delivery!.deliveryReceiptNumber.trim();
    updates.deliveredAt = new Date();
    updates.deliveryReceiptNumber = receipt;
    updates.deliveredByUser = { connect: { id: userId } };
    const receiver = delivery?.receivedByName?.trim();
    updates.receivedByName = receiver || null;
  }

  // B2B orders: transfer inventory from seller to buyer when payment is confirmed
  if (newStatus === "paid" && order.type === "B2B" && order.sellerOrganizationId && order.buyerOrganizationId) {
    return prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: updates });

      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await transferOrgStock(
          tx,
          {
            fromOrganizationId: order.sellerOrganizationId!,
            toOrganizationId: order.buyerOrganizationId!,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            reference: order.orderNumber,
          },
          userId
        );
      }

      await tx.transaction.create({
        data: {
          branchId: null,
          organizationId: order.sellerOrganizationId,
          orderId: order.id,
          type: "SALE",
          amount: order.total,
          paymentMethod: order.paymentMethod,
          reference: order.orderNumber,
          performedBy: userId,
        },
      });

      return tx.order.findUnique({ where: { id: orderId } });
    });
  }

  // B2B orders: a refund after payment reverses the earlier seller-to-buyer transfer,
  // otherwise the buyer keeps stock they were refunded for and the seller never gets it back.
  if (
    newStatus === "refunded" &&
    order.type === "B2B" &&
    order.status === "paid" &&
    order.sellerOrganizationId &&
    order.buyerOrganizationId
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: updates });

      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await transferOrgStock(
          tx,
          {
            fromOrganizationId: order.buyerOrganizationId!,
            toOrganizationId: order.sellerOrganizationId!,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            reference: `${order.orderNumber}-REFUND`,
            notesPrefix: "B2B refund",
          },
          userId
        );
      }

      await tx.transaction.create({
        data: {
          branchId: null,
          organizationId: order.sellerOrganizationId,
          orderId: order.id,
          type: "REFUND",
          amount: order.total,
          paymentMethod: order.paymentMethod,
          reference: `${order.orderNumber}-REFUND`,
          performedBy: userId,
        },
      });

      return tx.order.findUnique({ where: { id: orderId } });
    });
  }

  try {
    return await prisma.order.update({ where: { id: orderId }, data: updates });
  } catch (err) {
    if (
      newStatus === "delivered" &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(`Delivery receipt number "${updates.deliveryReceiptNumber}" is already in use`);
    }
    throw err;
  }
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
  actingUser: Pick<SessionUser, "role" | "organizationId">;
}

export async function createB2BOrder(input: CreateB2BOrderInput) {
  // A non-admin must be transacting on behalf of one of the two organizations —
  // otherwise an ORG_ADMIN could pair two unrelated orgs and, once the order they're
  // party to is marked paid, siphon stock between organizations they don't belong to.
  if (input.actingUser.role !== "ADMIN") {
    const ownOrgId = input.actingUser.organizationId;
    if (!ownOrgId || (ownOrgId !== input.sellerOrganizationId && ownOrgId !== input.buyerOrganizationId)) {
      throw new Error("You may only create B2B orders where your organization is the buyer or seller");
    }
  }

  return prisma.$transaction(async (tx) => {
    // Validate seller is authorized to distribute
    const seller = await tx.organization.findFirst({
      where: { id: input.sellerOrganizationId, isActive: true, deletedAt: null },
    });
    if (!seller) throw new Error("Seller organization not found or inactive");
    if (!seller.canDistribute) throw new Error("Seller organization is not authorized to distribute");

    const buyer = await tx.organization.findFirst({
      where: { id: input.buyerOrganizationId, isActive: true, deletedAt: null },
    });
    if (!buyer) throw new Error("Buyer organization not found or inactive");
    if (!buyer.canSubmitOrders) throw new Error("Buyer organization is not authorized to submit orders");

    // Validate seller has enough stock — batch fetch then validate in memory
    const sellerStockDocs = await tx.organizationInventory.findMany({
      where: {
        organizationId: input.sellerOrganizationId,
        productId: { in: input.items.map((i) => i.productId) },
      },
    });
    const sellerStockKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? ""}`;
    const sellerStockMap = new Map(
      sellerStockDocs.map((s) => [sellerStockKey(s.productId, s.variantId), s.quantity])
    );
    for (const item of input.items) {
      const qty = sellerStockMap.get(sellerStockKey(item.productId, item.variantId ?? null)) ?? 0;
      if (qty < item.quantity) {
        throw new Error(`Insufficient stock for product: ${item.productName}`);
      }
    }

    const count = await tx.order.count();
    const orderNumber = `B2B-${String(count + 1).padStart(6, "0")}`;

    const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const discountPercent = input.discountPercent ?? 0;
    const discountAmount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
    const total = subtotal - discountAmount;

    const order = await tx.order.create({
      data: {
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
    });

    await tx.orderItem.createMany({
      data: input.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId ?? null,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity,
      })),
    });

    return order;
  });
}
