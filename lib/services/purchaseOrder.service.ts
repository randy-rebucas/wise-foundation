import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { getDefaultLowStockThreshold } from "@/lib/services/appSettings.service";
import { Branch } from "@/lib/db/models/Branch";
import { Organization } from "@/lib/db/models/Organization";
import { User } from "@/lib/db/models/User";
import { PurchaseOrder } from "@/lib/db/models/PurchaseOrder";
import { PurchaseOrderItem } from "@/lib/db/models/PurchaseOrderItem";
import { Product } from "@/lib/db/models/Product";
import { ProductVariant } from "@/lib/db/models/ProductVariant";
import { Inventory } from "@/lib/db/models/Inventory";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import { StockMovement } from "@/lib/db/models/StockMovement";
import { hasPermission } from "@/lib/permissions";
import {
  canApprovePurchaseOrders,
  canManagePurchaseOrdersInventory,
  canSetPurchaseOrderDiscount,
  canSubmitOrgPurchaseOrders,
  isOrgPurchaseOrderSubmitter,
} from "@/lib/permissions/purchaseOrders";
import { resolvePurchaseOrderDiscountPercent } from "@/lib/purchaseOrders/discount.server";
import { refEntityId } from "@/lib/purchaseOrders/entityId";
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

/** Ensures Mongoose registers models referenced by populate() in this service. */
const _purchaseOrderRefModels = [Branch, Organization, User] as const;

type PurchaseOrderItemInput = CreatePurchaseOrderInput["items"][number];

async function generatePONumber(): Promise<string> {
  const latest = await PurchaseOrder.findOne({ deletedAt: null })
    .sort({ createdAt: -1 })
    .select("poNumber")
    .lean();

  let next = 1;
  if (latest?.poNumber) {
    const match = /^PO-(\d+)$/i.exec(latest.poNumber);
    if (match) next = parseInt(match[1], 10) + 1;
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `PO-${String(next + attempt).padStart(5, "0")}`;
    const exists = await PurchaseOrder.exists({ poNumber: candidate });
    if (!exists) return candidate;
  }

  return `PO-${String(Date.now()).slice(-8)}`;
}

export { canUserAccessPurchaseOrder } from "@/lib/purchaseOrders/access";

function buildPurchaseOrderListQuery(
  user: SessionUser,
  opts?: { branchId?: string; organizationId?: string; status?: string }
): Record<string, unknown> | null {
  const query: Record<string, unknown> = { deletedAt: null };
  if (opts?.status) query.status = opts.status;

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
    query.$or = [{ branchId: { $in: bids } }, { branchId: null }];
  }

  return query;
}

