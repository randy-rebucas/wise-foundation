---
slug: commissions
title: Commissions
summary: View commission lines, statuses (pending, paid, cancelled), and summaries for your organization or tenant scope.
category: people-rewards
relatedPaths:
  - /commissions
permissionsNote: ADMIN or ORG_ADMIN can view commissions (org-scoped for ORG_ADMIN). Only ADMIN can mark paid or cancel.
journeys:
  - id: commission-payout-checklist
    title: Payout checklist
    audience: ADMIN · finance
    description: Before releasing funds.
    steps:
      - title: Filter pending
        description: Isolate the payout batch window.
        href: /commissions
      - title: Cross-check orders
        description: Spot anomalies or refunds.
        href: /orders
      - title: Execute bank transfer
        description: Complete payment in your bank portal.
      - title: Mark paid in app
        description: When supported, update statuses to stay in sync.
        href: /commissions
---

## Reading the list

Each row ties to **order** context when populated. **Rate** and **amount** should match your organization’s commercial agreement.

## Status semantics

| Status | Meaning |
|--------|---------|
| pending | Accrued but not yet paid out |
| paid | Included in a payout |
| cancelled | Reversed or invalidated |

## Summaries

Summary tiles or API aggregates typically split **earned**, **pending**, and **paid**—confirm definitions with finance before external reporting.

## Related

- [Reseller sales](/help/reseller-sales) often feeds commission sources.
- [Reports](/help/reports) for period analytics.
