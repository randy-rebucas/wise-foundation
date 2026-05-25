# Deployment Runbook — Glowish

## Environment variables

### Required (server will refuse to start without these)

| Variable | Description |
|---|---|
| `MONGODB_URI` | Full MongoDB connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/glowish` |
| `AUTH_SECRET` | 32+ char random secret — `openssl rand -hex 32` |
| `AUTH_URL` | Public base URL used by NextAuth for callbacks, e.g. `https://your-store.com` |

### Optional (features degrade gracefully if absent)

| Variable | Feature | Default behaviour if unset |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Canonical URLs, OG tags, verification links | Logs a warning; localhost used |
| `CLOUDINARY_URL` | Image uploads (production) | Falls back to local `public/uploads/` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Alt Cloudinary config | Same as above |
| `PAYMONGO_SECRET_KEY` | Card / GCash payments | Payment methods hidden |
| `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY` | Client-side tokenisation | Same as above |
| `RESEND_API_KEY` | Transactional email | Email verification skipped; users auto-verified |
| `EMAIL_FROM` | Sender address shown to recipients | Derived from `NEXT_PUBLIC_APP_URL` |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking | Errors logged to stdout only |
| `SENTRY_DSN` | Server-only Sentry DSN | Same as above |
| `SENTRY_AUTH_TOKEN` | Source map upload during CI | Source maps not uploaded |
| `LOG_LEVEL` | Pino log level (`debug`/`info`/`warn`/`error`) | `debug` in dev, `info` in prod |
| `MAINTENANCE_MODE` | Block all users with maintenance page | Off |
| `NEXT_PUBLIC_APP_NAME` | Displayed app name | `Glowish` |

---

## Initial deploy (first time)

1. **Create MongoDB cluster** (Atlas or self-hosted replica set).
2. **Create database user** with `readWrite` on the `glowish` database.
3. **Allowlist Vercel egress IPs** in Atlas Network Access (or use `0.0.0.0/0` temporarily).
4. **Set env vars** in Vercel Project Settings → Environment Variables. Use the table above.
5. **Push to `main`** — the GitHub Actions workflow auto-deploys to Vercel production.
6. **Run setup wizard** — visit `https://your-store.com/setup` and complete the one-time admin account creation.
7. **Verify startup logs** — check Vercel Function Logs for `"Environment validation passed"` and `"MongoDB connectivity check passed"`.

---

## Routine deploy

Push commits to `main`. The CI pipeline runs:
1. Lint + unit tests
2. Production build
3. `vercel deploy --prod` (auto, no manual step needed)

Monitor the deployment in the Vercel dashboard. Vercel performs atomic swap so zero downtime is expected.

---

## Rollback

### Option A — Vercel dashboard (fastest)
1. Go to Vercel → Project → Deployments
2. Find the last good deployment → click ⋯ → **Promote to Production**

### Option B — GitHub Actions workflow dispatch
1. Go to GitHub → Actions → CI → Run workflow
2. The `rollback` job lists recent deployments
3. Set `ROLLBACK_DEPLOYMENT_URL` repository variable to the target deployment URL
4. Re-run the workflow — the job promotes that URL to production

### Option C — Vercel CLI
```bash
vercel ls --token $VERCEL_TOKEN
vercel promote <deployment-url> --token $VERCEL_TOKEN
```

---

## Database backups

Run `scripts/backup-db.sh` as a daily cron job on a host with `mongodump` installed:

```cron
0 2 * * * MONGODB_URI="..." BACKUP_DIR=/var/backups/glowish /path/to/scripts/backup-db.sh >> /var/log/glowish-backup.log 2>&1
```

**Required env vars for the script:**
- `MONGODB_URI` — same connection string as the app
- `BACKUP_DIR` — writable directory for `.gz` archives (default: `/var/backups/glowish`)
- `RETAIN_DAYS` — days to keep (default: `14`)

### Restore from backup
```bash
mongorestore \
  --uri="$MONGODB_URI" \
  --gzip \
  --archive=/var/backups/glowish/glowish_20260525_020000.gz \
  --drop
```

> `--drop` drops each collection before restoring. Omit it for an additive restore.

---

## Scaling

The app is stateless (JWT sessions, no sticky sessions required). Scale by increasing Vercel Function concurrency in project settings.

For high read traffic on the product catalog, add a MongoDB read replica and point `MONGODB_URI` at the replica set connection string — Mongoose will distribute reads automatically when `readPreference: secondaryPreferred` is set.

---

## Maintenance mode

Set `MAINTENANCE_MODE=true` in Vercel env vars and redeploy (or use Vercel env var overrides to apply immediately without a new deploy via the Vercel API).

All users (including admins) are redirected to `/maintenance` until the flag is cleared.

---

## Health check

```
GET /api/health
```

Returns `200 { status: "ok", timestamp, services: { mongo, cloudinary, paymongo } }` if all configured services are reachable.
Returns `503 { status: "degraded", ... }` if any service is degraded.
Optional services return `"unconfigured"` status when env vars are absent.

Use this as the target for uptime monitoring (UptimeRobot, Better Uptime, etc.).

---

## Uptime monitoring (setup steps)

1. Create a free monitor at [UptimeRobot](https://uptimerobot.com) or [Better Uptime](https://betterstack.com/better-uptime).
2. Monitor type: **HTTP(s)**
3. URL: `https://your-store.com/api/health`
4. Check interval: **5 minutes**
5. Alert contacts: add on-call email / Slack webhook.
