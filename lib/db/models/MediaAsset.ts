import mongoose, { Schema, model, type Document, type Types } from "mongoose";

export interface IMediaAsset extends Document {
  url: string;
  publicId: string;
  filename?: string;
  mimeType: string;
  bytes: number;
  folder: string;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    filename: { type: String, trim: true },
    mimeType: { type: String, required: true },
    bytes: { type: Number, required: true, min: 0 },
    folder: { type: String, required: true, trim: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MediaAssetSchema.index({ deletedAt: 1, createdAt: -1 });
MediaAssetSchema.index({ publicId: 1 }, { unique: true });
MediaAssetSchema.index({ filename: 1 });

export const MediaAsset =
  (mongoose.models.MediaAsset as mongoose.Model<IMediaAsset> | undefined) ??
  model<IMediaAsset>("MediaAsset", MediaAssetSchema);
