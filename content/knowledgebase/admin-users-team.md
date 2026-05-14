---
slug: admin-users-team
title: Users & team (admin)
summary: ADMIN uses Users; ORG_ADMIN uses Team to provision people, roles, and branch or organization linkage.
category: administration
relatedPaths:
  - /admin/users
permissionsNote: manage:users (ORG_ADMIN team) or ADMIN for all users
journeys:
  - id: hire-staff
    title: Hire a cashier
    audience: BRANCH_MANAGER · ADMIN
    description: Safe onboarding.
    steps:
      - title: Create user
        description: Choose STAFF or appropriate role.
        href: /admin/users
      - title: Branches
        description: Attach branch IDs they may work in.
        href: /admin/branches
      - title: Train POS
        description: Shadow shifts with a manager.
        href: /pos
---

## Invites and activation

Create users with correct **role**, **branchIds**, and **organizationId** when applicable. **Inactive** users cannot sign in.

## Least privilege

Grant the **minimum** permissions needed. Merge org defaults with per-user extras documented in [Roles & permissions](/help/roles-permissions).

## Separation

- **ADMIN** path `/admin/users` for tenant-wide user admin.
- **ORG_ADMIN** may use the same path label **Team** in the sidebar with narrower scope.

## Related

- [Organizations](/help/admin-organizations) when linking ORG_ADMIN users.
