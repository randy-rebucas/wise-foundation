---
slug: members
title: Members
summary: Customer or distributor member profiles—used at POS, for pricing tiers, and in order history.
category: people-rewards
relatedPaths:
  - /members
permissionsNote: manage:members
journeys:
  - id: member-pos-link
    title: Member checkout journey
    audience: STAFF
    description: Attach the right person at POS.
    steps:
      - title: Search member
        description: Use phone or name as available.
        href: /members
      - title: Open POS
        description: Attach before finalizing line items if pricing depends on it.
        href: /pos
      - title: Complete sale
        description: Confirm member appears on the order record.
        href: /orders
---

## Onboarding

Collect accurate **contact** data and any **sponsor** or **organization** linkage required for pricing. Use consistent **email** formatting to reduce duplicates.

## Status

**active**, **inactive**, or **suspended** (per your schema)—suspended members should not accrue new sales until policy clears them.

## At POS

Train staff to **search** before creating duplicates. Member attach affects **reports** and **commissions** downstream.

## Privacy

Handle personal data per your jurisdiction (consent, retention, export/deletion requests).
