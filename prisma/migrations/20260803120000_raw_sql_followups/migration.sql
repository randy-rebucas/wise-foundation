-- Follow-up migration for constructs Prisma's declarative schema can't express:
-- partial unique indexes, full-text search columns, and a cross-column CHECK.

-- Product.slug: unique only among non-deleted rows
CREATE UNIQUE INDEX "Product_slug_active_unique" ON "Product" ("slug") WHERE "deletedAt" IS NULL;

-- BlogPost.slug: unique only among non-deleted rows
CREATE UNIQUE INDEX "BlogPost_slug_active_unique" ON "BlogPost" ("slug") WHERE "deletedAt" IS NULL;

-- Order.deliveryReceiptNumber: unique only when set
CREATE UNIQUE INDEX "Order_deliveryReceiptNumber_unique" ON "Order" ("deliveryReceiptNumber") WHERE "deliveryReceiptNumber" IS NOT NULL;

-- Product full-text search over name + tags.
-- (to_tsvector('english', ...) is STABLE not IMMUTABLE, so it can't back a
-- GENERATED column directly — use a plain column kept in sync by a trigger.)
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector;
CREATE FUNCTION product_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(NEW."tags", ' ')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER product_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "name", "tags" ON "Product"
  FOR EACH ROW EXECUTE FUNCTION product_search_vector_update();
CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");

-- BlogPost full-text search over title + summary (same trigger approach)
ALTER TABLE "BlogPost" ADD COLUMN "searchVector" tsvector;
CREATE FUNCTION blogpost_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."summary", '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER blogpost_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "summary" ON "BlogPost"
  FOR EACH ROW EXECUTE FUNCTION blogpost_search_vector_update();
CREATE INDEX "BlogPost_searchVector_idx" ON "BlogPost" USING GIN ("searchVector");

-- PurchaseOrder.paymentTermsMonths / paymentTermsWeekly: mutually exclusive
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_paymentTerms_exclusive_check"
  CHECK (NOT ("paymentTermsMonths" IS NOT NULL AND "paymentTermsWeekly" = true));
