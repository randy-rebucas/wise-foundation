# Database Backup & Restore

Glowish supports full MongoDB backup and restore through both a **CLI script** and an **Admin UI**. Backups are stored as gzip-compressed JSON files (`.json.gz`) containing every collection in the database.

---

## Quick Reference

| Task | Command |
|---|---|
| Create a backup | `npm run db:backup` |
| Create a labeled backup | `npm run db:backup -- --label <name>` |
| List backups | `npm run db:backup:list` |
| Restore from a file | `npm run db:restore -- --file <path>` |

---

## CLI

### Prerequisites

- `MONGODB_URI` must be set in `.env.local`
- `tsx` is already installed as a dev dependency

### Create a Backup

```bash
npm run db:backup
```

Creates a timestamped archive in `./backups/`:

```
backups/backup_2025-01-15_09-30-00.json.gz
```

#### With a label

```bash
npm run db:backup -- --label pre-migration
```

Output: `backups/backup_2025-01-15_09-30-00_pre-migration.json.gz`

Labels are sanitized (only `a-z A-Z 0-9 - _` kept, max 40 chars).

### List Backups

```bash
npm run db:backup:list
```

```
Backups in /your/project/backups:

     42.3 KB   1/15/2025, 9:30:00 AM   backup_2025-01-15_09-30-00_pre-migration.json.gz
     41.8 KB   1/14/2025, 2:00:05 AM   backup_2025-01-14_02-00-05.json.gz
```

### Restore from a Backup

```bash
npm run db:restore -- --file backups/backup_2025-01-15_09-30-00.json.gz
```

> **Warning:** This drops and reimports every collection. All current data will be replaced by the backup contents.

Accepts a path relative to the project root or an absolute path.

---

## Admin UI

Navigate to **Admin → Backup & Restore** in the dashboard. Only users with the `ADMIN` role can access this page.

### Create a Backup

1. Click **Create Backup**.
2. Optionally enter a label (e.g. `pre-migration`).
3. Click **Create Backup** — the new entry appears in the table.

### Download a Backup

Click the `⋯` menu on any row → **Download**. The `.json.gz` file is saved to your browser's downloads folder.

### Restore from a Backup

**Option A — restore a server-side backup**  
Download it first, then use "Restore from File" to re-upload it.

**Option B — restore from a local file**  
1. Click **Restore from File**.
2. Select a `.json.gz` backup file.
3. Confirm the destructive-action warning.

### Delete a Backup

Click the `⋯` menu on any row → **Delete**.

---

## API Routes

All routes require an authenticated staff session. ADMIN role is enforced by the page layout; the API itself requires `withStaffAuth`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/backup` | List backup files |
| `POST` | `/api/admin/backup` | Create a backup; accepts `{ label?: string }` |
| `GET` | `/api/admin/backup/[filename]` | Download a backup file |
| `DELETE` | `/api/admin/backup/[filename]` | Delete a backup file |
| `POST` | `/api/admin/restore` | Restore from a `multipart/form-data` upload (field: `file`) |

### POST /api/admin/backup

```json
// Request body (optional)
{ "label": "pre-migration" }

// Response 201
{
  "success": true,
  "data": {
    "filename": "backup_2025-01-15_09-30-00_pre-migration.json.gz",
    "size": 43315,
    "createdAt": "2025-01-15T09:30:00.000Z"
  },
  "message": "Backup created"
}
```

### POST /api/admin/restore

```
Content-Type: multipart/form-data
field: file  →  <backup>.json.gz
```

```json
// Response 200
{
  "success": true,
  "data": {
    "collections": {
      "users": 12,
      "products": 340,
      "orders": 88
    }
  },
  "message": "Database restored successfully"
}
```

---

## Backup Format

Each `.json.gz` file decompresses to a single JSON object:

```json
{
  "createdAt": "2025-01-15T09:30:00.000Z",
  "collections": {
    "users": [ { "_id": { "$oid": "..." }, ... }, ... ],
    "products": [ ... ],
    "orders": [ ... ]
  }
}
```

MongoDB Extended JSON fields (e.g. `{ "$oid": "..." }`, `{ "$date": "..." }`) are rehydrated back to proper BSON types on restore.

---

## Storage Location

Backups are stored on the server filesystem. The path defaults to `<project-root>/backups/` and can be overridden with the `BACKUP_DIR` environment variable.

```bash
# .env.local
BACKUP_DIR=/var/backups/glowish
```

---

## Automated Backups (Cron)

Use the existing shell script for cron-based backups (requires `mongodump` on the host):

```bash
# scripts/backup-db.sh
# Runs via cron: 0 2 * * * /path/to/scripts/backup-db.sh
```

Alternatively, schedule the Node script directly:

```cron
0 2 * * * cd /path/to/project && npm run db:backup >> /var/log/glowish-backup.log 2>&1
```

---

## Files

| File | Purpose |
|---|---|
| [`scripts/backup.ts`](../scripts/backup.ts) | CLI script (backup, restore, list) |
| [`app/api/admin/backup/route.ts`](../app/api/admin/backup/route.ts) | API: list and create backups |
| [`app/api/admin/backup/[filename]/route.ts`](../app/api/admin/backup/%5Bfilename%5D/route.ts) | API: download and delete a backup |
| [`app/api/admin/restore/route.ts`](../app/api/admin/restore/route.ts) | API: restore from uploaded file |
| [`app/(dashboard)/admin/backup/page.tsx`](../app/%28dashboard%29/admin/backup/page.tsx) | Admin UI page |
| [`app/(dashboard)/admin/backup/layout.tsx`](../app/%28dashboard%29/admin/backup/layout.tsx) | Layout — restricts access to ADMIN role |
