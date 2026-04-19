import { Schema, model, models, type Document } from "mongoose";

export interface IAppSettings extends Document {
  appName: string;
  currency: string;
  timezone: string;
  setupCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    appName: { type: String, required: true, default: "Wise POS" },
    currency: { type: String, required: true, default: "PHP" },
    timezone: { type: String, required: true, default: "Asia/Manila" },
    setupCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AppSettings = models.AppSettings || model<IAppSettings>("AppSettings", AppSettingsSchema);
