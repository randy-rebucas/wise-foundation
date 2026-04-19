import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { Inventory } from "@/lib/db/models/Inventory";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import { StockMovement } from "@/lib/db/models/StockMovement";
import { Member } from "@/lib/db/models/Member";
import { Product } from "@/lib/db/models/Product";
import { Branch } from "@/lib/db/models/Branch";
import { Transaction } from "@/lib/db/models/Transaction";
import { generateOrderNumber } from "@/lib/utils";
import type { CartItem } from "@/types";
import type { ClientSession } from "mongoose";

interface CheckoutInput {
  branchId: string;
  cashierId: string;
  items: CartItem[];
  memberId?: string | null;
  discountPercent: number;
  paymentMethod: "cash" | "gcash" | "card" | "bank_transfer" | "credit";
  amountPaid: number;
  notes?: string;
}

async function deductOrgInventory(
  organizationId: string,
  productId: string,
  variantId: string | null | undefined,
  quantity: number,
  session: ClientSession
) {
  await OrganizationInventory.findOneAndUpdate(
    { organizationId, productId, variantId: variantId ?? null },
    { $inc: { quantity: -quantity, totalSold: quantity } },
    { session }
  );
}

export async function processCheckout(input: CheckoutInput) {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const branch = await Branch.findById(input.branchId).lean();
    const organizationId = branch?.organizationId ?? null;

    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = (subtotal * input.discountPercent) / 100;
    const total = subtotal - discountAmount;
    const change = Math.max(0, input.amountPaid - total);

    const orderNumber = generateOrderNumber();

    let memberName: string | undefined;
    if (input.memberId) {
      const member = await Member.findOne({
        _id: input.memberId,
        status: "active",
      }).session(session);
      if (!member) throw new Error("Member not found or inactive");
      memberName = member.name;
    }

    const productIds = input.items.map((i) => i.productId);
    const productCosts = await Product.find(
      { _id: { $in: productIds } },
      { _id: 1, cost: 1 }
    )
      .session(session)
      .lean();
    const costMap = new Map(productCosts.map((p) => [p._id.toString(), p.cost ?? 0]));

    for (const item of input.items) {
      const inventoryRecord = await Inventory.findOne({
        branchId: input.branchId,
        productId: item.productId,
        variantId: item.variantId ?? null,
      }).session(session);

      if (!inventoryRecord) {
        throw new Error(`No inventory record for product: ${item.name}`);
      }

      if (inventoryRecord.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.name}". Available: ${inventoryRecord.quantity}, Requested: ${item.quantity}`
        );
      }

      const previousQty = inventoryRecord.quantity;
      inventoryRecord.quantity -= item.quantity;
      await inventoryRecord.save({ session });

      if (organizationId) {
        await deductOrgInventory(
          organizationId.toString(),
          item.productId,
          item.variantId,
          item.quantity,
          session
        );
      }

      await StockMovement.create(
        [
          {
            branchId: input.branchId,
            organizationId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            type: "OUT",
            quantity: item.quantity,
            previousQuantity: previousQty,
            newQuantity: inventoryRecord.quantity,
            reference: orderNumber,
            performedBy: input.cashierId,
          },
        ],
        { session }
      );
    }

    const [order] = await Order.create(
      [
        {
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
          total,
          amountPaid: input.amountPaid,
          change,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          paidAt: new Date(),
        },
      ],
      { session }
    );

    const orderItems = input.items.map((item) => ({
      orderId: order._id,
      branchId: input.branchId,
      organizationId,
      productId: item.productId,
      variantId: item.variantId ?? null,
      productName: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.price,
      cost: costMap.get(item.productId) ?? 0,
      total: item.price * item.quantity,
    }));

    await OrderItem.create(orderItems, { session });

    await Transaction.create(
      [
        {
          branchId: input.branchId,
          organizationId,
          orderId: order._id,
          memberId: input.memberId ?? null,
          type: "SALE",
          amount: total,
          paymentMethod: input.paymentMethod,
          performedBy: input.cashierId,
        },
      ],
      { session }
    );

    if (input.memberId) {
      await Member.updateOne(
        { _id: input.memberId },
        { $inc: { totalPurchases: 1, totalSpent: total } },
        { session }
      );
    }

    await session.commitTransaction();

    return {
      orderNumber,
      orderId: order._id.toString(),
      subtotal,
      discountAmount,
      total,
      change,
      paymentMethod: input.paymentMethod,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}
