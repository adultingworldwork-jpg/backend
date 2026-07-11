import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Readable } from "stream";
import {
  StorageService,
  StorageUploadInput,
  StorageUploadResult,
} from "@/core/interfaces/storage";
import { AppError } from "@/utils/app-error";

export type CloudinaryConfig = {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
  folder: string;
};

function resourceTypeForMime(
  mimeType: string,
): "image" | "raw" | "video" | "auto" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "raw";
  return "auto";
}

/**
 * Cloudinary implementation of StorageService.
 * Only this class (and the plugin) may import the Cloudinary SDK.
 */
export class CloudinaryStorageService implements StorageService {
  readonly configured: boolean;

  constructor(private readonly cfg: CloudinaryConfig) {
    this.configured = Boolean(cfg.cloudName && cfg.apiKey && cfg.apiSecret);

    if (this.configured) {
      cloudinary.config({
        cloud_name: cfg.cloudName,
        api_key: cfg.apiKey,
        api_secret: cfg.apiSecret,
        secure: true,
      });
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    if (!this.configured) {
      throw new AppError(
        "Cloudinary is not configured",
        503,
        "NOT_READY",
      );
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
      resourceType:
        (result.resource_type as StorageUploadResult["resourceType"]) ||
        resourceType,
    };
  }

  async delete(
    publicId: string,
    resourceType: "image" | "raw" | "video" = "image",
  ): Promise<void> {
    if (!this.configured) {
      throw new AppError(
        "Cloudinary is not configured",
        503,
        "NOT_READY",
      );
    }

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }

  private uploadBuffer(
    buffer: Buffer,
    options: Record<string, unknown>,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Cloudinary upload returned no result"));
            return;
          }
          resolve(result);
        },
      );

      Readable.from(buffer).pipe(stream);
    });
  }
}
