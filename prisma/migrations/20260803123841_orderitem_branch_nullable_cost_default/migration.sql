-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_branchId_fkey";

-- DropIndex
DROP INDEX "BlogPost_searchVector_idx";

-- DropIndex
DROP INDEX "Product_searchVector_idx";

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "branchId" DROP NOT NULL,
ALTER COLUMN "cost" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
