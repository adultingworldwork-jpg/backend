"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRoutes = metricsRoutes;
const metrics_1 = require("../../core/metrics");
async function metricsRoutes(app) {
    app.get('/metrics', async (request, reply) => {
        reply.header('Content-Type', metrics_1.register.contentType);
        return metrics_1.register.metrics();
    });
}
