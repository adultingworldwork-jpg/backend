import { z } from "zod";
import { PROFILE_VISIBILITY } from "./profile.model";

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Display name is required")
      .max(30, "Display name must be at most 30 characters")
      .optional()
      .describe("Public display name (1–30 characters)"),
    bio: z
      .string()
      .max(1000, "Bio must be at most 1000 characters")
      .optional()
      .describe("Profile bio (max 1000 characters)"),
    pronouns: z
      .string()
      .max(40, "Pronouns must be at most 40 characters")
      .optional()
      .describe("Pronouns (max 40 characters)"),
    location: z
      .string()
      .max(80, "Location must be at most 80 characters")
      .optional()
      .describe("Free-text location (max 80 characters)"),
    website: z
      .union([
        z.literal(""),
        z.string().trim().url("Website must be a valid URL").max(200),
      ])
      .optional()
      .describe("Personal website URL, or empty string to clear"),
    dateOfBirth: z
      .union([
        z.null(),
        z.string().datetime({ offset: true }),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD or ISO date"),
      ])
      .optional()
      .describe("Date of birth as YYYY-MM-DD, ISO datetime, or null"),
    visibility: z
      .enum(PROFILE_VISIBILITY)
      .optional()
      .describe("Who can view this profile: PUBLIC | COMMUNITY | PRIVATE"),
    preferences: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Free-form client preferences object"),
  })
  .strict();

export const mediaRefSchema = z
  .object({
    url: z
      .string()
      .url("url must be a valid URL")
      .optional()
      .describe("Direct media URL"),
    uploadId: z
      .string()
      .min(1)
      .optional()
      .describe("Existing upload document id from Files module"),
  })
  .strict()
  .refine((v) => Boolean(v.url || v.uploadId), {
    message: "Provide url or uploadId",
  });

export const usernameParamSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .describe("Auth username to look up"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type MediaRefInput = z.infer<typeof mediaRefSchema>;
