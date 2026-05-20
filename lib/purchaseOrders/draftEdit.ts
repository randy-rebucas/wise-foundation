import {
  canManagePurchaseOrdersInventory,
  isOrgPurchaseOrderSubmitter,
} from "@/lib/permissions/purchaseOrders";
import { refEntityId } from "@/lib/purchaseOrders/entityId";
import type { SessionUser } from "@/types";

export function assertCanEditDraftPurchaseOrder(
  po: { status: string; createdBy?: unknown },
  user: SessionUser
): void {
  if (po.status !== "draft") {
    throw new Error("Only draft purchase orders can be edited");
  }
  if (
    isOrgPurchaseOrderSubmitter(user) &&
    !canManagePurchaseOrdersInventory(user) &&
    refEntityId(po.createdBy) !== String(user.id)
  ) {
    throw new Error("You can only edit your own draft purchase orders");
  }
}
