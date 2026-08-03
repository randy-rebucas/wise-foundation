import { prisma } from "@/lib/db/prisma";

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

function addressKey(ship: { line1: string; city: string; postalCode: string }) {
  return `${ship.line1}|${ship.city}|${ship.postalCode}`.toLowerCase();
}

type MarketplaceShipping = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
};

export async function listAddressesFromOrders(
  customerUserId: string
): Promise<CustomerAddressFromOrder[]> {
  const rows = await prisma.order.findMany({
    where: { type: "MARKETPLACE", marketplaceCustomerUserId: customerUserId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { paymentDetails: true, createdAt: true },
    take: 50,
  });

  const seen = new Map<string, CustomerAddressFromOrder>();

  for (const row of rows) {
    const ship = (row.paymentDetails as { shipping?: MarketplaceShipping } | null)?.shipping;
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
      lastUsedAt: row.createdAt.toISOString(),
    });
  }

  return [...seen.values()];
}
