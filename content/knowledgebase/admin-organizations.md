---
slug: admin-organizations
title: Organizations (admin)
summary: Tenant-level directory of distributor, franchise, partner, or headquarters organizations—with commercial and capability flags.
category: administration
relatedPaths:
  - /admin/organizations
permissionsNote: ADMIN
journeys:
  - id: onboard-partner-org
    title: Onboard a partner organization
    audience: ADMIN
    description: Commercial setup.
    steps:
      - title: Create organization
        description: Choose partner type and legal name.
        href: /admin/organizations
      - title: Commission settings
        description: Align rate with contract.
        href: /admin/organizations
      - title: Org admin user
        description: Create ORG_ADMIN linked to the org.
        href: /admin/users
      - title: Smoke test
        description: User logs in and opens My Panel.
        href: /org-panel
---

## Purpose

Organizations power **org dashboards**, **B2B** relationships, **commissions**, and **organization inventory**. **Type** drives which **My Panel** experience users see.

## Capability flags

Examples: **inventory enabled**, **commission enabled**, **can sell retail**, **can distribute**. Changes alter downstream UI—confirm with stakeholders before toggling in production.

## Data quality

Keep **legal names** and **tax identifiers** (if stored) aligned with contracts. Link the right **ORG_ADMIN** users early.

## Related

- [Org dashboard](/help/org-dashboard) for org-level KPIs.
- [Commissions](/help/commissions) for payout configuration context.
