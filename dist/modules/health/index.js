"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthModule = healthModule;
const health_routes_1 = require("./health.routes");
async function healthModule(app) {
    await app.register(health_routes_1.healthRoutes);
}
