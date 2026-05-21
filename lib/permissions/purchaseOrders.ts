import { hasPermission, isPlatformAdmin } from "@/lib/permissions";
import { canUserAccessPurchaseOrder } from "@/lib/purchaseOrders/access";
import { refEntityId } from "@/lib/purchaseOrders/entityId";
import type { SessionUser } from "@/types";

/** HQ / branch staff — full purchase order operations. */
export function canManagePurchaseOrdersInventory(user: SessionUser): boolean {
  return isPlatformAdmin(user.role) || hasPermission(user, "manage:inventory");
}

/** Distributor org admins — create and submit POs for their organization. */
export function canSubmitOrgPurchaseOrders(user: SessionUser): boolean {
  return (
    isPlatformAdmin(user.role) ||
    hasPermission(user, "manage:inventory") ||
    hasPermission(user, "submit:org_orders")
  );
}

export function canViewPurchaseOrders(user: SessionUser): boolean {
  return canManagePurchaseOrdersInventory(user) || canSubmitOrgPurchaseOrders(user);
}

/** Platform admin approves or declines submitted POs. */
export function canApprovePurchaseOrders(user: SessionUser): boolean {
  return isPlatformAdmin(user.role);
}

/** Platform admin may override PO discount %; others use org-type defaults. */
export function canSetPurchaseOrderDiscount(user: SessionUser): boolean {
  return canApprovePurchaseOrders(user);
}

export function isOrgPurchaseOrderSubmitter(user: SessionUser): boolean {
  return user.role === "ORG_ADMIN" && canSubmitOrgPurchaseOrders(user);
}

/** Approved / fulfilled POs (deliveries list). */
export function canViewDeliveries(user: SessionUser): boolean {
  return canViewPurchaseOrders(user);
}

export function canFulfillDeliveries(user: SessionUser): boolean {
  return canManagePurchaseOrdersInventory(user);
}

/** Receive approved PO: org admin for org deliveries; inventory staff for branch POs. */
export function canReceivePurchaseOrder(
  user: SessionUser,
  po: { organizationId?: unknown; branchId?: unknown }
): boolean {
  if (!canUserAccessPurchaseOrder(po, user)) return false;
  const branchId = refEntityId(po.branchId);
  if (branchId) {
    return canManagePurchaseOrdersInventory(user) && !isOrgPurchaseOrderSubmitter(user);
  }
  return (
    isOrgPurchaseOrderSubmitter(user) &&
    !!user.organizationId &&
    refEntityId(po.organizationId) === String(user.organizationId)
  );
}
