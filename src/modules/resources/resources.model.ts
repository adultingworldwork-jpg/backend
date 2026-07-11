import mongoose from "mongoose";

export const RESOURCE_STATUS = ["DRAFT", "PUBLISHED"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUS)[number];

/**
 * Curated therapy / wellness resource library entry.
 * Not booking — content only.
 */
const resourceSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, default: "", maxlength: 500 },
    content: { type: String, required: true },
    category: { type: String, required: true, trim: true, index: true },
    tags: { type: [String], default: [], index: true },
    coverImage: { type: String, default: null },
    estimatedReadMinutes: { type: Number, default: 5, min: 1, max: 240 },
    featured: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: RESOURCE_STATUS,
      default: "DRAFT",
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

resourceSchema.index({ status: 1, publishedAt: -1 });
resourceSchema.index({ status: 1, featured: 1, publishedAt: -1 });
resourceSchema.index({ category: 1, status: 1, publishedAt: -1 });
resourceSchema.index({ authorId: 1, updatedAt: -1 });

export const Resource = mongoose.model("Resource", resourceSchema);
