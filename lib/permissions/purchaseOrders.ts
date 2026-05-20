import { hasPermission, isPlatformAdmin } from "@/lib/permissions";
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

export function isOrgPurchaseOrderSubmitter(user: SessionUser): boolean {
  return user.role === "ORG_ADMIN" && canSubmitOrgPurchaseOrders(user);
}
