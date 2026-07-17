import { z } from "zod";
import {
  LETTER_MOODS,
  LETTER_STATUSES,
  LETTER_TYPES,
} from "./letters.model";

export const createLetterSchema = z
  .object({
    type: z.enum(LETTER_TYPES).describe("PRIVATE (requires recipientId) or PUBLIC"),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    content: z
      .string()
      .min(1, "Content is required")
      .max(20_000, "Content is too long"),
    mood: z.enum(LETTER_MOODS).optional().default("OTHER"),
    recipientId: z.string().min(1).optional().nullable(),
    attachmentUploadIds: z
      .array(z.string().min(1))
      .max(5)
      .optional()
      .default([]),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.type === "PRIVATE" && !val.recipientId) {
      ctx.addIssue({
        code: "custom",
        message: "recipientId is required for PRIVATE letters",
        path: ["recipientId"],
      });
    }
    if (val.type === "PUBLIC" && val.recipientId) {
      ctx.addIssue({
        code: "custom",
        message: "recipientId must be empty for PUBLIC letters",
        path: ["recipientId"],
      });
    }
  });

export const updateLetterSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().min(1).max(20_000).optional(),
    mood: z.enum(LETTER_MOODS).optional(),
    type: z.enum(LETTER_TYPES).optional(),
    recipientId: z.string().min(1).optional().nullable(),
    attachmentUploadIds: z.array(z.string().min(1)).max(5).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const letterIdParamSchema = z.object({
  id: z.string().min(1).describe("Letter id"),
});

export const letterListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20).describe("Page size (default 20, max 100)"),
});

// status is server-managed; not accepted on create/update body
export type CreateLetterInput = z.infer<typeof createLetterSchema>;
export type UpdateLetterInput = z.infer<typeof updateLetterSchema>;
export type LetterListQuery = z.infer<typeof letterListQuerySchema>;

// re-export for docs / service
export { LETTER_STATUSES, LETTER_TYPES, LETTER_MOODS };
