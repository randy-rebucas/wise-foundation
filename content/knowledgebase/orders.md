---
slug: orders
title: Orders
summary: Search and manage orders from POS, B2B, and other channels—filters, status transitions, and scope by branch or organization.
category: sales-operations
relatedPaths:
  - /orders
permissionsNote: manage:orders, or member-scoped history where enabled
journeys:
  - id: resolve-stuck-order
    title: Resolve a stuck order
    audience: BRANCH_MANAGER · ORG_ADMIN
    description: Clear blockers on payment or approval.
    steps:
      - title: Find the order
        description: Search by number or filter pending.
        href: /orders
      - title: Verify facts
        description: Confirm payment received or stock allocated.
      - title: Apply allowed transition
        description: Move status forward or cancel per policy.
        href: /orders
---

## Order channels (type)

| Type | Source |
|------|--------|
| **POS** | In-store checkout |
| **B2B** | Organization B2B sales (org panel / approvals) |
| **DISTRIBUTOR** | Distributor-channel orders |
| **MARKETPLACE** | Public **online store** checkout (shipping address on the order detail) |

Configure listing and fulfillment for marketplace orders under [Online store](/help/online-store) and [Settings](/help/settings).

## List and filters

Filter by **status**, **branch**, **type**, or **date** when the UI exposes them. **ORG_ADMIN** listings are scoped to orders involving their **organization** (buyer, seller, or legacy org field—per API rules).

## Status model (reference)

| Status | Typical meaning |
|--------|-----------------|
| pending | Awaiting approval or payment |
| approved | Approved; may await payment |
| paid | Payment captured |
| delivered | Out for delivery / receipt recorded |
| completed | Closed successful sale |
| cancelled | Voided before completion |
| refunded | Money returned per policy |

Valid **transitions** are enforced **server-side** (for example you cannot skip from **pending** to **completed** without intermediate states).

## Delivery metadata

Some transitions to **delivered** require **delivery receipt** fields—have paperwork ready before updating status.

## Related

- [POS](/help/pos) creates many branch orders.
- [Online store](/help/online-store) — customer **MARKETPLACE** orders.
- [Purchase order detail](/help/purchase-order-detail) for procurement, not customer orders.
