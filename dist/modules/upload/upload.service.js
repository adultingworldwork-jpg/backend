"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const app_error_1 = require("@/utils/app-error");
const upload_repository_1 = require("./upload.repository");
const upload_schema_1 = require("./upload.schema");
class UploadService {
    constructor(app, ctx) {
        this.app = app;
        this.ctx = ctx;
        this.repo = new upload_repository_1.UploadRepository();
    }
    async uploadFile(input) {
        if (!this.app.storage) {
            throw new app_error_1.AppError("Storage plugin is not registered. Enable Cloudinary (PLUGINS=cloudinary or set CLOUDINARY_CLOUD_NAME).", 503, "NOT_READY");
        }
        const purpose = upload_schema_1.uploadPurposeSchema.parse(input.purpose ?? "general");
        if (!upload_schema_1.ALLOWED_MIME_TYPES.includes(input.mimeType)) {
            throw new app_error_1.AppError(`Invalid file type: ${input.mimeType}`, 400, "UPLOAD_INVALID_TYPE");
        }
        const maxSize = upload_schema_1.MAX_SIZE_BY_PURPOSE[purpose];
        if (input.buffer.length > maxSize) {
            throw new app_error_1.AppError(`File too large. Max ${Math.floor(maxSize / (1024 * 1024))}MB for ${purpose}`, 400, "UPLOAD_TOO_LARGE");
        }
        if (purpose === "book_pdf" && input.mimeType !== "application/pdf") {
            throw new app_error_1.AppError("book_pdf purpose requires application/pdf", 400, "UPLOAD_INVALID_TYPE");
        }
        const stored = await this.app.storage.upload({
            buffer: input.buffer,
            filename: input.filename,
            mimeType: input.mimeType,
            purpose,
        });
        const doc = await this.repo.create({
            ownerId: this.ctx?.user?.id,
            purpose,
            originalName: input.filename,
            mimeType: input.mimeType,
            size: stored.size,
            publicId: stored.publicId,
            url: stored.secureUrl || stored.url,
            resourceType: stored.resourceType,
        });
        return this.toDto(doc);
    }
    async remove(id) {
        const existing = await this.repo.findById(id);
        if (!existing) {
            throw new app_error_1.AppError("Upload not found", 404, "UPLOAD_NOT_FOUND");
        }
        const ownerId = this.ctx?.user?.id;
        const isAdmin = this.ctx?.user?.role === "admin";
        if (existing.ownerId && ownerId && existing.ownerId !== ownerId && !isAdmin) {
            throw new app_error_1.AppError("Forbidden", 403, "FORBIDDEN");
        }
        if (this.app.storage) {
            const resourceType = existing.resourceType === "raw" ||
                existing.resourceType === "video" ||
                existing.resourceType === "image"
                ? existing.resourceType
                : "image";
            await this.app.storage.delete(existing.publicId, resourceType);
        }
        await this.repo.deleteById(id);
        return { ok: true };
    }
    toDto(doc) {
        return {
            id: doc._id.toString(),
            purpose: doc.purpose,
            originalName: doc.originalName,
            mimeType: doc.mimeType,
            size: doc.size,
            publicId: doc.publicId,
            url: doc.url,
            resourceType: doc.resourceType,
            ownerId: doc.ownerId ?? null,
            createdAt: doc.createdAt ?? new Date(),
        };
    }
}
exports.UploadService = UploadService;
