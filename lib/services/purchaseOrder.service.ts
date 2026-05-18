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
import { defaultProcurementUnitCost } from "@/lib/utils/procurementCost";
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

function refEntityId(field: unknown): string | null {
  if (field == null) return null;
  if (typeof field === "object" && field !== null && "_id" in field) {
    return String((field as { _id: unknown })._id);
  }
  if (typeof field === "object" && field !== null && "toString" in field) {
    return (field as { toString(): string }).toString();
  }
  return String(field);
}

/** Whether the user may read or mutate this purchase order (org- or branch-scoped). */
export function canUserAccessPurchaseOrder(
  po: { organizationId?: unknown; branchId?: unknown },
  user: SessionUser
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "ORG_ADMIN") {
    const oid = user.organizationId;
    if (!oid) return false;
    return refEntityId(po.organizationId) === String(oid);
  }
  const bid = refEntityId(po.branchId);
  if (bid) {
    return (user.branchIds ?? []).map(String).includes(bid);
  }
  return hasPermission(user, "manage:inventory");
}

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

  const bids = (user.branchIds ?? []).map(String).filter(Boolean);
  if (!hasPermission(user, "manage:inventory")) return null;
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

export async function getPurchaseOrderById(poId: string) {
  await connectDB();
  assertValidObjectId(poId, "purchase order id");

  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null })
    .populate("branchId", "name code")
    .populate("organizationId", "name type contactPerson email phone")
    .populate("createdBy", "name")
    .populate("approvedBy", "name")
    .populate("receivedBy", "name")
    .lean();

  if (!po) return null;

  const items = await PurchaseOrderItem.find({ purchaseOrderId: poId })
    .populate("productId", "name sku images")
    .lean();

  return { ...po, items };
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

  const items = await normalizePurchaseOrderItems(input.items);
  const branchId = user ? resolveBranchIdForCreate(user, input.branchId) : (input.branchId ?? null);

  const poNumber = await generatePONumber();
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const po = await PurchaseOrder.create({
    organizationId: input.organizationId,
    branchId,
    poNumber,
    status: "draft",
    subtotal,
    total: subtotal,
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
  return PurchaseOrder.findById(po._id).lean();
}

export async function updatePurchaseOrder(poId: string, input: UpdatePurchaseOrderInput) {
  await connectDB();

  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null });
  if (!po) throw new Error("Purchase order not found");
  if (po.status !== "draft") throw new Error("Only draft purchase orders can be edited");

  const updates: Record<string, unknown> = {};
  if (input.expectedDeliveryDate !== undefined)
    updates.expectedDeliveryDate = input.expectedDeliveryDate
      ? new Date(input.expectedDeliveryDate)
      : null;
  if (input.notes !== undefined) updates.notes = input.notes;

  if (input.items) {
    const items = await normalizePurchaseOrderItems(input.items);
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    updates.subtotal = subtotal;
    updates.total = subtotal;

    await PurchaseOrderItem.deleteMany({ purchaseOrderId: poId });
    await PurchaseOrderItem.insertMany(
      items.map((item) => ({
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

  return PurchaseOrder.findByIdAndUpdate(poId, { $set: updates }, { new: true }).lean();
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
  await deletePurchaseOrder(poId);
  return true;
}

export async function updatePurchaseOrderStatus(
  poId: string,
  status: PurchaseOrderStatus,
  userId: string
) {
  await connectDB();

  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null });
  if (!po) throw new Error("Purchase order not found");

  const validTransitions: Record<string, PurchaseOrderStatus[]> = {
    draft: ["submitted", "cancelled"],
    submitted: ["approved", "cancelled"],
    approved: ["received", "cancelled"],
    received: [],
    cancelled: [],
  };

  if (!validTransitions[po.status].includes(status)) {
    throw new Error(`Cannot transition from ${po.status} to ${status}`);
  }

  if (status === "submitted") {
    throw new Error("Submit this purchase order using Sign & Submit.");
  }
  if (status === "approved") {
    throw new Error("Approve this purchase order using Sign & Approve.");
  }

  return PurchaseOrder.findByIdAndUpdate(poId, { $set: { status } }, { new: true }).lean();
}

export async function receivePurchaseOrder(
  poId: string,
  userId: string,
  input: ReceivePurchaseOrderInput
) {
  await connectDB();
  const defaultLowStockThreshold = await getDefaultLowStockThreshold();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null })
      .populate("organizationId", "settings")
      .session(session);
    if (!po) throw new Error("Purchase order not found");
    if (po.status !== "approved") throw new Error("Only approved purchase orders can be received");

    const poItems = await PurchaseOrderItem.find({ purchaseOrderId: poId }).session(session);

    for (const receiveItem of input.items) {
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
          const poItem = poItems.find((i) => String(i._id) === receiveItem.itemId);
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
      const poItem = poItems.find((i) => String(i._id) === receiveItem.itemId);
      if (!poItem) continue;
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
    return getPurchaseOrderById(poId);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}
