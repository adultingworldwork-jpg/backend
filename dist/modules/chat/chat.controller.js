"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const chat_service_1 = require("./chat.service");
class ChatController {
    service(request) {
        const presence = request.server.socketPresence ||
            request.server.presence ||
            null;
        return new chat_service_1.ChatService({
            ctx: request.ctx,
            audit: request.server.audit,
            isTherapistOnline: presence?.isOnline
                ? (userId) => presence.isOnline(userId)
                : undefined,
        });
    }
    async createConversation(request, reply) {
        const data = await this.service(request).createConversation(request.body);
        return reply.success(data, 201);
    }
    async startSupportSession(request, reply) {
        const data = await this.service(request).startSupportSession(request.body);
        // Notify assigned therapist immediately (user room) so inbox updates without refresh
        if (request.server.realtime && data?.otherParticipantId) {
            try {
                const therapistUserId = data.otherParticipantId;
                const userId = request.ctx.user?.id;
                // otherParticipantId is relative to the requesting user → therapist user id
                if (therapistUserId && therapistUserId !== userId) {
                    request.server.realtime.emitToUser(therapistUserId, "chat:conversation", {
                        conversation: data,
                        reason: "assigned",
                    });
                    request.log.info({
                        conversationId: data.id,
                        therapistUserId,
                        userId,
                        assignedTherapistName: data.assignedTherapistName,
                    }, "chat.support_session.assigned");
                }
            }
            catch {
                /* non-fatal */
            }
        }
        return reply.success(data, 201);
    }
    async listConversations(request, reply) {
        const data = await this.service(request).listConversations(request.query);
        return reply.success(data);
    }
    async updateConversation(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).updateConversation(id, request.body);
        return reply.success(data);
    }
    async getMessages(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).getMessages(id, request.query);
        return reply.success(data);
    }
    async markRead(request, reply) {
        const { id } = request.params;
        const service = this.service(request);
        const data = await service.markRead(id);
        // Realtime notify peer if available
        if (request.server.realtime) {
            try {
                const userId = request.ctx.user.id;
                const { otherParticipantId } = await service.validateParticipant(id, userId);
                request.server.realtime.emitToUser(otherParticipantId, "chat:read", {
                    conversationId: id,
                    readerId: userId,
                    count: data.count,
                });
            }
            catch {
                /* ignore emit failures */
            }
        }
        return reply.success(data);
    }
}
exports.ChatController = ChatController;
