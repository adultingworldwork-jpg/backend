import { RequestContext } from "@/types/request-context";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import { AppError } from "@/utils/app-error";
import { UploadRepository } from "@/modules/upload/upload.repository";
import { UserRepository } from "@/modules/user/user.repository";
import {
  LetterMood,
  LetterStatus,
  LetterType,
} from "./letters.model";
import {
  LetterAttachment,
  LettersRepository,
} from "./letters.repository";
import {
  CreateLetterInput,
  LetterListQuery,
  UpdateLetterInput,
} from "./letters.schema";

export type LetterDto = {
  id: string;
  senderId: string;
  recipientId: string | null;
  type: LetterType;
  title: string;
  content: string;
  mood: LetterMood;
  attachments: LetterAttachment[];
  status: LetterStatus;
  deliveredAt: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isSender: boolean;
  isRecipient: boolean;
};

export type PaginatedLetters = {
  items: LetterDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type LettersServiceDeps = {
  ctx?: RequestContext;
  audit: SecurityAuditLogger;
};

export class LettersService {
  private repo = new LettersRepository();
  private uploads = new UploadRepository();
  private users = new UserRepository();

  constructor(private deps: LettersServiceDeps) {}

  private get ctx() {
    return this.deps.ctx;
  }

  private requireUserId(): string {
    const id = this.ctx?.user?.id;
    if (!id) throw AppError.fromCode("UNAUTHORIZED");
    return id;
  }

  /** Metadata-only audit — never log title/content/attachments */
  private audit(
    type:
      | "LETTER_CREATED"
      | "LETTER_UPDATED"
      | "LETTER_DELETED"
      | "LETTER_SENT"
      | "LETTER_READ"
      | "LETTER_ARCHIVED",
    letterId: string,
    extra?: Record<string, string | number | boolean | null | undefined>,
  ) {
    return this.deps.audit.log({
      type,
      requestId: this.ctx?.requestId,
      ip: this.ctx?.ip,
      userAgent: this.ctx?.userAgent,
      userId: this.ctx?.user?.id,
      username: this.ctx?.user?.username,
      metadata: { letterId, ...extra },
    });
  }

  async createLetter(input: CreateLetterInput): Promise<LetterDto> {
    const senderId = this.requireUserId();

    if (input.type === "PRIVATE") {
      if (!input.recipientId) {
        throw AppError.fromCode(
          "VALIDATION_ERROR",
          "recipientId is required for PRIVATE letters",
        );
      }
      if (input.recipientId === senderId) {
        throw AppError.fromCode(
          "VALIDATION_ERROR",
          "Cannot send a private letter to yourself",
        );
      }
      const recipient = await this.users.findById(input.recipientId);
      if (!recipient) {
        throw AppError.fromCode("USER_NOT_FOUND", "Recipient not found");
      }
    }

    const attachments = await this.resolveAttachments(
      senderId,
      input.attachmentUploadIds ?? [],
    );

    const doc = await this.repo.create({
      senderId,
      recipientId: input.type === "PRIVATE" ? input.recipientId! : null,
      type: input.type,
      title: input.title.trim(),
      content: input.content,
      mood: input.mood ?? "OTHER",
      attachments,
      status: "DRAFT",
    });

    await this.audit("LETTER_CREATED", String(doc._id), {
      type: input.type,
      status: "DRAFT",
    });

    return this.toDto(doc, senderId);
  }

  async updateLetter(
    id: string,
    input: UpdateLetterInput,
  ): Promise<LetterDto> {
    const userId = this.requireUserId();
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.fromCode("LETTER_NOT_FOUND");

    // Only sender can edit, and only drafts
    if (existing.senderId !== userId) {
      throw AppError.fromCode("LETTER_NOT_FOUND"); // no existence leak for non-parties
    }
    if (existing.status !== "DRAFT") {
      throw AppError.fromCode(
        "LETTER_INVALID_STATE",
        "Only draft letters can be edited",
      );
    }

    const nextType = (input.type ?? existing.type) as LetterType;
    let nextRecipient =
      input.recipientId !== undefined
        ? input.recipientId
        : existing.recipientId;

    if (nextType === "PRIVATE") {
      if (!nextRecipient) {
        throw AppError.fromCode(
          "VALIDATION_ERROR",
          "recipientId is required for PRIVATE letters",
        );
      }
      if (nextRecipient === userId) {
        throw AppError.fromCode(
          "VALIDATION_ERROR",
          "Cannot send a private letter to yourself",
        );
      }
      const recipient = await this.users.findById(String(nextRecipient));
      if (!recipient) {
        throw AppError.fromCode("USER_NOT_FOUND", "Recipient not found");
      }
    } else {
      nextRecipient = null;
    }

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.content !== undefined) patch.content = input.content;
    if (input.mood !== undefined) patch.mood = input.mood;
    if (input.type !== undefined) patch.type = input.type;
    if (input.type !== undefined || input.recipientId !== undefined) {
      patch.recipientId = nextRecipient;
    }
    if (input.attachmentUploadIds !== undefined) {
      patch.attachments = await this.resolveAttachments(
        userId,
        input.attachmentUploadIds,
      );
    }

    const updated = await this.repo.updateById(id, patch);
    if (!updated) throw AppError.fromCode("LETTER_NOT_FOUND");

    await this.audit("LETTER_UPDATED", id, { status: "DRAFT" });
    return this.toDto(updated, userId);
  }

  async deleteLetter(id: string): Promise<{ ok: true }> {
    const userId = this.requireUserId();
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.fromCode("LETTER_NOT_FOUND");

    // Sender may delete drafts only
    if (existing.senderId !== userId || existing.status !== "DRAFT") {
      // Don't leak: non-owner or non-draft
      if (existing.senderId !== userId) {
        throw AppError.fromCode("LETTER_NOT_FOUND");
      }
      throw AppError.fromCode(
        "LETTER_INVALID_STATE",
        "Only draft letters can be deleted",
      );
    }

    await this.repo.deleteById(id);
    await this.audit("LETTER_DELETED", id, { status: "DRAFT" });
    return { ok: true };
  }

  async sendLetter(id: string): Promise<LetterDto> {
    const userId = this.requireUserId();
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.fromCode("LETTER_NOT_FOUND");

    if (existing.senderId !== userId) {
      throw AppError.fromCode("LETTER_NOT_FOUND");
    }
    if (existing.status !== "DRAFT") {
      throw AppError.fromCode(
        "LETTER_INVALID_STATE",
        "Only draft letters can be sent",
      );
    }

    if (existing.type === "PRIVATE" && !existing.recipientId) {
      throw AppError.fromCode(
        "LETTER_INVALID_STATE",
        "PRIVATE letters require a recipient before sending",
      );
    }

    const now = new Date();
    const updated = await this.repo.updateById(id, {
      status: "SENT",
      deliveredAt: now,
    });
    if (!updated) throw AppError.fromCode("LETTER_NOT_FOUND");

    await this.audit("LETTER_SENT", id, {
      type: String(existing.type),
      status: "SENT",
    });

    return this.toDto(updated, userId);
  }

  async archiveLetter(id: string): Promise<LetterDto> {
    const userId = this.requireUserId();
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.fromCode("LETTER_NOT_FOUND");

    // Recipient archives private received letters
    if (
      existing.type !== "PRIVATE" ||
      existing.recipientId !== userId ||
      (existing.status !== "SENT" && existing.status !== "READ")
    ) {
      // If user is not recipient, hide existence when not sender of draft
      if (existing.recipientId !== userId) {
        throw AppError.fromCode("LETTER_NOT_FOUND");
      }
      throw AppError.fromCode(
        "LETTER_INVALID_STATE",
        "Only received private letters can be archived",
      );
    }

    const updated = await this.repo.updateById(id, {
      status: "ARCHIVED",
      archivedAt: new Date(),
    });
    if (!updated) throw AppError.fromCode("LETTER_NOT_FOUND");

    await this.audit("LETTER_ARCHIVED", id, { status: "ARCHIVED" });
    return this.toDto(updated, userId);
  }

  async getInbox(query: LetterListQuery): Promise<PaginatedLetters> {
    const userId = this.requireUserId();
    const result = await this.repo.listInbox(userId, query.page, query.limit);
    return this.toPage(result, userId);
  }

  async getSent(query: LetterListQuery): Promise<PaginatedLetters> {
    const userId = this.requireUserId();
    const result = await this.repo.listSent(userId, query.page, query.limit);
    return this.toPage(result, userId);
  }

  async getPublicLetters(query: LetterListQuery): Promise<PaginatedLetters> {
    // Public feed — no auth required, but if authenticated mark isSender
    const userId = this.ctx?.user?.id;
    const result = await this.repo.listPublic(query.page, query.limit);
    return this.toPage(result, userId);
  }

  async getLetter(id: string): Promise<LetterDto> {
    const userId = this.ctx?.user?.id;
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.fromCode("LETTER_NOT_FOUND");

    if (!this.canView(existing, userId)) {
      throw AppError.fromCode("LETTER_NOT_FOUND");
    }

    // Read tracking: recipient first view of SENT private letter
    let doc = existing;
    if (
      userId &&
      existing.type === "PRIVATE" &&
      existing.recipientId === userId &&
      existing.status === "SENT"
    ) {
      const updated = await this.repo.updateById(id, {
        status: "READ",
        readAt: new Date(),
      });
      if (updated) {
        doc = updated;
        await this.audit("LETTER_READ", id, { status: "READ" });
      }
    }

    return this.toDto(doc, userId);
  }

  /**
   * Authorization matrix for viewing a letter.
   */
  canView(doc: any, userId?: string): boolean {
    // PUBLIC + SENT (and READ if ever set) — anonymous OK
    if (doc.type === "PUBLIC" && (doc.status === "SENT" || doc.status === "READ")) {
      return true;
    }

    if (!userId) return false;

    // Sender can always view their own letters (any status)
    if (doc.senderId === userId) return true;

    // Recipient can view private SENT / READ / ARCHIVED
    if (
      doc.type === "PRIVATE" &&
      doc.recipientId === userId &&
      (doc.status === "SENT" ||
        doc.status === "READ" ||
        doc.status === "ARCHIVED")
    ) {
      return true;
    }

    // Drafts: sender only (already covered)
    // Admins: no bypass
    return false;
  }

  private async resolveAttachments(
    userId: string,
    uploadIds: string[],
  ): Promise<LetterAttachment[]> {
    const out: LetterAttachment[] = [];
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

  private toPage(
    result: { items: any[]; total: number; page: number; limit: number },
    userId?: string,
  ): PaginatedLetters {
    return {
      items: result.items.map((d) => this.toDto(d, userId)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.max(1, Math.ceil(result.total / result.limit) || 1),
      },
    };
  }

  private toDto(doc: any, userId?: string): LetterDto {
    return {
      id: String(doc._id),
      senderId: doc.senderId,
      recipientId: doc.recipientId ?? null,
      type: doc.type,
      title: doc.title,
      content: doc.content,
      mood: doc.mood,
      attachments: doc.attachments ?? [],
      status: doc.status,
      deliveredAt: doc.deliveredAt
        ? new Date(doc.deliveredAt).toISOString()
        : null,
      readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
      archivedAt: doc.archivedAt
        ? new Date(doc.archivedAt).toISOString()
        : null,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
      isSender: Boolean(userId && userId === doc.senderId),
      isRecipient: Boolean(userId && userId === doc.recipientId),
    };
  }
}
