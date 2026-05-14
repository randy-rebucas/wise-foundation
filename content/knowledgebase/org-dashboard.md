---
slug: org-dashboard
title: Organization dashboard
summary: Org-wide KPIs for organization admins—sales, commissions or pending orders, inventory, and recent orders involving your org.
category: insights
relatedPaths:
  - /org-dashboard
permissionsNote: ORG_ADMIN with an assigned organization.
journeys:
  - id: weekly-org-review
    title: Weekly org review
    audience: ORG_ADMIN
    description: Short cycle to keep org metrics honest.
    steps:
      - title: Org dashboard
        description: Compare week-over-week mentally or in reports.
        href: /org-dashboard
      - title: My Panel
        description: Drill into inventory or B2B queues by org type.
        href: /org-panel
      - title: Commissions or reports
        description: Close the loop with finance views.
        href: /commissions
---

## KPI cards

**Today** and **monthly revenue** reflect orders in **paid** statuses where your organization is the **seller** (including `sellerOrganizationId` / `organizationId` scoping used by the API).

**Pending orders** include **pending** and **approved** statuses for orders where your org participates as buyer or seller.

## Capability toggles

When **commission** is enabled for your org, a **commission** card surfaces. When **inventory** is enabled, **inventory units** and **low stock** counts appear; otherwise a **total orders** style fallback may show.

## Quick links

Tiles point to [My Panel](/help/org-panel), [Reseller sales](/help/reseller-sales), [Commissions](/help/commissions), and [Reports](/help/reports). You still need underlying **permissions** to use each destination.

## Time zones

KPI **windows** (start of day / month) follow **server calendar** boundaries; **display** times on orders may use tenant timezone settings—align finance close with your policy.
