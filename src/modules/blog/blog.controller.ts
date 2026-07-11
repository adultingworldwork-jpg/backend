import { FastifyRequest, FastifyReply } from "fastify";
import { BlogService } from "./blog.service";
import {
  BlogListQuery,
  CreateBlogInput,
  UpdateBlogInput,
} from "./blog.schema";

export class BlogController {
  private service(request: FastifyRequest) {
    return new BlogService({
      ctx: request.ctx,
      audit: request.server.audit,
    });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).createPost(
      request.body as CreateBlogInput,
    );
    return reply.success(data, 201);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).updatePost(
      id,
      request.body as UpdateBlogInput,
    );
    return reply.success(data);
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deletePost(id);
    return reply.success(data);
  }

  async mine(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).getMyPosts(
      request.query as BlogListQuery,
    );
    return reply.success(data);
  }

  async listPublished(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).getPublished(
      request.query as BlogListQuery,
    );
    return reply.success(data);
  }

  async bySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const data = await this.service(request).getPost(slug);
    return reply.success(data);
  }

  async byTag(request: FastifyRequest, reply: FastifyReply) {
    const { tag } = request.params as { tag: string };
    const data = await this.service(request).getByTag(
      tag,
      request.query as BlogListQuery,
    );
    return reply.success(data);
  }
}
