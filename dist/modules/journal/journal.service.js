"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalService = void 0;
const app_error_1 = require("../../utils/app-error");
const slug_1 = require("../../utils/slug");
const upload_repository_1 = require("../../modules/upload/upload.repository");
const journal_repository_1 = require("./journal.repository");
/**
 * Private journal service.
 * Every query is scoped to ownerId. Non-owners always get JOURNAL_NOT_FOUND
 * (including admins). Never leak existence.
 */
class JournalService {
    constructor(deps) {
        this.deps = deps;
        this.repo = new journal_repository_1.JournalRepository();
        this.uploads = new upload_repository_1.UploadRepository();
    }
    get ctx() {
        return this.deps.ctx;
    }
    requireOwnerId() {
        const id = this.ctx?.user?.id;
        if (!id)
            throw app_error_1.AppError.fromCode("UNAUTHORIZED");
        return id;
    }
    /** Metadata-only audit — never log journal fields */
    audit(type, journalId) {
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
    async createEntry(input) {
        const ownerId = this.requireOwnerId();
        const tags = (0, slug_1.normalizeTags)(input.tags);
        const attachments = await this.resolveAttachments(ownerId, input.attachmentUploadIds ?? []);
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
    async updateEntry(id, input) {
        const ownerId = this.requireOwnerId();
        const existing = await this.repo.findByIdForOwner(id, ownerId);
        if (!existing) {
            // Same error for missing and non-owned — no existence leak
            throw app_error_1.AppError.fromCode("JOURNAL_NOT_FOUND");
        }
        const patch = {};
        if (input.title !== undefined)
            patch.title = input.title.trim();
        if (input.content !== undefined)
            patch.content = input.content;
        if (input.mood !== undefined)
            patch.mood = input.mood;
        if (input.tags !== undefined)
            patch.tags = (0, slug_1.normalizeTags)(input.tags);
        if (input.attachmentUploadIds !== undefined) {
            patch.attachments = await this.resolveAttachments(ownerId, input.attachmentUploadIds);
        }
        const updated = await this.repo.updateForOwner(id, ownerId, patch);
        if (!updated)
            throw app_error_1.AppError.fromCode("JOURNAL_NOT_FOUND");
        await this.audit("JOURNAL_UPDATED", id);
        return this.toDto(updated);
    }
    async deleteEntry(id) {
        const ownerId = this.requireOwnerId();
        const deleted = await this.repo.deleteForOwner(id, ownerId);
        if (!deleted)
            throw app_error_1.AppError.fromCode("JOURNAL_NOT_FOUND");
        await this.audit("JOURNAL_DELETED", id);
        return { ok: true };
    }
    async getEntry(id) {
        const ownerId = this.requireOwnerId();
        const doc = await this.repo.findByIdForOwner(id, ownerId);
        if (!doc)
            throw app_error_1.AppError.fromCode("JOURNAL_NOT_FOUND");
        return this.toDto(doc);
    }
    async listEntries(query) {
        const ownerId = this.requireOwnerId();
        const filter = {};
        if (query.mood)
            filter.mood = query.mood;
        if (query.tag) {
            filter.tag = query.tag.trim().toLowerCase().replace(/\s+/g, "-");
        }
        if (query.from)
            filter.from = this.parseRangeStart(query.from);
        if (query.to)
            filter.to = this.parseRangeEnd(query.to);
        const result = await this.repo.listForOwner(ownerId, filter, query.page, query.limit);
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
    parseRangeStart(raw) {
        // YYYY-MM-DD → start of day UTC
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return new Date(`${raw}T00:00:00.000Z`);
        }
        return new Date(raw);
    }
    parseRangeEnd(raw) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return new Date(`${raw}T23:59:59.999Z`);
        }
        return new Date(raw);
    }
    async resolveAttachments(ownerId, uploadIds) {
        const out = [];
        for (const uploadId of uploadIds) {
            const upload = await this.uploads.findById(uploadId);
            if (!upload)
                throw app_error_1.AppError.fromCode("UPLOAD_NOT_FOUND");
            if (upload.ownerId && upload.ownerId !== ownerId) {
                throw app_error_1.AppError.fromCode("FORBIDDEN", "Upload does not belong to you");
            }
            out.push({ uploadId, url: upload.url });
        }
        return out;
    }
    toDto(doc) {
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
exports.JournalService = JournalService;
