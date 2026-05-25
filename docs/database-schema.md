# Database Schema — Glowish

MongoDB database: `glowish`

All timestamps are stored as BSON Date unless noted. Soft-deleted records use `deletedAt: Date | null`.

---

## Collections

### `users`

Stores both staff accounts and marketplace customer accounts. Differentiated by `role`.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | required |
| `email` | String | unique, lowercase |
| `password` | String | bcrypt hash, `select: false` |
| `role` | String | `ADMIN` `ORG_ADMIN` `BRANCH_MANAGER` `STAFF` `INVENTORY_MANAGER` `MEMBER` `CUSTOMER` |
| `permissions` | String[] | Effective permissions array (merged role + custom) |
| `branchIds` | ObjectId[] | → Branch |
| `organizationId` | ObjectId | → Organization |
| `avatar` | String | URL |
| `phone` | String | |
| `isActive` | Boolean | default: true |
| `emailVerified` | Boolean | default: false |
| `emailVerificationToken` | String | `select: false`, sparse index |
| `emailVerificationExpiry` | Date | `select: false` |
| `lastLoginAt` | Date | |
| `failedLoginAttempts` | Number | default: 0 |
| `lockedUntil` | Date \| null | null = not locked |
| `totpSecret` | String | `select: false`, null until 2FA setup |
| `totpEnabled` | Boolean | default: false |
| `totpBackupCodes` | String[] | `select: false`, consumed on use |
| `marketplace` | Object | Customer-only subdocument |
| `marketplace.wishlist` | Array | `{ productId, variantId, slug, name, sku, price, image, addedAt }` |
| `marketplace.savedAddresses` | Array | `{ id, label, fullName, phone, line1, line2, city, region, postalCode, isDefault }` |
| `marketplace.paymentMethods` | Array | `{ id, type, label, last4, isDefault }` |
| `marketplace.reviews` | Array | `{ id, productId, productName, productSlug, rating, text, createdAt }` |
| `deletedAt` | Date \| null | soft-delete |
| `createdAt` | Date | |
| `updatedAt` | Date | |

**Indexes:** `email` (unique), `role+deletedAt`, `branchIds+deletedAt`, `emailVerificationToken` (sparse)

---

### `products`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | required |
| `slug` | String | unique, URL-safe |
| `sku` | String | unique |
| `description` | String | |
| `shortDescription` | String | |
| `retailPrice` | Number | in PHP (not centavos) |
| `costPrice` | Number | |
| `category` | String | `homecare` `cosmetics` `wellness` `scent` |
| `images` | String[] | Cloudinary URLs |
| `isActive` | Boolean | |
| `marketplaceListed` | Boolean | visible in public storefront |
| `hasVariants` | Boolean | |
| `tags` | String[] | |
| `seoTitle` | String | |
| `seoDescription` | String | |
| `deletedAt` | Date \| null | |

**Indexes:** `slug` (unique), `sku` (unique), `marketplaceListed+isActive+deletedAt`, `category+deletedAt`

---

### `productvariants`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `productId` | ObjectId | → Product |
| `name` | String | e.g. "50ml / Rose" |
| `sku` | String | unique |
| `retailPrice` | Number | overrides parent if set |
| `costPrice` | Number | |
| `isActive` | Boolean | |

---

### `inventory`

One document per (product or variant) per branch.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `branchId` | ObjectId | → Branch |
| `productId` | ObjectId | → Product |
| `variantId` | ObjectId \| null | → ProductVariant |
| `quantity` | Number | current stock |
| `reorderPoint` | Number | low-stock threshold |

**Indexes:** `branchId+productId` (unique), `productId`, `quantity`

---

### `stockmovements`

Immutable audit trail for every inventory change.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `branchId` | ObjectId | |
| `productId` | ObjectId | |
| `variantId` | ObjectId \| null | |
| `type` | String | `sale` `purchase` `adjustment` `transfer_in` `transfer_out` `return` |
| `quantity` | Number | positive = in, negative = out |
| `referenceId` | ObjectId \| null | Order or PurchaseOrder |
| `referenceType` | String | `Order` `PurchaseOrder` |
| `performedBy` | ObjectId | → User |
| `createdAt` | Date | |

---

### `orders`

