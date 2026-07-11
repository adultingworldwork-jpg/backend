import { FastifyInstance } from "fastify";
import { AppError } from "@/utils/app-error";
import { RequestContext } from "@/types/request-context";
import { UploadRepository } from "./upload.repository";
import {
  ALLOWED_MIME_TYPES,
  MAX_SIZE_BY_PURPOSE,
  UploadPurpose,
  uploadPurposeSchema,
} from "./upload.schema";

export class UploadService {
  private repo = new UploadRepository();

  constructor(
    private app: FastifyInstance,
    private ctx?: RequestContext,
  ) {}

  async uploadFile(input: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    purpose?: string;
  }) {
    if (!this.app.storage) {
      throw new AppError(
        "Storage plugin is not registered. Enable Cloudinary (PLUGINS=cloudinary or set CLOUDINARY_CLOUD_NAME).",
        503,
        "NOT_READY",
      );
    }

    const purpose = uploadPurposeSchema.parse(input.purpose ?? "general");

    if (!ALLOWED_MIME_TYPES.includes(input.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new AppError(
        `Invalid file type: ${input.mimeType}`,
        400,
        "UPLOAD_INVALID_TYPE",
      );
    }

    const maxSize = MAX_SIZE_BY_PURPOSE[purpose];
    if (input.buffer.length > maxSize) {
      throw new AppError(
        `File too large. Max ${Math.floor(maxSize / (1024 * 1024))}MB for ${purpose}`,
        400,
        "UPLOAD_TOO_LARGE",
      );
    }

    if (purpose === "book_pdf" && input.mimeType !== "application/pdf") {
      throw new AppError(
        "book_pdf purpose requires application/pdf",
        400,
        "UPLOAD_INVALID_TYPE",
      );
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

  async remove(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError("Upload not found", 404, "UPLOAD_NOT_FOUND");
    }

    const ownerId = this.ctx?.user?.id;
    const isAdmin = this.ctx?.user?.role === "admin";
    if (existing.ownerId && ownerId && existing.ownerId !== ownerId && !isAdmin) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    if (this.app.storage) {
      const resourceType =
        existing.resourceType === "raw" ||
        existing.resourceType === "video" ||
        existing.resourceType === "image"
          ? existing.resourceType
          : "image";
      await this.app.storage.delete(existing.publicId, resourceType);
    }

    await this.repo.deleteById(id);
    return { ok: true as const };
  }

  private toDto(doc: {
    _id: { toString(): string };
    purpose: string;
    originalName: string;
    mimeType: string;
    size: number;
    publicId: string;
    url: string;
    resourceType: string;
    ownerId?: string | null;
    createdAt?: Date;
  }) {
    return {
      id: doc._id.toString(),
      purpose: doc.purpose as UploadPurpose,
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
