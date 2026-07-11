import mongoose from "mongoose";

export const COMMUNITY_VISIBILITY = ["PUBLIC", "COMMUNITY"] as const;
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITY)[number];

export const REACTION_TYPES = ["LIKE", "SUPPORT", "HUG", "THANKFUL"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

const attachmentSchema = new mongoose.Schema(
  {
    uploadId: { type: String },
    url: { type: String, required: true },
  },
  { _id: false },
);

const communityPostSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
    visibility: {
      type: String,
      enum: COMMUNITY_VISIBILITY,
      default: "COMMUNITY",
      index: true,
    },
    commentsCount: { type: Number, default: 0 },
    reactionsCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ authorId: 1, createdAt: -1 });
communityPostSchema.index({ visibility: 1, createdAt: -1 });

const communityCommentSchema = new mongoose.Schema(
  {
    postId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true },
);

communityCommentSchema.index({ postId: 1, createdAt: -1 });

const communityReactionSchema = new mongoose.Schema(
  {
    postId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: REACTION_TYPES,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

communityReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const CommunityPost = mongoose.model(
  "CommunityPost",
  communityPostSchema,
);
export const CommunityComment = mongoose.model(
  "CommunityComment",
  communityCommentSchema,
);
export const CommunityReaction = mongoose.model(
  "CommunityReaction",
  communityReactionSchema,
);
