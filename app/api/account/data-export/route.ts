import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { errorResponse } from "@/lib/utils/withCustomerRoute";
import { withCustomerRoute } from "@/lib/utils/withCustomerRoute";
import type { MarketplacePaymentMethod } from "@/lib/types/customerAccount";

export const GET = withCustomerRoute(async (userId) => {
  await connectDB();

  const user = await User.findOne({ _id: userId, deletedAt: null })
    .select("-password -emailVerificationToken -emailVerificationExpiry -failedLoginAttempts -lockedUntil")
    .lean();

  if (!user) return errorResponse("Account not found", 404);

  const orders = await Order.find({
    marketplaceCustomerUserId: userId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  const orderIds = orders.map((o) => o._id);
  const items =
    orderIds.length > 0
      ? await OrderItem.find({ orderId: { $in: orderIds } }).lean()
      : [];

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const oid = item.orderId.toString();
    if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
    itemsByOrder.get(oid)!.push(item);
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: {
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
      emailVerified: user.emailVerified,
    },
    savedAddresses: user.marketplace?.savedAddresses ?? [],
    paymentMethods: (user.marketplace?.paymentMethods ?? []).map((pm: MarketplacePaymentMethod) => ({
      type: pm.type,
      label: pm.label,
      last4: pm.last4 ?? null,
    })),
    wishlist: user.marketplace?.wishlist ?? [],
    reviews: user.marketplace?.reviews ?? [],
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      shippingAddress: o.marketplaceShipping ?? null,
      items: (itemsByOrder.get(o._id.toString()) ?? []).map((i) => ({
        productName: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    })),
  };

  const json = JSON.stringify(exportData, null, 2);
  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="glowish-data-export-${Date.now()}.json"`,
    },
  });
});
