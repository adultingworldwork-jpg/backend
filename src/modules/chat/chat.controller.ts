import { FastifyRequest, FastifyReply } from "fastify";
import { ChatService } from "./chat.service";
import {
  ConversationListQuery,
  CreateConversationInput,
  MessageListQuery,
  StartSupportSessionInput,
  UpdateConversationInput,
} from "./chat.schema";

export class ChatController {
  private service(request: FastifyRequest) {
    const presence =
      (request.server as any).socketPresence ||
      (request.server as any).presence ||
      null;
    return new ChatService({
      ctx: request.ctx,
      audit: request.server.audit,
      isTherapistOnline: presence?.isOnline
        ? (userId: string) => presence.isOnline(userId)
        : undefined,
    });
  }

  async createConversation(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).createConversation(
      request.body as CreateConversationInput,
    );
    return reply.success(data, 201);
  }

  async startSupportSession(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).startSupportSession(
      request.body as StartSupportSessionInput,
    );

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
          request.log.info(
            {
              conversationId: data.id,
              therapistUserId,
              userId,
              assignedTherapistName: data.assignedTherapistName,
            },
            "chat.support_session.assigned",
          );
        }
      } catch {
        /* non-fatal */
      }
    }

    return reply.success(data, 201);
  }

  async listConversations(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service(request).listConversations(
      request.query as ConversationListQuery,
    );
    return reply.success(data);
  }

  async updateConversation(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).updateConversation(
      id,
      request.body as UpdateConversationInput,
    );
    return reply.success(data);
  }

  async getMessages(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await this.service(request).getMessages(
      id,
      request.query as MessageListQuery,
    );
    return reply.success(data);
  }

  async markRead(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const service = this.service(request);
    const data = await service.markRead(id);

    // Realtime notify peer if available
    if (request.server.realtime) {
      try {
        const userId = request.ctx.user!.id;
        const { otherParticipantId } = await service.validateParticipant(
          id,
          userId,
        );
        request.server.realtime.emitToUser(otherParticipantId, "chat:read", {
          conversationId: id,
          readerId: userId,
          count: data.count,
        });
      } catch {
        /* ignore emit failures */
      }
    }

    return reply.success(data);
  }
}
