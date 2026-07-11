import { FastifyRequest, FastifyReply } from "fastify";
import { LettersService } from "./letters.service";
import {
  CreateLetterInput,
  LetterListQuery,
  UpdateLetterInput,
} from "./letters.schema";

export class LettersController {
  private service(request: FastifyRequest) {
    return new LettersService({
      ctx: request.ctx,
      audit: request.server.audit,
    });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).createLetter(
      request.body as CreateLetterInput,
    );
    return reply.success(data, 201);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).updateLetter(
      id,
      request.body as UpdateLetterInput,
    );
    return reply.success(data);
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deleteLetter(id);
    return reply.success(data);
  }

  async send(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).sendLetter(id);
    return reply.success(data);
  }

  async archive(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).archiveLetter(id);
    return reply.success(data);
  }

  async sent(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).getSent(
      request.query as LetterListQuery,
    );
    return reply.success(data);
  }

  async inbox(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).getInbox(
      request.query as LetterListQuery,
    );
    return reply.success(data);
  }

  async publicFeed(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).getPublicLetters(
      request.query as LetterListQuery,
    );
    return reply.success(data);
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).getLetter(id);
    return reply.success(data);
  }
}
