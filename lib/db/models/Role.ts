import { Schema, model, models, type Document } from "mongoose";
import type { UserRole } from "@/types";

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
      enum: ["ADMIN", "BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER", "MEMBER"],
    },
    displayName: { type: String, required: true },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RoleSchema.index({ name: 1 }, { unique: true });
RoleSchema.index({ deletedAt: 1 });

export const Role = models.Role || model<IRole>("Role", RoleSchema);

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    "manage:branches",
    "manage:users",
    "manage:products",
    "manage:inventory",
    "use:pos",
    "view:reports",
    "manage:members",
    "manage:orders",
    "manage:roles",
  ],
  BRANCH_MANAGER: [
    "manage:products",
    "manage:inventory",
    "use:pos",
    "view:reports",
    "manage:members",
    "manage:orders",
  ],
  STAFF: ["use:pos", "manage:members", "manage:orders"],
  INVENTORY_MANAGER: ["manage:inventory", "view:reports"],
  MEMBER: ["view:own_orders"],
};
