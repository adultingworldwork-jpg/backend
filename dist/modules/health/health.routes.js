"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const mongoose_1 = __importDefault(require("mongoose"));
const swagger_1 = require("../../plugins/swagger");
async function healthRoutes(app) {
    app.get("/health", {
        ...(0, swagger_1.docRoute)({
            tags: ["Health"],
            summary: "Liveness probe",
            description: `
Process liveness check for orchestrators and load balancers.

**Who should use it:** Kubernetes/Docker health checks, uptime monitors.

**Business purpose:** Confirm the HTTP process is running (does not verify DB/Redis).

**Auth:** Public.
        `.trim(),
            auth: "public",
            success: (0, swagger_1.ok200)({
                type: "object",
                properties: {
                    status: { type: "string", example: "ok" },
                    uptime: {
                        type: "number",
                        description: "Process uptime in seconds",
                        example: 3600.5,
                    },
                    timestamp: {
                        type: "integer",
                        description: "Unix epoch milliseconds",
                        example: 1720700000000,
                    },
                },
            }, { status: "ok", uptime: 12.34, timestamp: 1720700000000 }),
            errors: [500],
        }),
    }, async (_request, reply) => {
        return reply.success({
            status: "ok",
            uptime: process.uptime(),
            timestamp: Date.now(),
        });
    });
    app.get("/ready", {
        schema: {
            tags: ["Health"],
            summary: "Readiness probe",
            description: `
**Auth:** Public

Dependency readiness check (database, optional Redis).

**Who should use it:** Load balancers deciding whether to route traffic.

**Business purpose:** Return 200 when critical dependencies are ready; 503 when degraded.

**Response shape:** Uses the standard envelope; \`success\` is false when not ready.
        `.trim(),
            security: [],
            response: {
                200: {
                    description: "All checks passed",
                    ...(0, swagger_1.successEnvelope)({
                        type: "object",
                        properties: {
                            status: { type: "string", example: "ready" },
                            checks: {
                                type: "object",
                                additionalProperties: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string", enum: ["ok", "fail"] },
                                        message: { type: "string" },
                                    },
                                },
                                example: { database: { status: "ok" } },
                            },
                        },
                    }),
                },
                503: {
                    description: "One or more services are not ready",
                    type: "object",
                    example: {
                        success: false,
                        data: {
                            status: "degraded",
                            checks: {
                                database: {
                                    status: "fail",
                                    message: "Database not connected",
                                },
                            },
                        },
                        error: {
                            type: "NOT_READY",
                            message: "One or more services are not ready",
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
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
