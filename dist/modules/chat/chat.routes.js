"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = chatRoutes;
const chat_controller_1 = require("./chat.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const chat_schema_1 = require("./chat.schema");
const swagger_1 = require("../../plugins/swagger");
const paginatedConversations = (0, swagger_1.paginatedSchema)(swagger_1.ConversationDtoSchema);
const paginatedMessages = (0, swagger_1.paginatedSchema)(swagger_1.MessageDtoSchema);
async function chatRoutes(app) {
    const c = new chat_controller_1.ChatController();
    app.post("/conversations", {
        ...(0, swagger_1.docRoute)({
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
            body: chat_schema_1.createConversationSchema,
            bodyExample: {
                participantId: "665f1a2b3c4d5e6f7a8b9c0b",
            },
            success: (0, swagger_1.created201)(swagger_1.ConversationDtoSchema),
            errors: [400, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(chat_schema_1.createConversationSchema)],
    }, c.createConversation.bind(c));
    app.get("/conversations", {
        ...(0, swagger_1.docRoute)({
            tags: ["Chat"],
            summary: "List my conversations",
            description: `
Paginated conversations for the authenticated user (most recently active first).

Each item includes \`otherParticipantId\` relative to the viewer.
        `.trim(),
            auth: "bearer",
            querystring: chat_schema_1.conversationListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedConversations),
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(chat_schema_1.conversationListQuerySchema)],
    }, c.listConversations.bind(c));
    app.get("/conversations/:id/messages", {
        ...(0, swagger_1.docRoute)({
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
            params: chat_schema_1.conversationIdParamSchema,
            querystring: chat_schema_1.messageListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedMessages),
            errors: [403, 404],
        }),
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(chat_schema_1.conversationIdParamSchema),
            (0, validation_middleware_1.validateQuery)(chat_schema_1.messageListQuerySchema),
        ],
    }, c.getMessages.bind(c));
    app.post("/conversations/:id/read", {
        ...(0, swagger_1.docRoute)({
            tags: ["Chat"],
            summary: "Mark conversation as read",
            description: `
Mark messages in a conversation as read for the authenticated participant.

**Side effects:** Updates \`readAt\` on messages; may emit realtime events to the peer.
        `.trim(),
            auth: "bearer",
            params: chat_schema_1.conversationIdParamSchema,
            success: (0, swagger_1.ok200)({
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
            }, { ok: true, count: 3 }),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(chat_schema_1.conversationIdParamSchema)],
    }, c.markRead.bind(c));
}
