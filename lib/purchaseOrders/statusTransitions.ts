import type { PurchaseOrderStatus } from "@/types";

export const PO_STATUS_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "declined", "cancelled"],
  approved: ["cancelled"],
  declined: [],
  received: [],
  cancelled: [],
};

/** Status changes that must use a dedicated flow (sign, decline, receive). */
export const PO_STATUS_REQUIRES_DEDICATED_FLOW: Partial<
  Record<PurchaseOrderStatus, string>
> = {
  submitted: "Submit this purchase order using Sign & Submit.",
  approved: "Approve this purchase order using Sign & Approve.",
  declined: "Decline this purchase order using Decline on the order detail page.",
  received: "Fulfill this purchase order using Mark Fulfilled (updates inventory).",
};

export function isValidPoStatusTransition(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus
): boolean {
  return PO_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function dedicatedFlowMessageForStatus(
  status: PurchaseOrderStatus
): string | undefined {
  return PO_STATUS_REQUIRES_DEDICATED_FLOW[status];
}

export interface ReceiveQuantityLine {
  itemId: string;
  productName: string;
  quantity: number;
  receivedQuantity: number;
}

export function validateReceiveQuantities(lines: ReceiveQuantityLine[]): void {
  for (const line of lines) {
    if (line.receivedQuantity > line.quantity) {
      throw new Error(
        `Received quantity cannot exceed ordered quantity for ${line.productName}`
      );
    }
    if (line.receivedQuantity < 0) {
      throw new Error(`Received quantity cannot be negative for ${line.productName}`);
    }
  }
}
