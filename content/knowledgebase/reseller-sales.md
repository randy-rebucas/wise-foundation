---
slug: reseller-sales
title: Reseller sales
summary: Record sales outside standard POS flows—community or field selling that feeds commissions and org reporting.
category: sales-operations
relatedPaths:
  - /reseller-sales
permissionsNote: ADMIN or ORG_ADMIN (sidebar); APIs enforce scope.
journeys:
  - id: month-end-reseller
    title: Month-end reseller capture
    audience: ORG_ADMIN
    description: Ensure nothing is missing before payout.
    steps:
      - title: Gather offline sheets
        description: Collect partner-reported sales.
      - title: Enter reseller sales
        description: Add rows for each batch or seller.
        href: /reseller-sales
      - title: Reconcile commissions
        description: Open commissions to verify pending totals.
        href: /commissions
---

## When to use

Use **reseller sales** when revenue must be attributed to **partner** or **community** channels that do not map cleanly to a single **POS** session.

## Downstream effects

Entries can influence **commission** calculations depending on org settings. Keep **dates** and **amounts** aligned with finance policy.

## Hygiene

- Double-enter checks with paper trackers where required.
- Coordinate with [Commissions](/help/commissions) before closing a payout batch.
