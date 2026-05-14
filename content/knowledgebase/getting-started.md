---
slug: getting-started
title: Getting started
summary: After login you land on a route matched to your role. Use the sidebar for permitted areas and Help for documentation.
category: get-started
relatedPaths:
  - /dashboard
  - /org-dashboard
  - /org-panel
  - /pos
  - /help
journeys:
  - id: first-day-any-role
    title: First day in the app
    audience: Everyone
    description: Orient yourself regardless of role.
    steps:
      - title: Confirm you can sign in
        description: Resolve access errors with your admin if needed.
      - title: Scan the sidebar
        description: Note which areas you have—those are your working surfaces.
        href: /help/roles-permissions
      - title: Open Help
        description: Skim the article for your main job (POS, orders, members, etc.).
        href: /help
      - title: Complete one real task
        description: Example—run a test sale, look up a member, or open reports.
        href: /pos
---

## First login

Sign in with the email and password your administrator provided. If you see **access denied** or cannot reach the dashboard, your account may be inactive or your role may be restricted—contact your administrator.

## Where you land

| Role | Typical home |
|------|----------------|
| ADMIN | Main dashboard |
| ORG_ADMIN | Org dashboard or org workspace |
| BRANCH_MANAGER / STAFF | POS or branch tools |
| INVENTORY_MANAGER | Inventory-focused entry |

Your exact landing URL follows your role after authentication.

## Navigation

The **sidebar** lists only screens your permissions allow. Items you cannot use are hidden. Open **Help & guides** anytime to search articles or follow a **user journey** for your role.

## Tenant context

App name, tagline, and formatting (currency, dates) come from **tenant / organization settings** where configured. Some KPIs use server calendar boundaries; displayed timestamps may use your configured timezone.

## Related guides

- [Roles & permissions](/help/roles-permissions)
- [User journeys by role](/help/user-journeys)
- [Sign in & account](/help/login)
