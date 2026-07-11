"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const profile_service_1 = require("./profile.service");
const profile_schema_1 = require("./profile.schema");
const app_error_1 = require("@/utils/app-error");
class ProfileController {
    service(request) {
        return new profile_service_1.ProfileService({
            ctx: request.ctx,
            audit: request.server.audit,
            app: request.server,
        });
    }
    async getMe(request, reply) {
        const data = await this.service(request).getMyProfile();
        return reply.success(data);
    }
    async updateMe(request, reply) {
        const data = await this.service(request).updateProfile(request.body);
        return reply.success(data);
    }
    async getByUsername(request, reply) {
        const { username } = request.params;
        const data = await this.service(request).getPublicProfile(username);
        return reply.success(data);
    }
    async updateAvatar(request, reply) {
        const service = this.service(request);
        const contentType = String(request.headers["content-type"] || "");
        // Multipart → UploadService → store URL (no Cloudinary in Profile)
        if (contentType.includes("multipart/form-data")) {
            const file = await request.file();
            if (!file) {
                throw app_error_1.AppError.fromCode("VALIDATION_ERROR", "No file provided");
            }
            const buffer = await file.toBuffer();
            const data = await service.updateAvatarFromFile({
                buffer,
                filename: file.filename,
                mimeType: file.mimetype,
            });
            return reply.success(data);
        }
        const body = profile_schema_1.mediaRefSchema.parse(request.body ?? {});
        const data = await service.updateAvatar(body);
        return reply.success(data);
    }
    async updateCover(request, reply) {
        const service = this.service(request);
        const contentType = String(request.headers["content-type"] || "");
        if (contentType.includes("multipart/form-data")) {
            const file = await request.file();
            if (!file) {
                throw app_error_1.AppError.fromCode("VALIDATION_ERROR", "No file provided");
            }
            const buffer = await file.toBuffer();
            const data = await service.updateCoverFromFile({
                buffer,
                filename: file.filename,
                mimeType: file.mimetype,
            });
            return reply.success(data);
        }
        const body = profile_schema_1.mediaRefSchema.parse(request.body ?? {});
        const data = await service.updateCover(body);
        return reply.success(data);
    }
}
exports.ProfileController = ProfileController;
