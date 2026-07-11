import { RequestContext } from "@/types/request-context";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import { AppError } from "@/utils/app-error";
import { UploadRepository } from "@/modules/upload/upload.repository";
import { UserRepository } from "@/modules/user/user.repository";
import { MessageType, orderParticipants } from "./chat.model";
import {
  ChatAttachment,
  ChatRepository,
} from "./chat.repository";
import {
  ConversationListQuery,
  CreateConversationInput,
  MessageListQuery,
  SendMessageInput,
} from "./chat.schema";

export type ConversationDto = {
  id: string;
  participantA: string;
  participantB: string;
  otherParticipantId: string;
  lastMessageId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  attachments: ChatAttachment[];
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedConversations = {
  items: ConversationDto[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type PaginatedMessages = {
  items: MessageDto[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type ChatServiceDeps = {
  ctx?: RequestContext;
  audit: SecurityAuditLogger;
};

export class ChatService {
  private repo = new ChatRepository();
  private uploads = new UploadRepository();
  private users = new UserRepository();

  constructor(private deps: ChatServiceDeps) {}

  private get ctx() {
    return this.deps.ctx;
  }

  private requireUserId(): string {
    const id = this.ctx?.user?.id;
    if (!id) throw AppError.fromCode("UNAUTHORIZED");
    return id;
  }

  private audit(
    type:
      | "CHAT_CONVERSATION_CREATED"
      | "CHAT_MESSAGE_SENT"
      | "CHAT_MESSAGE_READ",
    metadata: Record<string, string | number | boolean | null | undefined>,
  ) {
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
  async validateParticipant(
    conversationId: string,
    userId: string,
  ): Promise<{
    conversation: any;
    otherParticipantId: string;
  }> {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) {
      throw AppError.fromCode("CHAT_CONVERSATION_NOT_FOUND");
    }
    if (
      conversation.participantA !== userId &&
      conversation.participantB !== userId
    ) {
      throw AppError.fromCode("CHAT_FORBIDDEN");
    }
    const otherParticipantId =
      conversation.participantA === userId
        ? conversation.participantB
        : conversation.participantA;
    return { conversation, otherParticipantId };
  }

  async createConversation(
    input: CreateConversationInput,
  ): Promise<ConversationDto> {
    const userId = this.requireUserId();
    const otherId = input.participantId;

    if (otherId === userId) {
      throw AppError.fromCode(
        "CHAT_INVALID_PARTICIPANT",
        "Cannot create a conversation with yourself",
      );
    }

    const other = await this.users.findById(otherId);
    if (!other) {
      throw AppError.fromCode("USER_NOT_FOUND", "Participant not found");
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
    } catch (err: any) {
      // Race: unique index — return existing
      if (err?.code === 11000) {
        const again = await this.repo.findConversationByPair(userId, otherId);
        if (again) return this.toConversationDto(again, userId);
      }
      throw err;
    }
  }

  async listConversations(
    query: ConversationListQuery,
  ): Promise<PaginatedConversations> {
    const userId = this.requireUserId();
    const result = await this.repo.listConversationsForUser(
      userId,
      query.page,
      query.limit,
    );
    return {
      items: result.items.map((c) => this.toConversationDto(c, userId)),
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  async getMessages(
    conversationId: string,
    query: MessageListQuery,
  ): Promise<PaginatedMessages> {
    const userId = this.requireUserId();
    await this.validateParticipant(conversationId, userId);

    const before = query.before ? new Date(query.before) : undefined;
    const result = await this.repo.listMessages(
      conversationId,
      query.page,
      query.limit,
      before && !Number.isNaN(before.getTime()) ? before : undefined,
    );

    return {
      items: result.items.map((m) => this.toMessageDto(m)),
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  async sendMessage(
    conversationId: string,
    input: SendMessageInput,
    opts?: { markDelivered?: boolean },
  ): Promise<MessageDto> {
    const userId = this.requireUserId();
    await this.validateParticipant(conversationId, userId);

    const attachments = await this.resolveAttachments(
      userId,
      input.attachmentUploadIds ?? [],
    );

    const type = (input.type ?? "TEXT") as MessageType;
    const content = input.content?.trim() ?? "";

    if (type === "TEXT" && !content && attachments.length === 0) {
      throw AppError.fromCode(
        "VALIDATION_ERROR",
        "TEXT messages require content or attachments",
      );
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

    await this.repo.updateConversationLastMessage(
      conversationId,
      String(doc._id),
      now,
    );

    await this.audit("CHAT_MESSAGE_SENT", {
      conversationId,
      messageId: String(doc._id),
      type,
    });

    return this.toMessageDto(doc);
  }

  async markDelivered(conversationId: string): Promise<{ ok: true; count: number }> {
    const userId = this.requireUserId();
    await this.validateParticipant(conversationId, userId);
    const result = await this.repo.markMessagesDelivered(
      conversationId,
      userId,
      new Date(),
    );
    return { ok: true, count: result.modifiedCount ?? 0 };
  }

  async markRead(conversationId: string): Promise<{ ok: true; count: number }> {
    const userId = this.requireUserId();
    await this.validateParticipant(conversationId, userId);
    const result = await this.repo.markMessagesRead(
      conversationId,
      userId,
      new Date(),
    );

    await this.audit("CHAT_MESSAGE_READ", {
      conversationId,
      count: result.modifiedCount ?? 0,
    });

    return { ok: true, count: result.modifiedCount ?? 0 };
  }

  private async resolveAttachments(
    userId: string,
    uploadIds: string[],
  ): Promise<ChatAttachment[]> {
    const out: ChatAttachment[] = [];
    for (const uploadId of uploadIds) {
      const upload = await this.uploads.findById(uploadId);
      if (!upload) throw AppError.fromCode("UPLOAD_NOT_FOUND");
      if (upload.ownerId && upload.ownerId !== userId) {
        throw AppError.fromCode("FORBIDDEN", "Upload does not belong to you");
      }
      out.push({ uploadId, url: upload.url });
    }
    return out;
  }

  private meta(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    };
  }

  private toConversationDto(doc: any, viewerId: string): ConversationDto {
    const other =
      doc.participantA === viewerId ? doc.participantB : doc.participantA;
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

  private toMessageDto(doc: any): MessageDto {
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

// re-export for socket layer convenience
export { orderParticipants };
