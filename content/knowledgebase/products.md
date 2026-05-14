---
slug: products
title: Products
summary: Maintain the product catalog—SKUs, pricing, categories, and assets used at POS and in inventory.
category: catalog-stock
relatedPaths:
  - /products
permissionsNote: manage:products
journeys:
  - id: launch-sku
    title: Launch a new SKU
    audience: INVENTORY_MANAGER · ADMIN
    description: From idea to sellable.
    steps:
      - title: Create product
        description: Define name, SKU, category, and prices.
        href: /products
      - title: Stock in
        description: Receive or adjust inventory to non-zero if needed.
        href: /inventory
      - title: Verify POS
        description: Confirm the item is searchable at POS.
        href: /pos
---

## Catalog hygiene

- Keep **SKUs** unique and stable for integrations.
- Align **retail** vs **distributor** price fields with how your org sells.
- Use clear **names** and images for faster checkout search.

## Creating products

Use **Add product** from the admin dashboard quick actions or the products screen. Complete required fields before stocking.

## Images

If **Cloudinary** or similar is configured, follow your tenant’s image size and naming standards—broken images slow down POS browsing.

## Related

- [Inventory](/help/inventory) for on-hand quantities.
- [Purchase orders](/help/purchase-orders) for inbound costing.
