"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogListQuerySchema = exports.blogTagParamSchema = exports.blogSlugParamSchema = exports.blogIdParamSchema = exports.updateBlogSchema = exports.createBlogSchema = void 0;
const zod_1 = require("zod");
const blog_model_1 = require("./blog.model");
const tagSchema = zod_1.z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((t) => t.toLowerCase().replace(/\s+/g, "-"))
    .describe("Tag string (normalized to lowercase kebab-case, max 40 chars)");
exports.createBlogSchema = zod_1.z
    .object({
    title: zod_1.z
        .string()
        .trim()
        .min(1, "Title is required")
        .max(200, "Title must be at most 200 characters")
        .describe("Post title (1–200 characters)"),
    content: zod_1.z
        .string()
        .min(1, "Content is required")
        .max(100000, "Content is too long")
        .describe("Full post body (max 100,000 characters)"),
    excerpt: zod_1.z
        .string()
        .max(500)
        .optional()
        .default("")
        .describe("Short summary for feeds (max 500 characters)"),
    tags: zod_1.z
        .array(tagSchema)
        .max(20)
        .optional()
        .default([])
        .describe("Up to 20 tags"),
    coverImage: zod_1.z
        .union([zod_1.z.null(), zod_1.z.string().url("coverImage must be a valid URL")])
        .optional()
        .nullable()
        .describe("Cover image URL, or null to clear"),
    coverUploadId: zod_1.z
        .string()
        .min(1)
        .optional()
        .describe("Upload document id resolved to coverImage URL via Files module"),
    status: zod_1.z
        .enum(blog_model_1.BLOG_STATUS)
        .optional()
        .default("DRAFT")
        .describe("DRAFT or PUBLISHED (default DRAFT)"),
})
    .strict();
exports.updateBlogSchema = zod_1.z
    .object({
    title: zod_1.z.string().trim().min(1).max(200).optional().describe("Post title"),
    content: zod_1.z.string().min(1).max(100000).optional().describe("Full post body"),
    excerpt: zod_1.z.string().max(500).optional().describe("Short summary"),
    tags: zod_1.z.array(tagSchema).max(20).optional().describe("Replace tags (max 20)"),
    coverImage: zod_1.z
        .union([zod_1.z.null(), zod_1.z.string().url("coverImage must be a valid URL")])
        .optional()
        .nullable()
        .describe("Cover image URL or null"),
    coverUploadId: zod_1.z
        .string()
        .min(1)
        .optional()
        .describe("Upload id for cover image"),
    status: zod_1.z.enum(blog_model_1.BLOG_STATUS).optional().describe("DRAFT or PUBLISHED"),
})
    .strict()
    .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
});
exports.blogIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).describe("Blog post id"),
});
exports.blogSlugParamSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1).max(100).describe("URL slug of the post"),
});
exports.blogTagParamSchema = zod_1.z.object({
    tag: zod_1.z.string().min(1).max(40).describe("Tag to filter by"),
});
exports.blogListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe("Page number (1-based, default 1)"),
    limit: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Page size (default 20, max 100)"),
});
