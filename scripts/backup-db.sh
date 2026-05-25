#!/usr/bin/env bash
# MongoDB backup script using mongodump.
# Designed to be run as a daily cron job:
#   0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/glowish-backup.log 2>&1
#
# Required env vars (set in shell profile or cron environment):
#   MONGODB_URI   — full MongoDB connection string
#   BACKUP_DIR    — directory where backup archives are written (default: /var/backups/glowish)
#
# Optional env vars:
#   RETAIN_DAYS   — how many days of backups to keep (default: 14)

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/glowish}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE="${BACKUP_DIR}/glowish_${TIMESTAMP}.gz"

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "[backup] ERROR: MONGODB_URI is not set" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "[backup] Starting backup → ${ARCHIVE}"

mongodump \
  --uri="${MONGODB_URI}" \
  --gzip \
  --archive="${ARCHIVE}"

echo "[backup] Backup complete: $(du -sh "${ARCHIVE}" | cut -f1)"

# Prune old backups
echo "[backup] Pruning backups older than ${RETAIN_DAYS} days"
find "${BACKUP_DIR}" -name "glowish_*.gz" -mtime "+${RETAIN_DAYS}" -delete -print \
  | sed 's/^/[backup] Deleted: /'

echo "[backup] Done at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
