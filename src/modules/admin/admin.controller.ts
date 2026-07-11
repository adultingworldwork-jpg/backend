import { FastifyRequest, FastifyReply } from "fastify";
import { AdminService } from "./admin.service";
import {
  PaginationQuery,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from "./admin.schema";

export class AdminController {
  private service(request: FastifyRequest) {
    return new AdminService({
      ctx: request.ctx,
      audit: request.server.audit,
    });
  }

  async dashboard(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).getDashboard();
    return reply.success(data);
  }

  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listUsers(
      request.query as PaginationQuery,
    );
    return reply.success(data);
  }

  async getUser(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).getUser(id);
    return reply.success(data);
  }

  async updateUserStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).updateUserStatus(
      id,
      request.body as UpdateUserStatusInput,
    );
    return reply.success(data);
  }

  async updateUserRole(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).updateUserRole(
      id,
      request.body as UpdateUserRoleInput,
    );
    return reply.success(data);
  }

  async listBlogs(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listBlogs(
      request.query as PaginationQuery,
    );
    return reply.success(data);
  }

  async deleteBlog(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deleteBlog(id);
    return reply.success(data);
  }

  async listCommunity(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listCommunityPosts(
      request.query as PaginationQuery,
    );
    return reply.success(data);
  }

  async deleteCommunityPost(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deleteCommunityPost(id);
    return reply.success(data);
  }

  async deleteCommunityComment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deleteCommunityComment(id);
    return reply.success(data);
  }

  async listResources(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listResources(
      request.query as PaginationQuery,
    );
    return reply.success(data);
  }

  async deleteResource(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deleteResource(id);
    return reply.success(data);
  }

  async listLetters(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listPublicLetters(
      request.query as PaginationQuery,
    );
    return reply.success(data);
  }

  async deleteLetter(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).deletePublicLetter(id);
    return reply.success(data);
  }

  /** Privacy wall — journals never accessible to admin */
  async denyJournals(request: FastifyRequest, reply: FastifyReply) {
    this.service(request).denyJournalAccess();
    return reply;
  }

  /** Privacy wall — chat messages never accessible to admin */
  async denyChat(request: FastifyRequest, reply: FastifyReply) {
    this.service(request).denyChatAccess();
    return reply;
  }
}
