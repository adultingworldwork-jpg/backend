import { RequestContext } from "@/types/request-context";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import { AppError } from "@/utils/app-error";
import { UploadRepository } from "@/modules/upload/upload.repository";
import { UserRepository } from "@/modules/user/user.repository";
import { Therapist } from "@/modules/admin/therapist.model";
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
  StartSupportSessionInput,
  UpdateConversationInput,
} from "./chat.schema";

export type ConversationDto = {
  id: string;
  participantA: string;
  participantB: string;
  otherParticipantId: string;
  lastMessageId: string | null;
  lastMessageAt: string | null;
  category: string | null;
  status: "active" | "ended";
  clientLabel: string | null;
  assignedTherapistId: string | null;
  assignedTherapistName: string | null;
  messageCount?: number;
  lastMessagePreview?: string | null;
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

  /**
   * Ensure userId is participant of conversation — throws CHAT_FORBIDDEN / NOT_FOUND.
   * Platform admins may access any conversation for operational support (chat routes only).
   * Privacy wall remains on /admin/chat/* deny endpoints.
   */
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
    const role = (this.ctx?.user?.role || "").toLowerCase();
    const isParticipant =
      conversation.participantA === userId ||
      conversation.participantB === userId;
    if (!isParticipant && role !== "admin") {
      throw AppError.fromCode("CHAT_FORBIDDEN");
    }
    const otherParticipantId =
      conversation.participantA === userId
        ? conversation.participantB
        : conversation.participantA === userId
          ? conversation.participantB
          : conversation.participantB;
    // Prefer non-admin peer as "other" for admin viewers
    if (!isParticipant && role === "admin") {
      return {
        conversation,
        otherParticipantId: conversation.participantA,
      };
    }
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

  /**
   * User Safe Space entrypoint: assign (or resume) a 1:1 conversation with a therapist.
   * Picks least-loaded therapist when therapistUserId is not provided.
   */
  async startSupportSession(
    input: StartSupportSessionInput,
  ): Promise<ConversationDto> {
    const userId = this.requireUserId();
    const category = (input.category || "Something Else").trim();
    const clientLabel =
      (input.clientLabel || this.ctx?.user?.username || "Member").trim();

    let therapistUserId = input.therapistUserId;
    let therapistRoster: {
      _id: unknown;
      name: string;
      userId?: string | null;
      sessionsAttended?: number;
    } | null = null;

    if (therapistUserId) {
      therapistRoster = await Therapist.findOne({
        userId: therapistUserId,
      }).lean();
      if (!therapistRoster) {
        // Allow direct user id even if roster row missing (legacy support id)
        const other = await this.users.findById(therapistUserId);
        if (!other) {
          throw AppError.fromCode("USER_NOT_FOUND", "Therapist not found");
        }
      }
    } else {
      // Ensure roster rows have linked Users (lazy backfill via AdminService)
      const { AdminService } = await import("@/modules/admin/admin.service");
      const adminSvc = new AdminService({
        ctx: this.ctx,
        audit: this.deps.audit,
      });
      const publicList = await adminSvc.listTherapistsPublic();
      const pick = (publicList.items || [])[0];
      if (!pick?.userId) {
        throw AppError.fromCode(
          "VALIDATION_ERROR",
          "No therapists available. Please try again later.",
        );
      }
      therapistUserId = pick.userId;
      therapistRoster = {
        _id: pick.id,
        name: pick.name,
        userId: pick.userId,
      };
    }

    if (therapistUserId === userId) {
      throw AppError.fromCode(
        "CHAT_INVALID_PARTICIPANT",
        "Cannot create a support session with yourself",
      );
    }

    const existing = await this.repo.findConversationByPair(
      userId,
      therapistUserId!,
    );
    if (existing) {
      // Re-open ended sessions and refresh metadata
      const patched = await this.repo.updateConversationMeta(
        String(existing._id),
        {
          status: "active",
          category,
          clientLabel,
          assignedTherapistId: therapistRoster
            ? String(therapistRoster._id)
            : (existing as any).assignedTherapistId ?? null,
          assignedTherapistName: therapistRoster?.name
            ? therapistRoster.name
            : (existing as any).assignedTherapistName ?? null,
        },
      );
      return this.toConversationDto(patched || existing, userId);
    }

    try {
      const doc = await this.repo.createConversation(userId, therapistUserId!, {
        category,
        status: "active",
        clientLabel,
        assignedTherapistId: therapistRoster
          ? String(therapistRoster._id)
          : null,
        assignedTherapistName: therapistRoster?.name || null,
      });

      if (therapistRoster?._id) {
        await Therapist.findByIdAndUpdate(therapistRoster._id, {
          $inc: { sessionsAttended: 1 },
        });
      }

      await this.audit("CHAT_CONVERSATION_CREATED", {
        conversationId: String(doc._id),
        support: true,
      });
      return this.toConversationDto(doc, userId);
    } catch (err: any) {
      if (err?.code === 11000) {
        const again = await this.repo.findConversationByPair(
          userId,
          therapistUserId!,
        );
        if (again) return this.toConversationDto(again, userId);
      }
      throw err;
    }
  }

  async listConversations(
    query: ConversationListQuery,
  ): Promise<PaginatedConversations> {
    const userId = this.requireUserId();
    const role = (this.ctx?.user?.role || "").toLowerCase();

    // Admin inbox: all platform conversations (operational overview).
    // Therapists/users: only their participant conversations.
    const result =
      role === "admin"
        ? await this.repo.listAllConversations(
            query.page,
            query.limit,
            query.status,
          )
        : await this.repo.listConversationsForUser(
            userId,
            query.page,
            query.limit,
            query.status,
          );

    const items = await Promise.all(
      result.items.map(async (c) => {
        const dto = this.toConversationDto(c, userId);
        try {
          const [count, last] = await Promise.all([
            this.repo.countMessages(String(c._id)),
            this.repo.findLatestMessage(String(c._id)),
          ]);
          dto.messageCount = count;
          dto.lastMessagePreview = last?.content
            ? String(last.content).slice(0, 120)
            : null;
        } catch {
          dto.messageCount = 0;
          dto.lastMessagePreview = null;
        }
        return dto;
      }),
    );

    return {
      items,
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  async updateConversation(
    conversationId: string,
    input: UpdateConversationInput,
  ): Promise<ConversationDto> {
    const userId = this.requireUserId();
    const role = (this.ctx?.user?.role || "").toLowerCase();

    if (role === "admin") {
      const conversation = await this.repo.findConversationById(conversationId);
      if (!conversation) {
        throw AppError.fromCode("CHAT_CONVERSATION_NOT_FOUND");
      }
    } else {
      await this.validateParticipant(conversationId, userId);
    }

    const patched = await this.repo.updateConversationMeta(conversationId, {
      status: input.status,
      category: input.category,
      clientLabel: input.clientLabel,
    });
    if (!patched) throw AppError.fromCode("CHAT_CONVERSATION_NOT_FOUND");
    return this.toConversationDto(patched, userId);
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
      doc.participantA === viewerId
        ? doc.participantB
        : doc.participantB === viewerId
          ? doc.participantA
          : doc.participantB;
    return {
      id: String(doc._id),
      participantA: doc.participantA,
      participantB: doc.participantB,
      otherParticipantId: other,
      lastMessageId: doc.lastMessageId ?? null,
      lastMessageAt: doc.lastMessageAt
        ? new Date(doc.lastMessageAt).toISOString()
        : null,
      category: doc.category ?? null,
      status: (doc.status as "active" | "ended") || "active",
      clientLabel: doc.clientLabel ?? null,
      assignedTherapistId: doc.assignedTherapistId ?? null,
      assignedTherapistName: doc.assignedTherapistName ?? null,
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
