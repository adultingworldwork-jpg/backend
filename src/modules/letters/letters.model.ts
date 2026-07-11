import mongoose from "mongoose";

export const LETTER_TYPES = ["PRIVATE", "PUBLIC"] as const;
export type LetterType = (typeof LETTER_TYPES)[number];

export const LETTER_STATUSES = ["DRAFT", "SENT", "READ", "ARCHIVED"] as const;
export type LetterStatus = (typeof LETTER_STATUSES)[number];

export const LETTER_MOODS = [
  "HAPPY",
  "CALM",
  "SAD",
  "ANXIOUS",
  "STRESSED",
  "ANGRY",
  "HOPEFUL",
  "EXCITED",
  "TIRED",
  "OTHER",
] as const;
export type LetterMood = (typeof LETTER_MOODS)[number];

const attachmentSchema = new mongoose.Schema(
  {
    uploadId: { type: String },
    url: { type: String, required: true },
  },
  { _id: false },
);

/**
 * Standalone emotional letter — not a chat thread.
 * No replies, no conversation.
 */
const letterSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true, index: true },
    recipientId: { type: String, default: null, index: true },
    type: {
      type: String,
      enum: LETTER_TYPES,
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 20_000 },
    mood: {
      type: String,
      enum: LETTER_MOODS,
      default: "OTHER",
    },
    attachments: { type: [attachmentSchema], default: [] },
    status: {
      type: String,
      enum: LETTER_STATUSES,
      default: "DRAFT",
      index: true,
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

letterSchema.index({ senderId: 1, createdAt: -1 });
letterSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
letterSchema.index({ type: 1, status: 1, deliveredAt: -1 });

export const Letter = mongoose.model("Letter", letterSchema);
