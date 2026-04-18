import { Schema, model, models, type Document, type Types } from "mongoose";
import type { MemberStatus } from "@/types";

export interface IMember extends Document {
  branchId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  memberId: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  discountPercent: number;
  status: MemberStatus;
  totalPurchases: number;
  totalSpent: number;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const MemberSchema = new Schema<IMember>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    memberId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true },
    address: { type: String },
    discountPercent: { type: Number, default: 10, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"] as MemberStatus[],
      default: "active",
    },
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MemberSchema.index({ memberId: 1 }, { unique: true });
MemberSchema.index({ phone: 1, deletedAt: 1 });
MemberSchema.index({ status: 1, deletedAt: 1 });

export const Member = models.Member || model<IMember>("Member", MemberSchema);
