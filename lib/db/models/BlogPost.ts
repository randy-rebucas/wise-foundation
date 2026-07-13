import { Schema, model, models, type Document } from "mongoose";

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  summary: string;
  coverImage?: string;
  author: string;
  tags: string[];
  bodyMarkdown: string;
  isPublished: boolean;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    summary: { type: String, required: true, trim: true, maxlength: 300 },
    coverImage: { type: String },
    author: { type: String, default: "Team", trim: true },
    tags: [{ type: String, trim: true }],
    bodyMarkdown: { type: String, required: true },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BlogPostSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
BlogPostSchema.index({ isPublished: 1, publishedAt: -1, deletedAt: 1 });
BlogPostSchema.index({ title: "text", summary: "text" });

export const BlogPost = models.BlogPost || model<IBlogPost>("BlogPost", BlogPostSchema);
