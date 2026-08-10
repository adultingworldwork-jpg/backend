"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceListQuerySchema = exports.resourceTagParamSchema = exports.resourceCategoryParamSchema = exports.resourceSlugParamSchema = exports.resourceIdParamSchema = exports.updateResourceSchema = exports.createResourceSchema = void 0;
const zod_1 = require("zod");
const resources_model_1 = require("./resources.model");
const tagSchema = zod_1.z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((t) => t.toLowerCase().replace(/\s+/g, "-"));
exports.createResourceSchema = zod_1.z
    .object({
    title: zod_1.z.string().trim().min(1).max(200),
    summary: zod_1.z.string().max(500).optional().default(""),
    content: zod_1.z.string().min(1).max(100000),
    category: zod_1.z.string().trim().min(1).max(80),
    tags: zod_1.z.array(tagSchema).max(20).optional().default([]),
    coverImage: zod_1.z
        .union([zod_1.z.null(), zod_1.z.string().url("coverImage must be a valid URL")])
        .optional()
        .nullable(),
    coverUploadId: zod_1.z.string().min(1).optional(),
    estimatedReadMinutes: zod_1.z.coerce.number().int().min(1).max(240).optional().default(5),
    featured: zod_1.z.boolean().optional().default(false),
    status: zod_1.z.enum(resources_model_1.RESOURCE_STATUS).optional().default("DRAFT"),
})
    .strict();
exports.updateResourceSchema = zod_1.z
    .object({
    title: zod_1.z.string().trim().min(1).max(200).optional(),
    summary: zod_1.z.string().max(500).optional(),
    content: zod_1.z.string().min(1).max(100000).optional(),
    category: zod_1.z.string().trim().min(1).max(80).optional(),
    tags: zod_1.z.array(tagSchema).max(20).optional(),
    coverImage: zod_1.z
        .union([zod_1.z.null(), zod_1.z.string().url("coverImage must be a valid URL")])
        .optional()
        .nullable(),
    coverUploadId: zod_1.z.string().min(1).optional(),
    estimatedReadMinutes: zod_1.z.coerce.number().int().min(1).max(240).optional(),
    featured: zod_1.z.boolean().optional(),
    status: zod_1.z.enum(resources_model_1.RESOURCE_STATUS).optional(),
})
    .strict()
    .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
});
exports.resourceIdParamSchema = zod_1.z.object({ id: zod_1.z.string().min(1).describe("Resource id") });
exports.resourceSlugParamSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1).max(100).describe("URL slug"),
});
exports.resourceCategoryParamSchema = zod_1.z.object({
    category: zod_1.z.string().min(1).max(80),
});
exports.resourceTagParamSchema = zod_1.z.object({
    tag: zod_1.z.string().min(1).max(40),
});
exports.resourceListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20).describe("Page size (default 20, max 100)"),
});
