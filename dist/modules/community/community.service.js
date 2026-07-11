"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = void 0;
const app_error_1 = require("../../utils/app-error");
const upload_repository_1 = require("../../modules/upload/upload.repository");
const community_repository_1 = require("./community.repository");
class CommunityService {
    constructor(deps) {
        this.deps = deps;
        this.repo = new community_repository_1.CommunityRepository();
        this.uploads = new upload_repository_1.UploadRepository();
    }
    get ctx() {
        return this.deps.ctx;
    }
    auditBase() {
        return {
            requestId: this.ctx?.requestId,
            ip: this.ctx?.ip,
            userAgent: this.ctx?.userAgent,
            userId: this.ctx?.user?.id,
            username: this.ctx?.user?.username,
        };
    }
    requireUserId() {
        const id = this.ctx?.user?.id;
        if (!id)
            throw app_error_1.AppError.fromCode("UNAUTHORIZED");
        return id;
    }
    // ── Posts ──────────────────────────────────────────────
    async createPost(input) {
        const authorId = this.requireUserId();
        const attachments = await this.resolveAttachments(authorId, input.attachmentUploadIds ?? []);
        const doc = await this.repo.createPost({
            authorId,
            content: input.content,
            attachments,
            visibility: input.visibility ?? "COMMUNITY",
        });
        await this.deps.audit.log({
            type: "COMMUNITY_POST_CREATED",
            ...this.auditBase(),
            userId: authorId,
            metadata: {
                postId: String(doc._id),
                visibility: String(doc.visibility),
            },
        });
        return this.toPostDto(doc, authorId, null);
    }
    async updatePost(id, input) {
        const userId = this.requireUserId();
        const existing = await this.repo.findPostById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("COMMUNITY_POST_NOT_FOUND");
        if (existing.authorId !== userId) {
            throw app_error_1.AppError.fromCode("COMMUNITY_POST_FORBIDDEN");
        }
        const patch = {};
        if (input.content !== undefined)
            patch.content = input.content;
        if (input.visibility !== undefined)
            patch.visibility = input.visibility;
        if (input.attachmentUploadIds !== undefined) {
            patch.attachments = await this.resolveAttachments(userId, input.attachmentUploadIds);
        }
        const updated = await this.repo.updatePost(id, patch);
        if (!updated)
            throw app_error_1.AppError.fromCode("COMMUNITY_POST_NOT_FOUND");
        await this.deps.audit.log({
            type: "COMMUNITY_POST_UPDATED",
            ...this.auditBase(),
            userId,
            metadata: {
                postId: id,
                fields: Object.keys(patch).join(","),
            },
        });
        const myReaction = await this.repo.findReaction(id, userId);
        return this.toPostDto(updated, userId, myReaction?.type ?? null);
    }
    async deletePost(id) {
        const userId = this.requireUserId();
        const existing = await this.repo.findPostById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("COMMUNITY_POST_NOT_FOUND");
        if (existing.authorId !== userId) {
            throw app_error_1.AppError.fromCode("COMMUNITY_POST_FORBIDDEN");
        }
        await this.repo.deleteCommentsByPost(id);
        await this.repo.deleteReactionsByPost(id);
        await this.repo.deletePost(id);
        await this.deps.audit.log({
            type: "COMMUNITY_POST_DELETED",
            ...this.auditBase(),
            userId,
            metadata: { postId: id },
        });
        return { ok: true };
    }
    async listPosts(query) {
        const viewerId = this.ctx?.user?.id;
        const filter = viewerId
            ? {} // authenticated: PUBLIC + COMMUNITY
            : { visibility: "PUBLIC" };
        // Authenticated users see both PUBLIC and COMMUNITY
        if (viewerId) {
            // no visibility filter
        }
        const result = await this.repo.listPosts(filter, query.page, query.limit);
        const items = await Promise.all(result.items.map(async (doc) => {
            const isOwner = Boolean(viewerId && viewerId === doc.authorId);
            // Double-check COMMUNITY for safety if filter ever widens
            if (!this.canView(doc.visibility, isOwner, viewerId)) {
                return null;
            }
            const reaction = viewerId
                ? await this.repo.findReaction(String(doc._id), viewerId)
                : null;
            return this.toPostDto(doc, viewerId, reaction?.type ?? null);
        }));
        const filtered = items.filter(Boolean);
        return {
            items: filtered,
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    async getPost(id) {
        const doc = await this.repo.findPostById(id);
        if (!doc)
            throw app_error_1.AppError.fromCode("COMMUNITY_POST_NOT_FOUND");
        const viewerId = this.ctx?.user?.id;
        const isOwner = Boolean(viewerId && viewerId === doc.authorId);
        if (!this.canView(doc.visibility, isOwner, viewerId)) {
            throw app_error_1.AppError.fromCode("COMMUNITY_POST_FORBIDDEN");
        }
        const reaction = viewerId
            ? await this.repo.findReaction(id, viewerId)
            : null;
        return this.toPostDto(doc, viewerId, reaction?.type ?? null);
    }
    async getMyPosts(query) {
        const authorId = this.requireUserId();
        const result = await this.repo.listPosts({ authorId }, query.page, query.limit);
        const items = await Promise.all(result.items.map(async (doc) => {
            const reaction = await this.repo.findReaction(String(doc._id), authorId);
            return this.toPostDto(doc, authorId, reaction?.type ?? null);
        }));
        return {
            items,
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    // ── Comments ───────────────────────────────────────────
    async addComment(postId, input) {
        const authorId = this.requireUserId();
        await this.assertCanInteract(postId);
        const doc = await this.repo.createComment({
            postId,
            authorId,
            content: input.content,
        });
        await this.repo.incComments(postId, 1);
        await this.deps.audit.log({
            type: "COMMUNITY_COMMENT_CREATED",
            ...this.auditBase(),
            userId: authorId,
            metadata: { postId, commentId: String(doc._id) },
        });
        return this.toCommentDto(doc, authorId);
    }
    async updateComment(commentId, input) {
        const userId = this.requireUserId();
        const existing = await this.repo.findCommentById(commentId);
        if (!existing)
            throw app_error_1.AppError.fromCode("COMMUNITY_COMMENT_NOT_FOUND");
        if (existing.authorId !== userId) {
            throw app_error_1.AppError.fromCode("COMMUNITY_COMMENT_FORBIDDEN");
        }
        // Ensure parent post still viewable for consistency
        await this.assertCanInteract(existing.postId);
        const updated = await this.repo.updateComment(commentId, input.content);
        if (!updated)
            throw app_error_1.AppError.fromCode("COMMUNITY_COMMENT_NOT_FOUND");
        await this.deps.audit.log({
            type: "COMMUNITY_COMMENT_UPDATED",
            ...this.auditBase(),
            userId,
            metadata: { commentId, postId: existing.postId },
        });
        return this.toCommentDto(updated, userId);
    }
    async deleteComment(commentId) {
        const userId = this.requireUserId();
        const existing = await this.repo.findCommentById(commentId);
        if (!existing)
            throw app_error_1.AppError.fromCode("COMMUNITY_COMMENT_NOT_FOUND");
        if (existing.authorId !== userId) {
            throw app_error_1.AppError.fromCode("COMMUNITY_COMMENT_FORBIDDEN");
        }
        await this.repo.deleteComment(commentId);
        await this.repo.incComments(existing.postId, -1);
        // Prevent negative counters
        const post = await this.repo.findPostById(existing.postId);
        if (post && (post.commentsCount ?? 0) < 0) {
            await this.repo.updatePost(existing.postId, { commentsCount: 0 });
        }
        await this.deps.audit.log({
            type: "COMMUNITY_COMMENT_DELETED",
            ...this.auditBase(),
            userId,
            metadata: { commentId, postId: existing.postId },
        });
        return { ok: true };
    }
    async listComments(postId, query) {
        // Viewing comments requires ability to view the post
        await this.getPost(postId);
        const result = await this.repo.listComments(postId, query.page, query.limit);
        const viewerId = this.ctx?.user?.id;
        return {
            items: result.items.map((c) => this.toCommentDto(c, viewerId)),
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    // ── Reactions ──────────────────────────────────────────
    async react(postId, input) {
        const userId = this.requireUserId();
        await this.assertCanInteract(postId);
        const existing = await this.repo.findReaction(postId, userId);
        const doc = await this.repo.upsertReaction(postId, userId, input.type);
        if (!existing) {
            await this.repo.incReactions(postId, 1);
        }
        await this.deps.audit.log({
            type: "COMMUNITY_REACTION_ADDED",
            ...this.auditBase(),
            userId,
            metadata: {
                postId,
                reactionType: input.type,
                updated: Boolean(existing),
            },
        });
        return this.toReactionDto(doc);
    }
    async removeReaction(postId) {
        const userId = this.requireUserId();
        await this.assertCanInteract(postId);
        const existing = await this.repo.findReaction(postId, userId);
        if (!existing) {
            throw app_error_1.AppError.fromCode("COMMUNITY_REACTION_NOT_FOUND");
        }
        await this.repo.deleteReaction(postId, userId);
        await this.repo.incReactions(postId, -1);
        const post = await this.repo.findPostById(postId);
        if (post && (post.reactionsCount ?? 0) < 0) {
            await this.repo.updatePost(postId, { reactionsCount: 0 });
        }
        await this.deps.audit.log({
            type: "COMMUNITY_REACTION_REMOVED",
            ...this.auditBase(),
            userId,
            metadata: { postId },
        });
        return { ok: true };
    }
    // ── Visibility / helpers ───────────────────────────────
    canView(visibility, isOwner, viewerId) {
        if (isOwner)
            return true;
        if (visibility === "PUBLIC")
            return true;
        if (visibility === "COMMUNITY")
            return Boolean(viewerId);
        return false;
    }
    /** Comment/react require auth + ability view rights */
    async assertCanInteract(postId) {
        this.requireUserId();
        await this.getPost(postId);
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
    toPostDto(doc, viewerId, myReaction = null) {
        return {
            id: String(doc._id),
            authorId: doc.authorId,
            content: doc.content,
            attachments: doc.attachments ?? [],
            visibility: doc.visibility,
            commentsCount: Math.max(0, doc.commentsCount ?? 0),
            reactionsCount: Math.max(0, doc.reactionsCount ?? 0),
            createdAt: new Date(doc.createdAt).toISOString(),
            updatedAt: new Date(doc.updatedAt).toISOString(),
            isOwner: Boolean(viewerId && viewerId === doc.authorId),
            myReaction,
        };
    }
    toCommentDto(doc, viewerId) {
        return {
            id: String(doc._id),
            postId: doc.postId,
            authorId: doc.authorId,
            content: doc.content,
            createdAt: new Date(doc.createdAt).toISOString(),
            updatedAt: new Date(doc.updatedAt).toISOString(),
            isOwner: Boolean(viewerId && viewerId === doc.authorId),
        };
    }
    toReactionDto(doc) {
        return {
            id: String(doc._id),
            postId: doc.postId,
            userId: doc.userId,
            type: doc.type,
            createdAt: new Date(doc.createdAt).toISOString(),
        };
    }
}
exports.CommunityService = CommunityService;
