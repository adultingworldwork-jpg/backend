import { z } from "zod";
import { RESOURCE_STATUS } from "./resources.model";

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .transform((t) => t.toLowerCase().replace(/\s+/g, "-"));

export const createResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    summary: z.string().max(500).optional().default(""),
    content: z.string().min(1).max(100_000),
    category: z.string().trim().min(1).max(80),
    tags: z.array(tagSchema).max(20).optional().default([]),
    coverImage: z
      .union([z.null(), z.string().url("coverImage must be a valid URL")])
      .optional()
      .nullable(),
    coverUploadId: z.string().min(1).optional(),
    estimatedReadMinutes: z.coerce.number().int().min(1).max(240).optional().default(5),
    featured: z.boolean().optional().default(false),
    status: z.enum(RESOURCE_STATUS).optional().default("DRAFT"),
  })
  .strict();

export const updateResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    summary: z.string().max(500).optional(),
    content: z.string().min(1).max(100_000).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    tags: z.array(tagSchema).max(20).optional(),
    coverImage: z
      .union([z.null(), z.string().url("coverImage must be a valid URL")])
      .optional()
      .nullable(),
    coverUploadId: z.string().min(1).optional(),
    estimatedReadMinutes: z.coerce.number().int().min(1).max(240).optional(),
    featured: z.boolean().optional(),
    status: z.enum(RESOURCE_STATUS).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const resourceIdParamSchema = z.object({ id: z.string().min(1) });
export const resourceSlugParamSchema = z.object({
  slug: z.string().min(1).max(100),
});
export const resourceCategoryParamSchema = z.object({
  category: z.string().min(1).max(80),
});
export const resourceTagParamSchema = z.object({
  tag: z.string().min(1).max(40),
});
export const resourceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ResourceListQuery = z.infer<typeof resourceListQuerySchema>;
