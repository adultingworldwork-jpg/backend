import { FastifyRequest, FastifyReply } from "fastify";
import { ProfileService } from "./profile.service";
import {
  MediaRefInput,
  UpdateProfileInput,
  mediaRefSchema,
} from "./profile.schema";
import { AppError } from "@/utils/app-error";

export class ProfileController {
  private service(request: FastifyRequest) {
    return new ProfileService({
      ctx: request.ctx,
      audit: request.server.audit,
      app: request.server,
    });
  }

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).getMyProfile();
    return reply.success(data);
  }

  async updateMe(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).updateProfile(
      request.body as UpdateProfileInput,
    );
    return reply.success(data);
  }

  async getByUsername(request: FastifyRequest, reply: FastifyReply) {
    const { username } = request.params as { username: string };
    const data = await this.service(request).getPublicProfile(username);
    return reply.success(data);
  }

  async updateAvatar(request: FastifyRequest, reply: FastifyReply) {
    const service = this.service(request);
    const contentType = String(request.headers["content-type"] || "");

    // Multipart → UploadService → store URL (no Cloudinary in Profile)
    if (contentType.includes("multipart/form-data")) {
      const file = await request.file();
      if (!file) {
        throw AppError.fromCode("VALIDATION_ERROR", "No file provided");
      }
      const buffer = await file.toBuffer();
      const data = await service.updateAvatarFromFile({
        buffer,
        filename: file.filename,
        mimeType: file.mimetype,
      });
      return reply.success(data);
    }

    const body = mediaRefSchema.parse(request.body ?? {});
    const data = await service.updateAvatar(body as MediaRefInput);
    return reply.success(data);
  }

  async updateCover(request: FastifyRequest, reply: FastifyReply) {
    const service = this.service(request);
    const contentType = String(request.headers["content-type"] || "");

    if (contentType.includes("multipart/form-data")) {
      const file = await request.file();
      if (!file) {
        throw AppError.fromCode("VALIDATION_ERROR", "No file provided");
      }
      const buffer = await file.toBuffer();
      const data = await service.updateCoverFromFile({
        buffer,
        filename: file.filename,
        mimeType: file.mimetype,
      });
      return reply.success(data);
    }

    const body = mediaRefSchema.parse(request.body ?? {});
    const data = await service.updateCover(body as MediaRefInput);
    return reply.success(data);
  }
}
