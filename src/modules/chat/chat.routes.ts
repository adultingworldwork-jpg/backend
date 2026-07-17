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
import {
  ConversationDtoSchema,
  MessageDtoSchema,
  created201,
  docRoute,
  ok200,
  paginatedSchema,
} from "@/plugins/swagger";

const paginatedConversations = paginatedSchema(ConversationDtoSchema);
const paginatedMessages = paginatedSchema(MessageDtoSchema);

export async function chatRoutes(app: FastifyInstance) {
  const c = new ChatController();

  app.post(
    "/conversations",
    {
      ...docRoute({
        tags: ["Chat"],
        summary: "Create or get a 1:1 conversation",
        description: `
Create a conversation with another user (or return the existing pair).

**Body:** \`{ "participantId": "<otherUserId>" }\`

**Business purpose:** Ensure a unique ordered participant pair exists.

**Note:** Sending messages is primarily via Socket.IO; HTTP covers history and read receipts.

**Errors:** \`CHAT_INVALID_PARTICIPANT\`, \`USER_NOT_FOUND\`.
        `.trim(),
        auth: "bearer",
        body: createConversationSchema,
        bodyExample: {
          participantId: "665f1a2b3c4d5e6f7a8b9c0b",
        },
        success: created201(ConversationDtoSchema),
        errors: [400, 404],
      }),
      preHandler: [authGuard, validateBody(createConversationSchema)],
    },
    c.createConversation.bind(c),
  );

  app.get(
    "/conversations",
    {
      ...docRoute({
        tags: ["Chat"],
        summary: "List my conversations",
        description: `
Paginated conversations for the authenticated user (most recently active first).

Each item includes \`otherParticipantId\` relative to the viewer.
        `.trim(),
        auth: "bearer",
        querystring: conversationListQuerySchema,
        success: ok200(paginatedConversations),
      }),
      preHandler: [authGuard, validateQuery(conversationListQuerySchema)],
    },
    c.listConversations.bind(c),
  );

  app.get(
    "/conversations/:id/messages",
    {
      ...docRoute({
        tags: ["Chat"],
        summary: "List messages in a conversation",
        description: `
Paginated message history for a conversation the caller participates in.

**Query:**
- \`page\`, \`limit\` (default limit 30)
- \`before\` optional cursor (ISO createdAt of oldest message already loaded)

**Errors:** \`CHAT_CONVERSATION_NOT_FOUND\`, \`CHAT_FORBIDDEN\`.
        `.trim(),
        auth: "bearer",
        params: conversationIdParamSchema,
        querystring: messageListQuerySchema,
        success: ok200(paginatedMessages),
        errors: [403, 404],
      }),
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
      ...docRoute({
        tags: ["Chat"],
        summary: "Mark conversation as read",
        description: `
Mark messages in a conversation as read for the authenticated participant.

**Side effects:** Updates \`readAt\` on messages; may emit realtime events to the peer.
        `.trim(),
        auth: "bearer",
        params: conversationIdParamSchema,
        success: ok200(
          {
            type: "object",
            required: ["ok", "count"],
            properties: {
              ok: { type: "boolean", const: true, example: true },
              count: {
                type: "integer",
                description: "Number of messages marked read",
                example: 3,
              },
            },
          },
          { ok: true, count: 3 },
        ),
        errors: [403, 404],
      }),
      preHandler: [authGuard, validateParams(conversationIdParamSchema)],
    },
    c.markRead.bind(c),
  );
}
