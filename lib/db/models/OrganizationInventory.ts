import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IOrganizationInventory extends Document {
  organizationId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  totalReceived: number;
  totalSold: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationInventorySchema = new Schema<IOrganizationInventory>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    totalReceived: { type: Number, default: 0, min: 0 },
    totalSold: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

OrganizationInventorySchema.index(
  { organizationId: 1, productId: 1 },
  { unique: true }
);
OrganizationInventorySchema.index({ organizationId: 1, quantity: 1 });

export const OrganizationInventory =
  models.OrganizationInventory ||
  model<IOrganizationInventory>("OrganizationInventory", OrganizationInventorySchema);
