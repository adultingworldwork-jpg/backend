import { RequestContext } from "@/types/request-context";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import { AppError } from "@/utils/app-error";
import { normalizeTags } from "@/utils/slug";
import { UploadRepository } from "@/modules/upload/upload.repository";
import { JournalMood } from "./journal.model";
import {
  JournalAttachment,
  JournalRepository,
} from "./journal.repository";
import {
  CreateJournalInput,
  JournalListQuery,
  UpdateJournalInput,
} from "./journal.schema";

export type JournalDto = {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  mood: JournalMood;
  tags: string[];
  attachments: JournalAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type PaginatedJournals = {
  items: JournalDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type JournalServiceDeps = {
  ctx?: RequestContext;
  audit: SecurityAuditLogger;
};

/**
 * Private journal service.
 * Every query is scoped to ownerId. Non-owners always get JOURNAL_NOT_FOUND
 * (including admins). Never leak existence.
 */
export class JournalService {
  private repo = new JournalRepository();
  private uploads = new UploadRepository();

  constructor(private deps: JournalServiceDeps) {}

  private get ctx() {
    return this.deps.ctx;
  }

  private requireOwnerId(): string {
    const id = this.ctx?.user?.id;
    if (!id) throw AppError.fromCode("UNAUTHORIZED");
    return id;
  }

  /** Metadata-only audit — never log journal fields */
  private audit(
    type: "JOURNAL_CREATED" | "JOURNAL_UPDATED" | "JOURNAL_DELETED",
    journalId: string,
  ) {
    return this.deps.audit.log({
      type,
      requestId: this.ctx?.requestId,
      ip: this.ctx?.ip,
      userAgent: this.ctx?.userAgent,
      userId: this.ctx?.user?.id,
      username: this.ctx?.user?.username,
      metadata: { journalId },
    });
  }

  async createEntry(input: CreateJournalInput): Promise<JournalDto> {
    const ownerId = this.requireOwnerId();
    const tags = normalizeTags(input.tags);
    const attachments = await this.resolveAttachments(
      ownerId,
      input.attachmentUploadIds ?? [],
    );

    const doc = await this.repo.create({
      ownerId,
      title: input.title.trim(),
      content: input.content,
      mood: input.mood ?? "OTHER",
      tags,
      attachments,
    });

    await this.audit("JOURNAL_CREATED", String(doc._id));
    return this.toDto(doc);
  }

  async updateEntry(
    id: string,
    input: UpdateJournalInput,
  ): Promise<JournalDto> {
    const ownerId = this.requireOwnerId();
    const existing = await this.repo.findByIdForOwner(id, ownerId);
    if (!existing) {
      // Same error for missing and non-owned — no existence leak
      throw AppError.fromCode("JOURNAL_NOT_FOUND");
    }

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.content !== undefined) patch.content = input.content;
    if (input.mood !== undefined) patch.mood = input.mood;
    if (input.tags !== undefined) patch.tags = normalizeTags(input.tags);
    if (input.attachmentUploadIds !== undefined) {
      patch.attachments = await this.resolveAttachments(
        ownerId,
        input.attachmentUploadIds,
      );
    }

    const updated = await this.repo.updateForOwner(id, ownerId, patch);
    if (!updated) throw AppError.fromCode("JOURNAL_NOT_FOUND");

    await this.audit("JOURNAL_UPDATED", id);
    return this.toDto(updated);
  }

  async deleteEntry(id: string): Promise<{ ok: true }> {
    const ownerId = this.requireOwnerId();
    const deleted = await this.repo.deleteForOwner(id, ownerId);
    if (!deleted) throw AppError.fromCode("JOURNAL_NOT_FOUND");

    await this.audit("JOURNAL_DELETED", id);
    return { ok: true };
  }

  async getEntry(id: string): Promise<JournalDto> {
    const ownerId = this.requireOwnerId();
    const doc = await this.repo.findByIdForOwner(id, ownerId);
    if (!doc) throw AppError.fromCode("JOURNAL_NOT_FOUND");
    return this.toDto(doc);
  }

  async listEntries(query: JournalListQuery): Promise<PaginatedJournals> {
    const ownerId = this.requireOwnerId();

    const filter: {
      mood?: JournalMood;
      tag?: string;
      from?: Date;
      to?: Date;
    } = {};

    if (query.mood) filter.mood = query.mood;
    if (query.tag) {
      filter.tag = query.tag.trim().toLowerCase().replace(/\s+/g, "-");
    }
    if (query.from) filter.from = this.parseRangeStart(query.from);
    if (query.to) filter.to = this.parseRangeEnd(query.to);

    const result = await this.repo.listForOwner(
      ownerId,
      filter,
      query.page,
      query.limit,
    );

    return {
      items: result.items.map((d) => this.toDto(d)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.max(1, Math.ceil(result.total / result.limit) || 1),
      },
    };
  }

  private parseRangeStart(raw: string): Date {
    // YYYY-MM-DD → start of day UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T00:00:00.000Z`);
    }
    return new Date(raw);
  }

  private parseRangeEnd(raw: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T23:59:59.999Z`);
    }
    return new Date(raw);
  }

  private async resolveAttachments(
    ownerId: string,
    uploadIds: string[],
  ): Promise<JournalAttachment[]> {
    const out: JournalAttachment[] = [];
    for (const uploadId of uploadIds) {
      const upload = await this.uploads.findById(uploadId);
      if (!upload) throw AppError.fromCode("UPLOAD_NOT_FOUND");
      if (upload.ownerId && upload.ownerId !== ownerId) {
        throw AppError.fromCode("FORBIDDEN", "Upload does not belong to you");
      }
      out.push({ uploadId, url: upload.url });
    }
    return out;
  }

  private toDto(doc: any): JournalDto {
    return {
      id: String(doc._id),
      ownerId: doc.ownerId,
      title: doc.title,
      content: doc.content,
      mood: doc.mood,
      tags: doc.tags ?? [],
      attachments: doc.attachments ?? [],
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }
}
