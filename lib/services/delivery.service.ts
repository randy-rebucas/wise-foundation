import {
  getPurchaseOrders,
  getPurchaseOrderStatusCounts,
} from "@/lib/services/purchaseOrder.service";
import type { PurchaseOrderStatus, SessionUser } from "@/types";

export const DELIVERY_STATUSES = ["approved", "received"] as const;
export type DeliveryListStatus = (typeof DELIVERY_STATUSES)[number];

export interface DeliveryStatusCounts {
  approved: number;
  received: number;
}

export async function getDeliveries(
  user: SessionUser,
  status: DeliveryListStatus,
  page = 1,
  limit = 20,
  opts?: { branchId?: string; organizationId?: string }
) {
  if (!DELIVERY_STATUSES.includes(status)) {
    throw new Error("Invalid delivery status filter");
  }
  return getPurchaseOrders(user, opts?.branchId, status, page, limit, opts?.organizationId);
}

export async function getDeliveryStatusCounts(
  user: SessionUser,
  opts?: { branchId?: string; organizationId?: string }
): Promise<DeliveryStatusCounts> {
  const counts = await getPurchaseOrderStatusCounts(
    user,
    opts?.branchId,
    opts?.organizationId
  );
  return {
    approved: counts.approved ?? 0,
    received: counts.received ?? 0,
  };
}

export function isDeliveryStatus(status: string): status is DeliveryListStatus {
  return DELIVERY_STATUSES.includes(status as DeliveryListStatus);
}
