-- Prisma's declarative @@unique([branchId, productId, variantId]) treats NULL
-- variantId as distinct per row (standard SQL), unlike MongoDB's unique index
-- semantics which treat null as an equal, deduplicated value. Replace with an
-- expression unique index that coalesces NULL variantId to a fixed sentinel
-- so at most one "base product" (no variant) row can exist per branch/org+product.

DROP INDEX IF EXISTS "Inventory_branchId_productId_variantId_key";
DROP INDEX IF EXISTS "Inventory_branchId_productId_variantId_idx";
CREATE UNIQUE INDEX "Inventory_branch_product_variant_unique"
  ON "Inventory" ("branchId", "productId", COALESCE("variantId", '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX "Inventory_branchId_productId_variantId_idx"
  ON "Inventory" ("branchId", "productId", "variantId");

DROP INDEX IF EXISTS "OrganizationInventory_organizationId_productId_variantId_key";
DROP INDEX IF EXISTS "OrganizationInventory_organizationId_productId_variantId_idx";
CREATE UNIQUE INDEX "OrganizationInventory_org_product_variant_unique"
  ON "OrganizationInventory" ("organizationId", "productId", COALESCE("variantId", '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX "OrganizationInventory_organizationId_productId_variantId_idx"
  ON "OrganizationInventory" ("organizationId", "productId", "variantId");
