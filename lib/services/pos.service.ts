import { prisma } from "@/lib/db/prisma";
import { generateOrderNumber } from "@/lib/utils";
import type { CartItem } from "@/types";

interface CheckoutInput {
  branchId: string;
  cashierId: string;
  items: CartItem[];
  memberId?: string | null;
  discountPercent: number;
  paymentMethod: "cash" | "gcash" | "card" | "bank_transfer" | "credit";
  amountPaid: number;
  notes?: string;
  shippingFee?: number;
}

export async function processCheckout(input: CheckoutInput) {
  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) throw new Error("Branch not found");
    const organizationId = branch.organizationId ?? null;

    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = (subtotal * input.discountPercent) / 100;
    const shippingFee = input.shippingFee ?? 0;
    const total = subtotal - discountAmount + shippingFee;
    const change = Math.max(0, input.amountPaid - total);

    const orderNumber = generateOrderNumber();

    let memberName: string | undefined;
    if (input.memberId) {
      const member = await tx.member.findFirst({ where: { id: input.memberId, status: "active" } });
      if (!member) throw new Error("Member not found or inactive");
      memberName = member.name;
    }

    // Batch-fetch all inventory records, validate, then bulk-update
    const inventoryDocs = await tx.inventory.findMany({
      where: { branchId: input.branchId, productId: { in: input.items.map((i) => i.productId) } },
    });

    const invMap = new Map(inventoryDocs.map((inv) => [`${inv.productId}:${inv.variantId ?? ""}`, inv]));

    for (const item of input.items) {
      const inv = invMap.get(`${item.productId}:${item.variantId ?? ""}`);
      if (!inv) throw new Error(`No inventory record for product: ${item.name}`);
      if (inv.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.name}". Available: ${inv.quantity}, Requested: ${item.quantity}`
        );
      }
    }

    // Deduct branch inventory
    for (const item of input.items) {
      const inv = invMap.get(`${item.productId}:${item.variantId ?? ""}`)!;
      await tx.inventory.update({
        where: { id: inv.id },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    // Deduct org inventory (if applicable)
    if (organizationId) {
      for (const item of input.items) {
        await tx.organizationInventory.updateMany({
          where: { organizationId, productId: item.productId, variantId: item.variantId ?? null },
          data: { quantity: { decrement: item.quantity }, totalSold: { increment: item.quantity } },
        });
      }
    }

    // Batch create stock movements
    await tx.stockMovement.createMany({
      data: input.items.map((item) => {
        const inv = invMap.get(`${item.productId}:${item.variantId ?? ""}`)!;
        return {
          branchId: input.branchId,
          organizationId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          type: "OUT" as const,
          quantity: item.quantity,
          previousQuantity: inv.quantity,
          newQuantity: inv.quantity - item.quantity,
          reference: orderNumber,
          performedBy: input.cashierId,
        };
      }),
    });

    const order = await tx.order.create({
      data: {
        branchId: input.branchId,
        organizationId,
        orderNumber,
        type: "POS",
        status: "paid",
        memberId: input.memberId ?? null,
        memberName,
        cashierId: input.cashierId,
        subtotal,
        discountAmount,
        discountPercent: input.discountPercent,
        shippingAmount: shippingFee,
        total,
        amountPaid: input.amountPaid,
        change,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        paidAt: new Date(),
      },
    });

    await tx.orderItem.createMany({
      data: input.items.map((item) => ({
        orderId: order.id,
        branchId: input.branchId,
        organizationId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        productName: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        cost: 0,
        total: item.price * item.quantity,
      })),
    });

    await tx.transaction.create({
      data: {
        branchId: input.branchId,
        organizationId,
        orderId: order.id,
        memberId: input.memberId ?? null,
        type: "SALE",
        amount: total,
        paymentMethod: input.paymentMethod,
        performedBy: input.cashierId,
      },
    });

    if (input.memberId) {
      await tx.member.update({
        where: { id: input.memberId },
        data: { totalPurchases: { increment: 1 }, totalSpent: { increment: total } },
      });
    }

    return {
      orderNumber,
      orderId: order.id,
      subtotal,
      discountAmount,
      shippingFee,
      total,
      change,
      paymentMethod: input.paymentMethod,
    };
  });
}
