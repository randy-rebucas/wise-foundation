import { prisma } from "@/lib/db/prisma";
import { generateOrderNumber } from "@/lib/utils";

const ORG_LOW_STOCK_THRESHOLD = 5;

export async function getOrgInventory(organizationId?: string) {
  return prisma.organizationInventory.findMany({
    where: organizationId ? { organizationId } : {},
    include: {
      organization: { select: { name: true, type: true } },
      product: { select: { name: true, sku: true, category: true, images: true, retailPrice: true } },
    },
    orderBy: { organizationId: "asc" },
  });
}

/** Paginated organization warehouse stock (distributor / HQ org admins). */
export async function getOrgInventoryPaged(
  organizationId: string,
  page = 1,
  limit = 20,
  lowStockOnly = false
) {
  const where: Record<string, unknown> = { organizationId };
  if (lowStockOnly) {
    where.quantity = { lte: ORG_LOW_STOCK_THRESHOLD };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.organizationInventory.findMany({
      where,
      orderBy: { quantity: "asc" },
      skip,
      take: limit,
      include: {
        organization: { select: { name: true, type: true } },
        product: { select: { name: true, sku: true, category: true, images: true, retailPrice: true } },
      },
    }),
    prisma.organizationInventory.count({ where }),
  ]);

  return { items, total, pages: Math.ceil(total / limit) };
}

export interface ResellerSaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface ResellerSaleInput {
  organizationId: string;
  cashierId: string;
  items: ResellerSaleItem[];
  paymentMethod: "cash" | "gcash" | "card" | "bank_transfer" | "credit";
  amountPaid: number;
  notes?: string;
}

export async function processResellerSale(input: ResellerSaleInput) {
  const org = await prisma.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null, isActive: true },
  });
  if (!org) throw new Error("Organization not found or inactive");
  if (!org.hasInventory) throw new Error("This organization does not have inventory");
  const commissionEnabled = org.commissionEnabled;
  const commissionRate = org.commissionRate ?? 10;

  return prisma.$transaction(async (tx) => {
    // Validate org inventory for each item
    for (const item of input.items) {
      const inv = await tx.organizationInventory.findFirst({
        where: { organizationId: input.organizationId, productId: item.productId, variantId: null },
      });

      if (!inv) {
        throw new Error(`No inventory record for "${item.productName}"`);
      }
      if (inv.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.productName}". Available: ${inv.quantity}, Requested: ${item.quantity}`
        );
      }
    }

    const subtotal = input.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const change = Math.max(0, input.amountPaid - subtotal);
    const orderNumber = generateOrderNumber();

    // Create the DISTRIBUTOR order
    const order = await tx.order.create({
      data: {
        branchId: null,
        organizationId: input.organizationId,
        orderNumber,
        type: "DISTRIBUTOR",
        status: "paid",
        cashierId: input.cashierId,
        subtotal,
        discountAmount: 0,
        discountPercent: 0,
        total: subtotal,
        amountPaid: input.amountPaid,
        change,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        paidAt: new Date(),
      },
    });

    // Create order items and deduct org inventory
    await tx.orderItem.createMany({
      data: input.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        cost: 0,
        total: item.unitPrice * item.quantity,
      })),
    });

    for (const item of input.items) {
      await tx.organizationInventory.updateMany({
        where: { organizationId: input.organizationId, productId: item.productId, variantId: null },
        data: { quantity: { decrement: item.quantity }, totalSold: { increment: item.quantity } },
      });
    }

    await tx.transaction.create({
      data: {
        branchId: null,
        orderId: order.id,
        type: "SALE",
        amount: subtotal,
        paymentMethod: input.paymentMethod,
        performedBy: input.cashierId,
      },
    });

    if (commissionEnabled) {
      await tx.commission.create({
        data: {
          organizationId: input.organizationId,
          orderId: order.id,
          saleAmount: subtotal,
          rate: commissionRate,
          amount: parseFloat(((subtotal * commissionRate) / 100).toFixed(2)),
          status: "pending",
        },
      });
    }

    return {
      orderNumber,
      orderId: order.id,
      subtotal,
      total: subtotal,
      change,
      paymentMethod: input.paymentMethod,
      commission: commissionEnabled
        ? { rate: commissionRate, amount: parseFloat(((subtotal * commissionRate) / 100).toFixed(2)) }
        : null,
    };
  });
}
