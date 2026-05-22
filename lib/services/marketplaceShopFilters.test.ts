import { describe, expect, it } from "vitest";
import {
  buildMarketplaceProductFilter,
  marketplaceProductSortSpec,
  normalizeShopTags,
} from "@/lib/services/marketplaceShopFilters";

describe("buildMarketplaceProductFilter", () => {
  it("keeps listing rules when search is applied", () => {
    const filter = buildMarketplaceProductFilter({ search: "serum" });
    expect(filter).toHaveProperty("$and");
    const and = (filter as { $and: Record<string, unknown>[] }).$and;
    expect(and.some((c) => c.$or && Array.isArray(c.$or))).toBe(true);
    expect(and.some((c) => c.deletedAt === null)).toBe(true);
  });

  it("adds tag and price constraints", () => {
    const filter = buildMarketplaceProductFilter({
      tags: ["Rose", "rose"],
      minPrice: 100,
      maxPrice: 500,
    });
    const and = (filter as { $and: Record<string, unknown>[] }).$and;
    expect(and).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tags: { $in: ["rose"] } }),
        expect.objectContaining({ retailPrice: { $gte: 100, $lte: 500 } }),
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
    expect(marketplaceProductSortSpec("price-low")).toEqual({ retailPrice: 1, createdAt: -1 });
    expect(marketplaceProductSortSpec("price-high")).toEqual({ retailPrice: -1, createdAt: -1 });
  });
});
