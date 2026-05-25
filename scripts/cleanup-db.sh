#!/usr/bin/env bash
# Database cleanup utility — removes orphaned and expired records.
#
# Usage:
#   MONGODB_URI="mongodb+srv://..." bash scripts/cleanup-db.sh [--dry-run]
#
# Options:
#   --dry-run   Print what would be deleted without removing anything.
#
# Required env vars:
#   MONGODB_URI — full MongoDB connection string

set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN=true
  fi
done

if [ -z "${MONGODB_URI:-}" ]; then
  echo "ERROR: MONGODB_URI is not set." >&2
  exit 1
fi

command -v mongosh >/dev/null 2>&1 || {
  echo "ERROR: mongosh is not installed or not in PATH." >&2
  exit 1
}

echo "=================================================="
echo " Glowish DB cleanup — $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo " Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN' || echo 'LIVE')"
echo "=================================================="

mongosh "$MONGODB_URI" --quiet --eval "
const dryRun = $DRY_RUN;
const now = new Date();

function report(label, count) {
  const action = dryRun ? 'would delete' : 'deleted';
  print(label + ': ' + action + ' ' + count + ' document(s)');
}

// 1. Expired, unverified email verification tokens (> 48 hours old, not yet verified)
const expiredVerifications = db.users.countDocuments({
  emailVerified: false,
  emailVerificationExpiry: { \$lt: now },
  deletedAt: null,
});
report('Expired unverified accounts (email token expired)', expiredVerifications);
if (!dryRun && expiredVerifications > 0) {
  db.users.updateMany(
    { emailVerified: false, emailVerificationExpiry: { \$lt: now }, deletedAt: null },
    { \$set: { emailVerificationToken: null, emailVerificationExpiry: null } }
  );
}

// 2. Stale expired lockouts (lockedUntil in the past — safe to clear)
const staleLocks = db.users.countDocuments({
  lockedUntil: { \$lt: now, \$ne: null },
  deletedAt: null,
});
report('Stale expired lockouts', staleLocks);
if (!dryRun && staleLocks > 0) {
  db.users.updateMany(
    { lockedUntil: { \$lt: now, \$ne: null }, deletedAt: null },
    { \$set: { lockedUntil: null, failedLoginAttempts: 0 } }
  );
}

// 3. Soft-deleted users older than 90 days
const cutoff90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
const deletedUsers = db.users.countDocuments({ deletedAt: { \$lt: cutoff90 } });
report('Soft-deleted users (>90 days)', deletedUsers);
if (!dryRun && deletedUsers > 0) {
  db.users.deleteMany({ deletedAt: { \$lt: cutoff90 } });
}

// 4. Draft purchase orders older than 30 days
const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const draftOrders = db.purchaseorders.countDocuments({
  status: 'draft',
  createdAt: { \$lt: cutoff30 },
  deletedAt: null,
});
report('Stale draft purchase orders (>30 days)', draftOrders);
if (!dryRun && draftOrders > 0) {
  db.purchaseorders.updateMany(
    { status: 'draft', createdAt: { \$lt: cutoff30 }, deletedAt: null },
    { \$set: { deletedAt: now } }
  );
}

// 5. AuditLog records older than 365 days
const cutoff365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
const oldAuditLogs = db.auditlogs.countDocuments({ createdAt: { \$lt: cutoff365 } });
report('Audit logs (>365 days)', oldAuditLogs);
if (!dryRun && oldAuditLogs > 0) {
  db.auditlogs.deleteMany({ createdAt: { \$lt: cutoff365 } });
}

print('');
print(dryRun ? '-- Dry run complete. No changes made. --' : '-- Cleanup complete. --');
"
