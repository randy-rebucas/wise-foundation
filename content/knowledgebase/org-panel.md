---
slug: org-panel
title: My Panel (organization workspace)
summary: Type-specific workspace—inventory + B2B for distributors, sales for franchises, commissions for partners.
category: sales-operations
relatedPaths:
  - /org-panel
permissionsNote: ORG_ADMIN; order actions also require manage:orders where applicable.
journeys:
  - id: distributor-b2b-approval
    title: Process a B2B order (distributor)
    audience: ORG_ADMIN
    description: From intake to paid.
    steps:
      - title: Open My Panel
        description: Locate Distribution Orders (B2B).
        href: /org-panel
      - title: Pending
        description: Approve legitimate orders or cancel invalid ones.
        href: /org-panel
      - title: Approved
        description: Mark paid when payment is confirmed.
        href: /org-panel
---

## Distributor / headquarters

- **Organization inventory** table with **low stock** highlights (typical threshold ≤ 5 units—align with ops policy).
- **B2B orders** list with status controls where your permissions allow (**pending** → **approved** / **cancelled**; **approved** → **paid**).

## Franchise

- KPIs from **recent orders** on the loaded page; **Reseller sales** and **Commissions** quick links.
- Use [POS](/help/pos) for counter sales; use [Reseller sales](/help/reseller-sales) for community-style capture.

## Partner

- **Commission earned**, **pending payout**, **paid out** summaries.
- **Recent orders** and **commission history** tables with links to full [Commissions](/help/commissions).

## API alignment

Inventory list uses your **session organization** even if a query parameter is present in the client. Orders are **organization-scoped** for ORG_ADMIN when listing from the API.
