import mongoose from "mongoose";

export const BLOG_STATUS = ["DRAFT", "PUBLISHED"] as const;
export type BlogStatus = (typeof BLOG_STATUS)[number];

const blogSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: "", maxlength: 500 },
    content: { type: String, required: true },
    coverImage: { type: String, default: null },
    tags: { type: [String], default: [], index: true },
    status: {
      type: String,
      enum: BLOG_STATUS,
      default: "DRAFT",
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ authorId: 1, updatedAt: -1 });
blogSchema.index({ tags: 1, status: 1, publishedAt: -1 });

export type BlogDocument = mongoose.InferSchemaType<typeof blogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Blog = mongoose.model("Blog", blogSchema);
