import { hasPermission } from "@/lib/permissions";
import type { SessionUser } from "@/types";
import { refEntityId } from "@/lib/purchaseOrders/entityId";

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
