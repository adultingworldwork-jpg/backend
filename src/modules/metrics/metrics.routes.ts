import { FastifyInstance } from "fastify";
import { register } from "@/core/metrics";

/**
 * Prometheus metrics scrape endpoint.
 * Hidden from Swagger UI — internal observability surface.
 */
export async function metricsRoutes(app: FastifyInstance) {
  app.get(
    "/metrics",
    {
      schema: {
        hide: true,
        tags: ["Health"],
        summary: "Prometheus metrics (internal)",
        description:
          "Internal Prometheus scrape endpoint. Not part of the public product API.",
      },
    },
    async (_request, reply) => {
      reply.header("Content-Type", register.contentType);
      return register.metrics();
    },
  );
}
