"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LETTER_MOODS = exports.LETTER_TYPES = exports.LETTER_STATUSES = exports.letterListQuerySchema = exports.letterIdParamSchema = exports.updateLetterSchema = exports.createLetterSchema = void 0;
const zod_1 = require("zod");
const letters_model_1 = require("./letters.model");
Object.defineProperty(exports, "LETTER_MOODS", { enumerable: true, get: function () { return letters_model_1.LETTER_MOODS; } });
Object.defineProperty(exports, "LETTER_STATUSES", { enumerable: true, get: function () { return letters_model_1.LETTER_STATUSES; } });
Object.defineProperty(exports, "LETTER_TYPES", { enumerable: true, get: function () { return letters_model_1.LETTER_TYPES; } });
exports.createLetterSchema = zod_1.z
    .object({
    type: zod_1.z.enum(letters_model_1.LETTER_TYPES).describe("PRIVATE (requires recipientId) or PUBLIC"),
    title: zod_1.z
        .string()
        .trim()
        .min(1, "Title is required")
        .max(200, "Title must be at most 200 characters"),
    content: zod_1.z
        .string()
        .min(1, "Content is required")
        .max(20000, "Content is too long"),
    mood: zod_1.z.enum(letters_model_1.LETTER_MOODS).optional().default("OTHER"),
    recipientId: zod_1.z.string().min(1).optional().nullable(),
    attachmentUploadIds: zod_1.z
        .array(zod_1.z.string().min(1))
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
exports.updateLetterSchema = zod_1.z
    .object({
    title: zod_1.z.string().trim().min(1).max(200).optional(),
    content: zod_1.z.string().min(1).max(20000).optional(),
    mood: zod_1.z.enum(letters_model_1.LETTER_MOODS).optional(),
    type: zod_1.z.enum(letters_model_1.LETTER_TYPES).optional(),
    recipientId: zod_1.z.string().min(1).optional().nullable(),
    attachmentUploadIds: zod_1.z.array(zod_1.z.string().min(1)).max(5).optional(),
})
    .strict()
    .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
});
exports.letterIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).describe("Letter id"),
});
exports.letterListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20).describe("Page size (default 20, max 100)"),
});
