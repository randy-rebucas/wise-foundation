import { connectDB } from "@/lib/db/connect";
import { AbandonedCheckout } from "@/lib/db/models/AbandonedCheckout";
import { caseInsensitiveRegex } from "@/lib/utils/escapeRegex";
import mongoose from "mongoose";

export interface AbandonedCheckoutSnapshotInput {
  email: string;
  fullName?: string;
  phone?: string;
  customerId?: string | null;
  items: {
    productId: string;
    variantId?: string | null;
    name: string;
    variantName?: string;
    sku: string;
    image?: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  paymentMethod?: string;
}

export async function snapshotAbandonedCheckout(input: AbandonedCheckoutSnapshotInput) {
  await connectDB();
  const email = input.email.trim().toLowerCase();
  if (!email || input.items.length === 0) return null;

  return AbandonedCheckout.findOneAndUpdate(
    { email, status: "open" },
    {
      $set: {
        email,
        fullName: input.fullName,
        phone: input.phone,
        customerId: input.customerId ? new mongoose.Types.ObjectId(input.customerId) : null,
        items: input.items.map((i) => ({
          productId: new mongoose.Types.ObjectId(i.productId),
          variantId: i.variantId ? new mongoose.Types.ObjectId(i.variantId) : null,
          name: i.name,
          variantName: i.variantName,
          sku: i.sku,
          image: i.image,
          price: i.price,
          quantity: i.quantity,
        })),
        subtotal: input.subtotal,
        discountAmount: input.discountAmount,
        shippingCost: input.shippingCost,
        total: input.total,
        paymentMethod: input.paymentMethod,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
}

export async function markAbandonedCheckoutRecovered(email: string, orderId: string) {
  await connectDB();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  await AbandonedCheckout.updateMany(
    { email: normalized, status: "open" },
    {
      $set: {
        status: "recovered",
        recoveredOrderId: new mongoose.Types.ObjectId(orderId),
        recoveredAt: new Date(),
      },
    }
  );
}

export async function getAbandonedCheckouts(
  status: "open" | "recovered" | undefined,
  search: string | undefined,
  page: number,
  limit: number
) {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (search) {
    const rx = caseInsensitiveRegex(search);
    query.$or = [{ email: rx }, { fullName: rx }, { phone: rx }];
  }

  const skip = (page - 1) * limit;
  const [checkouts, total, openCount] = await Promise.all([
    AbandonedCheckout.find(query).sort({ lastSeenAt: -1 }).skip(skip).limit(limit).lean(),
    AbandonedCheckout.countDocuments(query),
    AbandonedCheckout.countDocuments({ status: "open" }),
  ]);

  return { checkouts, total, openCount };
}

export async function deleteAbandonedCheckout(id: string) {
  await connectDB();
  await AbandonedCheckout.deleteOne({ _id: id });
}
