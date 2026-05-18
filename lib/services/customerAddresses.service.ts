import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";

export type CustomerAddressFromOrder = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  lastUsedAt: string;
};

function addressKey(ship: {
  line1: string;
  city: string;
  postalCode: string;
}) {
  return `${ship.line1}|${ship.city}|${ship.postalCode}`.toLowerCase();
}

export async function listAddressesFromOrders(
  customerUserId: string
): Promise<CustomerAddressFromOrder[]> {
  await connectDB();
  if (!mongoose.isValidObjectId(customerUserId)) return [];

  const oid = new mongoose.Types.ObjectId(customerUserId);
  const rows = await Order.find({
    type: "MARKETPLACE",
    marketplaceCustomerUserId: oid,
    deletedAt: null,
    "marketplaceShipping.line1": { $exists: true, $ne: "" },
  })
    .sort({ createdAt: -1 })
    .select("marketplaceShipping createdAt")
    .limit(50)
    .lean();

  const seen = new Map<string, CustomerAddressFromOrder>();

  for (const row of rows) {
    const ship = row.marketplaceShipping as
      | {
          fullName?: string;
          phone?: string;
          line1?: string;
          line2?: string;
          city?: string;
          region?: string;
          postalCode?: string;
        }
      | undefined;
    if (!ship?.line1?.trim()) continue;

    const key = addressKey({
      line1: ship.line1,
      city: ship.city ?? "",
      postalCode: ship.postalCode ?? "",
    });
    if (seen.has(key)) continue;

    seen.set(key, {
      id: `order-${key.replace(/\|/g, "-")}`,
      fullName: ship.fullName?.trim() || "—",
      phone: ship.phone?.trim() || "—",
      line1: ship.line1.trim(),
      line2: ship.line2?.trim() || undefined,
      city: ship.city?.trim() || "—",
      region: ship.region?.trim() || "—",
      postalCode: ship.postalCode?.trim() || "—",
      lastUsedAt: (row.createdAt as Date).toISOString(),
    });
  }

  return [...seen.values()];
}
