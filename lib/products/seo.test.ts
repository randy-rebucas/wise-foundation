import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/appSettings.service", () => ({
  getPublicAppSettings: vi.fn(),
}));

import { buildProductJsonLd } from "@/lib/products/seo";

describe("buildProductJsonLd availability", () => {
  const product = {
    name: "Serum",
    slug: "serum",
    retailPrice: 499,
    images: [],
  };

  it("marks in stock when stock is positive", () => {
    const json = buildProductJsonLd(product, {
      appName: "Test Shop",
      siteUrl: "https://shop.example.com",
      currency: "PHP",
      stock: 3,
    });
    expect(json.offers.availability).toBe("https://schema.org/InStock");
  });

  it("marks out of stock when stock is zero", () => {
    const json = buildProductJsonLd(product, {
      appName: "Test Shop",
      siteUrl: "https://shop.example.com",
      currency: "PHP",
      stock: 0,
    });
    expect(json.offers.availability).toBe("https://schema.org/OutOfStock");
  });
});
