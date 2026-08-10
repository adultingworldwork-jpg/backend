"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityListQuerySchema = exports.commentIdParamSchema = exports.communityIdParamSchema = exports.reactionSchema = exports.updateCommentSchema = exports.createCommentSchema = exports.updateCommunityPostSchema = exports.createCommunityPostSchema = void 0;
const zod_1 = require("zod");
const community_model_1 = require("./community.model");
exports.createCommunityPostSchema = zod_1.z
    .object({
    content: zod_1.z
        .string()
        .trim()
        .min(1, "Content is required")
        .max(5000, "Content must be at most 5000 characters")
        .describe("Post body (1–5000 characters)"),
    visibility: zod_1.z
        .enum(community_model_1.COMMUNITY_VISIBILITY)
        .optional()
        .default("COMMUNITY")
        .describe("PUBLIC or COMMUNITY (default COMMUNITY)"),
    attachmentUploadIds: zod_1.z
        .array(zod_1.z.string().min(1))
        .max(5)
        .optional()
        .default([])
        .describe("Up to 5 existing upload ids resolved to attachment URLs"),
})
    .strict();
exports.updateCommunityPostSchema = zod_1.z
    .object({
    content: zod_1.z.string().trim().min(1).max(5000).optional(),
    visibility: zod_1.z.enum(community_model_1.COMMUNITY_VISIBILITY).optional(),
    attachmentUploadIds: zod_1.z.array(zod_1.z.string().min(1)).max(5).optional(),
})
    .strict()
    .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
});
exports.createCommentSchema = zod_1.z
    .object({
    content: zod_1.z
        .string()
        .trim()
        .min(1, "Content is required")
        .max(2000, "Comment must be at most 2000 characters"),
})
    .strict();
exports.updateCommentSchema = zod_1.z
    .object({
    content: zod_1.z.string().trim().min(1).max(2000),
})
    .strict();
exports.reactionSchema = zod_1.z
    .object({
    type: zod_1.z
        .enum(community_model_1.REACTION_TYPES)
        .describe("Reaction type: LIKE | SUPPORT | HUG | THANKFUL"),
})
    .strict();
exports.communityIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).describe("Community post id"),
});
exports.commentIdParamSchema = zod_1.z.object({
    commentId: zod_1.z.string().min(1),
});
exports.communityListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20).describe("Page size (default 20, max 100)"),
});
