---
slug: dashboard
title: Administrator dashboard
summary: Tenant-wide snapshot—recent orders, members, low stock, and shortcuts into POS, products, members, and reports.
category: insights
relatedPaths:
  - /dashboard
permissionsNote: Visible to ADMIN after login.
journeys:
  - id: daily-admin-check
    title: Daily health check (about 5 minutes)
    audience: ADMIN
    description: Spot issues early.
    steps:
      - title: Open dashboard
        description: Scan KPIs vs expectations.
        href: /dashboard
      - title: Review recent orders
        description: Spot stuck or unusual statuses.
        href: /dashboard
      - title: Glance at low stock
        description: Follow up with inventory if counts spike.
        href: /inventory
---

## What you see

**KPI cards** summarize **paid-status** order revenue and counts for **today** and the **month**. **Alerts** surface low stock. **Recent orders** show a live feed of branch activity.

## Quick actions

Tiles jump to **New sale** ([POS](/help/pos)), **Add product**, **Add member**, and **Reports** without hunting the sidebar.

## Interpretation tips

- Revenue aligns with **paid / delivered / completed** style statuses configured for your tenant.
- Low stock counts depend on accurate [Inventory](/help/inventory) movements.
