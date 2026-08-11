import {
  Conversation,
  ConversationStatus,
  Message,
  MessageType,
  orderParticipants,
} from "./chat.model";

export type ChatAttachment = { uploadId?: string; url: string };

export type ConversationMetaInput = {
  category?: string | null;
  status?: ConversationStatus;
  clientLabel?: string | null;
  assignedTherapistId?: string | null;
  assignedTherapistName?: string | null;
};

export class ChatRepository {
  async findConversationByPair(userId1: string, userId2: string) {
    const { participantA, participantB } = orderParticipants(userId1, userId2);
    return Conversation.findOne({ participantA, participantB }).lean();
  }

  async createConversation(
    userId1: string,
    userId2: string,
    meta?: ConversationMetaInput,
  ) {
    const { participantA, participantB } = orderParticipants(userId1, userId2);
    return Conversation.create({
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

  async findConversationById(id: string) {
    return Conversation.findById(id).lean();
  }

  /**
   * Status filter: "active" includes missing/null status (legacy docs default to active).
   * "ended" is exact match only.
   */
  private statusClause(status?: ConversationStatus | "all") {
    if (!status || status === "all") return null;
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

  async listConversationsForUser(
    userId: string,
    page: number,
    limit: number,
    status?: ConversationStatus | "all",
  ) {
    const parts: Record<string, unknown>[] = [
      { $or: [{ participantA: userId }, { participantB: userId }] },
    ];
    const sc = this.statusClause(status);
    if (sc) parts.push(sc);
    const filter = parts.length === 1 ? parts[0] : { $and: parts };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  /** Staff/admin: list all support conversations (metadata for inbox). */
  async listAllConversations(
    page: number,
    limit: number,
    status?: ConversationStatus | "all",
  ) {
    const sc = this.statusClause(status);
    const filter = sc || {};
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async updateConversationMeta(
    conversationId: string,
    patch: ConversationMetaInput,
  ) {
    const $set: Record<string, unknown> = {};
    if (patch.category !== undefined) $set.category = patch.category;
    if (patch.status !== undefined) $set.status = patch.status;
    if (patch.clientLabel !== undefined) $set.clientLabel = patch.clientLabel;
    if (patch.assignedTherapistId !== undefined) {
      $set.assignedTherapistId = patch.assignedTherapistId;
    }
    if (patch.assignedTherapistName !== undefined) {
      $set.assignedTherapistName = patch.assignedTherapistName;
    }
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $set },
      { new: true },
    ).lean();
  }

  async updateConversationLastMessage(
    conversationId: string,
    messageId: string,
    at: Date,
  ) {
    return Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          lastMessageId: messageId,
          lastMessageAt: at,
        },
      },
      { new: true },
    ).lean();
  }

  async findLatestMessage(conversationId: string) {
    return Message.findOne({ conversationId })
      .sort({ createdAt: -1 })
      .lean();
  }

  async countMessages(conversationId: string) {
    return Message.countDocuments({ conversationId });
  }

  async createMessage(data: {
    conversationId: string;
    senderId: string;
    type: MessageType;
    content: string;
    attachments: ChatAttachment[];
    deliveredAt?: Date | null;
  }) {
    return Message.create({
      ...data,
      deliveredAt: data.deliveredAt ?? null,
      readAt: null,
    });
  }

  async findMessageById(id: string) {
    return Message.findById(id).lean();
  }

  async listMessages(
    conversationId: string,
    page: number,
    limit: number,
    before?: Date,
  ) {
    const filter: Record<string, unknown> = { conversationId };
    if (before) {
      filter.createdAt = { $lt: before };
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationId }),
    ]);
    return { items, total, page, limit };
  }

  async markMessagesDelivered(
    conversationId: string,
    recipientId: string,
    at: Date,
  ) {
    // Messages not sent by recipient that lack deliveredAt
    return Message.updateMany(
      {
        conversationId,
        senderId: { $ne: recipientId },
        deliveredAt: null,
      },
      { $set: { deliveredAt: at } },
    );
  }

  async markMessagesRead(
    conversationId: string,
    readerId: string,
    at: Date,
  ) {
    return Message.updateMany(
      {
        conversationId,
        senderId: { $ne: readerId },
        readAt: null,
      },
      { $set: { readAt: at, deliveredAt: at } },
    );
  }
}
