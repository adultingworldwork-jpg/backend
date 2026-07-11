import { FastifyRequest, FastifyReply } from "fastify";
import { CommunityService } from "./community.service";
import {
  CommunityListQuery,
  CreateCommentInput,
  CreateCommunityPostInput,
  ReactionInput,
  UpdateCommentInput,
  UpdateCommunityPostInput,
} from "./community.schema";

export class CommunityController {
  private service(request: FastifyRequest) {
    return new CommunityService({
      ctx: request.ctx,
      audit: request.server.audit,
    });
  }

  async createPost(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).createPost(
      request.body as CreateCommunityPostInput,
    );
    return reply.success(data, 201);
  }

  async updatePost(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).updatePost(
      id,
      request.body as UpdateCommunityPostInput,
    );
    return reply.success(data);
  }

  async deletePost(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deletePost(id);
    return reply.success(data);
  }

  async listPosts(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listPosts(
      request.query as CommunityListQuery,
    );
    return reply.success(data);
  }

  async getPost(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).getPost(id);
    return reply.success(data);
  }

  async getMyPosts(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).getMyPosts(
      request.query as CommunityListQuery,
    );
    return reply.success(data);
  }

  async addComment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).addComment(
      id,
      request.body as CreateCommentInput,
    );
    return reply.success(data, 201);
  }

  async updateComment(request: FastifyRequest, reply: FastifyReply) {
    const { commentId } = request.params as { commentId: string };
    const data = await this.service(request).updateComment(
      commentId,
      request.body as UpdateCommentInput,
    );
    return reply.success(data);
  }

  async deleteComment(request: FastifyRequest, reply: FastifyReply) {
    const { commentId } = request.params as { commentId: string };
    const data = await this.service(request).deleteComment(commentId);
    return reply.success(data);
  }

  async listComments(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).listComments(
      id,
      request.query as CommunityListQuery,
    );
    return reply.success(data);
  }

  async react(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).react(
      id,
      request.body as ReactionInput,
    );
    return reply.success(data);
  }

  async removeReaction(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).removeReaction(id);
    return reply.success(data);
  }
}
