import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Inventory } from "@/lib/db/models/Inventory";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import { StockMovement } from "@/lib/db/models/StockMovement";
import { Branch } from "@/lib/db/models/Branch";
import { Organization } from "@/lib/db/models/Organization";
import type { StockMovementInput, OrgTransferInput } from "@/lib/validations/inventory.schema";

async function getOrgIdForBranch(branchId: string): Promise<string | null> {
  const branch = await Branch.findById(branchId).lean();
  return branch?.organizationId?.toString() ?? null;
}

async function syncOrgInventory(
  organizationId: string,
  productId: string,
  variantId: string | null | undefined,
  type: "IN" | "OUT",
  quantity: number,
  session: ClientSession
) {
  const filter = { organizationId, productId, variantId: variantId ?? null };
  if (type === "IN") {
    await OrganizationInventory.findOneAndUpdate(
      filter,
      { $inc: { quantity, totalReceived: quantity } },
      { upsert: true, new: true, session }
    );
  } else {
    await OrganizationInventory.findOneAndUpdate(
      filter,
      { $inc: { quantity: -quantity, totalSold: quantity } },
      { session }
    );
  }
}

export async function getInventory(
  branchId: string,
  page = 1,
  limit = 20,
  lowStockOnly = false
) {
  await connectDB();

  const query: Record<string, unknown> = { branchId };
  if (lowStockOnly) {
    query.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Inventory.find(query)
      .sort({ quantity: 1 })
      .skip(skip)
      .limit(limit)
      .populate("productId", "name sku category images retailPrice")
      .populate("variantId", "name sku attributes")
      .lean(),
    Inventory.countDocuments(query),
  ]);

  return { items, total, pages: Math.ceil(total / limit) };
}

export async function getInventoryByOrg(
  organizationId: string,
  page = 1,
  limit = 20,
  lowStockOnly = false
) {
  await connectDB();

  const query: Record<string, unknown> = { organizationId };
  if (lowStockOnly) {
    query.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Inventory.find(query)
      .sort({ quantity: 1 })
      .skip(skip)
      .limit(limit)
      .populate("productId", "name sku category images retailPrice")
      .populate("variantId", "name sku attributes")
      .populate("branchId", "name code")
      .lean(),
    Inventory.countDocuments(query),
  ]);

  return { items, total, pages: Math.ceil(total / limit) };
}

export async function getStockMovements(
  branchId: string,
  productId?: string,
  page = 1,
  limit = 20
) {
  await connectDB();

  const query: Record<string, unknown> = { branchId };
  if (productId) query.productId = productId;

  const skip = (page - 1) * limit;
  const [movements, total] = await Promise.all([
    StockMovement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("productId", "name sku")
      .populate("performedBy", "name")
      .populate("fromBranchId", "name code")
      .populate("toBranchId", "name code")
      .lean(),
    StockMovement.countDocuments(query),
  ]);

  return { movements, total, pages: Math.ceil(total / limit) };
}

export async function getStockMovementsByOrg(
  organizationId: string,
  productId?: string,
  page = 1,
  limit = 20
) {
  await connectDB();

  const query: Record<string, unknown> = {
    $or: [
      { organizationId },
      { fromOrganizationId: organizationId },
      { toOrganizationId: organizationId },
    ],
  };
  if (productId) query.productId = productId;

  const skip = (page - 1) * limit;
  const [movements, total] = await Promise.all([
    StockMovement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("productId", "name sku")
      .populate("branchId", "name code")
      .populate("performedBy", "name")
      .lean(),
    StockMovement.countDocuments(query),
  ]);

  return { movements, total, pages: Math.ceil(total / limit) };
}

