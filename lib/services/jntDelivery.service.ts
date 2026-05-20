import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Branch } from "@/lib/db/models/Branch";
import { PurchaseOrder } from "@/lib/db/models/PurchaseOrder";
import { PurchaseOrderItem } from "@/lib/db/models/PurchaseOrderItem";
import { getJntOrigin, isJntConfigured } from "@/lib/jnt/config";
import { jntCreateOrder, jntTrackOrder } from "@/lib/jnt/api";
import {
  canUserAccessPurchaseOrder,
  getPurchaseOrderByIdForUser,
} from "@/lib/services/purchaseOrder.service";
import type { BookJntDeliveryInput } from "@/lib/validations/jnt.schema";
import type { SessionUser } from "@/types";

const BOOKABLE_STATUSES = new Set(["approved"]);

function estimateWeightKg(itemCount: number, parcelCount: number, overrideKg?: number): number {
  if (overrideKg && overrideKg > 0) return overrideKg;
  const perParcel = Math.max(1, Math.ceil(itemCount / Math.max(1, parcelCount)));
  return Math.max(1, perParcel * 0.5 * parcelCount);
}

export async function bookJntDeliveryForPurchaseOrder(
  poId: string,
  user: SessionUser,
  input: BookJntDeliveryInput
) {
  if (!isJntConfigured()) {
    throw new Error("J&T Express is not configured. Add JNT_* variables to the environment.");
  }

  await connectDB();
  const po = await getPurchaseOrderByIdForUser(poId, user);
  if (!po) throw new Error("Purchase order not found");
  if (!BOOKABLE_STATUSES.has(po.status)) {
    throw new Error("J&T delivery can only be booked for approved purchase orders");
  }
  if (po.jntShipment?.trackingNumber) {
    throw new Error("A J&T shipment is already booked for this order");
  }

  const items = await PurchaseOrderItem.find({ purchaseOrderId: poId }).lean();
  const itemQty = items.reduce((s, i) => s + i.quantity, 0);
  const parcelCount = input.parcelCount ?? 1;
  const weightKg = estimateWeightKg(itemQty, parcelCount, input.weightKg);
  const origin = getJntOrigin();

  let originOverride = origin;
  const branchRef = po.branchId as { _id?: unknown } | string | null | undefined;
  const branchId =
    branchRef && typeof branchRef === "object" && branchRef._id != null
      ? String(branchRef._id)
      : branchRef
        ? String(branchRef)
        : null;
  if (branchId && mongoose.isValidObjectId(branchId)) {
    const branch = await Branch.findById(branchId).lean();
    if (branch?.address) {
      originOverride = {
        ...origin,
        name: branch.name,
        address: branch.address,
        phone: branch.phone ?? origin.phone,
      };
    }
  }

  const result = await jntCreateOrder({
    txlogisticid: `${po.poNumber}-${Date.now()}`,
    sender: {
      name: originOverride.name,
      mobile: originOverride.phone,
      city: originOverride.city,
      area: originOverride.area,
      address: originOverride.address,
    },
    receiver: {
      name: input.recipientName,
      mobile: input.recipientPhone,
      city: input.recipientCity,
      area: input.recipientRegion,
      address: input.recipientAddress,
    },
    weightKg,
    itemsValue: po.total,
    goodsValue: po.total,
    remark: input.remark ?? `PO ${po.poNumber}`,
    items: items.slice(0, 10).map((i) => ({
      itemname: i.productName,
      number: i.quantity,
      itemvalue: i.total,
    })),
  });

  const now = new Date();
  await PurchaseOrder.findByIdAndUpdate(poId, {
    $set: {
      jntShipment: {
        trackingNumber: result.trackingNumber,
        billCode: result.billCode,
        sortingCode: result.sortingCode,
        status: "booked",
        statusLabel: "Booked with J&T",
        bookedAt: now,
        bookedBy: new mongoose.Types.ObjectId(user.id),
        lastSyncedAt: now,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        recipientAddress: input.recipientAddress,
        recipientCity: input.recipientCity,
        recipientRegion: input.recipientRegion,
        weightKg,
        parcelCount,
        remark: input.remark,
      },
    },
  });

  return {
    trackingNumber: result.trackingNumber,
    billCode: result.billCode,
    sortingCode: result.sortingCode,
  };
}

export async function syncJntTrackingForPurchaseOrder(poId: string, user: SessionUser) {
  if (!isJntConfigured()) {
    throw new Error("J&T Express is not configured");
  }

  await connectDB();
  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null }).lean();
  if (!po) throw new Error("Purchase order not found");
  if (!canUserAccessPurchaseOrder(po, user)) {
    throw new Error("Purchase order not found");
  }

  const tracking = po.jntShipment?.trackingNumber;
  if (!tracking) throw new Error("No J&T shipment booked for this order");

  const track = await jntTrackOrder(tracking);
  const delivered =
    /deliver|sign|complete|received/i.test(track.statusLabel) ||
    /deliver|sign|complete|received/i.test(track.status);

  const status = delivered ? "delivered" : "in_transit";

  await PurchaseOrder.findByIdAndUpdate(poId, {
    $set: {
      "jntShipment.status": status,
      "jntShipment.statusLabel": track.statusLabel,
      "jntShipment.lastSyncedAt": new Date(),
      "jntShipment.rawStatus": track.status,
    },
  });

  return {
    trackingNumber: track.trackingNumber,
    status,
    statusLabel: track.statusLabel,
    traces: track.traces,
  };
}
