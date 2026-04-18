import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Inventory } from "@/lib/db/models/Inventory";
import { StockMovement } from "@/lib/db/models/StockMovement";
import { Branch } from "@/lib/db/models/Branch";
import type { StockMovementInput } from "@/lib/validations/inventory.schema";

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

export async function processStockMovement(
  branchId: string,
  performedBy: string,
  input: StockMovementInput
) {
  await connectDB();
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
        break;
      case "OUT":
        if (previousQuantity < input.quantity) {
          throw new Error(
            `Insufficient stock. Available: ${previousQuantity}, Requested: ${input.quantity}`
          );
        }
        newQuantity = previousQuantity - input.quantity;
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
        if (!destBranch) {
          throw new Error("Destination branch not found");
        }
        if (input.toBranchId === branchId) {
          throw new Error("Source and destination branches must be different");
        }

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

        await StockMovement.create(
          [
            {
              branchId: input.toBranchId,
              productId: input.productId,
              variantId: input.variantId ?? null,
              type: "IN",
              quantity: input.quantity,
              previousQuantity: destPrev,
              newQuantity: destPrev + input.quantity,
              fromBranchId: branchId,
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
          productId: input.productId,
          variantId: input.variantId ?? null,
          type: input.type,
          quantity: input.quantity,
          previousQuantity,
          newQuantity,
          unitCost: input.unitCost,
          toBranchId: input.toBranchId ?? null,
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
