import { Schema, model, models, type Document, type Types } from "mongoose";
import type { UserRole } from "@/types";

export interface IUser extends Document {
  branchIds: Types.ObjectId[];
  name: string;
  email: string;
  password: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const UserSchema = new Schema<IUser>(
  {
    branchIds: [{ type: Schema.Types.ObjectId, ref: "Branch" }],
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ["ADMIN", "BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER", "MEMBER"],
    },
    permissions: [{ type: String }],
    avatar: { type: String },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, deletedAt: 1 });
UserSchema.index({ branchIds: 1, deletedAt: 1 });

export const User = models.User || model<IUser>("User", UserSchema);
