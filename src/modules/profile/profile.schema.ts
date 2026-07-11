import { z } from "zod";
import { PROFILE_VISIBILITY } from "./profile.model";

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Display name is required")
      .max(30, "Display name must be at most 30 characters")
      .optional(),
    bio: z.string().max(1000, "Bio must be at most 1000 characters").optional(),
    pronouns: z
      .string()
      .max(40, "Pronouns must be at most 40 characters")
      .optional(),
    location: z
      .string()
      .max(80, "Location must be at most 80 characters")
      .optional(),
    website: z
      .union([
        z.literal(""),
        z.string().trim().url("Website must be a valid URL").max(200),
      ])
      .optional(),
    dateOfBirth: z
      .union([
        z.null(),
        z.string().datetime({ offset: true }),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD or ISO date"),
      ])
      .optional(),
    visibility: z.enum(PROFILE_VISIBILITY).optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const mediaRefSchema = z
  .object({
    url: z.string().url("url must be a valid URL").optional(),
    uploadId: z.string().min(1).optional(),
  })
  .strict()
  .refine((v) => Boolean(v.url || v.uploadId), {
    message: "Provide url or uploadId",
  });

export const usernameParamSchema = z.object({
  username: z.string().trim().min(1).max(30),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type MediaRefInput = z.infer<typeof mediaRefSchema>;
