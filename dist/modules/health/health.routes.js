"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const mongoose_1 = __importDefault(require("mongoose"));
async function healthRoutes(app) {
    app.get("/health", async (request, reply) => {
        return reply.success({
            status: "ok",
            uptime: process.uptime(),
            timestamp: Date.now(),
        });
    });
    app.get("/ready", async (request, reply) => {
        const checks = {};
        try {
            const readyState = mongoose_1.default.connection.readyState;
            checks.database =
                readyState === 1
                    ? { status: "ok" }
                    : { status: "fail", message: "Database not connected" };
        }
        catch (err) {
            request.log.error(err);
            checks.database = { status: "fail", message: "Database unreachable" };
        }
        if (app.redis) {
            try {
                const pong = await app.redis.ping();
                checks.redis =
                    pong === "PONG"
                        ? { status: "ok" }
                        : { status: "fail", message: `Unexpected ping response: ${pong}` };
            }
            catch (err) {
                request.log.error(err);
                checks.redis = { status: "fail", message: "Redis unreachable" };
            }
        }
        const allReady = Object.values(checks).every((c) => c.status === "ok");
        return reply.status(allReady ? 200 : 503).send({
            success: allReady,
            data: {
                status: allReady ? "ready" : "degraded",
                checks,
            },
            error: allReady
                ? null
                : {
                    type: "NOT_READY",
                    message: "One or more services are not ready",
                },
        });
    });
}
