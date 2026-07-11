"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourcesService = void 0;
const app_error_1 = require("@/utils/app-error");
const slug_1 = require("@/utils/slug");
const upload_repository_1 = require("@/modules/upload/upload.repository");
const resources_repository_1 = require("./resources.repository");
class ResourcesService {
    constructor(deps) {
        this.deps = deps;
        this.repo = new resources_repository_1.ResourcesRepository();
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
    async createResource(input) {
        const authorId = this.requireUserId();
        const tags = (0, slug_1.normalizeTags)(input.tags);
        const coverImage = await this.resolveCover(authorId, input.coverImage ?? null, input.coverUploadId);
        const status = input.status ?? "DRAFT";
        const slug = await this.uniqueSlug(input.title);
        const publishedAt = status === "PUBLISHED" ? new Date() : null;
        const doc = await this.repo.create({
            authorId,
            title: input.title.trim(),
            slug,
            summary: input.summary ?? "",
            content: input.content,
            category: input.category.trim(),
            tags,
            coverImage,
            estimatedReadMinutes: input.estimatedReadMinutes ?? 5,
            featured: input.featured ?? false,
            status,
            publishedAt,
        });
        await this.deps.audit.log({
            type: "RESOURCE_CREATED",
            ...this.auditBase(),
            userId: authorId,
            metadata: {
                resourceId: String(doc._id),
                status,
                slug,
                category: input.category.trim(),
            },
        });
        if (status === "PUBLISHED") {
            await this.deps.audit.log({
                type: "RESOURCE_PUBLISHED",
                ...this.auditBase(),
                userId: authorId,
                metadata: { resourceId: String(doc._id), slug },
            });
        }
        return this.toDto(doc, true);
    }
    async updateResource(id, input) {
        const userId = this.requireUserId();
        const existing = await this.repo.findById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("RESOURCE_NOT_FOUND");
        if (existing.authorId !== userId) {
            throw app_error_1.AppError.fromCode("RESOURCE_FORBIDDEN");
        }
        const patch = {};
        if (input.title !== undefined)
            patch.title = input.title.trim();
        if (input.summary !== undefined)
            patch.summary = input.summary;
        if (input.content !== undefined)
            patch.content = input.content;
        if (input.category !== undefined)
            patch.category = input.category.trim();
        if (input.tags !== undefined)
            patch.tags = (0, slug_1.normalizeTags)(input.tags);
        if (input.estimatedReadMinutes !== undefined) {
            patch.estimatedReadMinutes = input.estimatedReadMinutes;
        }
        if (input.featured !== undefined)
            patch.featured = input.featured;
        if (input.coverImage !== undefined || input.coverUploadId) {
            patch.coverImage = await this.resolveCover(userId, input.coverImage === undefined
                ? existing.coverImage
                : input.coverImage, input.coverUploadId);
        }
        const wasPublished = existing.status === "PUBLISHED";
        let becomingPublished = false;
        if (input.status !== undefined) {
            patch.status = input.status;
            if (input.status === "PUBLISHED" && !wasPublished) {
                patch.publishedAt = existing.publishedAt || new Date();
                becomingPublished = true;
            }
        }
        if (input.title && existing.status === "DRAFT") {
            patch.slug = await this.uniqueSlug(input.title, id);
        }
        const updated = await this.repo.updateById(id, patch);
        if (!updated)
            throw app_error_1.AppError.fromCode("RESOURCE_NOT_FOUND");
        await this.deps.audit.log({
            type: "RESOURCE_UPDATED",
            ...this.auditBase(),
            userId,
            metadata: {
                resourceId: id,
                fields: Object.keys(patch).join(","),
            },
        });
        if (becomingPublished) {
            await this.deps.audit.log({
                type: "RESOURCE_PUBLISHED",
                ...this.auditBase(),
                userId,
                metadata: { resourceId: id, slug: String(updated.slug) },
            });
        }
        return this.toDto(updated, true);
    }
    async deleteResource(id) {
        const userId = this.requireUserId();
        const existing = await this.repo.findById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("RESOURCE_NOT_FOUND");
        if (existing.authorId !== userId) {
            throw app_error_1.AppError.fromCode("RESOURCE_FORBIDDEN");
        }
        await this.repo.deleteById(id);
        await this.deps.audit.log({
            type: "RESOURCE_DELETED",
            ...this.auditBase(),
            userId,
            metadata: { resourceId: id, slug: existing.slug },
        });
        return { ok: true };
    }
    async publishResource(id) {
        return this.updateResource(id, { status: "PUBLISHED" });
    }
    async listPublished(query) {
        const result = await this.repo.listPublished(query.page, query.limit);
        return this.toPage(result, this.ctx?.user?.id);
    }
    async listFeatured(query) {
        const result = await this.repo.listFeatured(query.page, query.limit);
        return this.toPage(result, this.ctx?.user?.id);
    }
    async listByCategory(category, query) {
        const result = await this.repo.listByCategory(category.trim(), query.page, query.limit);
        return this.toPage(result, this.ctx?.user?.id);
    }
    async listByTag(tag, query) {
        const normalized = tag.trim().toLowerCase().replace(/\s+/g, "-");
        const result = await this.repo.listByTag(normalized, query.page, query.limit);
        return this.toPage(result, this.ctx?.user?.id);
    }
    async getResource(slug) {
        const doc = await this.repo.findBySlug(slug);
        if (!doc)
            throw app_error_1.AppError.fromCode("RESOURCE_NOT_FOUND");
        const viewerId = this.ctx?.user?.id;
        const isOwner = Boolean(viewerId && viewerId === doc.authorId);
        if (doc.status === "DRAFT" && !isOwner) {
            throw app_error_1.AppError.fromCode("RESOURCE_NOT_FOUND");
        }
        return this.toDto(doc, isOwner);
    }
    async getMyResources(query) {
        const authorId = this.requireUserId();
        const result = await this.repo.listByAuthor(authorId, query.page, query.limit);
        return this.toPage(result, authorId);
    }
    async uniqueSlug(title, excludeId) {
        const base = (0, slug_1.slugify)(title);
        let candidate = base;
        let n = 2;
        while (await this.repo.slugExists(candidate, excludeId)) {
            candidate = `${base}-${n}`;
            n += 1;
            if (n > 1000)
                throw app_error_1.AppError.fromCode("RESOURCE_SLUG_EXISTS");
        }
        return candidate;
    }
    async resolveCover(userId, coverImage, coverUploadId) {
        if (coverUploadId) {
            const upload = await this.uploads.findById(coverUploadId);
            if (!upload)
                throw app_error_1.AppError.fromCode("UPLOAD_NOT_FOUND");
            if (upload.ownerId && upload.ownerId !== userId) {
                throw app_error_1.AppError.fromCode("FORBIDDEN", "Upload does not belong to you");
            }
            return upload.url;
        }
        if (coverImage === undefined)
            return null;
        return coverImage;
    }
    toPage(result, viewerId) {
        return {
            items: result.items.map((doc) => this.toDto(doc, Boolean(viewerId && viewerId === doc.authorId))),
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.max(1, Math.ceil(result.total / result.limit) || 1),
            },
        };
    }
    toDto(doc, isOwner) {
        return {
            id: String(doc._id),
            authorId: doc.authorId,
            title: doc.title,
            slug: doc.slug,
            summary: doc.summary ?? "",
            content: doc.content,
            category: doc.category,
            tags: doc.tags ?? [],
            coverImage: doc.coverImage ?? null,
            estimatedReadMinutes: doc.estimatedReadMinutes ?? 5,
            featured: Boolean(doc.featured),
            status: doc.status,
            publishedAt: doc.publishedAt
                ? new Date(doc.publishedAt).toISOString()
                : null,
            createdAt: new Date(doc.createdAt).toISOString(),
            updatedAt: new Date(doc.updatedAt).toISOString(),
            isOwner,
        };
    }
}
exports.ResourcesService = ResourcesService;
