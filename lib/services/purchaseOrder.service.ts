import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { getDefaultLowStockThreshold } from "@/lib/services/appSettings.service";
import { PurchaseOrder } from "@/lib/db/models/PurchaseOrder";
import { PurchaseOrderItem } from "@/lib/db/models/PurchaseOrderItem";
import { Inventory } from "@/lib/db/models/Inventory";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import { StockMovement } from "@/lib/db/models/StockMovement";
import type { PurchaseOrderStatus, SessionUser } from "@/types";
import type {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ReceivePurchaseOrderInput,
} from "@/lib/validations/purchaseOrder.schema";

async function generatePONumber(): Promise<string> {
  const count = await PurchaseOrder.countDocuments();
  const pad = String(count + 1).padStart(5, "0");
  return `PO-${pad}`;
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
  if (!bid) return false;
  return (user.branchIds ?? []).map(String).includes(bid);
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

  const query: Record<string, unknown> = { deletedAt: null };
  if (status) query.status = status;

  if (user.role === "ADMIN") {
    if (branchId) query.branchId = branchId;
    if (organizationId) query.organizationId = organizationId;
  } else if (user.role === "ORG_ADMIN" && user.organizationId) {
    query.organizationId = user.organizationId;
  } else {
    const bids = (user.branchIds ?? []).map(String).filter(Boolean);
    if (bids.length === 0) {
      return { orders: [], total: 0, pages: 0 };
    }
    if (branchId) {
      if (!bids.includes(branchId)) {
        return { orders: [], total: 0, pages: 0 };
      }
      query.branchId = branchId;
    } else {
      query.branchId = { $in: bids };
    }
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

export async function createPurchaseOrder(userId: string, input: CreatePurchaseOrderInput) {
  await connectDB();

  const poNumber = await generatePONumber();
  const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const po = await PurchaseOrder.create({
    organizationId: input.organizationId,
    branchId: null,
    poNumber,
    status: "draft",
    subtotal,
    total: subtotal,
    expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
    notes: input.notes,
    createdBy: userId,
  });

  const itemDocs = input.items.map((item) => ({
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
    const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    updates.subtotal = subtotal;
    updates.total = subtotal;

    await PurchaseOrderItem.deleteMany({ purchaseOrderId: poId });
    await PurchaseOrderItem.insertMany(
      input.items.map((item) => ({
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

  const updates: Record<string, unknown> = { status };
  if (status === "approved") {
    updates.approvedBy = userId;
    updates.approvedAt = new Date();
  }

  return PurchaseOrder.findByIdAndUpdate(poId, { $set: updates }, { new: true }).lean();
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
