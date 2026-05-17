import { Schema, model, models, type Document } from "mongoose";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import type { UserRole } from "@/types";

export { DEFAULT_ROLE_PERMISSIONS };

export interface IRole extends Document {
  name: UserRole;
  displayName: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["ADMIN", "ORG_ADMIN", "BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER", "MEMBER", "CUSTOMER"],
    },
    displayName: { type: String, required: true },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RoleSchema.index({ deletedAt: 1 });

export const Role = models.Role || model<IRole>("Role", RoleSchema);
