import fp from "fastify-plugin";
import { randomUUID } from "crypto";

/**
 * Request Context Plugin
 * Attaches requestId, client metadata, and a child logger to every request.
 * Auth guard enriches ctx.user after successful JWT verification.
 */
export default fp(async (app) => {
  app.addHook("onRequest", async (request) => {
    const requestId =
      (request.headers["x-request-id"] as string | undefined)?.trim() ||
      randomUUID();

    const forwarded = request.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ||
      request.ip;

    request.ctx = {
      requestId,
      ip,
      userAgent: request.headers["user-agent"],
      method: request.method,
      path: request.url,
    };

    request.log = request.log.child({
      requestId,
      ip,
      method: request.method,
      path: request.url,
    });
  });
}, {
  name: "request-context",
});
