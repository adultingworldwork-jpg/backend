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
    // Therapists
    async listTherapists(request, reply) {
        const data = await this.service(request).listTherapists(request.query);
        return reply.success(data);
    }
    async createTherapist(request, reply) {
        const data = await this.service(request).createTherapist(request.body);
        return reply.success(data, 201);
    }
    async updateTherapist(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).updateTherapist(id, request.body);
        return reply.success(data);
    }
    async deleteTherapist(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deleteTherapist(id);
        return reply.success(data);
    }
    /**
     * Public therapist PIN gate (no admin JWT).
     * On success issues a full JWT session for the linked therapist User
     * so Socket.IO + chat APIs work as a real participant.
     */
    async verifyTherapist(request, reply) {
        const verified = await this.service(request).verifyTherapist(request.body);
        const session = await request.services.auth.issueSessionForUserId(verified.userId);
        return reply.success({
            therapist: verified.therapist,
            user: session.user,
            tokens: session.tokens,
        });
    }
    /** Public roster for Safe Space matching (no PINs). */
    async listTherapistsPublic(request, reply) {
        const data = await this.service(request).listTherapistsPublic();
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
