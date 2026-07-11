"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = chatRoutes;
const chat_controller_1 = require("./chat.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const chat_schema_1 = require("./chat.schema");
async function chatRoutes(app) {
    const c = new chat_controller_1.ChatController();
    app.post("/conversations", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(chat_schema_1.createConversationSchema)],
    }, c.createConversation.bind(c));
    app.get("/conversations", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(chat_schema_1.conversationListQuerySchema)],
    }, c.listConversations.bind(c));
    app.get("/conversations/:id/messages", {
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(chat_schema_1.conversationIdParamSchema),
            (0, validation_middleware_1.validateQuery)(chat_schema_1.messageListQuerySchema),
        ],
    }, c.getMessages.bind(c));
    app.post("/conversations/:id/read", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(chat_schema_1.conversationIdParamSchema)],
    }, c.markRead.bind(c));
}
