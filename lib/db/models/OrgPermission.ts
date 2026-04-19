import { Schema, model, models, type Document, type Types } from "mongoose";

export type OrgPermissionKey =
  | "sell:retail"
  | "distribute:stock"
  | "has:inventory"
  | "earn:commission"
  | "submit:orders";

export interface IOrgPermission extends Document {
  organizationId: Types.ObjectId;
  permission: OrgPermissionKey;
  isGranted: boolean;
  grantedBy: Types.ObjectId;
  expiresAt?: Date | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrgPermissionSchema = new Schema<IOrgPermission>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    permission: {
      type: String,
      required: true,
      enum: ["sell:retail", "distribute:stock", "has:inventory", "earn:commission", "submit:orders"] as OrgPermissionKey[],
    },
    isGranted: { type: Boolean, default: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, default: null },
    notes: { type: String },
  },
  { timestamps: true }
);

OrgPermissionSchema.index({ organizationId: 1, permission: 1 }, { unique: true });
OrgPermissionSchema.index({ organizationId: 1, isGranted: 1 });

export const OrgPermission =
  models.OrgPermission || model<IOrgPermission>("OrgPermission", OrgPermissionSchema);
