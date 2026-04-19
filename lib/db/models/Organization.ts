import { Schema, model, models, type Document, type Types } from "mongoose";

export type OrganizationType = "distributor" | "franchise" | "partner";

export interface IOrganizationSettings {
  canSellRetail: boolean;
  canDistribute: boolean;
  hasInventory: boolean;
  commissionEnabled: boolean;
  canSubmitOrders: boolean;
}

export interface IOrganization extends Document {
  name: string;
  type: OrganizationType;
  parentOrganizationId?: Types.ObjectId | null;
  settings: IOrganizationSettings;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  commissionRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["distributor", "franchise", "partner"],
      required: true,
    },
    parentOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    settings: {
      canSellRetail: { type: Boolean, default: false },
      canDistribute: { type: Boolean, default: false },
      hasInventory: { type: Boolean, default: true },
      commissionEnabled: { type: Boolean, default: false },
      canSubmitOrders: { type: Boolean, default: false },
    },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    notes: { type: String },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ type: 1, deletedAt: 1 });
OrganizationSchema.index({ parentOrganizationId: 1, deletedAt: 1 });
OrganizationSchema.index({ deletedAt: 1 });

export const Organization =
  models.Organization || model<IOrganization>("Organization", OrganizationSchema);
