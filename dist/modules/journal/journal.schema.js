"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.journalListQuerySchema = exports.journalIdParamSchema = exports.updateJournalSchema = exports.createJournalSchema = void 0;
const zod_1 = require("zod");
const journal_model_1 = require("./journal.model");
const tagSchema = zod_1.z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((t) => t.toLowerCase().replace(/\s+/g, "-"));
exports.createJournalSchema = zod_1.z
    .object({
    title: zod_1.z
        .string()
        .trim()
        .min(1, "Title is required")
        .max(200, "Title must be at most 200 characters"),
    content: zod_1.z
        .string()
        .min(1, "Content is required")
        .max(100000, "Content is too long"),
    mood: zod_1.z.enum(journal_model_1.JOURNAL_MOODS).optional().default("OTHER"),
    tags: zod_1.z.array(tagSchema).max(20).optional().default([]),
    attachmentUploadIds: zod_1.z
        .array(zod_1.z.string().min(1))
        .max(10)
        .optional()
        .default([]),
})
    .strict();
exports.updateJournalSchema = zod_1.z
    .object({
    title: zod_1.z.string().trim().min(1).max(200).optional(),
    content: zod_1.z.string().min(1).max(100000).optional(),
    mood: zod_1.z.enum(journal_model_1.JOURNAL_MOODS).optional(),
    tags: zod_1.z.array(tagSchema).max(20).optional(),
    attachmentUploadIds: zod_1.z.array(zod_1.z.string().min(1)).max(10).optional(),
})
    .strict()
    .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
});
exports.journalIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.journalListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
    mood: zod_1.z.enum(journal_model_1.JOURNAL_MOODS).optional(),
    tag: zod_1.z.string().trim().min(1).max(40).optional(),
    /** Inclusive start (ISO date or YYYY-MM-DD) */
    from: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}/, "from must be YYYY-MM-DD or ISO datetime")
        .optional(),
    /** Inclusive end (ISO date or YYYY-MM-DD) */
    to: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}/, "to must be YYYY-MM-DD or ISO datetime")
        .optional(),
});
