---
slug: online-store
title: Online store (marketplace)
summary: Public customer storefront linked from the dashboard—catalog, cart, checkout, and how it ties to inventory and SEO.
category: sales-operations
relatedPaths:
  - /
  - /shop
  - /products
  - /settings
---

## Opening the store

Any authenticated dashboard user can open **Online store** in the sidebar. It opens the **public storefront** in a new context (same tenant branding as configured in Settings).

Customers shop at your deployed site URL (`NEXT_PUBLIC_APP_URL` in production).

## What customers see

- **Home** and **Shop** — Browse listed products (search, categories).
- **Product pages** — `/product/{slug}` for items marked **List on marketplace** in the catalog.
- **Cart & checkout** — Not indexed by search engines; require customer sign-in or guest flow per your checkout setup.
- Static pages such as **About**, **Contact**, **Categories**, and **Reviews** when enabled in the theme.

## Staff responsibilities

| Task | Where |
|------|--------|
| List products for sale online | Products → edit → **List on marketplace** |
| Product SEO for search/social | Products → edit → **SEO** section |
| Site-wide SEO defaults | Settings → Application → **Storefront SEO** |
| Which branch fulfills web orders | Settings → Application → **Marketplace fulfillment branch** |
| Stock shown online | Inventory at the fulfillment branch |

Online orders deduct inventory from the **marketplace fulfillment branch** (head office if unset).

## Branding

Store name, logo, tagline, and default meta/social images come from **Settings → Application**. Changes apply to the storefront after save and refresh.

## Related

- [Products](/help/products)
- [Storefront SEO](/help/storefront-seo)
- [Settings](/help/settings)
- [Orders](/help/orders) — Includes marketplace orders in staff views where permitted
