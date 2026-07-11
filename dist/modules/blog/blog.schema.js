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
    .transform((t) => t.toLowerCase().replace(/\s+/g, "-"));
exports.createBlogSchema = zod_1.z
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
    excerpt: zod_1.z.string().max(500).optional().default(""),
    tags: zod_1.z.array(tagSchema).max(20).optional().default([]),
    coverImage: zod_1.z
        .union([zod_1.z.null(), zod_1.z.string().url("coverImage must be a valid URL")])
        .optional()
        .nullable(),
    /** Optional upload document id — resolved to coverImage URL via Upload module */
    coverUploadId: zod_1.z.string().min(1).optional(),
    status: zod_1.z.enum(blog_model_1.BLOG_STATUS).optional().default("DRAFT"),
})
    .strict();
exports.updateBlogSchema = zod_1.z
    .object({
    title: zod_1.z.string().trim().min(1).max(200).optional(),
    content: zod_1.z.string().min(1).max(100000).optional(),
    excerpt: zod_1.z.string().max(500).optional(),
    tags: zod_1.z.array(tagSchema).max(20).optional(),
    coverImage: zod_1.z
        .union([zod_1.z.null(), zod_1.z.string().url("coverImage must be a valid URL")])
        .optional()
        .nullable(),
    coverUploadId: zod_1.z.string().min(1).optional(),
    status: zod_1.z.enum(blog_model_1.BLOG_STATUS).optional(),
})
    .strict()
    .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
});
exports.blogIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.blogSlugParamSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1).max(100),
});
exports.blogTagParamSchema = zod_1.z.object({
    tag: zod_1.z.string().min(1).max(40),
});
exports.blogListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
});
