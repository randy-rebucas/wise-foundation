# Troubleshooting Guide — Glowish

## Startup failures

### "MONGODB_URI is required" / "AUTH_SECRET is required"
**Cause:** Required environment variable not set.  
**Fix:** Add the variable to Vercel → Project → Environment Variables, then redeploy. See [deployment-runbook.md](./deployment-runbook.md) for the full list.

### "MongoDB connectivity check failed" on startup
**Cause:** The app cannot reach the database during the startup probe.  
**Check:**
1. `MONGODB_URI` is correct and the password has no unescaped special characters.
2. The Vercel outbound IPs are allowlisted in MongoDB Atlas → Network Access.
3. The cluster is not paused (free-tier Atlas pauses after 60 days of inactivity).

### "Cloudinary is not configured"
**Cause:** None of the Cloudinary env vars are set.  
**Fix:** Either set `CLOUDINARY_URL` or all three of `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. If you intentionally run without Cloudinary, images fall back to `public/uploads/`.

---

## Authentication issues

### Login always redirects to `/login` with no error
**Check:**
1. `AUTH_SECRET` is set and ≥32 characters.
2. `AUTH_URL` matches the exact origin of the deployment (including `https://`).
3. No browser extension is blocking cookies.

### "Account locked" — user cannot log in
**Cause:** 5+ consecutive failed login attempts within 15 minutes.  
**Fix (admin):** Use `POST /api/users/:id/lock` with `{ "locked": false }` to unlock, or wait 15 minutes.  
**Fix (CLI):**
```js
// mongosh
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { lockedUntil: null, failedLoginAttempts: 0 } }
)
```

### 2FA code rejected
**Check:**
1. The authenticator app clock is accurate (TOTP is time-based, ±30s window).
2. The user is entering the current 6-digit code, not a recently expired one.
3. If the device was replaced, use a backup code. Backup codes are 8-character hex strings shown once during setup.  
**If all backup codes are lost:** Admin can disable 2FA directly in the database:
```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { totpEnabled: false, totpSecret: null, totpBackupCodes: null } }
)
```

### Email verification link expired
**Cause:** Verification tokens expire after 24 hours.  
**Fix:** Have the user re-register, or if they already registered, reset the token:
```js
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null } }
)
```

---

## Payment issues

### PayMongo integration not appearing at checkout
**Cause:** `PAYMONGO_SECRET_KEY` or `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY` not set.  
**Fix:** Add both keys to Vercel environment variables. Card and GCash payment options are hidden when these are absent.

### "PayMongo minimum charge is ₱20.00"
**Cause:** Order total is below the PayMongo minimum.  
**Fix:** This is a PayMongo constraint. Ensure all products are priced above the minimum, or add a minimum order validation in checkout.

### Payment intent stuck in "processing"
**Check:**
1. Retrieve the payment intent via PayMongo dashboard to see the actual status.
2. Check `/api/health` — if PayMongo shows `degraded`, their API may be down.
3. Look for errors in Sentry tagged `payment`.

---

## Image upload issues

### Images not uploading / "Cloudinary authentication failed"
**Check:**
1. `CLOUDINARY_URL` or the three `CLOUDINARY_*` keys are correct.
2. The Cloudinary account is active and not over its storage quota.
3. Check Sentry for `CloudinaryUploadError` with `httpCode: 401`.

### Images uploading to `public/uploads/` in production
**Cause:** Cloudinary env vars are not set, triggering the local fallback.  
**Fix:** Set `CLOUDINARY_URL` in Vercel environment variables.

### "Cloudinary upload failed" with no specific error
**Cause:** Network timeout or transient Cloudinary error.  
**Fix:** The upload is automatically retried 3 times with exponential backoff. If it consistently fails, check the Cloudinary status page and Sentry.

---

## Email issues

### Verification emails not being sent
**Cause:** `RESEND_API_KEY` is not set.  
**Behaviour:** Users are auto-verified (development mode). Set the key in production.

### "Resend API error" in logs
**Check:**
1. `RESEND_API_KEY` is valid (not expired or revoked).
2. `EMAIL_FROM` is a verified sender address in your Resend account.
3. Check Resend dashboard → Logs for delivery details.

---

## Database issues

### Slow queries / timeouts
**Check:**
1. Run `db.collection.explain("executionStats").find({...})` in mongosh to check index usage.
2. Enable Atlas Performance Advisor — it suggests missing indexes automatically.
3. Check connection pool (currently 10). Increase via `lib/db/connect.ts` if needed.

### "Too many connections" error
**Cause:** Vercel serverless functions each maintain their own MongoDB connection. Under high concurrency, this can exceed the Atlas connection limit.  
**Fix:**
1. Upgrade Atlas tier (more connections).
2. Lower `maxPoolSize` in `lib/db/connect.ts`.
3. Enable MongoDB Atlas connection pooling proxy (M10+).

### Duplicate key errors on `email`
**Cause:** A user with the same email already exists (including soft-deleted).  
**Fix:** Check for `deletedAt != null` records:
```js
db.users.findOne({ email: "user@example.com" })
```
If a soft-deleted record exists, hard-delete it or use a different email.

---

## Build / deployment issues

### Build fails: "Cannot find module" or type error
**Fix:** Run `npm run build` locally to reproduce. Check that all env vars needed for the build are set as dummy values in the CI workflow.

### Turbopack warning about filesystem operations
**Cause:** A dependency (not app code) reads the filesystem during bundling.  
**Impact:** Warning only; does not affect functionality.  
**Action:** No action needed. Document and ignore until Turbopack resolves it.

### Preview deploy not posting URL to PR
**Check:**
1. The `VERCEL_TOKEN` GitHub secret is set and not expired.
2. The `preview` GitHub Actions environment exists and is not restricted to specific branches.
3. Check the `deploy-preview` job logs in GitHub Actions.

---

## Performance issues

### Marketplace catalog loading slowly
**Check:**
1. `unstable_cache` is active — first request after a cold start will be slow; subsequent requests within 60s use cache.
2. Verify MongoDB indexes exist on `Product`: `marketplaceListed+isActive+deletedAt`.
3. Check `Inventory` query when `inStockOnly=true` — this runs an aggregation; verify `branchId+quantity` index.

### Admin dashboard loading slowly
**Check:**
1. Add `loading.tsx` skeleton screens (already done for dashboard, products, inventory, orders).
2. Check slow query logs in Atlas.
3. Break down which API calls are slow using Vercel Function Logs timing.

---

## Maintenance mode

To put the site in maintenance mode without a redeploy:
1. Go to Vercel → Project → Environment Variables.
2. Add `MAINTENANCE_MODE=true`.
3. Use the Vercel API to apply immediately (no redeploy needed):
```bash
curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -d '{"key":"MAINTENANCE_MODE","value":"true","type":"plain","target":["production"]}'
```
4. Clear by setting to `false` or removing the variable.

---

## Running the cleanup script

```bash
# Dry run first — see what would be deleted
MONGODB_URI="mongodb+srv://..." bash scripts/cleanup-db.sh --dry-run

# Live run
MONGODB_URI="mongodb+srv://..." bash scripts/cleanup-db.sh
```

---

## Getting help

- Application errors: Check **Sentry** dashboard for stack traces and context.
- API failures: Check **Vercel Function Logs** — filter by route path.
- Database issues: Check **MongoDB Atlas** → Monitoring → Profiler.
- File an issue: https://github.com/your-org/glowish/issues
