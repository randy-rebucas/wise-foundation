import { prisma } from "@/lib/db/prisma";
import type { OrderStatus } from "@/types";

export type CustomerOrderLineSummary = {
  productId: string;
  productName: string;
  productSlug?: string;
};

export type CustomerOrderRow = {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  paidAt: string | null;
  shipSummary: string;
  thumbnailUrl: string | null;
  itemCount: number;
  lineItems: CustomerOrderLineSummary[];
};

export async function listMyMarketplaceOrders(customerUserId: string, limit = 50): Promise<CustomerOrderRow[]> {
  const rows = await prisma.order.findMany({
    where: { type: "MARKETPLACE", marketplaceCustomerUserId: customerUserId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      paidAt: true,
      paymentDetails: true,
    },
  });

  const orderIds = rows.map((o) => o.id);
  const lineItems = orderIds.length
    ? await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        select: { orderId: true, productId: true, quantity: true, productName: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const productIds = [...new Set(lineItems.map((item) => item.productId))];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
        select: { id: true, images: true, slug: true },
      })
    : [];
  const imageByProductId = new Map(products.map((p) => [p.id, p.images?.[0] ?? null]));
  const slugByProductId = new Map(products.map((p) => [p.id, p.slug]));

  const metaByOrderId = new Map<
    string,
    { thumbnailUrl: string | null; itemCount: number; lineItems: CustomerOrderLineSummary[] }
  >();
  for (const item of lineItems) {
    const existing = metaByOrderId.get(item.orderId);
    if (existing) {
      existing.itemCount += item.quantity;
      if (!existing.lineItems.some((l) => l.productId === item.productId)) {
        existing.lineItems.push({
          productId: item.productId,
          productName: item.productName,
          productSlug: slugByProductId.get(item.productId),
        });
      }
      continue;
    }
    metaByOrderId.set(item.orderId, {
      thumbnailUrl: imageByProductId.get(item.productId) ?? null,
      itemCount: item.quantity,
      lineItems: [
        {
          productId: item.productId,
          productName: item.productName,
          productSlug: slugByProductId.get(item.productId),
        },
      ],
    });
  }

  return rows.map((o) => {
    const details = o.paymentDetails as { shipping?: { line1?: string; city?: string; region?: string } } | null;
    const ship = details?.shipping;
    const parts = [ship?.line1, ship?.city, ship?.region].filter(Boolean);
    const shipSummary = parts.length > 0 ? parts.join(" · ") : "—";
    const meta = metaByOrderId.get(o.id);
    return {
      _id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
      shipSummary,
      thumbnailUrl: meta?.thumbnailUrl ?? null,
      itemCount: meta?.itemCount ?? 0,
      lineItems: meta?.lineItems ?? [],
    };
  });
}
