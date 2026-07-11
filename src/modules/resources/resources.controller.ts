import { FastifyRequest, FastifyReply } from "fastify";
import { ResourcesService } from "./resources.service";
import {
  CreateResourceInput,
  ResourceListQuery,
  UpdateResourceInput,
} from "./resources.schema";

export class ResourcesController {
  private service(request: FastifyRequest) {
    return new ResourcesService({
      ctx: request.ctx,
      audit: request.server.audit,
    });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).createResource(
      request.body as CreateResourceInput,
    );
    return reply.success(data, 201);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).updateResource(
      id,
      request.body as UpdateResourceInput,
    );
    return reply.success(data);
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deleteResource(id);
    return reply.success(data);
  }

  async publish(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).publishResource(id);
    return reply.success(data);
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listPublished(
      request.query as ResourceListQuery,
    );
    return reply.success(data);
  }

  async featured(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listFeatured(
      request.query as ResourceListQuery,
    );
    return reply.success(data);
  }

  async byCategory(request: FastifyRequest, reply: FastifyReply) {
    const { category } = request.params as { category: string };
    const data = await this.service(request).listByCategory(
      category,
      request.query as ResourceListQuery,
    );
    return reply.success(data);
  }

  async byTag(request: FastifyRequest, reply: FastifyReply) {
    const { tag } = request.params as { tag: string };
    const data = await this.service(request).listByTag(
      tag,
      request.query as ResourceListQuery,
    );
    return reply.success(data);
  }

  async bySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const data = await this.service(request).getResource(slug);
    return reply.success(data);
  }

  async mine(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).getMyResources(
      request.query as ResourceListQuery,
    );
    return reply.success(data);
  }
}
