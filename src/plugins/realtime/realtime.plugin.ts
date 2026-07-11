import fp from "fastify-plugin";
import { Server } from "socket.io";
import { FastifyInstance } from "fastify";
import { RealtimeService } from "./realtime.service";
import { AuthenticatedSocket } from "./realtime.types";
import {
  MemoryPresenceService,
  PresenceLike,
} from "./memory-presence";
import { config } from "@/config";

declare module "fastify" {
  interface FastifyInstance {
    realtime: RealtimeService;
  }
}

/**
 * Existing Socket.IO framework plugin — extended for Adulting101 chat.
 * - JWT access tokens (id claim)
 * - Optional Redis rate-limit / presence (memory fallback)
 * - Domain modules attach via app.realtime.onConnection(...)
 */
export default fp(
  async (app: FastifyInstance) => {
    const origins = config.app.corsOrigin?.length
      ? config.app.corsOrigin
      : ["*"];

    const io = new Server(app.server, {
      cors: {
        origin: origins.length === 1 && origins[0] === "*" ? true : origins,
        credentials: true,
      },
      path: "/socket.io",
    });

    const realtime = new RealtimeService(io);
    app.decorate("realtime", realtime);

    const memoryPresence = new MemoryPresenceService();

    const getPresence = (): PresenceLike => {
      if ((app as any).presence) return (app as any).presence;
      return memoryPresence;
    };

    // Auth middleware — access token from handshake.auth.token
    io.use(async (socket: any, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

        if (!token) {
          return next(new Error("Unauthorized"));
        }

        const decoded = app.jwt.verifyAccess(token) as {
          id?: string;
          userId?: string;
          username?: string;
          role?: string;
          tenantId?: string;
        };

        const id = decoded.id || decoded.userId;
        if (!id) {
          return next(new Error("Unauthorized"));
        }

        socket.user = {
          id: String(id),
          username: decoded.username,
          role: decoded.role,
          tenantId: decoded.tenantId || "default",
        };

        next();
      } catch {
        next(new Error("Unauthorized"));
      }
    });

    io.on("connection", async (socket: AuthenticatedSocket) => {
      const user = socket.user;
      if (!user) {
        socket.disconnect(true);
        return;
      }

      // Optional rate limit (requires redis rate-limit plugin)
      if ((app as any).rateLimit) {
        try {
          const key = `ratelimit:ws:${user.tenantId}:${user.id}:connect`;
          const result = await (app as any).rateLimit.hit(key, 60, 60);
          if (!result.allowed) {
            socket.emit("error", { message: "Rate limit exceeded" });
            socket.disconnect(true);
            return;
          }
        } catch (err) {
          app.log.warn({ err }, "ws rate limit check failed");
        }
      }

      socket.join(`user:${user.id}`);
      socket.join(`tenant:${user.tenantId}`);

      const presence = getPresence();
      await presence.userConnected(user.id, user.tenantId);

      // Product event names (also keep generic presence for compatibility)
      app.realtime.emitToTenant(user.tenantId, "chat:userOnline", {
        userId: user.id,
      });
      app.realtime.emitToTenant(user.tenantId, "presence:online", {
        userId: user.id,
      });

      // Domain handlers (chat, etc.)
      try {
        await realtime.runConnectionHandlers(socket);
      } catch (err) {
        app.log.error({ err }, "socket connection handler error");
      }

      socket.on("disconnect", async () => {
        await presence.userDisconnected(user.id, user.tenantId);
        const still = await presence.isOnline(user.id);
        if (!still) {
          app.realtime.emitToTenant(user.tenantId, "chat:userOffline", {
            userId: user.id,
          });
          app.realtime.emitToTenant(user.tenantId, "presence:offline", {
            userId: user.id,
          });
        }
      });
    });

    app.addHook("onClose", async () => {
      io.close();
    });

    app.log.info("Realtime (Socket.IO) plugin registered");
  },
  {
    name: "realtime",
    dependencies: ["jwt"],
  },
);
