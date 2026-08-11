import mongoose from "mongoose";

export const MESSAGE_TYPES = ["TEXT", "IMAGE", "FILE", "SYSTEM"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

const attachmentSchema = new mongoose.Schema(
  {
    uploadId: { type: String },
    url: { type: String, required: true },
  },
  { _id: false },
);

export const CONVERSATION_STATUSES = ["active", "ended"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/**
 * One conversation per unique pair of users.
 * participantA / participantB are ordered lexicographically (A < B).
 *
 * Safe Space support sessions add optional metadata (category/status/labels)
 * so therapist/admin inboxes can filter without a second data store.
 */
const conversationSchema = new mongoose.Schema(
  {
    participantA: { type: String, required: true, index: true },
    participantB: { type: String, required: true, index: true },
    lastMessageId: { type: String, default: null },
    lastMessageAt: { type: Date, default: null, index: true },
    /** Support-session category (e.g. Emotional Support) */
    category: { type: String, default: null, trim: true },
    /** active | ended — therapists only see active by default in UI */
    status: {
      type: String,
      enum: CONVERSATION_STATUSES,
      default: "active",
      index: true,
    },
    /** User-facing display name chosen at chat start (not the account username) */
    clientLabel: { type: String, default: null, trim: true },
    /** Therapist roster id when session was assigned (optional) */
    assignedTherapistId: { type: String, default: null, index: true },
    /** Therapist display name for inbox UI */
    assignedTherapistName: { type: String, default: null, trim: true },
  },
  { timestamps: true },
);

conversationSchema.index(
  { participantA: 1, participantB: 1 },
  { unique: true },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: MESSAGE_TYPES,
      default: "TEXT",
    },
    content: { type: String, default: "", maxlength: 10_000 },
    attachments: { type: [attachmentSchema], default: [] },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
export const Message = mongoose.model("Message", messageSchema);

/** Normalize pair so A < B lexicographically */
export function orderParticipants(
  userId1: string,
  userId2: string,
): { participantA: string; participantB: string } {
  if (userId1 === userId2) {
    throw new Error("Cannot create conversation with self");
  }
  return userId1 < userId2
    ? { participantA: userId1, participantB: userId2 }
    : { participantA: userId2, participantB: userId1 };
}
