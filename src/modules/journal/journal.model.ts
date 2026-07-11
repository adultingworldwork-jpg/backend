import mongoose from "mongoose";

export const JOURNAL_MOODS = [
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

export type JournalMood = (typeof JOURNAL_MOODS)[number];

const attachmentSchema = new mongoose.Schema(
  {
    uploadId: { type: String },
    url: { type: String, required: true },
  },
  { _id: false },
);

/**
 * Private journal entry — owner-only.
 * Never query without ownerId filter in the service layer.
 */
const journalSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 100_000 },
    mood: {
      type: String,
      enum: JOURNAL_MOODS,
      default: "OTHER",
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true },
);

journalSchema.index({ ownerId: 1, createdAt: -1 });
journalSchema.index({ ownerId: 1, mood: 1, createdAt: -1 });
journalSchema.index({ ownerId: 1, tags: 1, createdAt: -1 });

export const Journal = mongoose.model("Journal", journalSchema);
