import { describe, expect, it } from "vitest";
import { buildMarketplaceGalleryImages, dedupeImageUrls } from "@/lib/products/galleryImages";

describe("dedupeImageUrls", () => {
  it("trims and removes duplicates", () => {
    expect(dedupeImageUrls([" /a ", "/a", "/b", "", null])).toEqual(["/a", "/b"]);
  });
});

describe("buildMarketplaceGalleryImages", () => {
  it("uses product images when variant has none", () => {
    expect(buildMarketplaceGalleryImages(["/p1", "/p2"], [])).toEqual(["/p1", "/p2"]);
  });

  it("puts variant images first then unique product images", () => {
    expect(buildMarketplaceGalleryImages(["/p1", "/p2"], ["/v1", "/p1"])).toEqual([
      "/v1",
      "/p1",
      "/p2",
    ]);
  });
});
