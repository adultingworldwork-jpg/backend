"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LettersService = void 0;
const app_error_1 = require("../../utils/app-error");
const upload_repository_1 = require("../../modules/upload/upload.repository");
const user_repository_1 = require("../../modules/user/user.repository");
const letters_repository_1 = require("./letters.repository");
class LettersService {
    constructor(deps) {
        this.deps = deps;
        this.repo = new letters_repository_1.LettersRepository();
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
    /** Metadata-only audit — never log title/content/attachments */
    audit(type, letterId, extra) {
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
    async createLetter(input) {
        const senderId = this.requireUserId();
        if (input.type === "PRIVATE") {
            if (!input.recipientId) {
                throw app_error_1.AppError.fromCode("VALIDATION_ERROR", "recipientId is required for PRIVATE letters");
            }
            if (input.recipientId === senderId) {
                throw app_error_1.AppError.fromCode("VALIDATION_ERROR", "Cannot send a private letter to yourself");
            }
            const recipient = await this.users.findById(input.recipientId);
            if (!recipient) {
                throw app_error_1.AppError.fromCode("USER_NOT_FOUND", "Recipient not found");
            }
        }
        const attachments = await this.resolveAttachments(senderId, input.attachmentUploadIds ?? []);
        const doc = await this.repo.create({
            senderId,
            recipientId: input.type === "PRIVATE" ? input.recipientId : null,
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
    async updateLetter(id, input) {
        const userId = this.requireUserId();
        const existing = await this.repo.findById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        // Only sender can edit, and only drafts
        if (existing.senderId !== userId) {
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND"); // no existence leak for non-parties
        }
        if (existing.status !== "DRAFT") {
            throw app_error_1.AppError.fromCode("LETTER_INVALID_STATE", "Only draft letters can be edited");
        }
        const nextType = (input.type ?? existing.type);
        let nextRecipient = input.recipientId !== undefined
            ? input.recipientId
            : existing.recipientId;
        if (nextType === "PRIVATE") {
            if (!nextRecipient) {
                throw app_error_1.AppError.fromCode("VALIDATION_ERROR", "recipientId is required for PRIVATE letters");
            }
            if (nextRecipient === userId) {
                throw app_error_1.AppError.fromCode("VALIDATION_ERROR", "Cannot send a private letter to yourself");
            }
            const recipient = await this.users.findById(String(nextRecipient));
            if (!recipient) {
                throw app_error_1.AppError.fromCode("USER_NOT_FOUND", "Recipient not found");
            }
        }
        else {
            nextRecipient = null;
        }
        const patch = {};
        if (input.title !== undefined)
            patch.title = input.title.trim();
        if (input.content !== undefined)
            patch.content = input.content;
        if (input.mood !== undefined)
            patch.mood = input.mood;
        if (input.type !== undefined)
            patch.type = input.type;
        if (input.type !== undefined || input.recipientId !== undefined) {
            patch.recipientId = nextRecipient;
        }
        if (input.attachmentUploadIds !== undefined) {
            patch.attachments = await this.resolveAttachments(userId, input.attachmentUploadIds);
        }
        const updated = await this.repo.updateById(id, patch);
        if (!updated)
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        await this.audit("LETTER_UPDATED", id, { status: "DRAFT" });
        return this.toDto(updated, userId);
    }
    async deleteLetter(id) {
        const userId = this.requireUserId();
        const existing = await this.repo.findById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        // Sender may delete drafts only
        if (existing.senderId !== userId || existing.status !== "DRAFT") {
            // Don't leak: non-owner or non-draft
            if (existing.senderId !== userId) {
                throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
            }
            throw app_error_1.AppError.fromCode("LETTER_INVALID_STATE", "Only draft letters can be deleted");
        }
        await this.repo.deleteById(id);
        await this.audit("LETTER_DELETED", id, { status: "DRAFT" });
        return { ok: true };
    }
    async sendLetter(id) {
        const userId = this.requireUserId();
        const existing = await this.repo.findById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        if (existing.senderId !== userId) {
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        }
        if (existing.status !== "DRAFT") {
            throw app_error_1.AppError.fromCode("LETTER_INVALID_STATE", "Only draft letters can be sent");
        }
        if (existing.type === "PRIVATE" && !existing.recipientId) {
            throw app_error_1.AppError.fromCode("LETTER_INVALID_STATE", "PRIVATE letters require a recipient before sending");
        }
        const now = new Date();
        const updated = await this.repo.updateById(id, {
            status: "SENT",
            deliveredAt: now,
        });
        if (!updated)
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        await this.audit("LETTER_SENT", id, {
            type: String(existing.type),
            status: "SENT",
        });
        return this.toDto(updated, userId);
    }
    async archiveLetter(id) {
        const userId = this.requireUserId();
        const existing = await this.repo.findById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        // Recipient archives private received letters
        if (existing.type !== "PRIVATE" ||
            existing.recipientId !== userId ||
            (existing.status !== "SENT" && existing.status !== "READ")) {
            // If user is not recipient, hide existence when not sender of draft
            if (existing.recipientId !== userId) {
                throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
            }
            throw app_error_1.AppError.fromCode("LETTER_INVALID_STATE", "Only received private letters can be archived");
        }
        const updated = await this.repo.updateById(id, {
            status: "ARCHIVED",
            archivedAt: new Date(),
        });
        if (!updated)
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        await this.audit("LETTER_ARCHIVED", id, { status: "ARCHIVED" });
        return this.toDto(updated, userId);
    }
    async getInbox(query) {
        const userId = this.requireUserId();
        const result = await this.repo.listInbox(userId, query.page, query.limit);
        return this.toPage(result, userId);
    }
    async getSent(query) {
        const userId = this.requireUserId();
        const result = await this.repo.listSent(userId, query.page, query.limit);
        return this.toPage(result, userId);
    }
    async getPublicLetters(query) {
        // Public feed — no auth required, but if authenticated mark isSender
        const userId = this.ctx?.user?.id;
        const result = await this.repo.listPublic(query.page, query.limit);
        return this.toPage(result, userId);
    }
    async getLetter(id) {
        const userId = this.ctx?.user?.id;
        const existing = await this.repo.findById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        if (!this.canView(existing, userId)) {
            throw app_error_1.AppError.fromCode("LETTER_NOT_FOUND");
        }
        // Read tracking: recipient first view of SENT private letter
        let doc = existing;
        if (userId &&
            existing.type === "PRIVATE" &&
            existing.recipientId === userId &&
            existing.status === "SENT") {
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
    canView(doc, userId) {
        // PUBLIC + SENT (and READ if ever set) — anonymous OK
        if (doc.type === "PUBLIC" && (doc.status === "SENT" || doc.status === "READ")) {
            return true;
        }
        if (!userId)
            return false;
        // Sender can always view their own letters (any status)
        if (doc.senderId === userId)
            return true;
        // Recipient can view private SENT / READ / ARCHIVED
        if (doc.type === "PRIVATE" &&
            doc.recipientId === userId &&
            (doc.status === "SENT" ||
                doc.status === "READ" ||
                doc.status === "ARCHIVED")) {
            return true;
        }
        // Drafts: sender only (already covered)
        // Admins: no bypass
        return false;
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
    toPage(result, userId) {
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
    toDto(doc, userId) {
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
exports.LettersService = LettersService;
