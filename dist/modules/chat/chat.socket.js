"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatSocketHandlers = registerChatSocketHandlers;
const chat_service_1 = require("./chat.service");
const chat_schema_1 = require("./chat.schema");
/**
 * Thin Socket.IO handlers — business logic in ChatService.
 * Registered via app.realtime.onConnection (existing realtime framework).
 */
function registerChatSocketHandlers(app) {
    if (!app.realtime) {
        app.log.warn("Realtime plugin missing — chat sockets not registered");
        return;
    }
    app.realtime.onConnection(async (socket) => {
        const user = socket.user;
        if (!user)
            return;
        const makeService = () => new chat_service_1.ChatService({
            ctx: {
                requestId: socket.id,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                },
            },
            audit: app.audit,
        });
        socket.on("chat:join", async (payload, ack) => {
            try {
                const conversationId = payload?.conversationId;
                if (!conversationId)
                    throw new Error("conversationId required");
                const service = makeService();
                await service.validateParticipant(conversationId, user.id);
                socket.join(`conversation:${conversationId}`);
                // Mark delivered for messages waiting on this user
                const delivered = await service.markDelivered(conversationId);
                if (delivered.count > 0) {
                    const { otherParticipantId } = await service.validateParticipant(conversationId, user.id);
                    app.realtime.emitToUser(otherParticipantId, "chat:delivered", {
                        conversationId,
                        readerId: user.id,
                        count: delivered.count,
                    });
                }
                ack?.({ ok: true, conversationId });
            }
            catch (err) {
                ack?.({ ok: false, error: err?.message || "join_failed" });
                socket.emit("error", { event: "chat:join", message: err?.message });
            }
        });
        socket.on("chat:leave", (payload, ack) => {
            const conversationId = payload?.conversationId;
            if (conversationId) {
                socket.leave(`conversation:${conversationId}`);
            }
            ack?.({ ok: true });
        });
        socket.on("chat:send", async (payload, ack) => {
            try {
                const conversationId = payload?.conversationId;
                if (!conversationId)
                    throw new Error("conversationId required");
                const body = chat_schema_1.sendMessageBodySchema.parse({
                    type: payload.type ?? "TEXT",
                    content: payload.content ?? "",
                    attachmentUploadIds: payload.attachmentUploadIds ?? [],
                });
                const service = makeService();
                await service.validateParticipant(conversationId, user.id);
                // If peer is in the room, mark delivered immediately
                const room = `conversation:${conversationId}`;
                const sockets = await app.realtime.getIo().in(room).fetchSockets();
                const peerOnline = sockets.some((s) => s.user?.id && s.user.id !== user.id);
                const message = await service.sendMessage(conversationId, body, {
                    markDelivered: peerOnline,
                });
                app.realtime.emitToConversation(conversationId, "chat:message", {
                    message,
                });
                // If peer is not in the conversation room, deliver to their user room
                // so the inbox/list still updates (and open chat tabs still receive).
                // When peer is already in the room, skip to avoid duplicate renders.
                try {
                    const { otherParticipantId } = await service.validateParticipant(conversationId, user.id);
                    if (otherParticipantId) {
                        if (!peerOnline) {
                            app.realtime.emitToUser(otherParticipantId, "chat:message", {
                                message,
                            });
                        }
                        // Always emit lightweight inbox signal for list reordering/preview
                        app.realtime.emitToUser(otherParticipantId, "chat:conversation", {
                            conversation: {
                                id: conversationId,
                                lastMessageId: message.id,
                                lastMessageAt: message.createdAt,
                                lastMessagePreview: (message.content || "").slice(0, 120),
                            },
                            reason: "message",
                        });
                    }
                }
                catch {
                    /* non-fatal */
                }
                if (peerOnline) {
                    app.realtime.emitToConversation(conversationId, "chat:delivered", {
                        conversationId,
                        messageId: message.id,
                        senderId: user.id,
                    });
                }
                ack?.({ ok: true, message });
            }
            catch (err) {
                ack?.({
                    ok: false,
                    error: err?.message || "send_failed",
                    type: err?.type,
                });
                socket.emit("error", {
                    event: "chat:send",
                    message: err?.message,
                });
            }
        });
        socket.on("chat:typing", async (payload, ack) => {
            try {
                const conversationId = payload?.conversationId;
                if (!conversationId)
                    return;
                const service = makeService();
                const { otherParticipantId } = await service.validateParticipant(conversationId, user.id);
                app.realtime.emitToUser(otherParticipantId, "chat:typing", {
                    conversationId,
                    userId: user.id,
                });
                ack?.({ ok: true });
            }
            catch {
                /* ignore typing errors */
            }
        });
        socket.on("chat:stopTyping", async (payload, ack) => {
            try {
                const conversationId = payload?.conversationId;
                if (!conversationId)
                    return;
                const service = makeService();
                const { otherParticipantId } = await service.validateParticipant(conversationId, user.id);
                // Reuse typing event with stopped flag, or emit stopTyping to client
                app.realtime.emitToUser(otherParticipantId, "chat:typing", {
                    conversationId,
                    userId: user.id,
                    stopped: true,
                });
                ack?.({ ok: true });
            }
            catch {
                /* ignore */
            }
        });
        // Optional: client can emit read via socket (also available over HTTP)
        socket.on("chat:read", async (payload, ack) => {
            try {
                const conversationId = payload?.conversationId;
                if (!conversationId)
                    throw new Error("conversationId required");
                const service = makeService();
                const { otherParticipantId } = await service.validateParticipant(conversationId, user.id);
                const result = await service.markRead(conversationId);
                app.realtime.emitToUser(otherParticipantId, "chat:read", {
                    conversationId,
                    readerId: user.id,
                    count: result.count,
                });
                ack?.({ ok: true, count: result.count });
            }
            catch (err) {
                ack?.({ ok: false, error: err?.message });
            }
        });
    });
    app.log.info("Chat socket handlers registered");
}
