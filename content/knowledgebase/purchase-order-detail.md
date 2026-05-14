---
slug: purchase-order-detail
title: Purchase order detail
summary: Single-PO view—status, supplier, lines, received quantities, and actions to progress receiving.
category: catalog-stock
relatedPaths:
  - /purchase-orders
permissionsNote: manage:inventory
---

## Opening a PO

From **[Purchase orders](/help/purchase-orders)**, select a PO to open `/purchase-orders/[id]`. Bookmark important PO numbers for receiving dock staff.

## Line items

Each line shows **ordered quantity**, **received quantity** (where tracked), **unit cost**, and **product** identity. Partial receives are common—update received counts honestly.

## Status actions

Buttons or dialogs depend on current **status** and your permissions. Typical progression:

1. **Draft** — edit lines freely where allowed.
2. **Submitted / approved** — procurement acceptance.
3. **Received** — stock should reflect received totals.

## Reconciliation

After receive, spot-check **[Inventory](/help/inventory)** for the affected SKUs. Investigate discrepancies immediately.

## Troubleshooting

| Issue | Action |
|-------|--------|
| Cannot receive | Status may not be approved; check permissions |
| Wrong branch | Confirm PO organization / branch fields |
| Cost mismatch | Align with supplier invoice before locking |
