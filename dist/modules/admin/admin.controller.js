"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("./admin.service");
class AdminController {
    service(request) {
        return new admin_service_1.AdminService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
    }
    async dashboard(request, reply) {
        const data = await this.service(request).getDashboard();
        return reply.success(data);
    }
    async listUsers(request, reply) {
        const data = await this.service(request).listUsers(request.query);
        return reply.success(data);
    }
    async getUser(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).getUser(id);
        return reply.success(data);
    }
    async updateUserStatus(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).updateUserStatus(id, request.body);
        return reply.success(data);
    }
    async updateUserRole(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).updateUserRole(id, request.body);
        return reply.success(data);
    }
    async listBlogs(request, reply) {
        const data = await this.service(request).listBlogs(request.query);
        return reply.success(data);
    }
    async deleteBlog(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deleteBlog(id);
        return reply.success(data);
    }
    async listCommunity(request, reply) {
        const data = await this.service(request).listCommunityPosts(request.query);
        return reply.success(data);
    }
    async deleteCommunityPost(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deleteCommunityPost(id);
        return reply.success(data);
    }
    async deleteCommunityComment(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deleteCommunityComment(id);
        return reply.success(data);
    }
    async listResources(request, reply) {
        const data = await this.service(request).listResources(request.query);
        return reply.success(data);
    }
    async deleteResource(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deleteResource(id);
        return reply.success(data);
    }
    async listLetters(request, reply) {
        const data = await this.service(request).listPublicLetters(request.query);
        return reply.success(data);
    }
    async deleteLetter(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deletePublicLetter(id);
        return reply.success(data);
    }
    /** Privacy wall — journals never accessible to admin */
    async denyJournals(request, reply) {
        this.service(request).denyJournalAccess();
        return reply;
    }
    /** Privacy wall — chat messages never accessible to admin */
    async denyChat(request, reply) {
        this.service(request).denyChatAccess();
        return reply;
    }
}
exports.AdminController = AdminController;
