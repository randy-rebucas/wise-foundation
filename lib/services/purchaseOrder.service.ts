import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getDefaultLowStockThreshold } from "@/lib/services/appSettings.service";
import {
  canApprovePurchaseOrders,
  canManagePurchaseOrdersInventory,
  canReceivePurchaseOrder,
  canSetPurchaseOrderDiscount,
  canSubmitOrgPurchaseOrders,
  isOrgPurchaseOrderSubmitter,
} from "@/lib/permissions/purchaseOrders";
import { buildPurchaseOrderSignatureEmbed } from "@/lib/purchaseOrders/signatureEmbed";
import { resolvePurchaseOrderDiscountPercent } from "@/lib/purchaseOrders/discount.server";
import { canUserAccessPurchaseOrder } from "@/lib/purchaseOrders/access";
import { assertCanEditDraftPurchaseOrder } from "@/lib/purchaseOrders/draftEdit";
import {
  dedicatedFlowMessageForStatus,
  isValidPoStatusTransition,
  validateReceiveQuantities,
} from "@/lib/purchaseOrders/statusTransitions";
import {
  listPurchaseOrderAuditLogs,
  recordPurchaseOrderAudit,
} from "@/lib/services/purchaseOrderAudit.service";
import { defaultProcurementUnitCost } from "@/lib/utils/procurementCost";
import {
  computePurchaseOrderTotals,
  type PurchaseOrderPaymentTermsMonths,
} from "@/lib/utils/purchaseOrderTotals";
import type { PurchaseOrderStatus, SessionUser } from "@/types";
import type {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ReceivePurchaseOrderInput,
} from "@/lib/validations/purchaseOrder.schema";

export { canUserAccessPurchaseOrder } from "@/lib/purchaseOrders/access";

type PurchaseOrderItemInput = CreatePurchaseOrderInput["items"][number];

async function generatePONumber(): Promise<string> {
  const latest = await prisma.purchaseOrder.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { poNumber: true },
  });

  let next = 1;
  if (latest?.poNumber) {
    const match = /^PO-(\d+)$/i.exec(latest.poNumber);
    if (match) next = parseInt(match[1], 10) + 1;
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `PO-${String(next + attempt).padStart(5, "0")}`;
    const exists = await prisma.purchaseOrder.findFirst({ where: { poNumber: candidate } });
    if (!exists) return candidate;
  }

  return `PO-${String(Date.now()).slice(-8)}`;
}

function buildPurchaseOrderListQuery(
  user: SessionUser,
  opts?: { branchId?: string; organizationId?: string; status?: string }
): Prisma.PurchaseOrderWhereInput | null {
  const query: Prisma.PurchaseOrderWhereInput = { deletedAt: null };
  if (opts?.status) query.status = opts.status as PurchaseOrderStatus;

  if (user.role === "ADMIN") {
    if (opts?.branchId) query.branchId = opts.branchId;
    if (opts?.organizationId) query.organizationId = opts.organizationId;
    return query;
  }

  if (user.role === "ORG_ADMIN" && user.organizationId) {
    query.organizationId = user.organizationId;
    return query;
  }

  if (canSubmitOrgPurchaseOrders(user) && user.organizationId) {
    query.organizationId = user.organizationId;
    return query;
  }

  const bids = (user.branchIds ?? []).map(String).filter(Boolean);
  if (!canManagePurchaseOrdersInventory(user)) return null;
  if (bids.length === 0) {
    query.branchId = null;
    return query;
  }

  if (opts?.branchId) {
    if (bids.length > 0 && !bids.includes(opts.branchId)) return null;
    query.branchId = opts.branchId;
  } else {
    query.OR = [{ branchId: { in: bids } }, { branchId: null }];
  }

  return query;
}

