---
slug: login
title: Sign in & account
summary: Credentials flow, common errors, and how sign-in relates to dashboard access.
category: get-started
relatedPaths:
  - /login
permissionsNote: Unauthenticated users only see the login route until access succeeds.
---

## Credentials

Use the **email** and **password** issued by your administrator. Passwords are checked server-side; failed attempts return a generic error—avoid sharing accounts.

## After successful sign-in

You are redirected after sign-in to the URL in `callbackUrl`, or by default to the **dashboard**. The public **shop** lives at `/` for guests. If **maintenance mode** is on, you may be redirected to the maintenance page instead.

## Common issues

| Symptom | What to check |
|---------|----------------|
| Access denied | Role blocked from dashboard, or inactive user |
| Wrong landing page | Check `callbackUrl`; default is the dashboard, not the public shop at `/` |
| Forgot password | Use your org’s reset process if implemented; otherwise ask an admin |

## Security habits

- Sign out from the **sidebar** on shared terminals.
- Do not store passwords in browser autofill on public devices if policy forbids it.

## Next steps

Open [Getting started](/help/getting-started) once you reach the dashboard.
