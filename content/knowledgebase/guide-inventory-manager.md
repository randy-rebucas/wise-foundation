---
slug: guide-inventory-manager
title: "Complete guide: Inventory manager (INVENTORY_MANAGER)"
summary: Full walkthrough for stock & catalog staff—products, inventory, purchase orders, and stock reports.
category: user-journeys
relatedPaths:
  - /products
  - /inventory
  - /purchase-orders
  - /reports
permissionsNote: "INVENTORY_MANAGER default permissions: manage:products, manage:inventory, view:reports. No POS or member access by default."
journeys:
  - id: inventory-manager-daily
    title: Inventory manager—daily run
    audience: INVENTORY_MANAGER
    description: Maintain accurate on-hand and inbound stock.
    steps:
      - title: Products
        description: Keep SKUs, costs, and catalog metadata current.
        href: /products
      - title: Inventory
        description: Adjust levels, review movements, resolve variances.
        href: /inventory
      - title: Purchase orders
        description: Draft, submit, and receive inbound shipments.
        href: /purchase-orders
      - title: Reports
        description: Use stock views before audits.
        href: /reports
---

## Who this is for

You maintain the **catalog and stock**—not sales or members. Your default permissions cover products, inventory, and reports only.

## What you can access

| Area | Path | Notes |
|------|------|-------|
| Products | `/products` | SKUs, pricing, catalog metadata |
| Media | `/media` | Product images |
| Inventory | `/inventory` | Stock levels, adjustments, movements |
| Purchase Orders | `/purchase-orders` | Draft, submit, receive |
| Reports | `/reports` | Stock-focused views |
| Settings | `/settings` | Profile, security, read-only account |

You do **not** see POS, Orders, Members, Dashboard, Org Dashboard/My Panel, or any admin (Organizations, Users, Reviews, Ads, Blog, Backup, Audit Log) screens.

## Daily loop

1. **Products** — keep SKUs, costs, and catalog metadata current before variance shows up downstream.
2. **Inventory** — adjust levels, review recent movements, and resolve variances between counted and recorded stock.
3. **Purchase Orders** — draft and submit orders for inbound shipments; mark them **received** once stock physically arrives, which updates on-hand counts.
4. **Reports** — use stock views ahead of physical audits or cycle counts.

## Purchase order workflow

**Draft → submitted → approved → received** (or **declined/cancelled**). You can create/edit drafts, submit for approval, and receive approved orders. Approval itself is handled by HQ ADMIN or, for organization-scoped orders, ORG_ADMIN. Full detail: [Purchase orders](/help/purchase-orders).

## Products

Every product needs accurate cost and price data for inventory valuation and POS to work correctly downstream. See [Products](/help/products) for catalog fields, marketplace listing, and per-product SEO (SEO fields are editable but only matter if the storefront is live).

## Media

Product images live in the shared [Media library](/help/media)—reuse existing uploads where possible rather than re-uploading duplicates.

## If something is missing

You will not see POS or Members even though your role touches stock that POS consumes—that's by design; coordinate with **STAFF** or **BRANCH_MANAGER** for anything that requires ringing up a sale or handling a member record.

## Related guides

- [Products](/help/products)
- [Inventory](/help/inventory)
- [Purchase orders](/help/purchase-orders)
- [Media library](/help/media)
- [Roles & permissions](/help/roles-permissions)
