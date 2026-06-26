import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { Inventory } from "@/lib/db/models/Inventory";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import { StockMovement } from "@/lib/db/models/StockMovement";
import { Member } from "@/lib/db/models/Member";
import { Branch } from "@/lib/db/models/Branch";
import { Transaction } from "@/lib/db/models/Transaction";
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
  await connectDB();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const branch = await Branch.findById(input.branchId).session(session).lean();
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
      const member = await Member.findOne({
        _id: input.memberId,
        status: "active",
      }).session(session);
      if (!member) throw new Error("Member not found or inactive");
      memberName = member.name;
    }

    // Batch-fetch all inventory records, validate, then bulk-update
    const inventoryDocs = await Inventory.find({
      branchId: input.branchId,
      productId: { $in: input.items.map((i) => i.productId) },
    }).session(session).lean();

    const invMap = new Map(
      inventoryDocs.map((inv) => [`${inv.productId}:${inv.variantId ?? ""}`, inv])
    );

    for (const item of input.items) {
      const inv = invMap.get(`${item.productId}:${item.variantId ?? ""}`);
      if (!inv) throw new Error(`No inventory record for product: ${item.name}`);
      if (inv.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.name}". Available: ${inv.quantity}, Requested: ${item.quantity}`
        );
      }
    }

    // Batch deduct branch inventory
    await Inventory.bulkWrite(
      input.items.map((item) => ({
        updateOne: {
          filter: {
            branchId: input.branchId,
            productId: item.productId,
            variantId: item.variantId ?? null,
          },
          update: { $inc: { quantity: -item.quantity } },
        },
      })),
      { session }
    );

    // Batch deduct org inventory (if applicable)
    if (organizationId) {
      await OrganizationInventory.bulkWrite(
        input.items.map((item) => ({
          updateOne: {
            filter: {
              organizationId,
              productId: item.productId,
              variantId: item.variantId ?? null,
            },
            update: { $inc: { quantity: -item.quantity, totalSold: item.quantity } },
          },
        })),
        { session }
      );
    }

    // Batch create stock movements
    await StockMovement.insertMany(
      input.items.map((item) => {
        const inv = invMap.get(`${item.productId}:${item.variantId ?? ""}`)!;
        return {
          branchId: input.branchId,
          organizationId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          type: "OUT",
          quantity: item.quantity,
          previousQuantity: inv.quantity,
          newQuantity: inv.quantity - item.quantity,
          reference: orderNumber,
          performedBy: input.cashierId,
        };
      }),
      { session }
    );

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
          shippingAmount: shippingFee,
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
      cost: 0,
      total: item.price * item.quantity,
    }));

    await OrderItem.insertMany(orderItems, { session });

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
      shippingFee,
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
