---
slug: reports
title: Reports
summary: Analytical views and exports for sales, stock, and operational KPIs—scope follows permissions and branch or org assignments.
category: insights
relatedPaths:
  - /reports
permissionsNote: view:reports
journeys:
  - id: monthly-close
    title: Monthly management review
    audience: BRANCH_MANAGER · ADMIN
    description: Structured review using reports.
    steps:
      - title: Sales report
        description: Lock the month date range.
        href: /reports
      - title: Inventory snapshot
        description: Note shrink and top movers.
        href: /reports
      - title: Actions
        description: Create POs or promotions from findings.
        href: /purchase-orders
---

## Choosing a report

Start from the **business question** (period close, branch comparison, slow movers) then pick the closest built-in view. **Narrow date ranges** first for faster loads.

## Exports

When **CSV** (or similar) export exists, download immediately after applying filters so the file matches on-screen results.

## Scope

**Branch** users see branch-scoped data; **ORG_ADMIN** may see org-scoped slices; **ADMIN** may see tenant-wide views depending on report implementation.

## Related

- [Dashboard](/help/dashboard) for at-a-glance KPIs.
- [Commissions](/help/commissions) for payout-focused numbers.
