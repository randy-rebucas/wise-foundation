import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
import { getPurchaseOrderDiscountForOrgType } from "@/lib/purchaseOrders/orgTypeDiscountDefaults";
import { resolvePurchaseOrderDiscountPercent } from "@/lib/purchaseOrders/discount.server";
import { DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE } from "@/lib/purchaseOrders/orgTypeDiscountDefaults";
import type { SessionUser } from "@/types";

const mockFindFirst = vi.fn();
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    organization: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/services/appSettings.service", () => ({
  getPurchaseOrderDiscountByOrgType: vi.fn().mockResolvedValue({
    distributor: 15,
    franchise: 10,
    partner: 5,
    headquarters: 0,
  }),
}));

const orgAdmin: SessionUser = {
  id: "u1",
  name: "Org Admin",
  email: "org@example.com",
  role: "ORG_ADMIN",
  permissions: ["submit:org_orders"],
  branchIds: [],
  organizationId: "org1",
};

const admin: SessionUser = {
  id: "a1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN",
  permissions: [],
  branchIds: [],
};

describe("getPurchaseOrderDiscountForOrgType", () => {
  it("returns configured percent for distributor", () => {
    const map = { ...DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE, distributor: 20 };
    expect(getPurchaseOrderDiscountForOrgType("distributor", map)).toBe(20);
  });

  it("returns 0 for unknown type", () => {
    expect(
      getPurchaseOrderDiscountForOrgType("unknown", DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE)
    ).toBe(0);
  });
});

describe("resolvePurchaseOrderDiscountPercent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue({ type: "distributor" });
  });

  it("forces org-type default for non-admin regardless of request", async () => {
    const pct = await resolvePurchaseOrderDiscountPercent({
      organizationId: "org-uuid-1",
      requestedPercent: 50,
      user: orgAdmin,
    });
    expect(pct).toBe(15);
  });

  it("allows admin to override with requested percent", async () => {
    const pct = await resolvePurchaseOrderDiscountPercent({
      organizationId: "org-uuid-1",
      requestedPercent: 25,
      user: admin,
    });
    expect(pct).toBe(25);
  });

  it("keeps existing percent for admin when no request", async () => {
    const pct = await resolvePurchaseOrderDiscountPercent({
      organizationId: "org-uuid-1",
      existingPercent: 12,
      user: admin,
    });
    expect(pct).toBe(12);
  });

  it("throws when organization is missing", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(
      resolvePurchaseOrderDiscountPercent({
        organizationId: "org-uuid-1",
        user: admin,
      })
    ).rejects.toThrow("Organization not found");
    expect(mockFindFirst).toHaveBeenCalled();
  });
});
