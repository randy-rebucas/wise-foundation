import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { getDefaultLowStockThreshold } from "@/lib/services/appSettings.service";
import type { StockMovementInput, OrgTransferInput } from "@/lib/validations/inventory.schema";

type Tx = Prisma.TransactionClient;

async function getOrgIdForBranch(branchId: string): Promise<string | null> {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  return branch?.organizationId ?? null;
}

/**
 * Upsert-by-(organizationId, productId, COALESCE(variantId, nil)) using raw SQL, since
 * that expression index (not a plain Prisma @@unique) is what enforces "at most one
 * base-product row per org" — see prisma/migrations/20260803130000_inventory_unique_fix.
 */
async function syncOrgInventory(
  tx: Tx,
  organizationId: string,
  productId: string,
  variantId: string | null | undefined,
  type: "IN" | "OUT",
  quantity: number
) {
  const vId = variantId ?? null;
  if (type === "IN") {
    await tx.$executeRaw`
      INSERT INTO "OrganizationInventory" (id, "organizationId", "productId", "variantId", quantity, "totalReceived", "totalSold", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${organizationId}::uuid, ${productId}::uuid, ${vId}::uuid, ${quantity}, ${quantity}, 0, now(), now())
      ON CONFLICT ("organizationId", "productId", (COALESCE("variantId", '00000000-0000-0000-0000-000000000000'::uuid)))
      DO UPDATE SET quantity = "OrganizationInventory".quantity + ${quantity}, "totalReceived" = "OrganizationInventory"."totalReceived" + ${quantity}, "updatedAt" = now()
    `;
  } else {
    await tx.$executeRaw`
      UPDATE "OrganizationInventory"
      SET quantity = quantity - ${quantity}, "totalSold" = "totalSold" + ${quantity}, "updatedAt" = now()
      WHERE "organizationId" = ${organizationId}::uuid AND "productId" = ${productId}::uuid
        AND COALESCE("variantId", '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(${vId}::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
    `;
  }
}

export async function getInventory(branchId: string, page = 1, limit = 20, lowStockOnly = false) {
  const where: Prisma.InventoryWhereInput = { branchId };
  const skip = (page - 1) * limit;

  const [allForFilter, total] = lowStockOnly
    ? await Promise.all([
        prisma.inventory.findMany({ where, select: { id: true, quantity: true, lowStockThreshold: true } }),
        undefined,
      ])
    : [undefined, undefined];

  if (lowStockOnly && allForFilter) {
    const ids = allForFilter.filter((i) => i.quantity <= i.lowStockThreshold).map((i) => i.id);
    where.id = { in: ids };
  }

  const [items, count] = await Promise.all([
    prisma.inventory.findMany({
      where,
      orderBy: { quantity: "asc" },
      skip,
      take: limit,
      include: {
        product: { select: { name: true, sku: true, category: true, images: true, retailPrice: true } },
        variant: { select: { name: true, sku: true, attributes: true } },
      },
    }),
    prisma.inventory.count({ where }),
  ]);

  return { items, total: count, pages: Math.ceil(count / limit) };
}

export async function getInventoryByOrg(
  organizationId: string,
  page = 1,
  limit = 20,
  lowStockOnly = false
) {
  const where: Prisma.InventoryWhereInput = { organizationId };
  const skip = (page - 1) * limit;

  if (lowStockOnly) {
    const all = await prisma.inventory.findMany({
      where,
      select: { id: true, quantity: true, lowStockThreshold: true },
    });
    where.id = { in: all.filter((i) => i.quantity <= i.lowStockThreshold).map((i) => i.id) };
  }

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      orderBy: { quantity: "asc" },
      skip,
      take: limit,
      include: {
        product: { select: { name: true, sku: true, category: true, images: true, retailPrice: true } },
        variant: { select: { name: true, sku: true, attributes: true } },
        branch: { select: { name: true, code: true } },
      },
    }),
    prisma.inventory.count({ where }),
  ]);

  return { items, total, pages: Math.ceil(total / limit) };
}

