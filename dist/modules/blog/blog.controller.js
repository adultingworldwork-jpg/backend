"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogController = void 0;
const blog_service_1 = require("./blog.service");
class BlogController {
    service(request) {
        return new blog_service_1.BlogService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
    }
    async create(request, reply) {
        const data = await this.service(request).createPost(request.body);
        return reply.success(data, 201);
    }
    async update(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).updatePost(id, request.body);
        return reply.success(data);
    }
    async remove(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deletePost(id);
        return reply.success(data);
    }
    async mine(request, reply) {
        const data = await this.service(request).getMyPosts(request.query);
        return reply.success(data);
    }
    async listPublished(request, reply) {
        const data = await this.service(request).getPublished(request.query);
        return reply.success(data);
    }
    async bySlug(request, reply) {
        const { slug } = request.params;
        const data = await this.service(request).getPost(slug);
        return reply.success(data);
    }
    async byTag(request, reply) {
        const { tag } = request.params;
        const data = await this.service(request).getByTag(tag, request.query);
        return reply.success(data);
    }
}
exports.BlogController = BlogController;
