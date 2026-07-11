import { FastifyRequest, FastifyReply } from "fastify";
import { UploadService } from "./upload.service";
import { AppError } from "@/utils/app-error";

export class UploadController {
  async upload(request: FastifyRequest, reply: FastifyReply) {
    const file = await request.file();

    if (!file) {
      throw new AppError("No file provided", 400, "VALIDATION_ERROR");
    }

    const buffer = await file.toBuffer();
    const purposeField = (file.fields as Record<string, { value?: string } | undefined>)
      ?.purpose?.value;

    const service = new UploadService(request.server, request.ctx);
    const data = await service.uploadFile({
      buffer,
      filename: file.filename,
      mimeType: file.mimetype,
      purpose: purposeField,
    });

    return reply.success(data, 201);
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const service = new UploadService(request.server, request.ctx);
    const data = await service.remove(id);
    return reply.success(data);
  }
}