export async function getStockMovements(branchId: string, productId?: string, page = 1, limit = 20) {
  const where: Prisma.StockMovementWhereInput = { branchId };
  if (productId) where.productId = productId;

  const skip = (page - 1) * limit;
  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        product: { select: { name: true, sku: true } },
        variant: { select: { name: true, sku: true } },
        performedByUser: { select: { name: true } },
        fromBranch: { select: { name: true, code: true } },
        toBranch: { select: { name: true, code: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { movements, total, pages: Math.ceil(total / limit) };
}

export async function getStockMovementsByOrg(
  organizationId: string,
  productId?: string,
  page = 1,
  limit = 20
) {
  const where: Prisma.StockMovementWhereInput = {
    OR: [{ organizationId }, { fromOrganizationId: organizationId }, { toOrganizationId: organizationId }],
  };
  if (productId) where.productId = productId;

  const skip = (page - 1) * limit;
  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        product: { select: { name: true, sku: true } },
        variant: { select: { name: true, sku: true } },
        branch: { select: { name: true, code: true } },
        performedByUser: { select: { name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { movements, total, pages: Math.ceil(total / limit) };
}

export async function processStockMovement(
  branchId: string,
  performedBy: string,
  input: StockMovementInput
) {
  const defaultLowStockThreshold = await getDefaultLowStockThreshold();
  const organizationId = await getOrgIdForBranch(branchId);
  const destOrgId = input.type === "TRANSFER" && input.toBranchId ? await getOrgIdForBranch(input.toBranchId) : null;

  return prisma.$transaction(async (tx) => {
    let inventory = await tx.inventory.findFirst({
      where: { branchId, productId: input.productId, variantId: input.variantId ?? null },
    });

    if (!inventory && (input.type === "IN" || input.type === "ADJUSTMENT")) {
      inventory = await tx.inventory.create({
        data: {
          branchId,
          organizationId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          quantity: 0,
          reservedQuantity: 0,
          lowStockThreshold: defaultLowStockThreshold,
        },
      });
    }
    if (!inventory) {
      throw new Error("Inventory record not found for this product");
    }

    const previousQuantity = inventory.quantity;
    let newQuantity = previousQuantity;

    switch (input.type) {
      case "IN":
        newQuantity = previousQuantity + input.quantity;
        if (organizationId) {
          await syncOrgInventory(tx, organizationId, input.productId, input.variantId, "IN", input.quantity);
        }
        break;
      case "OUT":
        if (previousQuantity < input.quantity) {
          throw new Error(
            `Insufficient stock. Available: ${previousQuantity}, Requested: ${input.quantity}`
          );
        }
        newQuantity = previousQuantity - input.quantity;
        if (organizationId) {
          await syncOrgInventory(tx, organizationId, input.productId, input.variantId, "OUT", input.quantity);
        }
        break;
      case "ADJUSTMENT":
        newQuantity = input.quantity;
        break;
      case "TRANSFER": {
        if (!input.toBranchId) throw new Error("Destination branch is required for transfers");
        if (input.toBranchId === branchId) throw new Error("Source and destination branches must be different");

        const destBranch = await tx.branch.findFirst({
          where: { id: input.toBranchId, deletedAt: null },
        });
        if (!destBranch) throw new Error("Destination branch not found");

        if (previousQuantity < input.quantity) {
          throw new Error(
            `Insufficient stock for transfer. Available: ${previousQuantity}, Requested: ${input.quantity}`
          );
        }
        newQuantity = previousQuantity - input.quantity;

        const destFilter = {
          branchId: input.toBranchId,
          productId: input.productId,
          variantId: input.variantId ?? null,
        };
        const destPrevDoc = await tx.inventory.findFirst({ where: destFilter });
        const destPrev = destPrevDoc?.quantity ?? 0;
        if (destPrevDoc) {
          await tx.inventory.update({
            where: { id: destPrevDoc.id },
            data: { quantity: { increment: input.quantity } },
          });
        } else {
          await tx.inventory.create({
            data: {
              ...destFilter,
              quantity: input.quantity,
              reservedQuantity: 0,
              lowStockThreshold: defaultLowStockThreshold,
            },
          });
        }

        // Sync org inventories when transfer crosses org boundaries
        if (organizationId && destOrgId && organizationId !== destOrgId) {
          await syncOrgInventory(tx, organizationId, input.productId, input.variantId, "OUT", input.quantity);
          await syncOrgInventory(tx, destOrgId, input.productId, input.variantId, "IN", input.quantity);
        }

        await tx.stockMovement.create({
          data: {
            branchId: input.toBranchId,
            organizationId: destOrgId,
            productId: input.productId,
            variantId: input.variantId ?? null,
            type: "IN",
            quantity: input.quantity,
            previousQuantity: destPrev,
            newQuantity: destPrev + input.quantity,
            fromBranchId: branchId,
            fromOrganizationId: organizationId,
            toOrganizationId: destOrgId,
            reference: input.reference,
            notes: `Transfer from branch ${branchId}`,
            performedBy,
          },
        });
        break;
      }
    }

    await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: newQuantity } });

    await tx.stockMovement.create({
      data: {
        branchId,
        organizationId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        type: input.type,
        quantity: input.quantity,
        previousQuantity,
        newQuantity,
        unitCost: input.unitCost,
        toBranchId: input.toBranchId || null,
        toOrganizationId: input.type === "TRANSFER" ? destOrgId : null,
        reference: input.reference,
        notes: input.notes,
        performedBy,
      },
    });

    return { previousQuantity, newQuantity, type: input.type };
  });
}

export async function getInventoryById(inventoryId: string) {
  return prisma.inventory.findUnique({ where: { id: inventoryId } });
}

export async function updateLowStockThreshold(inventoryId: string, lowStockThreshold: number) {
  const updated = await prisma.inventory.update({
    where: { id: inventoryId },
    data: { lowStockThreshold },
    include: {
      product: { select: { name: true, sku: true, category: true, images: true, retailPrice: true } },
      variant: { select: { name: true, sku: true, attributes: true } },
    },
  });
  if (!updated) throw new Error("Inventory record not found");
  return updated;
}

export async function getLowStockAlerts(branchId?: string) {
  const where: Prisma.InventoryWhereInput = branchId ? { branchId } : {};
  const items = await prisma.inventory.findMany({
    where,
    include: {
      product: { select: { name: true, sku: true, category: true } },
      branch: { select: { name: true, code: true } },
    },
  });
  return items.filter((i) => i.quantity <= i.lowStockThreshold);
}

export async function processOrgTransfer(performedBy: string, input: OrgTransferInput) {
  if (input.fromOrganizationId === input.toOrganizationId) {
    throw new Error("Source and destination organizations must be different");
  }

  const [fromOrg, toOrg] = await Promise.all([
    prisma.organization.findFirst({ where: { id: input.fromOrganizationId, isActive: true, deletedAt: null } }),
    prisma.organization.findFirst({ where: { id: input.toOrganizationId, isActive: true, deletedAt: null } }),
  ]);
  if (!fromOrg) throw new Error("Source organization not found or inactive");
  if (!toOrg) throw new Error("Destination organization not found or inactive");

  return prisma.$transaction(async (tx) => {
    const sourceInv = await tx.organizationInventory.findFirst({
      where: {
        organizationId: input.fromOrganizationId,
        productId: input.productId,
        variantId: input.variantId ?? null,
      },
    });

    if (!sourceInv) throw new Error("No inventory record found in source organization for this product");
    if (sourceInv.quantity < input.quantity) {
      throw new Error(
        `Insufficient stock in source org. Available: ${sourceInv.quantity}, Requested: ${input.quantity}`
      );
    }

    const sourcePrev = sourceInv.quantity;
    const sourceNew = sourcePrev - input.quantity;

    // Deduct from source org
    await syncOrgInventory(tx, input.fromOrganizationId, input.productId, input.variantId, "OUT", input.quantity);

    // Get dest org current qty for audit
    const destInv = await tx.organizationInventory.findFirst({
      where: {
        organizationId: input.toOrganizationId,
        productId: input.productId,
        variantId: input.variantId ?? null,
      },
    });
    const destPrev = destInv?.quantity ?? 0;

    // Add to dest org
    await syncOrgInventory(tx, input.toOrganizationId, input.productId, input.variantId, "IN", input.quantity);

    const now = new Date();
    const transferRef = input.reference ?? `ORG-XFER-${now.getTime()}`;

    await tx.stockMovement.createMany({
      data: [
        {
          branchId: null,
          organizationId: input.fromOrganizationId,
          fromOrganizationId: input.fromOrganizationId,
          toOrganizationId: input.toOrganizationId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          type: "TRANSFER",
          quantity: input.quantity,
          previousQuantity: sourcePrev,
          newQuantity: sourceNew,
          reference: transferRef,
          notes: input.notes ?? `Org transfer to ${toOrg.name}`,
          performedBy,
        },
        {
          branchId: null,
          organizationId: input.toOrganizationId,
          fromOrganizationId: input.fromOrganizationId,
          toOrganizationId: input.toOrganizationId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          type: "IN",
          quantity: input.quantity,
          previousQuantity: destPrev,
          newQuantity: destPrev + input.quantity,
          reference: transferRef,
          notes: input.notes ?? `Org transfer from ${fromOrg.name}`,
          performedBy,
        },
      ],
    });

    return { fromOrg: fromOrg.name, toOrg: toOrg.name, quantity: input.quantity };
  });
}
