"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRepository = void 0;
const chat_model_1 = require("./chat.model");
class ChatRepository {
    async findConversationByPair(userId1, userId2) {
        const { participantA, participantB } = (0, chat_model_1.orderParticipants)(userId1, userId2);
        return chat_model_1.Conversation.findOne({ participantA, participantB }).lean();
    }
    async createConversation(userId1, userId2, meta) {
        const { participantA, participantB } = (0, chat_model_1.orderParticipants)(userId1, userId2);
        return chat_model_1.Conversation.create({
            participantA,
            participantB,
            lastMessageId: null,
            lastMessageAt: null,
            category: meta?.category ?? null,
            status: meta?.status ?? "active",
            clientLabel: meta?.clientLabel ?? null,
            assignedTherapistId: meta?.assignedTherapistId ?? null,
            assignedTherapistName: meta?.assignedTherapistName ?? null,
        });
    }
    async findConversationById(id) {
        return chat_model_1.Conversation.findById(id).lean();
    }
    /**
     * Status filter: "active" includes missing/null status (legacy docs default to active).
     * "ended" is exact match only.
     */
    statusClause(status) {
        if (!status || status === "all")
            return null;
        if (status === "active") {
            return {
                $or: [
                    { status: "active" },
                    { status: null },
                    { status: { $exists: false } },
                ],
            };
        }
        return { status };
    }
    async listConversationsForUser(userId, page, limit, status) {
        const parts = [
            { $or: [{ participantA: userId }, { participantB: userId }] },
        ];
        const sc = this.statusClause(status);
        if (sc)
            parts.push(sc);
        const filter = parts.length === 1 ? parts[0] : { $and: parts };
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            chat_model_1.Conversation.find(filter)
                .sort({ lastMessageAt: -1, updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            chat_model_1.Conversation.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
    /** Staff/admin: list all support conversations (metadata for inbox). */
    async listAllConversations(page, limit, status) {
        const sc = this.statusClause(status);
        const filter = sc || {};
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            chat_model_1.Conversation.find(filter)
                .sort({ lastMessageAt: -1, updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            chat_model_1.Conversation.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
    async updateConversationMeta(conversationId, patch) {
        const $set = {};
        if (patch.category !== undefined)
            $set.category = patch.category;
        if (patch.status !== undefined)
            $set.status = patch.status;
        if (patch.clientLabel !== undefined)
            $set.clientLabel = patch.clientLabel;
        if (patch.assignedTherapistId !== undefined) {
            $set.assignedTherapistId = patch.assignedTherapistId;
        }
        if (patch.assignedTherapistName !== undefined) {
            $set.assignedTherapistName = patch.assignedTherapistName;
        }
        return chat_model_1.Conversation.findByIdAndUpdate(conversationId, { $set }, { new: true }).lean();
    }
    async updateConversationLastMessage(conversationId, messageId, at) {
        return chat_model_1.Conversation.findByIdAndUpdate(conversationId, {
            $set: {
                lastMessageId: messageId,
                lastMessageAt: at,
            },
        }, { new: true }).lean();
    }
    async findLatestMessage(conversationId) {
        return chat_model_1.Message.findOne({ conversationId })
            .sort({ createdAt: -1 })
            .lean();
    }
    async countMessages(conversationId) {
        return chat_model_1.Message.countDocuments({ conversationId });
    }
    async createMessage(data) {
        return chat_model_1.Message.create({
            ...data,
            deliveredAt: data.deliveredAt ?? null,
            readAt: null,
        });
    }
    async findMessageById(id) {
        return chat_model_1.Message.findById(id).lean();
    }
    async listMessages(conversationId, page, limit, before) {
        const filter = { conversationId };
        if (before) {
            filter.createdAt = { $lt: before };
        }
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            chat_model_1.Message.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            chat_model_1.Message.countDocuments({ conversationId }),
        ]);
        return { items, total, page, limit };
    }
    async markMessagesDelivered(conversationId, recipientId, at) {
        // Messages not sent by recipient that lack deliveredAt
        return chat_model_1.Message.updateMany({
            conversationId,
            senderId: { $ne: recipientId },
            deliveredAt: null,
        }, { $set: { deliveredAt: at } });
    }
    async markMessagesRead(conversationId, readerId, at) {
        return chat_model_1.Message.updateMany({
            conversationId,
            senderId: { $ne: readerId },
            readAt: null,
        }, { $set: { readAt: at, deliveredAt: at } });
    }
}
exports.ChatRepository = ChatRepository;
