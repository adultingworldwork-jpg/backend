import { z } from "zod";
import { MESSAGE_TYPES } from "./chat.model";

export const createConversationSchema = z
  .object({
    participantId: z.string().min(1, "participantId is required").describe("Other user id for the 1:1 conversation"),
  })
  .strict();

export const sendMessageBodySchema = z
  .object({
    type: z.enum(MESSAGE_TYPES).optional().default("TEXT"),
    content: z.string().max(10_000).optional().default(""),
    attachmentUploadIds: z
      .array(z.string().min(1))
      .max(5)
      .optional()
      .default([]),
  })
  .strict()
  .refine(
    (v) =>
      (v.content && v.content.trim().length > 0) ||
      (v.attachmentUploadIds && v.attachmentUploadIds.length > 0) ||
      v.type === "SYSTEM",
    { message: "Message must have content or attachments" },
  );

export const conversationIdParamSchema = z.object({
  id: z.string().min(1).describe("Conversation id"),
});

export const messageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30).describe("Page size (default 30, max 100)"),
  before: z.string().optional().describe("Optional cursor: ISO createdAt of oldest message already loaded"),
});

export const conversationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageBodySchema>;
export type MessageListQuery = z.infer<typeof messageListQuerySchema>;
export type ConversationListQuery = z.infer<typeof conversationListQuerySchema>;
