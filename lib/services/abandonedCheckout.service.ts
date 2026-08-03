import { prisma } from "@/lib/db/prisma";

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
  const email = input.email.trim().toLowerCase();
  if (!email || input.items.length === 0) return null;

  const itemsData = input.items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId ?? null,
    name: i.name,
    variantName: i.variantName,
    sku: i.sku,
    image: i.image,
    price: i.price,
    quantity: i.quantity,
  }));

  const fields = {
    email,
    fullName: input.fullName,
    phone: input.phone,
    customerId: input.customerId ?? null,
    subtotal: input.subtotal,
    discountAmount: input.discountAmount,
    shippingCost: input.shippingCost,
    total: input.total,
    paymentMethod: input.paymentMethod,
    lastSeenAt: new Date(),
  };

  return prisma.$transaction(async (tx) => {
    const existing = await tx.abandonedCheckout.findFirst({ where: { email, status: "open" } });
    if (existing) {
      await tx.abandonedCheckoutItem.deleteMany({ where: { abandonedCheckoutId: existing.id } });
      return tx.abandonedCheckout.update({
        where: { id: existing.id },
        data: { ...fields, items: { create: itemsData } },
      });
    }
    return tx.abandonedCheckout.create({ data: { ...fields, items: { create: itemsData } } });
  });
}

export async function markAbandonedCheckoutRecovered(email: string, orderId: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  await prisma.abandonedCheckout.updateMany({
    where: { email: normalized, status: "open" },
    data: { status: "recovered", recoveredOrderId: orderId, recoveredAt: new Date() },
  });
}

export async function getAbandonedCheckouts(
  status: "open" | "recovered" | undefined,
  search: string | undefined,
  page: number,
  limit: number
) {
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [checkouts, total, openCount] = await Promise.all([
    prisma.abandonedCheckout.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      skip,
      take: limit,
      include: { items: true },
    }),
    prisma.abandonedCheckout.count({ where }),
    prisma.abandonedCheckout.count({ where: { status: "open" } }),
  ]);

  return { checkouts, total, openCount };
}

export async function deleteAbandonedCheckout(id: string) {
  await prisma.abandonedCheckout.delete({ where: { id } });
}
