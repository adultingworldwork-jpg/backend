"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationListQuerySchema = exports.messageListQuerySchema = exports.conversationIdParamSchema = exports.sendMessageBodySchema = exports.createConversationSchema = void 0;
const zod_1 = require("zod");
const chat_model_1 = require("./chat.model");
exports.createConversationSchema = zod_1.z
    .object({
    participantId: zod_1.z.string().min(1, "participantId is required").describe("Other user id for the 1:1 conversation"),
})
    .strict();
exports.sendMessageBodySchema = zod_1.z
    .object({
    type: zod_1.z.enum(chat_model_1.MESSAGE_TYPES).optional().default("TEXT"),
    content: zod_1.z.string().max(10000).optional().default(""),
    attachmentUploadIds: zod_1.z
        .array(zod_1.z.string().min(1))
        .max(5)
        .optional()
        .default([]),
})
    .strict()
    .refine((v) => (v.content && v.content.trim().length > 0) ||
    (v.attachmentUploadIds && v.attachmentUploadIds.length > 0) ||
    v.type === "SYSTEM", { message: "Message must have content or attachments" });
exports.conversationIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).describe("Conversation id"),
});
exports.messageListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(30).describe("Page size (default 30, max 100)"),
    before: zod_1.z.string().optional().describe("Optional cursor: ISO createdAt of oldest message already loaded"),
});
exports.conversationListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
});