export async function getPurchaseOrderStatusCounts(
  user: SessionUser,
  branchId?: string,
  organizationId?: string
): Promise<Record<PurchaseOrderStatus, number>> {
  const base = buildPurchaseOrderListQuery(user, { branchId, organizationId });
  const empty: Record<PurchaseOrderStatus, number> = {
    draft: 0,
    submitted: 0,
    approved: 0,
    declined: 0,
    received: 0,
    cancelled: 0,
  };
  if (!base) return empty;

  const rows = await prisma.purchaseOrder.groupBy({
    by: ["status"],
    where: base,
    _count: { _all: true },
  });

  for (const row of rows) {
    empty[row.status] = row._count._all;
  }
  return empty;
}

export async function getPurchaseOrders(
  user: SessionUser,
  branchId?: string,
  status?: string,
  page = 1,
  limit = 20,
  organizationId?: string
) {
  const query = buildPurchaseOrderListQuery(user, { branchId, organizationId, status });
  if (!query) {
    return { orders: [], total: 0, pages: 0 };
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        branch: { select: { name: true, code: true } },
        organization: { select: { name: true, type: true } },
        createdByUser: { select: { name: true } },
      },
    }),
    prisma.purchaseOrder.count({ where: query }),
  ]);

  return { orders, total, pages: Math.ceil(total / limit) };
}