export async function processStockMovement(
  branchId: string,
  performedBy: string,
  input: StockMovementInput
) {
  await connectDB();
  const organizationId = await getOrgIdForBranch(branchId);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const inventoryFilter = {
      branchId,
      productId: input.productId,
      variantId: input.variantId ?? null,
    };

    let inventory = await Inventory.findOne(inventoryFilter).session(session);

    if (!inventory) {
      if (input.type !== "IN" && input.type !== "ADJUSTMENT") {
        throw new Error("Inventory record not found for this product");
      }
      inventory = new Inventory({
        ...inventoryFilter,
        branchId,
        organizationId,
        quantity: 0,
        reservedQuantity: 0,
        lowStockThreshold: 10,
      });
    }

    const previousQuantity = inventory.quantity;
    let newQuantity = previousQuantity;

    switch (input.type) {
      case "IN":
        newQuantity = previousQuantity + input.quantity;
        if (organizationId) {
          await syncOrgInventory(organizationId, input.productId, input.variantId, "IN", input.quantity, session);
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
          await syncOrgInventory(organizationId, input.productId, input.variantId, "OUT", input.quantity, session);
        }
        break;
      case "ADJUSTMENT":
        newQuantity = input.quantity;
        break;
      case "TRANSFER": {
        if (!input.toBranchId) throw new Error("Destination branch is required for transfers");

        const destBranch = await Branch.findOne({
          _id: input.toBranchId,
          deletedAt: null,
        }).session(session);
        if (!destBranch) throw new Error("Destination branch not found");
        if (input.toBranchId === branchId) throw new Error("Source and destination branches must be different");

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
        let destInventory = await Inventory.findOne(destFilter).session(session);
        if (!destInventory) {
          destInventory = new Inventory({ ...destFilter, quantity: 0, reservedQuantity: 0, lowStockThreshold: 10 });
        }
        const destPrev = destInventory.quantity;
        destInventory.quantity = destPrev + input.quantity;
        await destInventory.save({ session });

        const destOrgId = await getOrgIdForBranch(input.toBranchId);

        // Sync org inventories when transfer crosses org boundaries
        if (organizationId && destOrgId && organizationId !== destOrgId) {
          await syncOrgInventory(organizationId, input.productId, input.variantId, "OUT", input.quantity, session);
          await syncOrgInventory(destOrgId, input.productId, input.variantId, "IN", input.quantity, session);
        }

        await StockMovement.create(
          [
            {
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
          ],
          { session }
        );
        break;
      }
    }

    inventory.quantity = newQuantity;
    await inventory.save({ session });

    await StockMovement.create(
      [
        {
          branchId,
          organizationId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          type: input.type,
          quantity: input.quantity,
          previousQuantity,
          newQuantity,
          unitCost: input.unitCost,
          toBranchId: input.toBranchId ?? null,
          toOrganizationId: input.type === "TRANSFER" ? (await getOrgIdForBranch(input.toBranchId!)) : null,
          reference: input.reference,
          notes: input.notes,
          performedBy,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return { previousQuantity, newQuantity, type: input.type };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

export async function getLowStockAlerts(branchId?: string) {
  await connectDB();

  const query: Record<string, unknown> = {
    $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
  };
  if (branchId) query.branchId = branchId;

  return Inventory.find(query)
    .populate("productId", "name sku category")
    .populate("branchId", "name code")
    .lean();
}

export async function processOrgTransfer(
  performedBy: string,
  input: OrgTransferInput
) {
  await connectDB();

  if (input.fromOrganizationId === input.toOrganizationId) {
    throw new Error("Source and destination organizations must be different");
  }

  const [fromOrg, toOrg] = await Promise.all([
    Organization.findOne({ _id: input.fromOrganizationId, isActive: true, deletedAt: null }).lean(),
    Organization.findOne({ _id: input.toOrganizationId, isActive: true, deletedAt: null }).lean(),
  ]);
  if (!fromOrg) throw new Error("Source organization not found or inactive");
  if (!toOrg) throw new Error("Destination organization not found or inactive");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const sourceInv = await OrganizationInventory.findOne({
      organizationId: input.fromOrganizationId,
      productId: input.productId,
      variantId: input.variantId ?? null,
    }).session(session);

    if (!sourceInv) throw new Error("No inventory record found in source organization for this product");
    if (sourceInv.quantity < input.quantity) {
      throw new Error(
        `Insufficient stock in source org. Available: ${sourceInv.quantity}, Requested: ${input.quantity}`
      );
    }

    const sourcePrev = sourceInv.quantity;
    const sourceNew = sourcePrev - input.quantity;

    // Deduct from source org
    await OrganizationInventory.findOneAndUpdate(
      { organizationId: input.fromOrganizationId, productId: input.productId, variantId: input.variantId ?? null },
      { $inc: { quantity: -input.quantity, totalSold: input.quantity } },
      { session }
    );

    // Get dest org current qty for audit
    const destInv = await OrganizationInventory.findOne({
      organizationId: input.toOrganizationId,
      productId: input.productId,
      variantId: input.variantId ?? null,
    }).session(session);
    const destPrev = destInv?.quantity ?? 0;

    // Add to dest org
    await OrganizationInventory.findOneAndUpdate(
      { organizationId: input.toOrganizationId, productId: input.productId, variantId: input.variantId ?? null },
      { $inc: { quantity: input.quantity, totalReceived: input.quantity } },
      { upsert: true, new: true, session }
    );

    const now = new Date();
    const transferRef = input.reference ?? `ORG-XFER-${now.getTime()}`;

    await StockMovement.create(
      [
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
      { session }
    );

    await session.commitTransaction();
    return { fromOrg: fromOrg.name, toOrg: toOrg.name, quantity: input.quantity };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}
