---
slug: products
title: Products
summary: Maintain the catalog—SKUs, pricing, variants, marketplace listing, SEO, and images for POS and the online store.
category: catalog-stock
relatedPaths:
  - /products
  - /media
permissionsNote: manage:products
journeys:
  - id: launch-sku
    title: Launch a new SKU
    audience: INVENTORY_MANAGER · ADMIN
    description: From idea to sellable online and in-store.
    steps:
      - title: Create product
        description: Name, SKU, category, prices, and optional SEO.
        href: /products
      - title: Add images
        description: Upload or pick from the media library.
        href: /media
      - title: List on marketplace
        description: Enable marketplace listing for the public shop.
        href: /products
      - title: Stock in
        description: Receive or adjust inventory at the fulfillment branch.
        href: /inventory
      - title: Verify POS
        description: Confirm the item is searchable at POS.
        href: /pos
---

## Catalog hygiene

- Keep **SKUs** unique and stable for integrations.
- Align **retail** vs **distributor** price fields with how your org sells.
- Use clear **names** and images for faster checkout search and better storefront SEO.

## Creating and editing products

Use **Add product** or open an existing row. Required fields must be complete before stocking or listing online.

### Marketplace

- **List on marketplace** — When enabled, the product can appear on the public **Online store**, `/shop`, and in `/sitemap.xml`.
- Stock shown online comes from the branch configured as **marketplace fulfillment** in Settings → Application.

### SEO (optional)

Overrides for search and social sharing on the product page:

| Field | Limit | Fallback |
|-------|-------|----------|
| SEO title | 70 characters | Product name + application name |
| SEO meta description | 160 characters | Short description (plain text sent to search engines) |

Site-wide defaults are set under **Settings → Application → Storefront SEO** — see [Storefront SEO](/help/storefront-seo).

### Variants

Products can have **variants** (size, shade, etc.) with their own SKU, price, images, and stock. Variant stock counts toward availability on the product page.

## Images

- Attach images on the product form or reuse assets from **Media**.
- With **Cloudinary** configured, uploads are hosted remotely; otherwise files use server storage (`public/uploads` when using local mode).
- Broken or missing images hurt POS search and storefront presentation.

## Related

- [Media library](/help/media)
- [Inventory](/help/inventory)
- [Online store](/help/online-store)
- [Storefront SEO](/help/storefront-seo)
- [Purchase orders](/help/purchase-orders)
