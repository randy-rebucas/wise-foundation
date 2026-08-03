import "server-only";

import { prisma } from "@/lib/db/prisma";
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
  const org = await prisma.organization.findFirst({
    where: { id: options.organizationId, deletedAt: null },
    select: { type: true },
  });
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
