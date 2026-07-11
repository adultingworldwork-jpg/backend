"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryStorageService = void 0;
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
const app_error_1 = require("../../utils/app-error");
function resourceTypeForMime(mimeType) {
    if (mimeType.startsWith("image/"))
        return "image";
    if (mimeType.startsWith("video/"))
        return "video";
    if (mimeType === "application/pdf")
        return "raw";
    return "auto";
}
/**
 * Cloudinary implementation of StorageService.
 * Only this class (and the plugin) may import the Cloudinary SDK.
 */
class CloudinaryStorageService {
    constructor(cfg) {
        this.cfg = cfg;
        this.configured = Boolean(cfg.cloudName && cfg.apiKey && cfg.apiSecret);
        if (this.configured) {
            cloudinary_1.v2.config({
                cloud_name: cfg.cloudName,
                api_key: cfg.apiKey,
                api_secret: cfg.apiSecret,
                secure: true,
            });
        }
    }
    async upload(input) {
        if (!this.configured) {
            throw new app_error_1.AppError("Cloudinary is not configured", 503, "NOT_READY");
        }
        const resourceType = resourceTypeForMime(input.mimeType);
        const folder = [this.cfg.folder, input.purpose || "general", input.folder]
            .filter(Boolean)
            .join("/");
        const result = await this.uploadBuffer(input.buffer, {
            folder,
            resource_type: resourceType === "auto" ? "auto" : resourceType,
            public_id: undefined,
            use_filename: true,
            unique_filename: true,
            overwrite: false,
        });
        return {
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            mimeType: input.mimeType,
            size: result.bytes ?? input.buffer.length,
            format: result.format,
            resourceType: result.resource_type ||
                resourceType,
        };
    }
    async delete(publicId, resourceType = "image") {
        if (!this.configured) {
            throw new app_error_1.AppError("Cloudinary is not configured", 503, "NOT_READY");
        }
        await cloudinary_1.v2.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
    }
    uploadBuffer(buffer, options) {
        return new Promise((resolve, reject) => {
            const stream = cloudinary_1.v2.uploader.upload_stream(options, (error, result) => {
                if (error || !result) {
                    reject(error || new Error("Cloudinary upload returned no result"));
                    return;
                }
                resolve(result);
            });
            stream_1.Readable.from(buffer).pipe(stream);
        });
    }
}
exports.CloudinaryStorageService = CloudinaryStorageService;
