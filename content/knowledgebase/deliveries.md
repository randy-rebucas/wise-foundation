---
slug: deliveries
title: Deliveries
summary: HQ fulfillment queue for approved purchase orders ready to ship or receive—separate from the customer online store.
category: catalog-stock
relatedPaths:
  - /deliveries
  - /purchase-orders
permissionsNote: Platform ADMIN only (hidden for org-bound and distributor accounts).
---

## Purpose

**Deliveries** is the headquarters view of **approved** purchase orders that need fulfillment—moving B2B stock to distributors, franchises, or partners.

Distributor org admins **do not** see this menu; they use **Purchase Orders** and **My Panel** instead.

## Workflow

1. A purchase order reaches **Approved** status.
2. It appears on **Deliveries** (status **To fulfill**).
3. HQ staff open the PO and use **Mark Fulfilled** (database status **`received`**; UI may show “Fulfilled”).

## vs online store

| Deliveries | Online store |
|------------|----------------|
| B2B / org purchase orders | Customer marketplace checkout |
| HQ ADMIN navigation | Public `/shop` and `/product/...` |
| Inventory via PO fulfillment | Inventory via **marketplace fulfillment branch** |

## Related

- [Purchase orders](/help/purchase-orders)
- [Purchase order detail](/help/purchase-order-detail)
- [Roles & permissions](/help/roles-permissions) — Who sees Deliveries
- [Online store](/help/online-store) — Customer-facing channel