export async function getPurchaseOrderStatusCounts(
  user: SessionUser,
  branchId?: string,
  organizationId?: string
): Promise<Record<PurchaseOrderStatus, number>> {
  await connectDB();
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

  const rows = await PurchaseOrder.aggregate<{ _id: PurchaseOrderStatus; count: number }>([
    { $match: base },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  for (const row of rows) {
    if (row._id in empty) empty[row._id] = row.count;
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
  await connectDB();

  const query = buildPurchaseOrderListQuery(user, { branchId, organizationId, status });
  if (!query) {
    return { orders: [], total: 0, pages: 0 };
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    PurchaseOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("branchId", "name code")
      .populate("organizationId", "name type")
      .populate("createdBy", "name")
      .lean(),
    PurchaseOrder.countDocuments(query),
  ]);

  return { orders, total, pages: Math.ceil(total / limit) };
}

async function normalizePurchaseOrderItems(
  items: PurchaseOrderItemInput[]
): Promise<PurchaseOrderItemInput[]> {
  const normalized: PurchaseOrderItemInput[] = [];

  for (const item of items) {
    assertValidObjectId(item.productId, "product id");
    const product = await Product.findOne({
      _id: item.productId,
      deletedAt: null,
      isActive: true,
    }).lean();
    if (!product) {
      throw new Error(`Product not found (${item.productId})`);
    }

    let sku = product.sku;
    let productName = product.name;
    let retailPrice = product.retailPrice;
    let variantId: string | undefined;

    if (item.variantId) {
      assertValidObjectId(item.variantId, "variant id");
      const variant = await ProductVariant.findOne({
        _id: item.variantId,
        productId: product._id,
        deletedAt: null,
        isActive: true,
      }).lean();
      if (!variant) {
        throw new Error(`Variant not found for ${product.name}`);
      }
      variantId = String(variant._id);
      sku = variant.sku;
      productName = `${product.name} — ${variant.name}`;
      retailPrice = variant.retailPrice;
    }

    let unitCost = defaultProcurementUnitCost(retailPrice);
    if (typeof item.unitCost === "number" && item.unitCost >= 0 && item.unitCost <= retailPrice * 1.1) {
      unitCost = item.unitCost;
    }

    normalized.push({
      productId: String(product._id),
      variantId,
      productName,
      sku,
      quantity: item.quantity,
      unitCost,
    });
  }

  return normalized;
}

function resolveBranchIdForCreate(
  user: SessionUser,
  requestedBranchId?: string | null
): string | null {
  if (requestedBranchId) {
    assertValidObjectId(requestedBranchId, "branch id");
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
  if (bids.length === 1) return bids[0]!;
  if (bids.length > 1) return bids[0]!;
  return null;
}

function assertValidObjectId(id: string, label = "ID"): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}`);
  }
}

function normalizePaymentTermsMonths(
  value: PurchaseOrderPaymentTermsMonths | null | undefined
): PurchaseOrderPaymentTermsMonths | null {
  if (value === 3 || value === 6 || value === "weekly") return value;
  return null;
}

function lineItemsSubtotal(
  items: { quantity: number; unitCost: number }[]
): number {
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
  await connectDB();
  assertValidObjectId(poId, "purchase order id");

  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null })
    .populate("branchId", "name code")
    .populate("organizationId", "name type contactPerson email phone")
    .populate("createdBy", "name")
    .populate("approvedBy", "name")
    .populate("declinedBy", "name")
    .populate("receivedBy", "name")
    .lean();

  if (!po) return null;

  const items = await PurchaseOrderItem.find({ purchaseOrderId: poId })
    .populate("productId", "name sku images")
    .lean();

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
  await connectDB();
  assertValidObjectId(input.organizationId, "organization id");

  if (user && isOrgPurchaseOrderSubmitter(user) && user.organizationId) {
    if (String(input.organizationId) !== String(user.organizationId)) {
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

  const po = await PurchaseOrder.create({
    organizationId: input.organizationId,
    branchId,
    poNumber,
    status: "draft",
    subtotal: pricing.subtotal,
    discountPercent: pricing.discountPercent,
    discountAmount: pricing.discountAmount,
    total: pricing.total,
    paymentTermsMonths: normalizePaymentTermsMonths(input.paymentTermsMonths),
    title: input.title?.trim() || undefined,
    expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
    notes: input.notes,
    createdBy: userId,
  });

  const itemDocs = items.map((item) => ({
    purchaseOrderId: po._id,
    productId: item.productId,
    variantId: item.variantId ?? null,
    productName: item.productName,
    sku: item.sku,
    quantity: item.quantity,
    receivedQuantity: 0,
    unitCost: item.unitCost,
    total: item.quantity * item.unitCost,
  }));

  await PurchaseOrderItem.insertMany(itemDocs);

  if (user) {
    await recordPurchaseOrderAudit({
      purchaseOrderId: String(po._id),
      action: "created",
      user,
      toStatus: "draft",
      metadata: { poNumber },
    });
  }

  return PurchaseOrder.findById(po._id).lean();
}

export async function updatePurchaseOrder(
  poId: string,
  input: UpdatePurchaseOrderInput,
  user?: SessionUser
) {
  await connectDB();

  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null });
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
    assertValidObjectId(input.organizationId, "organization id");
    const nextOrgId = String(input.organizationId);
    const currentOrgId = refEntityId(po.organizationId);
    if (currentOrgId !== nextOrgId) {
      const org = await Organization.findOne({ _id: nextOrgId, deletedAt: null }).lean();
      if (!org) throw new Error("Organization not found");
      updates.organizationId = nextOrgId;
      updates.branchId = null;
    }
  }

  if (input.paymentTermsMonths !== undefined) {
    updates.paymentTermsMonths = normalizePaymentTermsMonths(input.paymentTermsMonths);
  }

  let normalizedItems: Awaited<ReturnType<typeof normalizePurchaseOrderItems>> | undefined;

  if (input.items) {
    normalizedItems = await normalizePurchaseOrderItems(input.items);
    await PurchaseOrderItem.deleteMany({ purchaseOrderId: poId });
    await PurchaseOrderItem.insertMany(
      normalizedItems.map((item) => ({
        purchaseOrderId: poId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        receivedQuantity: 0,
        unitCost: item.unitCost,
        total: item.quantity * item.unitCost,
      }))
    );
  }

  const orgChanged =
    input.organizationId !== undefined &&
    String(input.organizationId) !== refEntityId(po.organizationId);
  const shouldRecalcPricing =
    normalizedItems !== undefined ||
    input.discountPercent !== undefined ||
    orgChanged;

  if (shouldRecalcPricing) {
    const effectiveOrgId = String(
      (updates.organizationId as string | undefined) ?? refEntityId(po.organizationId)
    );
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
    const lineSubtotal = normalizedItems
      ? lineItemsSubtotal(normalizedItems)
      : Number(po.subtotal ?? 0);
    applyPricingToUpdates(updates, lineSubtotal, discountPercent);
  }

  const updated = await PurchaseOrder.findByIdAndUpdate(poId, { $set: updates }, { new: true }).lean();

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

  await connectDB();
  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null });
  if (!po) throw new Error("Purchase order not found");
  if (!canUserAccessPurchaseOrder(po, user)) {
    throw new Error("Purchase order not found");
  }
  if (po.status !== "draft" && po.status !== "submitted") {
    throw new Error("Discount can only be changed on draft or submitted purchase orders");
  }

  const orgId = refEntityId(po.organizationId);
  if (!orgId) throw new Error("Organization not found");

  const resolved = await resolvePurchaseOrderDiscountPercent({
    organizationId: orgId,
    requestedPercent: discountPercent,
    user,
  });

  const updates: Record<string, unknown> = {};
  applyPricingToUpdates(updates, Number(po.subtotal ?? 0), resolved);

  const updated = await PurchaseOrder.findByIdAndUpdate(poId, { $set: updates }, { new: true }).lean();

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
  await connectDB();

  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null });
  if (!po) throw new Error("Purchase order not found");
  if (po.status !== "draft") {
    throw new Error("Only draft purchase orders can be deleted");
  }

  await PurchaseOrder.findByIdAndUpdate(poId, { $set: { deletedAt: new Date() } });
}

export async function deletePurchaseOrderForUser(poId: string, user: SessionUser) {
  const po = await getPurchaseOrderById(poId);
  if (!po) return false;
  if (!canUserAccessPurchaseOrder(po, user)) return false;
  if (
    isOrgPurchaseOrderSubmitter(user) &&
    !canManagePurchaseOrdersInventory(user) &&
    refEntityId(po.createdBy) !== String(user.id)
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
  await connectDB();

  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null });
  if (!po) throw new Error("Purchase order not found");
  if (!canUserAccessPurchaseOrder(po, user)) {
    throw new Error("Purchase order not found");
  }

  const fromStatus = po.status as PurchaseOrderStatus;
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
      if (
        isOrgPurchaseOrderSubmitter(user) &&
        refEntityId(po.createdBy) !== String(user.id)
      ) {
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

  const updated = await PurchaseOrder.findByIdAndUpdate(
    poId,
    { $set: { status } },
    { new: true }
  ).lean();

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

export async function declinePurchaseOrder(
  poId: string,
  user: SessionUser,
  reason?: string
) {
  if (!canApprovePurchaseOrders(user)) {
    throw new Error("Only platform administrators can decline purchase orders");
  }

  await connectDB();
  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null });
  if (!po) throw new Error("Purchase order not found");
  if (!canUserAccessPurchaseOrder(po, user)) {
    throw new Error("Purchase order not found");
  }
  if (po.status !== "submitted") {
    throw new Error("Only submitted purchase orders can be declined");
  }

  const trimmedReason = reason?.trim();
  const updated = await PurchaseOrder.findByIdAndUpdate(
    poId,
    {
      $set: {
        status: "declined",
        declinedBy: new mongoose.Types.ObjectId(user.id),
        declinedAt: new Date(),
        declineReason: trimmedReason || undefined,
      },
    },
    { new: true }
  ).lean();

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
  if (!canManagePurchaseOrdersInventory(user)) {
    throw new Error("Only operations staff can fulfill purchase orders");
  }

  await connectDB();
  const defaultLowStockThreshold = await getDefaultLowStockThreshold();
  const session = await mongoose.startSession();
  const userId = user.id;

  try {
    session.startTransaction();

    const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null })
      .populate("organizationId", "settings")
      .session(session);
    if (!po) throw new Error("Purchase order not found");
    if (!canUserAccessPurchaseOrder(po, user)) {
      throw new Error("Purchase order not found");
    }
    if (po.status !== "approved") throw new Error("Only approved purchase orders can be received");

    const poItems = await PurchaseOrderItem.find({ purchaseOrderId: poId }).session(session);

    validateReceiveQuantities(
      poItems.map((item) => {
        const receiveItem = input.items.find((r) => r.itemId === String(item._id));
        return {
          itemId: String(item._id),
          productName: item.productName,
          quantity: item.quantity,
          receivedQuantity: receiveItem?.receivedQuantity ?? 0,
        };
      })
    );

    for (const receiveItem of input.items) {
      const poItem = poItems.find((i) => String(i._id) === receiveItem.itemId);
      if (!poItem) continue;

      if (!po.branchId) {
        // Org PO — update received quantities and upsert org inventory
        await PurchaseOrderItem.findByIdAndUpdate(
          receiveItem.itemId,
          { $set: { receivedQuantity: receiveItem.receivedQuantity } },
          { session }
        );
        const orgSettings = (po.organizationId as unknown as { settings?: { hasInventory?: boolean } })?.settings;
        const orgHasInventory = orgSettings?.hasInventory !== false;
        if (po.organizationId && receiveItem.receivedQuantity > 0 && orgHasInventory) {
        if (poItem) {
            await OrganizationInventory.findOneAndUpdate(
              { organizationId: po.organizationId, productId: poItem.productId },
              {
                $inc: {
                  quantity: receiveItem.receivedQuantity,
                  totalReceived: receiveItem.receivedQuantity,
                },
              },
              { upsert: true, new: true, session }
            );
          }
        }
        continue;
      }
      if (receiveItem.receivedQuantity === 0) continue;

      const inventoryFilter = {
        branchId: po.branchId,
        productId: poItem.productId,
        variantId: poItem.variantId ?? null,
      };

      let inventory = await Inventory.findOne(inventoryFilter).session(session);
      if (!inventory) {
        inventory = new Inventory({
          ...inventoryFilter,
          quantity: 0,
          reservedQuantity: 0,
          lowStockThreshold: defaultLowStockThreshold,
        });
      }

      const previousQuantity = inventory.quantity;
      const newQuantity = previousQuantity + receiveItem.receivedQuantity;
      inventory.quantity = newQuantity;
      await inventory.save({ session });

      await StockMovement.create(
        [
          {
            branchId: po.branchId,
            productId: poItem.productId,
            variantId: poItem.variantId ?? null,
            type: "IN",
            quantity: receiveItem.receivedQuantity,
            previousQuantity,
            newQuantity,
            unitCost: poItem.unitCost,
            reference: po.poNumber,
            notes: `Received from PO ${po.poNumber}`,
            performedBy: userId,
          },
        ],
        { session }
      );

      await PurchaseOrderItem.findByIdAndUpdate(
        poItem._id,
        { $set: { receivedQuantity: receiveItem.receivedQuantity } },
        { session }
      );
    }

    await PurchaseOrder.findByIdAndUpdate(
      poId,
      { $set: { status: "received", receivedBy: userId, receivedAt: new Date() } },
      { session }
    );

    await session.commitTransaction();

    await recordPurchaseOrderAudit({
      purchaseOrderId: poId,
      action: "received",
      user,
      fromStatus: "approved",
      toStatus: "received",
    });

    return getPurchaseOrderById(poId);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}
