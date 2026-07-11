"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const upload_service_1 = require("./upload.service");
const app_error_1 = require("../../utils/app-error");
class UploadController {
    async upload(request, reply) {
        const file = await request.file();
        if (!file) {
            throw new app_error_1.AppError("No file provided", 400, "VALIDATION_ERROR");
        }
        const buffer = await file.toBuffer();
        const purposeField = file.fields
            ?.purpose?.value;
        const service = new upload_service_1.UploadService(request.server, request.ctx);
        const data = await service.uploadFile({
            buffer,
            filename: file.filename,
            mimeType: file.mimetype,
            purpose: purposeField,
        });
        return reply.success(data, 201);
    }
    async remove(request, reply) {
        const { id } = request.params;
        const service = new upload_service_1.UploadService(request.server, request.ctx);
        const data = await service.remove(id);
        return reply.success(data);
    }
}
exports.UploadController = UploadController;
