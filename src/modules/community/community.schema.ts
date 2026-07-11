import { z } from "zod";
import {
  COMMUNITY_VISIBILITY,
  REACTION_TYPES,
} from "./community.model";

export const createCommunityPostSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(5000, "Content must be at most 5000 characters"),
    visibility: z.enum(COMMUNITY_VISIBILITY).optional().default("COMMUNITY"),
    /** Existing upload document ids — resolved to URL attachments */
    attachmentUploadIds: z.array(z.string().min(1)).max(5).optional().default([]),
  })
  .strict();

export const updateCommunityPostSchema = z
  .object({
    content: z.string().trim().min(1).max(5000).optional(),
    visibility: z.enum(COMMUNITY_VISIBILITY).optional(),
    attachmentUploadIds: z.array(z.string().min(1)).max(5).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const createCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(2000, "Comment must be at most 2000 characters"),
  })
  .strict();

export const updateCommentSchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
  })
  .strict();

export const reactionSchema = z
  .object({
    type: z.enum(REACTION_TYPES),
  })
  .strict();

export const communityIdParamSchema = z.object({
  id: z.string().min(1),
});

export const commentIdParamSchema = z.object({
  commentId: z.string().min(1),
});

export const communityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateCommunityPostInput = z.infer<typeof createCommunityPostSchema>;
export type UpdateCommunityPostInput = z.infer<typeof updateCommunityPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ReactionInput = z.infer<typeof reactionSchema>;
export type CommunityListQuery = z.infer<typeof communityListQuerySchema>;
