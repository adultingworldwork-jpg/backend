import { Server } from "socket.io";
import {
  AuthenticatedSocket,
  SocketConnectionHandler,
} from "./realtime.types";

/**
 * Framework realtime facade over Socket.IO.
 * Domain modules register connection handlers — they do not create their own Server.
 */
export class RealtimeService {
  private connectionHandlers: SocketConnectionHandler[] = [];

  constructor(private io: Server) {}

  getIo(): Server {
    return this.io;
  }

  /**
   * Register a domain handler for each authenticated socket connection.
   * Called by modules (e.g. chat) during plugin/module setup.
   */
  onConnection(handler: SocketConnectionHandler) {
    this.connectionHandlers.push(handler);
  }

  async runConnectionHandlers(socket: AuthenticatedSocket) {
    for (const handler of this.connectionHandlers) {
      await handler(socket);
    }
  }

  emit(event: string, payload: any) {
    this.io.emit(event, payload);
  }

  toRoom(room: string, event: string, payload: any) {
    this.io.to(room).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: any) {
    this.toRoom(`user:${userId}`, event, payload);
  }

  emitToTenant(tenantId: string, event: string, payload: any) {
    this.toRoom(`tenant:${tenantId}`, event, payload);
  }

  emitToConversation(conversationId: string, event: string, payload: any) {
    this.toRoom(`conversation:${conversationId}`, event, payload);
  }

  join(socketId: string, room: string) {
    const socket = this.io.sockets.sockets.get(socketId);
    socket?.join(room);
  }
}
