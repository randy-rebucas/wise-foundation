---
slug: inventory
title: Inventory
summary: Branch stock levels, movements, and alerts that feed low-stock signals on dashboards.
category: catalog-stock
relatedPaths:
  - /inventory
permissionsNote: manage:inventory
journeys:
  - id: stock-count-day
    title: Stock count day
    audience: INVENTORY_MANAGER
    description: Physical count alignment.
    steps:
      - title: Pause chaotic moves
        description: Freeze large transfers during count if policy requires.
      - title: Count and record
        description: Adjust inventory to counted quantities.
        href: /inventory
      - title: Report
        description: Run variance reports if available.
        href: /reports
---

## Daily use

Review **on-hand** quantities, resolve **negative** stock investigations, and record **adjustments** with clear reasons. Tie receipts to **purchase orders** when stock arrives.

## Alerts

**Dashboard** low-stock signals depend on accurate counts here—fix root causes, not only symptoms.

## Movements

Track **IN**, **OUT**, **TRANSFER**, and **ADJUSTMENT** style movements per your deployment. Transfers may require both branches’ context.

## Related

- [Products](/help/products) for SKU master data.
- [Purchase orders](/help/purchase-orders) for inbound.
