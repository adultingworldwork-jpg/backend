import { FastifyInstance } from "fastify";
import { ChatController } from "./chat.controller";
import { authGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  conversationIdParamSchema,
  conversationListQuerySchema,
  createConversationSchema,
  messageListQuerySchema,
} from "./chat.schema";

export async function chatRoutes(app: FastifyInstance) {
  const c = new ChatController();

  app.post(
    "/conversations",
    {
      preHandler: [authGuard, validateBody(createConversationSchema)],
    },
    c.createConversation.bind(c),
  );

  app.get(
    "/conversations",
    {
      preHandler: [authGuard, validateQuery(conversationListQuerySchema)],
    },
    c.listConversations.bind(c),
  );

  app.get(
    "/conversations/:id/messages",
    {
      preHandler: [
        authGuard,
        validateParams(conversationIdParamSchema),
        validateQuery(messageListQuerySchema),
      ],
    },
    c.getMessages.bind(c),
  );

  app.post(
    "/conversations/:id/read",
    {
      preHandler: [authGuard, validateParams(conversationIdParamSchema)],
    },
    c.markRead.bind(c),
  );
}
