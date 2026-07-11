"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsModule = metricsModule;
const metrics_routes_1 = require("./metrics.routes");
async function metricsModule(app) {
    await app.register(metrics_routes_1.metricsRoutes);
}
