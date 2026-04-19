import { Schema, model, models, type Document, type Types } from "mongoose";

export type CommissionStatus = "pending" | "paid" | "cancelled";

export interface ICommission extends Document {
  organizationId: Types.ObjectId;
  orderId: Types.ObjectId;
  saleAmount: number;
  rate: number;
  amount: number;
  status: CommissionStatus;
  paidAt?: Date | null;
  paidBy?: Types.ObjectId | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionSchema = new Schema<ICommission>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    saleAmount: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0, max: 100 },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"] as CommissionStatus[],
      default: "pending",
    },
    paidAt: { type: Date, default: null },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String },
  },
  { timestamps: true }
);

CommissionSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
CommissionSchema.index({ orderId: 1 }, { unique: true });
CommissionSchema.index({ status: 1, createdAt: -1 });

export const Commission =
  models.Commission || model<ICommission>("Commission", CommissionSchema);
