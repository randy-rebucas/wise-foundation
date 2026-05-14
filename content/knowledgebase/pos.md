---
slug: pos
title: Point of sale (POS)
summary: Ring up sales—cart, discounts, member attach, payment, and checkout to create orders.
category: sales-operations
relatedPaths:
  - /pos
permissionsNote: use:pos
journeys:
  - id: standard-retail-sale
    title: Standard retail sale
    audience: STAFF · BRANCH_MANAGER
    description: Happy-path checkout.
    steps:
      - title: New sale
        description: Clear cart if needed; scan or search products.
        href: /pos
      - title: Member
        description: Attach member before totals finalize if required.
        href: /pos
      - title: Pay
        description: Enter tender; confirm change for cash.
        href: /pos
      - title: Verify order
        description: Confirm the order appears in Orders.
        href: /orders
---

## Before you start

Confirm **branch** context if your user has multiple branches. Ensure **products** and **prices** match the member tier when **member pricing** applies.

## Checkout flow

1. Add **line items**.
2. Apply **discounts** if policy allows.
3. **Attach member** when the sale should accrue to an account.
4. Capture **payment** (cash, card, GCash, etc.).
5. **Complete checkout** to create an **order** record.

## After the sale

Use [Orders](/help/orders) for lookups, receipts, or permitted adjustments. Keep **payment method** and **amounts** aligned with audit policy.

## Troubleshooting

| Issue | Check |
|-------|--------|
| Product missing | [Products](/help/products) catalog and branch availability |
| Price wrong | Member tier, discounts, tax settings |
| Cannot complete | Network, permissions, or stock constraints |
