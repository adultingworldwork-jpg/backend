import { z } from "zod";

export const uploadPurposeSchema = z
  .enum([
    "blog_cover",
    "book_cover",
    "book_pdf",
    "avatar",
    "cover",
    "general",
  ])
  .default("general");

export type UploadPurpose = z.infer<typeof uploadPurposeSchema>;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Max bytes by purpose (matches product admin UX) */
export const MAX_SIZE_BY_PURPOSE: Record<UploadPurpose, number> = {
  blog_cover: 5 * 1024 * 1024,
  book_cover: 5 * 1024 * 1024,
  avatar: 5 * 1024 * 1024,
  cover: 5 * 1024 * 1024,
  general: 5 * 1024 * 1024,
  book_pdf: 10 * 1024 * 1024,
};
