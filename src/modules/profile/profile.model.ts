import mongoose from "mongoose";

export const PROFILE_VISIBILITY = ["PUBLIC", "COMMUNITY", "PRIVATE"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[number];

/**
 * Profile entity — user-facing presentation only.
 * Identity/auth fields live on User (Auth module).
 */
const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, default: "", maxlength: 1000 },
    avatar: { type: String, default: null },
    coverImage: { type: String, default: null },
    pronouns: { type: String, default: "", maxlength: 40 },
    location: { type: String, default: "", maxlength: 80 },
    website: { type: String, default: "", maxlength: 200 },
    dateOfBirth: { type: Date, default: null },
    visibility: {
      type: String,
      enum: PROFILE_VISIBILITY,
      default: "COMMUNITY",
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export type ProfileDocument = mongoose.InferSchemaType<typeof profileSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Profile = mongoose.model("Profile", profileSchema);