async function normalizePurchaseOrderItems(
  items: PurchaseOrderItemInput[]
): Promise<PurchaseOrderItemInput[]> {
  const productIds = items.map((i) => i.productId);
  const variantIds = items.filter((i) => i.variantId).map((i) => i.variantId!);

  const [productDocs, variantDocs] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, deletedAt: null, isActive: true } }),
    variantIds.length > 0
      ? prisma.productVariant.findMany({ where: { id: { in: variantIds }, deletedAt: null, isActive: true } })
      : Promise.resolve([]),
  ]);

  const productMap = new Map(productDocs.map((p) => [p.id, p]));
  const variantMap = new Map(variantDocs.map((v) => [v.id, v]));

  return items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product not found (${item.productId})`);

    let sku = product.sku;
    let productName = product.name;
    let retailPrice = product.retailPrice;
    let variantId: string | undefined;

    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      if (!variant || variant.productId !== product.id) {
        throw new Error(`Variant not found for ${product.name}`);
      }
      variantId = variant.id;
      sku = variant.sku;
      productName = `${product.name} — ${variant.name}`;
      retailPrice = variant.retailPrice;
    }

    const submittedCost =
      typeof item.unitCost === "number" && Number.isFinite(item.unitCost) && item.unitCost >= 0
        ? item.unitCost
        : undefined;
    const unitCost =
      submittedCost !== undefined ? submittedCost : defaultProcurementUnitCost(retailPrice);

    return { productId: product.id, variantId, productName, sku, quantity: item.quantity, unitCost };
  });
}

function resolveBranchIdForCreate(
  user: SessionUser,
  requestedBranchId?: string | null
): string | null {
  if (requestedBranchId) {
    if (user.role !== "ADMIN") {
      const bids = (user.branchIds ?? []).map(String);
      if (bids.length > 0 && !bids.includes(requestedBranchId)) {
        throw new Error("You cannot create a purchase order for that branch.");
      }
    }
    return requestedBranchId;
  }

  if (user.role === "ORG_ADMIN") return null;

  const bids = (user.branchIds ?? []).map(String).filter(Boolean);
  if (bids.length >= 1) return bids[0]!;
  return null;
}

/** Splits the app-level `3 | 6 | "weekly" | null` union into the two scalar DB columns. */
function normalizePaymentTermsColumns(
  value: PurchaseOrderPaymentTermsMonths | null | undefined
): { paymentTermsMonths: number | null; paymentTermsWeekly: boolean } {
  if (value === "weekly") return { paymentTermsMonths: null, paymentTermsWeekly: true };
  if (value === 3 || value === 6) return { paymentTermsMonths: value, paymentTermsWeekly: false };
  return { paymentTermsMonths: null, paymentTermsWeekly: false };
}

function lineItemsSubtotal(items: { quantity: number; unitCost: number }[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
}

function applyPricingToUpdates(
  updates: Record<string, unknown>,
  lineSubtotal: number,
  discountPercent: number
) {
  const pricing = computePurchaseOrderTotals(lineSubtotal, discountPercent);
  updates.subtotal = pricing.subtotal;
  updates.discountPercent = pricing.discountPercent;
  updates.discountAmount = pricing.discountAmount;
  updates.total = pricing.total;
}

export async function getPurchaseOrderById(poId: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, deletedAt: null },
    include: {
      branch: { select: { name: true, code: true } },
      organization: { select: { name: true, type: true, contactPerson: true, email: true, phone: true } },
      createdByUser: { select: { name: true } },
      approvedByUser: { select: { name: true } },
      declinedByUser: { select: { name: true } },
      receivedByUser: { select: { name: true } },
      signatures: true,
    },
  });

  if (!po) return null;

  const items = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrderId: poId },
    include: { product: { select: { name: true, sku: true, images: true } } },
  });

  const auditLogs = await listPurchaseOrderAuditLogs(poId);

  return { ...po, items, auditLogs };
}

export async function getPurchaseOrderByIdForUser(poId: string, user: SessionUser) {
  const po = await getPurchaseOrderById(poId);
  if (!po) return null;
  if (!canUserAccessPurchaseOrder(po, user)) return null;
  return po;
}

export async function createPurchaseOrder(
  userId: string,
  input: CreatePurchaseOrderInput,
  user?: SessionUser
) {
  if (user && isOrgPurchaseOrderSubmitter(user) && user.organizationId) {
    if (input.organizationId !== user.organizationId) {
      throw new Error("You can only create purchase orders for your organization");
    }
  }

  const items = await normalizePurchaseOrderItems(input.items);
  const branchId = user ? resolveBranchIdForCreate(user, input.branchId) : (input.branchId ?? null);

  const poNumber = await generatePONumber();
  const discountPercent = await resolvePurchaseOrderDiscountPercent({
    organizationId: input.organizationId,
    requestedPercent: input.discountPercent,
    user,
  });
  const pricing = computePurchaseOrderTotals(lineItemsSubtotal(items), discountPercent);
  const { paymentTermsMonths, paymentTermsWeekly } = normalizePaymentTermsColumns(input.paymentTermsMonths);

  const po = await prisma.purchaseOrder.create({
    data: {
      organizationId: input.organizationId,
      branchId,
      poNumber,
      status: "draft",
      subtotal: pricing.subtotal,
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      total: pricing.total,
      paymentTermsMonths,
      paymentTermsWeekly,
      title: input.title?.trim() || undefined,
      expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
      notes: input.notes,
      createdBy: userId,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          receivedQuantity: 0,
          unitCost: item.unitCost,
          total: item.quantity * item.unitCost,
        })),
      },
    },
  });

  if (user) {
    await recordPurchaseOrderAudit({
      purchaseOrderId: po.id,
      action: "created",
      user,
      toStatus: "draft",
      metadata: { poNumber },
    });
  }

  return prisma.purchaseOrder.findUnique({ where: { id: po.id } });
}

export async function updatePurchaseOrder(
  poId: string,
  input: UpdatePurchaseOrderInput,
  user?: SessionUser
) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, deletedAt: null } });
  if (!po) throw new Error("Purchase order not found");
  if (user) {
    if (!canUserAccessPurchaseOrder(po, user)) {
      throw new Error("Purchase order not found");
    }
    assertCanEditDraftPurchaseOrder(po, user);
  } else if (po.status !== "draft") {
    throw new Error("Only draft purchase orders can be edited");
  }

  const updates: Record<string, unknown> = {};
  if (input.expectedDeliveryDate !== undefined)
    updates.expectedDeliveryDate = input.expectedDeliveryDate
      ? new Date(input.expectedDeliveryDate)
      : null;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.title !== undefined) updates.title = input.title.trim() || undefined;

  if (input.organizationId !== undefined) {
    const nextOrgId = input.organizationId;
    if (po.organizationId !== nextOrgId) {
      const org = await prisma.organization.findFirst({ where: { id: nextOrgId, deletedAt: null } });
      if (!org) throw new Error("Organization not found");
      updates.organizationId = nextOrgId;
      updates.branchId = null;
    }
  }

  if (input.paymentTermsMonths !== undefined) {
    Object.assign(updates, normalizePaymentTermsColumns(input.paymentTermsMonths));
  }

  let normalizedItems: Awaited<ReturnType<typeof normalizePurchaseOrderItems>> | undefined;

  if (input.items) {
    normalizedItems = await normalizePurchaseOrderItems(input.items);
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: poId } });
    await prisma.purchaseOrderItem.createMany({
      data: normalizedItems.map((item) => ({
        purchaseOrderId: poId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        receivedQuantity: 0,
        unitCost: item.unitCost,
        total: item.quantity * item.unitCost,
      })),
    });
  }

  const orgChanged = input.organizationId !== undefined && input.organizationId !== po.organizationId;
  const shouldRecalcPricing =
    normalizedItems !== undefined || input.discountPercent !== undefined || orgChanged;

  if (shouldRecalcPricing) {
    const effectiveOrgId = (updates.organizationId as string | undefined) ?? po.organizationId;
    const discountPercent = await resolvePurchaseOrderDiscountPercent({
      organizationId: effectiveOrgId,
      requestedPercent: input.discountPercent,
      existingPercent:
        user &&
        canSetPurchaseOrderDiscount(user) &&
        input.discountPercent === undefined &&
        !orgChanged
          ? Number(po.discountPercent ?? 0)
          : undefined,
      user,
    });
    const lineSubtotal = normalizedItems ? lineItemsSubtotal(normalizedItems) : Number(po.subtotal ?? 0);
    applyPricingToUpdates(updates, lineSubtotal, discountPercent);
  }

  const updated = await prisma.purchaseOrder.update({ where: { id: poId }, data: updates });

  if (user && updated) {
    await recordPurchaseOrderAudit({
      purchaseOrderId: poId,
      action: "updated",
      user,
      fromStatus: po.status,
      toStatus: po.status,
    });
  }

  return updated;
}

export async function updatePurchaseOrderDiscount(
  poId: string,
  discountPercent: number,
  user: SessionUser
) {
  if (!canSetPurchaseOrderDiscount(user)) {
    throw new Error("Only administrators can set purchase order discounts");
  }

  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, deletedAt: null } });
  if (!po) throw new Error("Purchase order not found");
  if (!canUserAccessPurchaseOrder(po, user)) {
    throw new Error("Purchase order not found");
  }
  if (po.status !== "draft" && po.status !== "submitted") {
    throw new Error("Discount can only be changed on draft or submitted purchase orders");
  }

  const resolved = await resolvePurchaseOrderDiscountPercent({
    organizationId: po.organizationId,
    requestedPercent: discountPercent,
    user,
  });

  const updates: Record<string, unknown> = {};
  applyPricingToUpdates(updates, Number(po.subtotal ?? 0), resolved);

  const updated = await prisma.purchaseOrder.update({ where: { id: poId }, data: updates });

  if (updated) {
    await recordPurchaseOrderAudit({
      purchaseOrderId: poId,
      action: "updated",
      user,
      fromStatus: po.status,
      toStatus: po.status,
      metadata: { discountPercent: resolved },
    });
  }

  return updated;
}

export async function deletePurchaseOrder(poId: string) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, deletedAt: null } });
  if (!po) throw new Error("Purchase order not found");
  if (po.status !== "draft") {
    throw new Error("Only draft purchase orders can be deleted");
  }

  await prisma.purchaseOrder.update({ where: { id: poId }, data: { deletedAt: new Date() } });
}

export async function deletePurchaseOrderForUser(poId: string, user: SessionUser) {
  const po = await getPurchaseOrderById(poId);
  if (!po) return false;
  if (!canUserAccessPurchaseOrder(po, user)) return false;
  if (
    isOrgPurchaseOrderSubmitter(user) &&
    !canManagePurchaseOrdersInventory(user) &&
    po.createdBy !== user.id
  ) {
    throw new Error("You can only delete your own draft purchase orders");
  }
  await recordPurchaseOrderAudit({
    purchaseOrderId: poId,
    action: "deleted",
    user,
    fromStatus: po.status,
    toStatus: po.status,
  });
  await deletePurchaseOrder(poId);
  return true;
}

export async function updatePurchaseOrderStatus(
  poId: string,
  status: PurchaseOrderStatus,
  user: SessionUser
) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, deletedAt: null } });
  if (!po) throw new Error("Purchase order not found");
  if (!canUserAccessPurchaseOrder(po, user)) {
    throw new Error("Purchase order not found");
  }

  const fromStatus = po.status;
  if (!isValidPoStatusTransition(fromStatus, status)) {
    throw new Error(`Cannot transition from ${po.status} to ${status}`);
  }

  const dedicatedMessage = dedicatedFlowMessageForStatus(status);
  if (dedicatedMessage) {
    throw new Error(dedicatedMessage);
  }

  if (status === "cancelled") {
    if (po.status === "draft") {
      if (!isOrgPurchaseOrderSubmitter(user) && !canManagePurchaseOrdersInventory(user)) {
        throw new Error("You cannot cancel this purchase order");
      }
      if (isOrgPurchaseOrderSubmitter(user) && po.createdBy !== user.id) {
        throw new Error("You can only cancel your own draft purchase orders");
      }
    } else if (po.status === "submitted") {
      if (canApprovePurchaseOrders(user)) {
        /* admin may cancel instead of decline */
      } else if (isOrgPurchaseOrderSubmitter(user)) {
        throw new Error("Submitted orders cannot be cancelled. Contact admin for changes.");
      } else if (!canManagePurchaseOrdersInventory(user)) {
        throw new Error("You cannot cancel this purchase order");
      }
    } else if (!canManagePurchaseOrdersInventory(user)) {
      throw new Error("You cannot cancel this purchase order");
    }
  }

  const updated = await prisma.purchaseOrder.update({ where: { id: poId }, data: { status } });

  if (updated) {
    await recordPurchaseOrderAudit({
      purchaseOrderId: poId,
      action: status === "cancelled" ? "cancelled" : "status_changed",
      user,
      fromStatus: po.status,
      toStatus: status,
    });
  }

  return updated;
}

export async function declinePurchaseOrder(poId: string, user: SessionUser, reason?: string) {
  if (!canApprovePurchaseOrders(user)) {
    throw new Error("Only platform administrators can decline purchase orders");
  }

  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, deletedAt: null } });
  if (!po) throw new Error("Purchase order not found");
  if (!canUserAccessPurchaseOrder(po, user)) {
    throw new Error("Purchase order not found");
  }
  if (po.status !== "submitted") {
    throw new Error("Only submitted purchase orders can be declined");
  }

  const trimmedReason = reason?.trim();
  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: "declined",
      declinedBy: user.id,
      declinedAt: new Date(),
      declineReason: trimmedReason || undefined,
    },
  });

  if (updated) {
    await recordPurchaseOrderAudit({
      purchaseOrderId: poId,
      action: "declined",
      user,
      fromStatus: po.status,
      toStatus: "declined",
      metadata: trimmedReason ? { reason: trimmedReason } : undefined,
    });
  }

  return updated;
}

export async function receivePurchaseOrder(
  poId: string,
  user: SessionUser,
  input: ReceivePurchaseOrderInput
) {
  const defaultLowStockThreshold = await getDefaultLowStockThreshold();
  const userId = user.id;
  const receivedSignature = buildPurchaseOrderSignatureEmbed(
    user,
    input.signedByName,
    input.signatureDataUrl
  );

  await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findFirst({
      where: { id: poId, deletedAt: null },
      include: { organization: { select: { hasInventory: true } } },
    });
    if (!po) throw new Error("Purchase order not found");
    if (!canUserAccessPurchaseOrder(po, user)) {
      throw new Error("Purchase order not found");
    }
    if (!canReceivePurchaseOrder(user, po)) {
      throw new Error("You cannot receive this purchase order");
    }
    if (po.status !== "approved") throw new Error("Only approved purchase orders can be received");

    const poItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });

    validateReceiveQuantities(
      poItems.map((item) => {
        const receiveItem = input.items.find((r) => r.itemId === item.id);
        return {
          itemId: item.id,
          productName: item.productName,
          quantity: item.quantity,
          receivedQuantity: receiveItem?.receivedQuantity ?? 0,
        };
      })
    );

    const poItemMap = new Map(poItems.map((i) => [i.id, i]));
    const validItems = input.items
      .map((ri) => ({ ri, poItem: poItemMap.get(ri.itemId) }))
      .filter((x): x is { ri: typeof x.ri; poItem: NonNullable<typeof x.poItem> } => !!x.poItem);

    if (!po.branchId) {
      // Org PO — update PO items and org inventory
      const orgHasInventory = po.organization.hasInventory !== false;

      for (const { ri, poItem } of validItems) {
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQuantity: ri.receivedQuantity },
        });
      }

      const orgInvItems = validItems.filter(({ ri }) => ri.receivedQuantity > 0 && orgHasInventory);
      for (const { ri, poItem } of orgInvItems) {
        const existing = await tx.organizationInventory.findFirst({
          where: { organizationId: po.organizationId, productId: poItem.productId, variantId: poItem.variantId },
        });
        if (existing) {
          await tx.organizationInventory.update({
            where: { id: existing.id },
            data: { quantity: { increment: ri.receivedQuantity }, totalReceived: { increment: ri.receivedQuantity } },
          });
        } else {
          await tx.organizationInventory.create({
            data: {
              organizationId: po.organizationId,
              productId: poItem.productId,
              variantId: poItem.variantId,
              quantity: ri.receivedQuantity,
              totalReceived: ri.receivedQuantity,
            },
          });
        }
      }
    } else {
      // Branch PO — fetch inventory, then update + record stock movements
      const branchItems = validItems.filter(({ ri }) => ri.receivedQuantity > 0);
      const invDocs = await tx.inventory.findMany({
        where: { branchId: po.branchId, productId: { in: branchItems.map(({ poItem }) => poItem.productId) } },
      });
      const invMap = new Map(invDocs.map((inv) => [`${inv.productId}:${inv.variantId ?? ""}`, inv]));

      for (const { ri, poItem } of branchItems) {
        const key = `${poItem.productId}:${poItem.variantId ?? ""}`;
        const existing = invMap.get(key);
        const previousQuantity = existing?.quantity ?? 0;

        if (existing) {
          await tx.inventory.update({
            where: { id: existing.id },
            data: { quantity: { increment: ri.receivedQuantity } },
          });
        } else {
          await tx.inventory.create({
            data: {
              branchId: po.branchId,
              productId: poItem.productId,
              variantId: poItem.variantId,
              quantity: ri.receivedQuantity,
              reservedQuantity: 0,
              lowStockThreshold: defaultLowStockThreshold,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            branchId: po.branchId,
            productId: poItem.productId,
            variantId: poItem.variantId,
            type: "IN",
            quantity: ri.receivedQuantity,
            previousQuantity,
            newQuantity: previousQuantity + ri.receivedQuantity,
            unitCost: poItem.unitCost,
            reference: po.poNumber,
            notes: `Received from PO ${po.poNumber}`,
            performedBy: userId,
          },
        });

        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQuantity: ri.receivedQuantity },
        });
      }
    }

    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: "received", receivedBy: userId, receivedAt: new Date() },
    });

    await tx.purchaseOrderSignature.upsert({
      where: { purchaseOrderId_kind: { purchaseOrderId: poId, kind: "RECEIVED" } },
      create: { purchaseOrderId: poId, kind: "RECEIVED", ...receivedSignature },
      update: receivedSignature,
    });
  });

  await recordPurchaseOrderAudit({
    purchaseOrderId: poId,
    action: "received",
    user,
    fromStatus: "approved",
    toStatus: "received",
    performedByName: input.signedByName,
  });

  return getPurchaseOrderById(poId);
}
