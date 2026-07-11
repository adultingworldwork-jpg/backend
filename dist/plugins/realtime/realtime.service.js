"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
/**
 * Framework realtime facade over Socket.IO.
 * Domain modules register connection handlers — they do not create their own Server.
 */
class RealtimeService {
    constructor(io) {
        this.io = io;
        this.connectionHandlers = [];
    }
    getIo() {
        return this.io;
    }
    /**
     * Register a domain handler for each authenticated socket connection.
     * Called by modules (e.g. chat) during plugin/module setup.
     */
    onConnection(handler) {
        this.connectionHandlers.push(handler);
    }
    async runConnectionHandlers(socket) {
        for (const handler of this.connectionHandlers) {
            await handler(socket);
        }
    }
    emit(event, payload) {
        this.io.emit(event, payload);
    }
    toRoom(room, event, payload) {
        this.io.to(room).emit(event, payload);
    }
    emitToUser(userId, event, payload) {
        this.toRoom(`user:${userId}`, event, payload);
    }
    emitToTenant(tenantId, event, payload) {
        this.toRoom(`tenant:${tenantId}`, event, payload);
    }
    emitToConversation(conversationId, event, payload) {
        this.toRoom(`conversation:${conversationId}`, event, payload);
    }
    join(socketId, room) {
        const socket = this.io.sockets.sockets.get(socketId);
        socket?.join(room);
    }
}
exports.RealtimeService = RealtimeService;
