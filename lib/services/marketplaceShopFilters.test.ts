import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import {
  buildMarketplaceProductFilter,
  marketplaceProductSortSpec,
  normalizeShopTags,
} from "@/lib/services/marketplaceShopFilters";

describe("buildMarketplaceProductFilter", () => {
  it("keeps listing rules when search is applied", () => {
    const filter = buildMarketplaceProductFilter({ search: "serum" });
    expect(filter).toHaveProperty("AND");
    const and = (filter as { AND: Prisma.ProductWhereInput[] }).AND;
    expect(and.some((c) => c.OR && Array.isArray(c.OR))).toBe(true);
    expect(and.some((c) => c.deletedAt === null)).toBe(true);
  });

  it("adds tag and price constraints", () => {
    const filter = buildMarketplaceProductFilter({
      tags: ["Rose", "rose"],
      minPrice: 100,
      maxPrice: 500,
    });
    const and = (filter as { AND: Prisma.ProductWhereInput[] }).AND;
    expect(and).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tags: { hasSome: ["rose"] } }),
        expect.objectContaining({ retailPrice: { gte: 100, lte: 500 } }),
      ])
    );
  });
});

describe("normalizeShopTags", () => {
  it("dedupes case-insensitively", () => {
    expect(normalizeShopTags(["Aloe", "aloe", ""])).toEqual(["aloe"]);
  });
});

describe("marketplaceProductSortSpec", () => {
  it("maps price sorts", () => {
    expect(marketplaceProductSortSpec("price-low")).toEqual([{ retailPrice: "asc" }, { createdAt: "desc" }]);
    expect(marketplaceProductSortSpec("price-high")).toEqual([{ retailPrice: "desc" }, { createdAt: "desc" }]);
  });
});
