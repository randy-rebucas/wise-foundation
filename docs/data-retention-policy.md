# Data Retention Policy — Glowish

**Effective date:** 2026-05-25  
**Review cycle:** Annually or when data processing activities change materially.

---

## Purpose

This policy defines how long Glowish retains different categories of personal and operational data, and how data is destroyed when retention periods expire. It satisfies the GDPR principle of **storage limitation** (Art. 5(1)(e)) and supports customers' right to erasure (Art. 17).

---

## Data Categories and Retention Periods

### Customer Accounts

| Data | Retention | Basis | Notes |
|---|---|---|---|
| Account profile (name, email, phone) | Duration of account + 30 days after deletion | Contract | Anonymised on account deletion via `DELETE /api/account/delete-account` |
| Password hash | Duration of account | Contract | Bcrypt hash only; plaintext never stored |
| Email verification tokens | 48 hours from issue | Operational | Cleared by `scripts/cleanup-db.sh` |
| Unverified accounts (token expired) | 7 days after token expiry | Operational | Removed by weekly cleanup job |
| Saved delivery addresses | Duration of account | Contract | Cleared on account deletion |
| Saved payment method tokens | Duration of account | Contract | Cleared on account deletion; only metadata (last4, type) stored — no raw card numbers |
| Wishlist | Duration of account | Contract | Cleared on account deletion |
| Reviews | 5 years | Legitimate interest | Anonymised if customer deletes account |

### Orders

| Data | Retention | Basis | Notes |
|---|---|---|---|
| Order records (number, items, total, status) | 7 years | Legal (tax / accounting) | Must be retained for financial audits |
| Shipping address on orders | 7 years | Legal | Embedded in order document; not removed on account deletion |
| Payment method metadata on orders | 7 years | Legal | Card last4 / brand only; no full PANs |
| Failed / abandoned orders | 90 days | Operational | Soft-deleted after 90 days |

### Staff Accounts

| Data | Retention | Basis | Notes |
|---|---|---|---|
| Staff account profile | Duration of employment + 30 days | Contract / Legal | Soft-deleted via `deleteUser()` |
| Soft-deleted staff accounts | 90 days | Operational | Hard-deleted by cleanup job |
| Login audit trail | 1 year | Security | Covered by AuditLog retention |

### Audit Logs

| Data | Retention | Basis | Notes |
|---|---|---|---|
| Audit log entries (admin actions) | 1 year | Security / Legal | Pruned by `scripts/cleanup-db.sh` |
| Purchase order audit log | 3 years | Legal | Kept alongside purchase order lifecycle |

### Application Logs (Pino / Vercel)

| Data | Retention | Basis | Notes |
|---|---|---|---|
| Application logs | 30 days | Operational | Managed by Vercel log retention settings |
| Error reports (Sentry) | 90 days | Operational | Configure in Sentry project settings |

---

## Customer Rights

Customers can exercise the following rights via the Glowish account portal or by emailing [privacy@glowish.com]:

| Right | Mechanism |
|---|---|
| Right of access | `GET /api/account/data-export` — downloads a JSON archive of all personal data |
| Right to erasure | `DELETE /api/account/delete-account` — anonymises profile and clears PII immediately |
| Right to rectification | `PATCH /api/account/details` — update name, phone, address at any time |
| Right to data portability | Same as right of access — machine-readable JSON format |

Note: Order records are retained for 7 years for legal / tax purposes even after account deletion. The shipping address embedded in historical orders is retained as part of the financial record.

---

## Automated Cleanup

The `scripts/cleanup-db.sh` script implements automatic enforcement of this policy:

| Cleanup action | Trigger | Policy section |
|---|---|---|
| Clear expired unverified email tokens | `emailVerificationExpiry < now` | Email verification tokens (48h) |
| Clear stale lockouts | `lockedUntil < now` | Security / operational |
| Hard-delete soft-deleted users | `deletedAt > 90 days ago` | Staff accounts (90-day grace) |
| Soft-delete stale draft purchase orders | `status = draft AND createdAt > 30 days ago` | Operational |
| Delete old audit log entries | `createdAt > 365 days ago` | Audit logs (1 year) |

**Recommended schedule:** Run daily as a cron job.

```cron
0 3 * * * MONGODB_URI="..." bash /path/to/scripts/cleanup-db.sh >> /var/log/glowish-cleanup.log 2>&1
```

---

## Third-Party Sub-processors

| Sub-processor | Data shared | Their retention policy |
|---|---|---|
| MongoDB Atlas | All database data | Controlled by Glowish; Atlas encryption at rest enabled |
| Cloudinary | Product images (no PII) | Images persist until deleted via API |
| Resend | Email address, email content | Per Resend DPA — typically 30 days for logs |
| PayMongo | Payment intents (no raw card numbers) | Per PayMongo DPA |
| Vercel | Function logs, request logs | 30 days (Vercel default) |
| Sentry | Error stack traces, user context | 90 days (configurable) |

---

## Amendments

Any material change to this policy must be reviewed by the data controller and communicated to affected users with at least 30 days notice before taking effect.
