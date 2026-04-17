import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IBranch extends Document {
  tenantId: Types.ObjectId;
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  managerId?: Types.ObjectId;
  isHeadOffice: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const BranchSchema = new Schema<IBranch>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    address: { type: String, required: true },
    phone: { type: String },
    email: { type: String, lowercase: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    isHeadOffice: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BranchSchema.index({ tenantId: 1, code: 1 }, { unique: true });
BranchSchema.index({ tenantId: 1, isActive: 1, deletedAt: 1 });

export const Branch = models.Branch || model<IBranch>("Branch", BranchSchema);
