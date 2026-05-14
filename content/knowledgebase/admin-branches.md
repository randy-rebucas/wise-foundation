---
slug: admin-branches
title: Branches (admin)
summary: Create and maintain branch records—foundation for POS, inventory, and user assignments.
category: administration
relatedPaths:
  - /admin/branches
permissionsNote: manage:branches
journeys:
  - id: open-new-store
    title: Open a new store location
    audience: ADMIN
    description: Provisioning checklist.
    steps:
      - title: Create branch
        description: Record address, codes, and timezone if captured.
        href: /admin/branches
      - title: Users
        description: Assign managers and staff with correct branch IDs.
        href: /admin/users
      - title: Stock baseline
        description: Seed inventory or initial transfer.
        href: /inventory
      - title: Smoke test POS
        description: Run a test sale per policy.
        href: /pos
---

## Model

Branches represent **physical or logical** selling locations. Users carry **branchIds** that scope POS, orders, and inventory APIs.

## Changes

Renaming is low risk; **deactivating** or **deleting** branches can affect **historical reporting**—coordinate with finance before archival.

## Related

- [Users & team](/help/admin-users-team) for assignments.
- [POS](/help/pos) for branch smoke tests.
