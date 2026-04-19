import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import { Organization } from "@/lib/db/models/Organization";
import { Commission } from "@/lib/db/models/Commission";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { Transaction } from "@/lib/db/models/Transaction";
import { generateOrderNumber } from "@/lib/utils";

export async function getOrgInventory(organizationId?: string) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (organizationId) filter.organizationId = organizationId;
  return OrganizationInventory.find(filter)
    .populate("organizationId", "name type")
    .populate("productId", "name sku images retailPrice distributorPrice")
    .sort({ organizationId: 1 })
    .lean();
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
  await connectDB();

  const org = await Organization.findOne({ _id: input.organizationId, deletedAt: null, isActive: true }).lean();
  if (!org) throw new Error("Organization not found or inactive");
  if (!org.settings?.hasInventory) throw new Error("This organization does not have inventory");
  const commissionEnabled = org.settings?.commissionEnabled ?? false;
  const commissionRate = org.commissionRate ?? 10;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate org inventory for each item
    for (const item of input.items) {
      const inv = await OrganizationInventory.findOne({
        organizationId: input.organizationId,
        productId: item.productId,
      }).session(session);

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
    const [order] = await Order.create(
      [
        {
          branchId: null,
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
      ],
      { session }
    );

    // Create order items and deduct org inventory
    const orderItems = input.items.map((item) => ({
      orderId: order._id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      cost: 0,
      total: item.unitPrice * item.quantity,
    }));

    await OrderItem.create(orderItems, { session });

    for (const item of input.items) {
      await OrganizationInventory.findOneAndUpdate(
        { organizationId: input.organizationId, productId: item.productId },
        { $inc: { quantity: -item.quantity, totalSold: item.quantity } },
        { session }
      );
    }

    await Transaction.create(
      [
        {
          branchId: null,
          orderId: order._id,
          type: "SALE",
          amount: subtotal,
          paymentMethod: input.paymentMethod,
          performedBy: input.cashierId,
        },
      ],
      { session }
    );

    if (commissionEnabled) {
      await Commission.create(
        [
          {
            organizationId: input.organizationId,
            orderId: order._id,
            saleAmount: subtotal,
            rate: commissionRate,
            amount: parseFloat(((subtotal * commissionRate) / 100).toFixed(2)),
            status: "pending",
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    return {
      orderNumber,
      orderId: order._id.toString(),
      subtotal,
      total: subtotal,
      change,
      paymentMethod: input.paymentMethod,
      commission: commissionEnabled
        ? { rate: commissionRate, amount: parseFloat(((subtotal * commissionRate) / 100).toFixed(2)) }
        : null,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}
