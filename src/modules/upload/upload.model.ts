import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema(
  {
    ownerId: { type: String, index: true },
    purpose: {
      type: String,
      enum: ["blog_cover", "book_cover", "book_pdf", "avatar", "cover", "general"],
      default: "general",
    },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    publicId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    resourceType: {
      type: String,
      enum: ["image", "raw", "video", "auto"],
      default: "image",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type UploadDocument = mongoose.InferSchemaType<typeof uploadSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Upload = mongoose.model("Upload", uploadSchema);
