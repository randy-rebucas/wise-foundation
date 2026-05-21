import "server-only";

import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Organization } from "@/lib/db/models/Organization";
import { getPurchaseOrderDiscountByOrgType } from "@/lib/services/appSettings.service";
import { canSetPurchaseOrderDiscount } from "@/lib/permissions/purchaseOrders";
import {
  getPurchaseOrderDiscountForOrgType,
  type PurchaseOrderDiscountByOrgType,
} from "@/lib/purchaseOrders/orgTypeDiscountDefaults";
import type { SessionUser } from "@/types";

function clampDiscountPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export async function resolvePurchaseOrderDiscountPercent(options: {
  organizationId: string;
  requestedPercent?: number;
  /** When ADMIN updates without sending discountPercent, keep current PO discount. */
  existingPercent?: number;
  user?: SessionUser;
  settingsMap?: PurchaseOrderDiscountByOrgType;
}): Promise<number> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(options.organizationId)) {
    throw new Error("Invalid organization id");
  }

  const org = await Organization.findOne({
    _id: options.organizationId,
    deletedAt: null,
  })
    .select("type")
    .lean();
  if (!org) throw new Error("Organization not found");

  const settingsMap =
    options.settingsMap ?? (await getPurchaseOrderDiscountByOrgType());
  const typeDefault = getPurchaseOrderDiscountForOrgType(org.type, settingsMap);

  if (options.user && canSetPurchaseOrderDiscount(options.user)) {
    if (options.requestedPercent !== undefined) {
      return clampDiscountPercent(options.requestedPercent);
    }
    if (options.existingPercent !== undefined) {
      return clampDiscountPercent(options.existingPercent);
    }
    return typeDefault;
  }

  return typeDefault;
}
