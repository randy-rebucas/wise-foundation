---
slug: purchase-orders
title: Purchase orders
summary: Create and track inbound POs from draft through received—procurement linked to inventory.
category: catalog-stock
relatedPaths:
  - /purchase-orders
permissionsNote: manage:inventory
journeys:
  - id: replenish-branch
    title: Replenish a branch
    audience: INVENTORY_MANAGER
    description: From PO to shelf.
    steps:
      - title: Draft PO
        description: Add lines for supplier SKUs and quantities.
        href: /purchase-orders
      - title: Submit and approve
        description: Follow internal approval rules.
        href: /purchase-orders
      - title: Receive
        description: Mark received when shipment arrives.
        href: /purchase-orders
      - title: Verify inventory
        description: Confirm on-hand increased.
        href: /inventory
---

## Lifecycle

Typical states: **draft** → **submitted** → **approved** → **received** (with **cancelled** as an exception path). Exact labels match your database enums.

## List page

Use filters and search to find **open** POs. Open a row to reach the **[PO detail](/help/purchase-order-detail)** screen for line-level receiving.

## Receiving

Completing **receive** flows should increase **on-hand** inventory. If counts do not move, verify **branch** context and **product** mapping on each line.

## Related

- [Purchase order detail](/help/purchase-order-detail) for line items and receiving UI.
- [Inventory](/help/inventory) for adjustments after variance.
