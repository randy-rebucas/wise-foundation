import { describe, expect, it } from "vitest";
import {
  dedicatedFlowMessageForStatus,
  isValidPoStatusTransition,
  validateReceiveQuantities,
} from "@/lib/purchaseOrders/statusTransitions";
import type { PurchaseOrderStatus } from "@/types";

describe("isValidPoStatusTransition", () => {
  it("allows draft to submitted or cancelled", () => {
    expect(isValidPoStatusTransition("draft", "submitted")).toBe(true);
    expect(isValidPoStatusTransition("draft", "cancelled")).toBe(true);
    expect(isValidPoStatusTransition("draft", "approved")).toBe(false);
  });

  it("allows submitted to approved, declined, or cancelled", () => {
    expect(isValidPoStatusTransition("submitted", "approved")).toBe(true);
    expect(isValidPoStatusTransition("submitted", "declined")).toBe(true);
    expect(isValidPoStatusTransition("submitted", "received")).toBe(false);
  });

  it("does not allow approved to received via PATCH", () => {
    expect(isValidPoStatusTransition("approved", "received")).toBe(false);
  });

  it("blocks terminal states", () => {
    const terminal: PurchaseOrderStatus[] = ["declined", "received", "cancelled"];
    for (const status of terminal) {
      expect(isValidPoStatusTransition(status, "draft")).toBe(false);
    }
  });
});

describe("dedicatedFlowMessageForStatus", () => {
  it("requires dedicated flows for submit, approve, decline, receive", () => {
    expect(dedicatedFlowMessageForStatus("submitted")).toContain("Sign & Submit");
    expect(dedicatedFlowMessageForStatus("approved")).toContain("Sign & Approve");
    expect(dedicatedFlowMessageForStatus("declined")).toContain("Decline");
    expect(dedicatedFlowMessageForStatus("received")).toContain("Mark Fulfilled");
    expect(dedicatedFlowMessageForStatus("cancelled")).toBeUndefined();
  });
});

describe("validateReceiveQuantities", () => {
  it("rejects over-receipt", () => {
    expect(() =>
      validateReceiveQuantities([
        {
          itemId: "1",
          productName: "Widget",
          quantity: 5,
          receivedQuantity: 6,
        },
      ])
    ).toThrow(/cannot exceed ordered quantity/);
  });

  it("allows partial and full receipt", () => {
    expect(() =>
      validateReceiveQuantities([
        { itemId: "1", productName: "A", quantity: 10, receivedQuantity: 3 },
        { itemId: "2", productName: "B", quantity: 2, receivedQuantity: 2 },
      ])
    ).not.toThrow();
  });

  it("rejects negative received quantity", () => {
    expect(() =>
      validateReceiveQuantities([
        { itemId: "1", productName: "Widget", quantity: 5, receivedQuantity: -1 },
      ])
    ).toThrow(/cannot be negative/);
  });
});
