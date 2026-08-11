import mongoose from "mongoose";

/**
 * Admin-managed Safe Space therapist roster.
 * Access codes are 4-digit PIN codes set by admins (shown in Admin UI).
 *
 * Each therapist is linked to a platform User (role `therapist`) so they can
 * authenticate (JWT) and participate in Chat as a real participant.
 */
const therapistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameNormalized: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    specialty: { type: String, default: "", trim: true },
    /** 4-digit access code (product requirement: admin can view/share the PIN) */
    code: { type: String, required: true, match: /^\d{4}$/, index: true },
    /**
     * Linked User id (role therapist). Used for chat participation + JWT login.
     * Lazily backfilled for legacy roster rows on verify/create.
     */
    userId: { type: String, default: null, index: true },
    repliesCount: { type: Number, default: 0, min: 0 },
    sessionsAttended: { type: Number, default: 0, min: 0 },
    lastLoginAt: { type: Date, default: null },
    createdBy: { type: String, default: null },
  },
  { timestamps: true },
);

therapistSchema.index({ code: 1 }, { unique: true });

export const Therapist = mongoose.model("Therapist", therapistSchema);
