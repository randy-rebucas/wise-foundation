import { Schema, model, models, type Document, type Types } from "mongoose";

export interface ISupplier extends Document {
  tenantId: Types.ObjectId;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    notes: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SupplierSchema.index({ tenantId: 1, name: 1 });
SupplierSchema.index({ tenantId: 1, deletedAt: 1 });

export const Supplier = models.Supplier || model<ISupplier>("Supplier", SupplierSchema);
