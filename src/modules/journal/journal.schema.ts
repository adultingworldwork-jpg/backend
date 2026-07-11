import { z } from "zod";
import { JOURNAL_MOODS } from "./journal.model";

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .transform((t) => t.toLowerCase().replace(/\s+/g, "-"));

export const createJournalSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    content: z
      .string()
      .min(1, "Content is required")
      .max(100_000, "Content is too long"),
    mood: z.enum(JOURNAL_MOODS).optional().default("OTHER"),
    tags: z.array(tagSchema).max(20).optional().default([]),
    attachmentUploadIds: z
      .array(z.string().min(1))
      .max(10)
      .optional()
      .default([]),
  })
  .strict();

export const updateJournalSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().min(1).max(100_000).optional(),
    mood: z.enum(JOURNAL_MOODS).optional(),
    tags: z.array(tagSchema).max(20).optional(),
    attachmentUploadIds: z.array(z.string().min(1)).max(10).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const journalIdParamSchema = z.object({
  id: z.string().min(1),
});

export const journalListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  mood: z.enum(JOURNAL_MOODS).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  /** Inclusive start (ISO date or YYYY-MM-DD) */
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, "from must be YYYY-MM-DD or ISO datetime")
    .optional(),
  /** Inclusive end (ISO date or YYYY-MM-DD) */
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, "to must be YYYY-MM-DD or ISO datetime")
    .optional(),
});

export type CreateJournalInput = z.infer<typeof createJournalSchema>;
export type UpdateJournalInput = z.infer<typeof updateJournalSchema>;
export type JournalListQuery = z.infer<typeof journalListQuerySchema>;
