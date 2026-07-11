"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderParticipants = exports.ChatService = void 0;
const app_error_1 = require("../../utils/app-error");
const upload_repository_1 = require("../../modules/upload/upload.repository");
const user_repository_1 = require("../../modules/user/user.repository");
const chat_model_1 = require("./chat.model");
Object.defineProperty(exports, "orderParticipants", { enumerable: true, get: function () { return chat_model_1.orderParticipants; } });
const chat_repository_1 = require("./chat.repository");
class ChatService {
    constructor(deps) {
        this.deps = deps;
        this.repo = new chat_repository_1.ChatRepository();
        this.uploads = new upload_repository_1.UploadRepository();
        this.users = new user_repository_1.UserRepository();
    }
    get ctx() {
        return this.deps.ctx;
    }
    requireUserId() {
        const id = this.ctx?.user?.id;
        if (!id)
            throw app_error_1.AppError.fromCode("UNAUTHORIZED");
        return id;
    }
    audit(type, metadata) {
        return this.deps.audit.log({
            type,
            requestId: this.ctx?.requestId,
            ip: this.ctx?.ip,
            userAgent: this.ctx?.userAgent,
            userId: this.ctx?.user?.id,
            username: this.ctx?.user?.username,
            metadata,
        });
    }
    /** Ensure userId is participant of conversation — throws CHAT_FORBIDDEN / NOT_FOUND */
    async validateParticipant(conversationId, userId) {
        const conversation = await this.repo.findConversationById(conversationId);
        if (!conversation) {
            throw app_error_1.AppError.fromCode("CHAT_CONVERSATION_NOT_FOUND");
        }
        if (conversation.participantA !== userId &&
            conversation.participantB !== userId) {
            throw app_error_1.AppError.fromCode("CHAT_FORBIDDEN");
        }
        const otherParticipantId = conversation.participantA === userId
            ? conversation.participantB
            : conversation.participantA;
        return { conversation, otherParticipantId };
    }
    async createConversation(input) {
        const userId = this.requireUserId();
        const otherId = input.participantId;
        if (otherId === userId) {
            throw app_error_1.AppError.fromCode("CHAT_INVALID_PARTICIPANT", "Cannot create a conversation with yourself");
        }
        const other = await this.users.findById(otherId);
        if (!other) {
            throw app_error_1.AppError.fromCode("USER_NOT_FOUND", "Participant not found");
        }
        const existing = await this.repo.findConversationByPair(userId, otherId);
        if (existing) {
            return this.toConversationDto(existing, userId);
        }
        try {
            const doc = await this.repo.createConversation(userId, otherId);
            await this.audit("CHAT_CONVERSATION_CREATED", {
                conversationId: String(doc._id),
            });
            return this.toConversationDto(doc, userId);
        }
        catch (err) {
            // Race: unique index — return existing
            if (err?.code === 11000) {
                const again = await this.repo.findConversationByPair(userId, otherId);
                if (again)
                    return this.toConversationDto(again, userId);
            }
            throw err;
        }
    }
    async listConversations(query) {
        const userId = this.requireUserId();
        const result = await this.repo.listConversationsForUser(userId, query.page, query.limit);
        return {
            items: result.items.map((c) => this.toConversationDto(c, userId)),
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    async getMessages(conversationId, query) {
        const userId = this.requireUserId();
        await this.validateParticipant(conversationId, userId);
        const before = query.before ? new Date(query.before) : undefined;
        const result = await this.repo.listMessages(conversationId, query.page, query.limit, before && !Number.isNaN(before.getTime()) ? before : undefined);
        return {
            items: result.items.map((m) => this.toMessageDto(m)),
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    async sendMessage(conversationId, input, opts) {
        const userId = this.requireUserId();
        await this.validateParticipant(conversationId, userId);
        const attachments = await this.resolveAttachments(userId, input.attachmentUploadIds ?? []);
        const type = (input.type ?? "TEXT");
        const content = input.content?.trim() ?? "";
        if (type === "TEXT" && !content && attachments.length === 0) {
            throw app_error_1.AppError.fromCode("VALIDATION_ERROR", "TEXT messages require content or attachments");
        }
        const now = new Date();
        const deliveredAt = opts?.markDelivered ? now : null;
        const doc = await this.repo.createMessage({
            conversationId,
            senderId: userId,
            type,
            content,
            attachments,
            deliveredAt,
        });
        await this.repo.updateConversationLastMessage(conversationId, String(doc._id), now);
        await this.audit("CHAT_MESSAGE_SENT", {
            conversationId,
            messageId: String(doc._id),
            type,
        });
        return this.toMessageDto(doc);
    }
    async markDelivered(conversationId) {
        const userId = this.requireUserId();
        await this.validateParticipant(conversationId, userId);
        const result = await this.repo.markMessagesDelivered(conversationId, userId, new Date());
        return { ok: true, count: result.modifiedCount ?? 0 };
    }
    async markRead(conversationId) {
        const userId = this.requireUserId();
        await this.validateParticipant(conversationId, userId);
        const result = await this.repo.markMessagesRead(conversationId, userId, new Date());
        await this.audit("CHAT_MESSAGE_READ", {
            conversationId,
            count: result.modifiedCount ?? 0,
        });
        return { ok: true, count: result.modifiedCount ?? 0 };
    }
    async resolveAttachments(userId, uploadIds) {
        const out = [];
        for (const uploadId of uploadIds) {
            const upload = await this.uploads.findById(uploadId);
            if (!upload)
                throw app_error_1.AppError.fromCode("UPLOAD_NOT_FOUND");
            if (upload.ownerId && upload.ownerId !== userId) {
                throw app_error_1.AppError.fromCode("FORBIDDEN", "Upload does not belong to you");
            }
            out.push({ uploadId, url: upload.url });
        }
        return out;
    }
    meta(total, page, limit) {
        return {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit) || 1),
        };
    }
    toConversationDto(doc, viewerId) {
        const other = doc.participantA === viewerId ? doc.participantB : doc.participantA;
        return {
            id: String(doc._id),
            participantA: doc.participantA,
            participantB: doc.participantB,
            otherParticipantId: other,
            lastMessageId: doc.lastMessageId ?? null,
            lastMessageAt: doc.lastMessageAt
                ? new Date(doc.lastMessageAt).toISOString()
                : null,
            createdAt: new Date(doc.createdAt).toISOString(),
            updatedAt: new Date(doc.updatedAt).toISOString(),
        };
    }
    toMessageDto(doc) {
        return {
            id: String(doc._id),
            conversationId: doc.conversationId,
            senderId: doc.senderId,
            type: doc.type,
            content: doc.content ?? "",
            attachments: doc.attachments ?? [],
            deliveredAt: doc.deliveredAt
                ? new Date(doc.deliveredAt).toISOString()
                : null,
            readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
            createdAt: new Date(doc.createdAt).toISOString(),
            updatedAt: new Date(doc.updatedAt).toISOString(),
        };
    }
}
exports.ChatService = ChatService;
