import { FastifyRequest, FastifyReply } from "fastify";
import { JournalService } from "./journal.service";
import {
  CreateJournalInput,
  JournalListQuery,
  UpdateJournalInput,
} from "./journal.schema";

export class JournalController {
  private service(request: FastifyRequest) {
    return new JournalService({
      ctx: request.ctx,
      audit: request.server.audit,
    });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).createEntry(
      request.body as CreateJournalInput,
    );
    return reply.success(data, 201);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).updateEntry(
      id,
      request.body as UpdateJournalInput,
    );
    return reply.success(data);
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deleteEntry(id);
    return reply.success(data);
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listEntries(
      request.query as JournalListQuery,
    );
    return reply.success(data);
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).getEntry(id);
    return reply.success(data);
  }
}
