import { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import { docRoute, ok200, successEnvelope } from "@/plugins/swagger";

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    "/health",
    {
      ...docRoute({
        tags: ["Health"],
        summary: "Liveness probe",
        description: `
Process liveness check for orchestrators and load balancers.

**Who should use it:** Kubernetes/Docker health checks, uptime monitors.

**Business purpose:** Confirm the HTTP process is running (does not verify DB/Redis).

**Auth:** Public.
        `.trim(),
        auth: "public",
        success: ok200(
          {
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
          },
          { status: "ok", uptime: 12.34, timestamp: 1720700000000 },
        ),
        errors: [500],
      }),
    },
    async (_request, reply) => {
      return reply.success({
        status: "ok",
        uptime: process.uptime(),
        timestamp: Date.now(),
      });
    },
  );

  app.get(
    "/ready",
    {
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
            ...successEnvelope({
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
    },
    async (request, reply) => {
      const checks: Record<string, { status: "ok" | "fail"; message?: string }> =
        {};

      try {
        const readyState = mongoose.connection.readyState;
        checks.database =
          readyState === 1
            ? { status: "ok" }
            : { status: "fail", message: "Database not connected" };
      } catch (err) {
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
        } catch (err) {
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
    },
  );
}
