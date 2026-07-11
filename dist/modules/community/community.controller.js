"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityController = void 0;
const community_service_1 = require("./community.service");
class CommunityController {
    service(request) {
        return new community_service_1.CommunityService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
    }
    async createPost(request, reply) {
        const data = await this.service(request).createPost(request.body);
        return reply.success(data, 201);
    }
    async updatePost(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).updatePost(id, request.body);
        return reply.success(data);
    }
    async deletePost(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deletePost(id);
        return reply.success(data);
    }
    async listPosts(request, reply) {
        const data = await this.service(request).listPosts(request.query);
        return reply.success(data);
    }
    async getPost(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).getPost(id);
        return reply.success(data);
    }
    async getMyPosts(request, reply) {
        const data = await this.service(request).getMyPosts(request.query);
        return reply.success(data);
    }
    async addComment(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).addComment(id, request.body);
        return reply.success(data, 201);
    }
    async updateComment(request, reply) {
        const { commentId } = request.params;
        const data = await this.service(request).updateComment(commentId, request.body);
        return reply.success(data);
    }
    async deleteComment(request, reply) {
        const { commentId } = request.params;
        const data = await this.service(request).deleteComment(commentId);
        return reply.success(data);
    }
    async listComments(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).listComments(id, request.query);
        return reply.success(data);
    }
    async react(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).react(id, request.body);
        return reply.success(data);
    }
    async removeReaction(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).removeReaction(id);
        return reply.success(data);
    }
}
exports.CommunityController = CommunityController;
