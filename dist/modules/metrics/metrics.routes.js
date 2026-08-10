"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRoutes = metricsRoutes;
const metrics_1 = require("../../core/metrics");
/**
 * Prometheus metrics scrape endpoint.
 * Hidden from Swagger UI — internal observability surface.
 */
async function metricsRoutes(app) {
    app.get("/metrics", {
        schema: {
            hide: true,
            tags: ["Health"],
            summary: "Prometheus metrics (internal)",
            description: "Internal Prometheus scrape endpoint. Not part of the public product API.",
        },
    }, async (_request, reply) => {
        reply.header("Content-Type", metrics_1.register.contentType);
        return metrics_1.register.metrics();
    });
}
