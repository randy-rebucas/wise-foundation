# Project Turnover Checklist — Glowish

Use this checklist when handing off this codebase (or a feature within it) to another developer or team. Check off each item and note anything that doesn't apply.

## 1. Access & accounts

- [ ] GitHub repo access granted (correct role: read/write/admin)
- [ ] Vercel project access granted
- [ ] MongoDB Atlas (or host) access granted, including Network Access allowlist entries
- [ ] Cloudinary account access (if used)
- [ ] PayMongo dashboard access (if payments are live)
- [ ] Resend account access (transactional email)
- [ ] Sentry project access (if error tracking configured)
- [ ] Domain registrar / DNS access for the production domain
- [ ] Any shared secrets vault (1Password, etc.) transferred

## 2. Environment & configuration

- [ ] `.env.local` (or equivalent) values shared securely — **never via plaintext chat/email**
- [ ] Required env vars confirmed against [deployment-runbook.md](./deployment-runbook.md#environment-variables): `MONGODB_URI`, `AUTH_SECRET`, `AUTH_URL`
- [ ] Optional env vars reviewed and documented for which features are enabled/disabled
- [ ] Vercel environment variables (Production/Preview/Development) match local config
- [ ] `MAINTENANCE_MODE` status confirmed (should be off unless intentional)

## 3. Codebase orientation

- [ ] Walk through [docs/README.md](./README.md) index of existing docs
- [ ] Review [architecture.md](./architecture.md)
- [ ] Review [database-schema.md](./database-schema.md)
- [ ] Review [roles-and-permissions-matrix.md](./roles-and-permissions-matrix.md) and note that `pnpm sync:roles` must run after editing `lib/permissions.ts`
- [ ] Confirm `pnpm install`, `pnpm dev`, `pnpm test`, and `pnpm build` all succeed locally
- [ ] Confirm `pnpm lint` passes

## 4. Operations

- [ ] Walk through [deployment-runbook.md](./deployment-runbook.md) end-to-end (deploy, rollback, maintenance mode)
- [ ] Confirm who/what triggers deploys (push to `main` → GitHub Actions → Vercel)
- [ ] Uptime monitor (UptimeRobot/Better Uptime) ownership transferred, alert contacts updated
- [ ] Review [backup-restore.md](./backup-restore.md); confirm the backup cron job's `MONGODB_URI` and destination are still valid, and new owner can run `pnpm db:backup:list` / `pnpm db:restore`
- [ ] Confirm who receives Sentry alerts (if configured)
- [ ] Review [data-retention-policy.md](./data-retention-policy.md)

## 5. Outstanding work

- [ ] Review [PRODUCTION_TODO.md](../PRODUCTION_TODO.md) for open items
- [ ] Review open GitHub issues/PRs and reassign as needed
- [ ] Flag any known bugs, workarounds, or tech debt not yet documented
- [ ] Note any features currently mid-implementation

## 6. Knowledge transfer

- [ ] Live walkthrough/call completed with outgoing owner (recommended, not just docs)
- [ ] Point of contact for questions established for a transition period
- [ ] Update this checklist and linked docs if anything here was inaccurate or missing

---

**Handoff completed by:** ______________________
**Handoff received by:** ______________________
**Date:** ______________________
