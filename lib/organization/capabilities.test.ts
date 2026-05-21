import { describe, expect, it } from "vitest";
import { resolveOrgCapabilities } from "@/lib/organization/capabilities";

describe("resolveOrgCapabilities", () => {
  it("distributor uses organization inventory, no POS", () => {
    const caps = resolveOrgCapabilities({ type: "distributor", settings: {} });
    expect(caps.inventorySurface).toBe("organization");
    expect(caps.posSurface).toBe("none");
  });

  it("franchise uses branch inventory and POS", () => {
    const caps = resolveOrgCapabilities({ type: "franchise", settings: {} });
    expect(caps.inventorySurface).toBe("branch");
    expect(caps.posSurface).toBe("branch");
  });

  it("partner has POS but no inventory surface", () => {
    const caps = resolveOrgCapabilities({ type: "partner", settings: {} });
    expect(caps.inventorySurface).toBe("none");
    expect(caps.posSurface).toBe("branch");
  });

  it("respects per-org setting overrides", () => {
    const caps = resolveOrgCapabilities({
      type: "distributor",
      settings: { canSellRetail: true, hasInventory: true },
    });
    expect(caps.inventorySurface).toBe("branch");
    expect(caps.posSurface).toBe("branch");
  });
});
