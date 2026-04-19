import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IBranch extends Document {
  organizationId?: Types.ObjectId | null;
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
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
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

BranchSchema.index({ code: 1 }, { unique: true });
BranchSchema.index({ organizationId: 1, deletedAt: 1 });
BranchSchema.index({ isActive: 1, deletedAt: 1 });

export const Branch = models.Branch || model<IBranch>("Branch", BranchSchema);
