"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const socket_io_1 = require("socket.io");
const realtime_service_1 = require("./realtime.service");
const memory_presence_1 = require("./memory-presence");
const config_1 = require("../../config");
/**
 * Existing Socket.IO framework plugin — extended for Adulting101 chat.
 * - JWT access tokens (id claim)
 * - Optional Redis rate-limit / presence (memory fallback)
 * - Domain modules attach via app.realtime.onConnection(...)
 */
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const origins = config_1.config.app.corsOrigin?.length
        ? config_1.config.app.corsOrigin
        : ["*"];
    const io = new socket_io_1.Server(app.server, {
        cors: {
            origin: origins.length === 1 && origins[0] === "*" ? true : origins,
            credentials: true,
        },
        path: "/socket.io",
    });
    const realtime = new realtime_service_1.RealtimeService(io);
    app.decorate("realtime", realtime);
    const memoryPresence = new memory_presence_1.MemoryPresenceService();
    const getPresence = () => {
        if (app.presence)
            return app.presence;
        return memoryPresence;
    };
    // Expose the same presence backend sockets use so chat assignment can
    // prefer currently connected therapists (Redis or in-memory).
    if (!app.socketPresence) {
        app.decorate("socketPresence", {
            isOnline: (userId) => getPresence().isOnline(userId),
        });
    }
    // Auth middleware — access token from handshake.auth.token
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");
            if (!token) {
                return next(new Error("Unauthorized"));
            }
            const decoded = app.jwt.verifyAccess(token);
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
        }
        catch {
            next(new Error("Unauthorized"));
        }
    });
    io.on("connection", async (socket) => {
        const user = socket.user;
        if (!user) {
            socket.disconnect(true);
            return;
        }
        // Optional rate limit (requires redis rate-limit plugin)
        if (app.rateLimit) {
            try {
                const key = `ratelimit:ws:${user.tenantId}:${user.id}:connect`;
                const result = await app.rateLimit.hit(key, 60, 60);
                if (!result.allowed) {
                    socket.emit("error", { message: "Rate limit exceeded" });
                    socket.disconnect(true);
                    return;
                }
            }
            catch (err) {
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
        }
        catch (err) {
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
}, {
    name: "realtime",
    dependencies: ["jwt"],
});