All order types in a single collection. Discriminated by `type`.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `orderNumber` | String | unique, human-readable |
| `type` | String | `pos` `marketplace` `b2b` |
| `status` | String | `pending` `processing` `completed` `cancelled` `refunded` |
| `branchId` | ObjectId | |
| `cashierId` | ObjectId | → User |
| `memberId` | ObjectId \| null | → Member (POS loyalty) |
| `organizationId` | ObjectId \| null | |
| `marketplaceCustomerUserId` | ObjectId \| null | → User (CUSTOMER role) |
| `marketplaceShipping` | Object | `{ fullName, email, phone, line1, line2, city, region, postalCode, shippingMethod, shippingCost }` |
| `subtotal` | Number | |
| `discount` | Number | |
| `tax` | Number | |
| `shippingAmount` | Number | |
| `total` | Number | |
| `paymentMethod` | String | `cash` `card` `gcash` `bank_transfer` `cod` |
| `marketplaceCardPayment` | Object | `{ cardBrand, cardLast4, cardholderName, expMonth, expYear }` |
| `deletedAt` | Date \| null | |
| `createdAt` | Date | |

**Indexes:** `orderNumber` (unique), `cashierId+createdAt`, `branchId+status+createdAt`, `marketplaceCustomerUserId+createdAt`

---

### `orderitems`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `orderId` | ObjectId | → Order |
| `productId` | ObjectId | → Product |
| `variantId` | ObjectId \| null | |
| `productName` | String | snapshot at order time |
| `sku` | String | |
| `quantity` | Number | |
| `unitPrice` | Number | |
| `discount` | Number | |
| `total` | Number | |

**Indexes:** `orderId`

---

### `purchaseorders`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `status` | String | `draft` `submitted` `approved` `declined` `received` `cancelled` |
| `branchId` | ObjectId | |
| `organizationId` | ObjectId \| null | |
| `createdBy` | ObjectId | → User |
| `supplierId` | ObjectId \| null | → Supplier |
| `items` | Array | embedded line items |
| `subtotal` | Number | |
| `discount` | Number | |
| `total` | Number | |
| `notes` | String | |
| `deletedAt` | Date \| null | |
| `createdAt` | Date | |

**Indexes:** `createdBy+status+createdAt`, `branchId+status+createdAt`, `organizationId+status+createdAt`, `status+deletedAt`

---

### `members`

Loyalty programme members (in-store, not the same as CUSTOMER users).

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | |
| `email` | String | |
| `phone` | String | |
| `branchId` | ObjectId | home branch |
| `membershipNumber` | String | unique |
| `points` | Number | loyalty points balance |
| `deletedAt` | Date \| null | |

**Indexes:** `membershipNumber` (unique), `branchId+deletedAt`, `email`

---

### `organizations`

Multi-tenant reseller organisations.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | |
| `type` | String | `direct` `franchise` `reseller` |
| `inventorySurface` | String | `branch` `organization` `none` |
| `posSurface` | String | `branch` `none` |
| `deletedAt` | Date \| null | |

---

### `branches`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | |
| `organizationId` | ObjectId \| null | |
| `isHeadOffice` | Boolean | |
| `isActive` | Boolean | |
| `deletedAt` | Date \| null | |

---

### `auditlogs`

Admin action audit trail. Never soft-deleted; pruned after 365 days by cleanup script.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `action` | String | `user.created` `user.updated` `user.role_changed` `user.deleted` `user.locked` `settings.updated` `order.refunded` `organization.created` `organization.updated` `organization.deleted` |
| `performedBy` | ObjectId | → User |
| `performedByName` | String | snapshot |
| `targetId` | String \| null | ID of affected resource |
| `targetType` | String \| null | e.g. `User` `Order` |
| `metadata` | Mixed | action-specific context |
| `createdAt` | Date | |

**Indexes:** `action+createdAt`, `performedBy+createdAt`, `targetId+createdAt`

---

### `appsettings`

Singleton document (only one record should exist).

| Field | Type | Notes |
|---|---|---|
| `appName` | String | |
| `appTagline` | String | |
| `appLogoUrl` | String | |
| `seoDefaultDescription` | String | |
| `seoOgImageUrl` | String | |
| `marketplaceFulfillmentBranchId` | ObjectId | → Branch |
| `shippingMethods` | Array | configured shipping options |
| `loyaltyEnabled` | Boolean | |

---

### Other collections

| Collection | Description |
|---|---|
| `suppliers` | Product suppliers for purchase orders |
| `transactions` | Financial transaction records |
| `commissions` | Reseller commission records |
| `mediaassets` | Uploaded media file metadata |
| `roles` | Custom role definitions (overrides per org) |
| `orgpermissions` | Per-organization permission customisations |
| `purchaseorderauditlogs` | PO-specific audit trail |
| `organizationinventories` | Org-level inventory aggregates |
| `marketplacecontactmessages` | Contact form submissions |
