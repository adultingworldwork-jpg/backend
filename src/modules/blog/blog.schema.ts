import { z } from "zod";
import { BLOG_STATUS } from "./blog.model";

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .transform((t) => t.toLowerCase().replace(/\s+/g, "-"));

export const createBlogSchema = z
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
    excerpt: z.string().max(500).optional().default(""),
    tags: z.array(tagSchema).max(20).optional().default([]),
    coverImage: z
      .union([z.null(), z.string().url("coverImage must be a valid URL")])
      .optional()
      .nullable(),
    /** Optional upload document id — resolved to coverImage URL via Upload module */
    coverUploadId: z.string().min(1).optional(),
    status: z.enum(BLOG_STATUS).optional().default("DRAFT"),
  })
  .strict();

export const updateBlogSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().min(1).max(100_000).optional(),
    excerpt: z.string().max(500).optional(),
    tags: z.array(tagSchema).max(20).optional(),
    coverImage: z
      .union([z.null(), z.string().url("coverImage must be a valid URL")])
      .optional()
      .nullable(),
    coverUploadId: z.string().min(1).optional(),
    status: z.enum(BLOG_STATUS).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const blogIdParamSchema = z.object({
  id: z.string().min(1),
});

export const blogSlugParamSchema = z.object({
  slug: z.string().min(1).max(100),
});

export const blogTagParamSchema = z.object({
  tag: z.string().min(1).max(40),
});

export const blogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
export type BlogListQuery = z.infer<typeof blogListQuerySchema>;
