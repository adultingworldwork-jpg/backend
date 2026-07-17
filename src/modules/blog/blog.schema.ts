import { z } from "zod";
import { BLOG_STATUS } from "./blog.model";

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .transform((t) => t.toLowerCase().replace(/\s+/g, "-"))
  .describe("Tag string (normalized to lowercase kebab-case, max 40 chars)");

export const createBlogSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters")
      .describe("Post title (1–200 characters)"),
    content: z
      .string()
      .min(1, "Content is required")
      .max(100_000, "Content is too long")
      .describe("Full post body (max 100,000 characters)"),
    excerpt: z
      .string()
      .max(500)
      .optional()
      .default("")
      .describe("Short summary for feeds (max 500 characters)"),
    tags: z
      .array(tagSchema)
      .max(20)
      .optional()
      .default([])
      .describe("Up to 20 tags"),
    coverImage: z
      .union([z.null(), z.string().url("coverImage must be a valid URL")])
      .optional()
      .nullable()
      .describe("Cover image URL, or null to clear"),
    coverUploadId: z
      .string()
      .min(1)
      .optional()
      .describe("Upload document id resolved to coverImage URL via Files module"),
    status: z
      .enum(BLOG_STATUS)
      .optional()
      .default("DRAFT")
      .describe("DRAFT or PUBLISHED (default DRAFT)"),
  })
  .strict();

export const updateBlogSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional().describe("Post title"),
    content: z.string().min(1).max(100_000).optional().describe("Full post body"),
    excerpt: z.string().max(500).optional().describe("Short summary"),
    tags: z.array(tagSchema).max(20).optional().describe("Replace tags (max 20)"),
    coverImage: z
      .union([z.null(), z.string().url("coverImage must be a valid URL")])
      .optional()
      .nullable()
      .describe("Cover image URL or null"),
    coverUploadId: z
      .string()
      .min(1)
      .optional()
      .describe("Upload id for cover image"),
    status: z.enum(BLOG_STATUS).optional().describe("DRAFT or PUBLISHED"),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const blogIdParamSchema = z.object({
  id: z.string().min(1).describe("Blog post id"),
});

export const blogSlugParamSchema = z.object({
  slug: z.string().min(1).max(100).describe("URL slug of the post"),
});

export const blogTagParamSchema = z.object({
  tag: z.string().min(1).max(40).describe("Tag to filter by"),
});

export const blogListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe("Page number (1-based, default 1)"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Page size (default 20, max 100)"),
});

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
export type BlogListQuery = z.infer<typeof blogListQuerySchema>;
